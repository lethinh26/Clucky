# Log kỹ thuật và Audit Service

## Phạm vi hiện có

Gateway, tám business service và Audit Service có log request/lỗi thống nhất. Đây là thay đổi mã nguồn; **chưa chạy self-check, test, build, Docker, migration hay kiểm thử trình duyệt**. Không coi tài liệu này là bằng chứng runtime PASS hoặc tự đổi trạng thái backlog.

Log kỹ thuật đi ra stdout; `audit_service.audit_logs` chỉ lưu lịch sử thay đổi quản trị, không chứa log request/stack trace. Không có service gom log kỹ thuật mới.

## HTTP và bảo mật

- Mỗi request có một dòng tổng kết `event`, `correlationId`, `method`, `path`, `status`, `durationMs`, `code`; tên service trong prefix cấu hình chung. `http_error` là dòng chẩn đoán riêng cho lỗi bất ngờ, không phải một request thứ hai.
- `path` là **route pattern** (ví dụ `/api/orders/{id}` ở MVC, `/api/orders/**` ở Gateway), không phải URL người dùng nhập. Route chưa match, bị chặn trước routing hoặc pattern không an toàn ghi `unmatched`. Không ghi query, body, Authorization/cookie, OTP, email, số điện thoại hoặc mật khẩu.
- 401/403 có `event=security_denied`; không suy ra actor từ JWT chưa xác thực hay header client tự khai. Bản base không ghi danh tính vào log request; actor/role/store của thay đổi quản trị thuộc audit sau khi xác thực.
- Business/validation error có code catalog nếu được handler hiện tại xử lý, không dump stack. Lỗi bất ngờ có class và vị trí stack/cause có giới hạn; **bỏ exception message và suppressed exceptions** vì có thể chứa SQL parameters, token hoặc payload. Không truyền nguyên Throwable vào logger của ứng dụng.
- Gateway chuyển tiếp correlation ID và dùng Reactor Context/các thuộc tính exchange; không dựa vào MDC xuyên thread. MVC đặt và khôi phục MDC. Request servlet async được ghi khi hoàn tất; callback async tự tạo cần chủ động truyền context nếu muốn log bên trong callback.
- HTTP gọi ra phải dùng `RestClient.Builder` do Spring cấp để nhận customizer. Correlation ID chỉ để truy vết, không phải identity, idempotency key hoặc distributed tracing đầy đủ.
- Gateway ghi outcome khi hủy request; status `0` nghĩa là chưa có HTTP status lúc bị hủy. `durationMs` là thời gian quan sát trong application pipeline, không phải thời gian trình duyệt tải xong dữ liệu.

Ví dụ hình dạng log (không phải kết quả đã chạy):

```text
INFO [service=payment-service,correlationId=request-123,eventId=] event=http_request correlationId=request-123 method=POST path=/api/payments/{orderId}/bank-transfer status=200 durationMs=18 code=unknown
```

Không bật HTTP wire/body logging hoặc bind-parameter SQL logging trên dữ liệu thật. Bảo đảm thư viện mới không tự ghi raw token/payload; cấu hình này không phải bộ lọc tự động che mọi chuỗi nhạy cảm của mọi thư viện.

## Kafka: hook nền, chưa phải luồng nghiệp vụ

`KafkaLogging` là bean `RecordInterceptor<Object,Object>` và `ProducerListener<Object,Object>` được Spring Boot gắn vào factory/template mặc định. Áp dụng cho record listener, không phải batch listener hay factory/template tự tạo bỏ qua auto-configuration.

Producer dùng helper mới, với **aggregate key ổn định** để giữ thứ tự cùng đơn/đối tượng:

```java
kafkaTemplate.send(eventMapper.toRecord(event, orderId.toString()));
```

- `toRecord` validate envelope, serialize JSON và gắn `X-Correlation-ID`/`X-Event-ID` từ envelope. Không tự sinh event ID mới khi gửi lại. Khi dùng API gửi khác, owner phải gắn hai header tương ứng.
- Consumer đặt correlation/event ID trong MDC và khôi phục context sau từng record. Header thiếu/sai ghi `unknown`, không dùng ID của message trước. Đây là metadata truy vết, không phải căn cứ phân quyền; consumer vẫn phải validate envelope và đối chiếu contract.
- Log gồm topic, partition, offset, identifiers, kết quả callback và attempt khi delivery thất bại; không log key/value/payload. `kafka_broker_acked` chỉ là broker xác nhận; `kafka_listener_returned` chỉ là listener trả về, **không chứng minh nghiệp vụ đã commit hoặc offset đã được commit**.
- Retry listener dùng cùng `DefaultErrorHandler` hiện có. Sau hai lần retry, handler vẫn từ chối recovery chưa có DLQ, không ack bỏ message lỗi. Đây chưa phải giải pháp DLQ; producer/consumer phải hoàn thiện retry/recovery/idempotency theo INT tương ứng.
- Một số logger thư viện có thể dump nguyên record/exception được tắt trong Config Server; callback an toàn và sự kiện consumer dừng vẫn ghi. Log kết nối từ Kafka client vẫn theo cấu hình thư viện. Cần nghiệm thu lỗi broker/auth/consumer trên môi trường thật; không coi hook là monitoring/alerting đầy đủ.

## Mức log và giới hạn lưu

- Format nằm ở `config-repo/application.yml`; `APP_LOG_LEVEL` mặc định INFO, dev mặc định DEBUG nếu không truyền biến. Prefix gồm service/correlationId/eventId; Gateway có correlation ID tường minh trong message.
- Docker Compose gốc dùng `json-file` với `DOCKER_LOG_MAX_SIZE=10m`, `DOCKER_LOG_MAX_FILES=3` **cho từng container**. Compose frontend đã có cấu hình riêng tương đương. Đây là giới hạn dung lượng, không phải thời hạn lưu theo ngày hoặc backup log.
- Việc đổi logging driver/options cần recreate container khi người vận hành cho phép; thay file cấu hình không áp dụng ngược vào container đang chạy. Không có thao tác recreate/deploy trong lần sửa này.
- Chạy Gradle/Java trực tiếp thì stdout do terminal/process manager quản lý, không được Docker xoay vòng. Chưa thêm Loki/ELK hay ghi đồng thời file trong container.

## Audit Service: base đọc, chưa ingest

- Module `backend/audit-service`, tên Eureka `audit-service`, cổng mặc định `8089`, cấu hình qua `config-repo/audit-service.yml`; Gateway route `GET /api/audit-logs` → `lb://AUDIT-SERVICE`.
- Flyway V1 tạo **một bảng nghiệp vụ `audit_service.audit_logs`** và index store/thời gian theo schema hiện có. Database phải tồn tại; Flyway tạo schema và bảng lịch sử migration riêng. Không sửa migration đã áp dụng ở service khác, không tự xóa/chuyển dữ liệu audit cũ.
- Entity read-only, repository, DTO/query validation, mapper, service, controller, security và OpenAPI riêng. Không expose entity; không HTTP create/update/delete audit, không join hoặc gọi SQL sang schema khác.
- Admin đọc toàn hệ thống. Manager bị ép `storeId` từ token và `actorRole=STAFF`; filter khác quán hoặc role khác bị 403. Staff/Customer/Shipper bị từ chối. Đây là scope tại thời điểm event, không truy vấn quan hệ nhân sự hiện tại ở Identity.
- Filter: `actorId`, `actorRole`, `sourceService`, `action`, `targetType`, `targetId`, `storeId`, `from`, `to`; thời gian ISO-8601 có timezone, hai đầu inclusive và `from <= to`. `page` zero-based, mặc định 0; `size` 1–200, mặc định 20; sort cố định `occurredAt DESC, id DESC` để phân trang ổn định khi timestamp trùng.
- Mapper base chỉ xuất `before`/`after` với các trường kiểu số (`storeId`, `price`, `amount`, `quantity`), boolean (`active`, `enabled`, `available`, `isActive`, `isLocked`, `isAvailable`) và role thuộc enum cho phép. Mọi text tự do/nested field khác bị bỏ. Đây là **allowlist tối thiểu**, không phải đầy đủ tất cả thay đổi; mở rộng theo từng domain cùng kiểm chứng redaction ở INT-48, không dùng denylist tên password/token để tự coi an toàn.
- Review Report đã lưu ý định `audit.recorded` cho reply/hide vào outbox cùng transaction nghiệp vụ (BE-41); đây không phải bảng lịch sử audit. **Chưa có dispatcher Kafka hoặc consumer ghi audit**; producer các domain khác và recovery vẫn thuộc INT-48. Không cho rằng chỉ `afterCommit` rồi gửi Kafka là chống mất audit. INT-48 phải giữ eventId khi retry, dedup ở consumer, kiểm chứng rollback/replay/outage và lọc dữ liệu trước khi lưu. Redaction ở API đọc không thay việc cấm lưu secret.
- Bảng trống trả trang rỗng; đó là hành vi hợp lệ của base, không phải evidence coverage audit thành công. Chưa thay trạng thái BE-43/INT-48.

Khi người dùng chủ động chạy, từ `backend` có thể dùng `./gradlew :audit-service:bootRun` sau infrastructure → Config Server → Eureka, với env database/JWT đã cấp. `.env` không tự được Spring Boot nạp. Docker Compose có profile `audit` để đóng gói module; không publish cổng service ra host, truy cập qua Gateway. Chưa triển khai profile này lên môi trường nào.

## Self-check để người dùng chạy

Từ `backend` trên Windows:

```powershell
.\gradlew.bat :identity-service:loggingSelfCheck :api-gateway:loggingSelfCheck :audit-service:auditSelfCheck
```

Các check dùng input giả, không cần database/Kafka hoặc gọi mạng: sanitization stack/path/header, HTTP completion/MDC/async, Gateway reactive error/cancel, Kafka context/header, audit scope và allowlist. **Chưa chạy các lệnh này.** Chúng không thay kiểm chứng JWT/filter chain thật, migration mới/lặp lại, query SQL phân quyền, batch/transactional Kafka, restart/rotation Docker hoặc producer audit của từng domain.
