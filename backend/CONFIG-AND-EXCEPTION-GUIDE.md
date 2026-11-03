# Hướng dẫn config, exception và luồng request


## 1. Đọc thư mục này như thế nào?

```text
config-repo/*.yml                         Giá trị cấu hình runtime
backend/<service>/src/main/resources/
  application.yml                        Bootstrap: tên service, địa chỉ Config Server
backend/<service>/src/main/java/com/clucky/<package>/
  config/                                Cấu hình Spring và tiện ích bảo mật/request
  controller/                            Nhận HTTP request, bind/validate DTO
  dto/                                   Request/response contract
  service/                               Quyền trên dữ liệu và nghiệp vụ
  repository/                            Truy cập schema của service
  mapper/                                Chuyển entity/event sang DTO và ngược lại
  exception/                             Mã lỗi, exception nghiệp vụ, handler HTTP
  logging/                               Hỗ trợ log an toàn và Kafka context
```

**Không phải mọi file trong `config/` đều là `@Configuration`.** `CurrentActor` là dữ liệu/ngữ cảnh người gọi; `AccessGuard` là tiện ích kiểm tra quyền; `CorrelationIdFilter` là filter. Chúng đang được đặt cùng thư mục, không có nghĩa tất cả chạy lần lượt khi request tới.

- `@Configuration` / `@Bean`: đăng ký thành phần Spring, chủ yếu khi khởi động. Request sử dụng các bean đã được tạo, không tạo lại toàn bộ config.
- `@ConfigurationProperties`: đọc nhóm giá trị từ cấu hình vào một object có kiểu dữ liệu rõ ràng.
- `@Component`: Spring quản lý instance. Một component như `AccessGuard` chỉ kiểm tra quyền khi code gọi method của nó.
- `@RestControllerAdvice` / `@ExceptionHandler`: chuyển exception trong luồng Spring MVC thành HTTP response.
- `@EnableMethodSecurity`: cho phép kiểm tra như `@PreAuthorize` ở method được gọi qua Spring proxy.

Config Server cung cấp cấu hình; Eureka cung cấp discovery; Gateway định tuyến frontend tới service. **Ba vai trò này không thay thế controller/service/repository nghiệp vụ.** Config Server và Discovery hiện không có các lớp Java trong package `config`/`exception` tương tự business service; cấu hình của chúng nằm ở YAML và application class.

## 2. Danh mục đầy đủ theo module

Tám business service được viết tắt là **B8** trong tài liệu:

| Module | Package sau `com.clucky` | Mở thư mục config / exception |
|---|---|---|
| identity-service | identityservice | [config](identity-service/src/main/java/com/clucky/identityservice/config/) · [exception](identity-service/src/main/java/com/clucky/identityservice/exception/) |
| catalog-store-service | catalogstoreservice | [config](catalog-store-service/src/main/java/com/clucky/catalogstoreservice/config/) · [exception](catalog-store-service/src/main/java/com/clucky/catalogstoreservice/exception/) |
| cart-order-service | cartorderservice | [config](cart-order-service/src/main/java/com/clucky/cartorderservice/config/) · [exception](cart-order-service/src/main/java/com/clucky/cartorderservice/exception/) |
| payment-service | paymentservice | [config](payment-service/src/main/java/com/clucky/paymentservice/config/) · [exception](payment-service/src/main/java/com/clucky/paymentservice/exception/) |
| promotion-loyalty-service | promotionloyaltyservice | [config](promotion-loyalty-service/src/main/java/com/clucky/promotionloyaltyservice/config/) · [exception](promotion-loyalty-service/src/main/java/com/clucky/promotionloyaltyservice/exception/) |
| shipping-service | shippingservice | [config](shipping-service/src/main/java/com/clucky/shippingservice/config/) · [exception](shipping-service/src/main/java/com/clucky/shippingservice/exception/) |
| notification-service | notificationservice | [config](notification-service/src/main/java/com/clucky/notificationservice/config/) · [exception](notification-service/src/main/java/com/clucky/notificationservice/exception/) |
| review-report-service | reviewreportservice | [config](review-report-service/src/main/java/com/clucky/reviewreportservice/config/) · [exception](review-report-service/src/main/java/com/clucky/reviewreportservice/exception/) |
| audit-service | auditservice | [config](audit-service/src/main/java/com/clucky/auditservice/config/) · [exception](audit-service/src/main/java/com/clucky/auditservice/exception/) |
| api-gateway | apigateway | [config](api-gateway/src/main/java/com/clucky/apigateway/config/) · [exception](api-gateway/src/main/java/com/clucky/apigateway/exception/) |

Các bản cùng chức năng được giải thích chung để không lặp lại nguyên văn cho từng module; những khác biệt quan trọng được ghi riêng.

| File | Có ở module nào? | Vai trò ngắn gọn |
|---|---|---|
| `config/SecurityConfig.java` | B8, Audit, Gateway | JWT, security chain, quyền HTTP, response 401/403 |
| `config/JwtSettings.java` | B8, Audit, Gateway | Đọc secret/issuer/audience |
| `config/AccessTokenValidator.java` | B8, Audit, Gateway | Kiểm tra claim access token |
| `config/CurrentActor.java` | B8, Audit | Lấy userId/role/storeId đã xác thực |
| `config/AccessGuard.java` | B8, Audit | Kiểm tra owner/store khi được gọi |
| `config/CorrelationIdFilter.java` | B8, Audit, Gateway | Correlation ID và log request |
| `config/HttpClientConfig.java` | B8, Audit | Chuyển tiếp correlation ID qua RestClient |
| `config/KafkaConfig.java` | B8 | Topics, retry/error handler cho Kafka |
| `config/RedisConfig.java` | B8 | TTL policy, key, thời gian hết hạn |
| `config/OpenApiConfig.java` | B8, Audit | Tài liệu API/DTO và Bearer scheme |
| `config/PasswordConfig.java` | Identity | BCrypt PasswordEncoder |
| `config/CloudinaryConfig.java` | Identity, Catalog, Promotion | Đăng ký CloudinaryProperties |
| `config/CloudinaryProperties.java` | Identity, Catalog, Promotion | Đọc/validate cấu hình media |
| `config/MailSenderConfig.java` | Notification | Đăng ký MailSenderProperties |
| `config/MailSenderProperties.java` | Notification | Đọc/validate cấu hình Gmail sender |
| `exception/ErrorCode.java` | B8, Audit, Gateway | Enum mã lỗi được sinh từ danh mục chung |
| `exception/ApiException.java` | B8, Audit | Exception nghiệp vụ mang ErrorCode |
| `exception/GlobalExceptionHandler.java` | B8, Audit, Gateway | Chuyển lỗi thành ApiError; Gateway dùng WebFlux |

Audit base chưa có `KafkaConfig`/`RedisConfig`; chưa nối consumer ghi audit. Gateway không có `ApiException` local và không dùng handler MVC. Những entity có chữ “Config” trong tên, như `ShippingFeeConfig`, là **dữ liệu nghiệp vụ**, không thuộc nhóm config hạ tầng này.

## 3. Chi tiết các file config

### 3.1. SecurityConfig.java — cổng kiểm soát request

Tham khảo [bản MVC](payment-service/src/main/java/com/clucky/paymentservice/config/SecurityConfig.java), [Gateway](api-gateway/src/main/java/com/clucky/apigateway/config/SecurityConfig.java), [Audit](audit-service/src/main/java/com/clucky/auditservice/config/SecurityConfig.java).

**Khi khởi động:** tạo JWT decoder và security filter chain; đọc `JwtSettings`. Secret phải ít nhất 32 byte UTF-8 và không được là placeholder bị code từ chối. Decoder hiện dùng **HS256**, không gọi Identity/database mỗi lần xác thực token.

**Khi có request cần xác thực:** Spring Security đọc Bearer token; decoder kiểm tra chữ ký, issuer và timestamp, kết hợp `AccessTokenValidator` kiểm tra claim. Role được chuyển thành authority `ROLE_<role>`.

- B8 dùng `SecurityFilterChain` và security context servlet; bật method security. Session là stateless, không dùng form login/HTTP Basic; CSRF tắt cho cấu hình Bearer hiện tại.
- Các route health, API public/auth được khai báo public; Swagger ở business service chỉ được mở theo cờ docs. Khai báo public **không tự tạo endpoint** nếu controller chưa có.
- `/internal/**` và `/api/payments/webhook/**` hiện bị `denyAll`; phải có cơ chế S2S/webhook riêng trước khi mở, không đổi thành public để chạy tạm.
- Audit chỉ cho `ADMIN`/`STORE_MANAGER` đọc `GET /api/audit-logs`; các route khác ngoài health/docs đã khai báo bị chặn.
- Gateway dùng `SecurityWebFilterChain`, `ReactiveJwtDecoder`, không lưu security context vào session. Bộ route public ở Gateway độc lập với bộ route ở service; muốn truy cập qua Gateway phải qua cả hai lớp.
- 401 được trả qua authentication entry point; 403 qua access denied handler. Response dùng `ApiError`, gắn error code cho log; 401 có `WWW-Authenticate: Bearer`.

**Điểm quan trọng:** xác thực “token hợp lệ” không có nghĩa được xem mọi đơn/quán. Service vẫn phải kiểm tra ownership/store. `permitAll` cho phép không gửi token, không có nghĩa một Bearer token hỏng được coi là hợp lệ.

### 3.2. JwtSettings.java — dữ liệu cấu hình JWT

[Mã nguồn](payment-service/src/main/java/com/clucky/paymentservice/config/JwtSettings.java).

Bind nhóm `clucky.security.jwt`: `secret`, `issuer`, `audience`. Issuer/audience có `@NotBlank`; secret được kiểm tra độ mạnh tối thiểu trong `SecurityConfig`. `@JsonIgnore` không serialize secret qua Jackson; `toString()` chỉ trả chuỗi đã che dữ liệu. Không gọi `secret()` rồi tự log giá trị thật.

### 3.3. AccessTokenValidator.java — kiểm tra nội dung token

[Mã nguồn](payment-service/src/main/java/com/clucky/paymentservice/config/AccessTokenValidator.java).

Decoder gọi validator này để kiểm tra:

- `sub` chuyển được thành user ID dương; `role` thuộc enum `Role`.
- Có `exp`; audience chứa audience cấu hình.
- `STAFF`/`STORE_MANAGER` bắt buộc có `storeId`; storeId nếu xuất hiện phải chuyển được thành ID dương.
- Claim lỗi/thiếu/sai kiểu trả validation failure `invalid_token`, không trả thành công với giá trị mặc định.

Class này **không tự kiểm tra chữ ký JWT, không cấp token và không kiểm tra user còn active trong database**. Chữ ký/issuer/thời hạn thực tế là trách nhiệm decoder và validator tiêu chuẩn được ghép trong `SecurityConfig`.

### 3.4. CurrentActor.java — người đang gọi service là ai?

[Mã nguồn](payment-service/src/main/java/com/clucky/paymentservice/config/CurrentActor.java).

`CurrentActor.require()` lấy `JwtAuthenticationToken` đã authenticated từ `SecurityContextHolder`, trả record gồm `userId`, `role`, `storeId`. Không lấy danh tính từ query/body hoặc header `X-User-Id` do client gửi. Không có authentication hợp lệ thì ném `AuthenticationCredentialsNotFoundException`.

Ví dụ sử dụng trong service:

```java
CurrentActor actor = CurrentActor.require();
Long userId = actor.userId();
Long storeId = actor.storeId();
```

Đây là tiện ích cho luồng HTTP servlet. Kafka consumer/background task không tự có người đăng nhập trong security context; không gọi `require()` và mặc định rằng context HTTP tự truyền sang worker.

### 3.5. AccessGuard.java — kiểm tra quyền đối với dữ liệu

[Mã nguồn](payment-service/src/main/java/com/clucky/paymentservice/config/AccessGuard.java).

| Method | Hành vi hiện tại |
|---|---|
| `requireOwner(ownerId)` | ownerId phải khác null và bằng userId hiện tại; **không có ngoại lệ tự động cho Admin** |
| `requireStore(resourceStoreId)` | Admin được qua; Staff/Manager phải có resourceStoreId bằng storeId trong token; role khác bị chặn |
| `effectiveStore(requestedStoreId)` | Admin giữ filter được yêu cầu, kể cả null; Staff/Manager bị giới hạn vào quán của mình, yêu cầu quán khác bị chặn |

Thất bại ném `AccessDeniedException`. Guard phải được gọi ở service trước khi đọc/ghi dữ liệu. Guard không tự thêm WHERE vào repository và không thay mọi rule nghiệp vụ. Audit dùng `AuditLogService.effectiveStore()` riêng vì ngoài store còn phải ép **Manager chỉ xem event của Staff**.

### 3.6. CorrelationIdFilter.java — gắn mã truy vết và ghi request

[MVC](payment-service/src/main/java/com/clucky/paymentservice/config/CorrelationIdFilter.java) · [Gateway](api-gateway/src/main/java/com/clucky/apigateway/config/CorrelationIdFilter.java).

Chạy sớm, trước security chain. Nhận `X-Correlation-ID` hợp lệ (1–128 ký tự chữ/số/dấu chấm/gạch dưới/gạch ngang), nếu thiếu hoặc sai thì sinh UUID; trả ID trong response header.

- MVC: đặt ID vào MDC và request attribute; khi kết thúc ghi một dòng tổng kết, khôi phục MDC cũ. Servlet async ghi tổng kết lúc hoàn tất; timeout/error được theo dõi riêng.
- Gateway: lưu trong exchange/Reactor Context, forward header sang service; xóa header danh tính `X-User-Id`, `X-Role`, `X-Store-Id` do client cung cấp. Không dùng MDC như servlet để giả định context xuyên thread.
- Log gồm method, route pattern, status, duration, code. 401/403 có event `security_denied`. Không log query/body/token; route chưa match ghi `unmatched`.
- Correlation ID không phải JWT, khóa idempotency hay bằng chứng danh tính; client có thể cung cấp ID đúng định dạng.

### 3.7. HttpClientConfig.java — giữ dấu vết khi gọi HTTP ra ngoài

[Mã nguồn](payment-service/src/main/java/com/clucky/paymentservice/config/HttpClientConfig.java).

Đăng ký `RestClientCustomizer`: lấy correlation ID hợp lệ từ MDC, đặt vào header outgoing request. Áp dụng khi dùng `RestClient.Builder` được Spring cấu hình. `RestClient.create()`/builder tự tạo không được bảo đảm có customizer này.

Hiện file này **không** tự forward JWT, không cấu hình timeout/retry, không có `@LoadBalanced` và không tự cung cấp cơ chế xác thực S2S. Địa chỉ/ủy quyền của cuộc gọi nội bộ phải được triển khai rõ ở luồng sử dụng.

### 3.8. KafkaConfig.java — topic và xử lý delivery failure

[Mã nguồn](payment-service/src/main/java/com/clucky/paymentservice/config/KafkaConfig.java).

- Bật Kafka listener; khai báo topic bằng `KafkaAdmin.NewTopics`: `order.created`, `order.status-changed`, `order.completed`, `order.cancelled`, `payment.confirmed`, `payment.failed`, `promotion.approved`, `audit.recorded`.
- Partitions/replicas đọc từ `clucky.kafka`, phải dương; mặc định trong code là 3/1. Broker/auto-config thực hiện khai báo topic, không tự tạo business event.
- `DefaultErrorHandler` dùng backoff 1 giây và 2 lần retry; retry listener ghi log an toàn. Recovery chưa có durable DLQ thì ném lỗi, không coi record đã xử lý xong; `setAckAfterHandle(false)` không tự thay idempotency nghiệp vụ.
- Producer/consumer factory và template mặc định do Spring Boot cấu hình từ `spring.kafka.*`. Không có nghĩa file này chứa toàn bộ producer/consumer nghiệp vụ.

Hook `logging/KafkaLogging.java` gắn event/correlation context cho record listener. `mapper/EventMapper.toRecord(event, aggregateKey)` tạo record có header truy vết. `kafka_broker_acked` không có nghĩa nghiệp vụ consumer đã commit; `kafka_listener_returned` không có nghĩa offset chắc chắn đã commit. Xem [giới hạn và quy ước Kafka](../docs/observability.md).

### 3.9. RedisConfig.java — TTL và key, không phải nghiệp vụ cache

[Mã nguồn](payment-service/src/main/java/com/clucky/paymentservice/config/RedisConfig.java).

- `Policy` bind `clucky.redis.ttl`; map phải có dữ liệu, mọi duration phải dương. `duration(purpose)` từ chối mục đích chưa khai báo.
- `key(prefix, identifier)` ghép key theo prefix cho phép (`cart`, `cart:guest`, `menu:store`, `otp`, `auth:google:pending`, `payment:pending`, `rate-limit`), validate identifier; cart/menu-store yêu cầu ID dương.
- `untilExpiry(expiresAt, now)` tính duration còn lại và từ chối thời điểm đã hết hạn.
- Kết nối Redis/template mặc định do auto-configuration và `spring.data.redis.*`. Key helper không tự lưu dữ liệu, không tự gắn TTL khi caller quên truyền, không tự invalidate cache hay tạo giỏ hàng.

Ví dụ cách gọi helper, không phải code đã thực hiện Redis write:

```java
String key = RedisConfig.key("menu:store", "11");
Duration ttl = redisPolicy.duration("menu");
```

### 3.10. OpenApiConfig.java — mô tả API cho Swagger

[Ví dụ Payment](payment-service/src/main/java/com/clucky/paymentservice/config/OpenApiConfig.java) · [Audit](audit-service/src/main/java/com/clucky/auditservice/config/OpenApiConfig.java).

Tạo bean `OpenAPI`, tên/phiên bản tài liệu và scheme `bearerAuth` để nhập JWT. B8 đăng ký các schema DTO chung và DTO domain của module; danh sách DTO không giống hoàn toàn giữa các service. Audit mô tả API đọc bằng cấu hình riêng.

OpenAPI không bảo vệ endpoint (Security làm việc đó), không triển khai controller và không chứng minh endpoint đã chạy. `API_DOCS_ENABLED` điều khiển bật tài liệu qua Config Server; docs URL được phép ở service không đồng nghĩa Gateway đã route/mở docs URL tương ứng.

### 3.11. PasswordConfig.java — băm và kiểm tra mật khẩu

[Mã nguồn Identity](identity-service/src/main/java/com/clucky/identityservice/config/PasswordConfig.java).

Tạo `PasswordEncoder` bằng `BCryptPasswordEncoder(12)`. Luồng tạo/đổi mật khẩu dùng `encode`; đăng nhập dùng `matches(rawPassword, storedHash)`. Đây là băm có salt, không phải mã hóa để giải ngược; không so sánh `encode(input)` mới với hash cũ bằng `equals`. File không tự tạo user hoặc xử lý endpoint login.

### 3.12. CloudinaryConfig.java và CloudinaryProperties.java — cấu hình media

[Config](catalog-store-service/src/main/java/com/clucky/catalogstoreservice/config/CloudinaryConfig.java) · [Properties](catalog-store-service/src/main/java/com/clucky/catalogstoreservice/config/CloudinaryProperties.java).

`CloudinaryConfig` chỉ bật binding `CloudinaryProperties`; có trong Identity/Catalog/Promotion. Properties đọc nhóm `cloudinary`: `enabled`, `cloudName`, `apiKey`, `apiSecret`, `folder`.

Khi bật, thiếu credential/folder bị từ chối ngay lúc tạo properties. Secret không serialize qua Jackson; `toString()` che credential. Hai file này **chưa tạo Cloudinary SDK client hay triển khai upload/delete/signature**. Không đặt API secret vào frontend hoặc commit vào YAML.

### 3.13. MailSenderConfig.java và MailSenderProperties.java — cấu hình email

[Config](notification-service/src/main/java/com/clucky/notificationservice/config/MailSenderConfig.java) · [Properties](notification-service/src/main/java/com/clucky/notificationservice/config/MailSenderProperties.java).

`MailSenderConfig` bật binding properties, không tự gửi mail. `MailSenderProperties` bind **`mail-sender`** (không nhầm với nhóm `mail.sender` ở một số cấu hình khác), gồm `enabled`, `host`, `port`, `username`, `appPassword`, `fromName`, `timeoutMs`, `maxRetries`.

- Timeout phải dương, maxRetries không âm. Username được validate email/độ dài.
- Khi bật, code yêu cầu `smtp.gmail.com`, port 587, tài khoản gửi/App Password/fromName đầy đủ; fromName không được có CR/LF.
- `startTlsRequired()` trả true; adapter gửi mail phải dùng giá trị này. Properties không tự cấu hình một SMTP connection.
- `appPassword` không serialize; `toString()` che credential. Đây là App Password của tài khoản gửi hệ thống, **không phải mật khẩu Gmail khách hàng**.
- Khai báo số retry không có nghĩa đã có scheduler/worker retry. SMTP chấp nhận thư không bảo đảm thư đã tới inbox.

## 4. Chi tiết các file exception

### 4.1. ErrorCode.java — danh mục lỗi cho từng ứng dụng

[Ví dụ enum](audit-service/src/main/java/com/clucky/auditservice/exception/ErrorCode.java) · [Nguồn quản lý chung](../contracts/errors.json) · [Generator](../scripts/generate-errors.mjs).

`ErrorCode` chứa mã ổn định, HTTP status và message tiếng Anh an toàn. Ví dụ `VALIDATION_ERROR` → 400, `FORBIDDEN` → 403, `RESOURCE_CONFLICT` → 409. `fromStatus(status)` chọn code mặc định của HTTP status; status không có mapping rơi về `INTERNAL_ERROR`.

Mỗi module có enum local để chạy/build độc lập, nhưng **nguồn duy nhất để sửa danh mục là `contracts/errors.json`**. Không tự thêm enum bằng tay hay tạo danh mục lỗi riêng trong service.

Khi cần thêm lỗi: cập nhật catalog đủ `httpStatus`, `messages.vi`, `messages.en`; rồi người triển khai chạy từ root repo:

```powershell
node scripts/generate-errors.mjs
```

Generator cập nhật enum và metadata/bản dịch frontend. `defaultForStatus` chỉ dành cho một code mặc định của mỗi status, không gắn cho mọi domain code cùng status. Lệnh trên là hướng dẫn, không được chạy trong lần viết tài liệu này.

### 4.2. ApiException.java — báo lỗi nghiệp vụ có chủ đích

[Mã nguồn](audit-service/src/main/java/com/clucky/auditservice/exception/ApiException.java).

Kế thừa `RuntimeException`, bắt buộc có `ErrorCode`; message lấy từ catalog. Nó không tự tạo HTTP response, không tự log, không tự dịch tiếng Việt.

Ví dụ **đang có trong AuditLogService**:

```java
if (query.from() != null && query.to() != null && query.from().isAfter(query.to())) {
    throw new ApiException(ErrorCode.VALIDATION_ERROR);
}
```

Sau `throw`, method không chạy tiếp phần tạo query/repository. Exception đi ngược call stack để Spring xử lý. Không phải controller nào cũng cần `try/catch`; nếu catch rồi nuốt lỗi/trả 200 thì handler không thể trả đúng lỗi nữa.

Ở method có transaction, RuntimeException chưa bị nuốt thường làm transaction rollback theo cấu hình Spring. Tuy nhiên transaction database không tự rollback email, HTTP hoặc event đã gửi ra ngoài; vì vậy audit/event bền vững vẫn cần thiết kế riêng.

### 4.3. GlobalExceptionHandler.java ở B8/Audit — đổi lỗi MVC thành response

[Mã nguồn](audit-service/src/main/java/com/clucky/auditservice/exception/GlobalExceptionHandler.java).

Được đăng ký bằng `@RestControllerAdvice`. Spring chọn method `@ExceptionHandler` phù hợp khi lỗi phát sinh trong quá trình xử lý MVC, thay vì để mỗi controller tự viết response lỗi.

| Exception / nhánh hiện tại | Method | HTTP / code |
|---|---|---|
| `ApiException` | `business` | Giữ status/code/message của ErrorCode được ném |
| `MethodArgumentNotValidException`, `ConstraintViolationException` | `invalid` | 400 / `VALIDATION_ERROR` |
| `HttpMessageNotReadableException`, `HandlerMethodValidationException`, `MethodArgumentTypeMismatchException` | `invalid` | 400 / `VALIDATION_ERROR` |
| `AuthenticationException` trong MVC | `unauthenticated` | 401 / `UNAUTHENTICATED` |
| `AccessDeniedException` trong MVC | `forbidden` | 403 / `FORBIDDEN` |
| `DataIntegrityViolationException`, `OptimisticLockingFailureException` | `conflict` | 409 / `RESOURCE_CONFLICT` |
| Exception implement `ErrorResponse` có status 4xx | Nhánh đầu của `unexpected` | Dùng `ApiError.of(status, path)`; code theo mapping `fromStatus` |
| Exception khác chưa xử lý | Phần còn lại của `unexpected` | Ghi `http_error` với safe trace, trả 500 / `INTERNAL_ERROR` |

Handler gắn code vào request attribute `clucky.errorCode` để `CorrelationIdFilter` ghi dòng tổng kết. Handler không trả `failure.getMessage()` tùy ý cho client, không gửi stack trace/SQL ra response. Lỗi validation hiện trả message chung; **chưa có danh sách lỗi từng field trong body**.

Đây không phải bộ bắt lỗi toàn JVM: lỗi khởi động, filter bên ngoài MVC hoặc Kafka worker không tự đi vào advice này.

### 4.4. GlobalExceptionHandler.java ở Gateway — phiên bản reactive

[Mã nguồn](api-gateway/src/main/java/com/clucky/apigateway/exception/GlobalExceptionHandler.java).

Gateway implement `WebExceptionHandler`, không dùng `@RestControllerAdvice`. Handler nhận lỗi của reactive pipeline:

- Nếu response chưa commit: chọn status từ `ErrorResponse` hoặc mặc định 500; tạo `ApiError`, serialize JSON, ghi response và gọi completion log.
- 5xx có chẩn đoán `http_error` bằng safe trace.
- Nếu response đã commit: không thể thay body/status bằng một JSON lỗi mới; ghi `http_response_failed`, hoàn tất log với outcome lỗi rồi propagate exception.
- 401/403 do security filter được xử lý trực tiếp bởi handler trong `SecurityConfig`, không bắt buộc đi qua lớp này.

**Service trả HTTP 400/403/500 không đồng nghĩa Gateway ném exception.** Nếu đó là response downstream bình thường, Gateway chuyển response về frontend. Không đi qua Gateway exception handler chỉ để tạo lại cùng lỗi một lần nữa.

### 4.5. ApiError.java — file liên quan nằm trong dto, không nằm trong exception

[Mã nguồn](audit-service/src/main/java/com/clucky/auditservice/dto/ApiError.java).

| Field | Ý nghĩa |
|---|---|
| `timestamp` | Thời điểm tạo lỗi, kiểu Instant |
| `status` | HTTP status |
| `error` | Tên HTTP reason, ví dụ `Bad Request` |
| `code` | Mã ổn định để frontend xử lý/dịch |
| `message` | Thông điệp tiếng Anh an toàn trong catalog |
| `path` | Request URI/path, không phải stack trace |

Correlation ID hiện nằm trong **response header `X-Correlation-ID`**, không có field `correlationId` trong record ApiError. Frontend dùng `code` tra bản dịch vi/en, không so khớp chuỗi tiếng Anh để quyết định nghiệp vụ.

## 5. Ví dụ luồng 1 — request hợp lệ vào service

Chọn endpoint **đã có controller trong mã nguồn**: `GET /api/audit-logs`, thay vì giả định các template Payment/Order đã là API hoàn chỉnh.

### Đầu vào minh họa

Giả sử Gateway/Audit đã chạy, database đã migrate, JWT hợp lệ có `sub=7`, `role=STORE_MANAGER`, `storeId=11`. Token thực không được ghi vào tài liệu hoặc log.

```http
GET /api/audit-logs?storeId=11&page=0&size=20 HTTP/1.1
Authorization: Bearer <access-token-hợp-lệ>
X-Correlation-ID: example-audit-001
```

### Thứ tự xử lý

```text
Frontend
  → Gateway CorrelationIdFilter
  → Gateway SecurityConfig / JWT decoder / AccessTokenValidator
  → Gateway route lb://AUDIT-SERVICE (resolve qua Eureka)
  → Audit CorrelationIdFilter
  → Audit SecurityConfig / JWT decoder / AccessTokenValidator
  → Spring MVC bind và validate AuditLogQuery + kiểm tra @PreAuthorize
  → AuditLogController.search(query)
  → AuditLogService.search(query)
      → CurrentActor.require()
      → AuditLogService.effectiveStore(actor, query)
      → kiểm tra from/to
      → repository.findAll(specification, page)
      → AuditMapper.toResponse(entity)
      → PageResponse.from(page)
  ← Spring MVC serialize DTO thành JSON
  ← Audit request log + khôi phục MDC
  ← Gateway chuyển response + ghi request log
  ← Frontend
```

1. **Gateway filter** nhận ID `example-audit-001`, lưu context/header và loại bỏ các identity header giả nếu client có gửi.
2. **Gateway Security** xác thực JWT. Claim hợp lệ mới cho request đi tiếp đến route.
3. **Gateway routing** dùng route trong `config-repo/api-gateway.yml` để tìm Audit Service; frontend không gọi trực tiếp repository/service.
4. **Audit filter** nhận cùng correlation ID, đặt MDC cho request và bắt đầu đo thời gian.
5. **Audit Security** tự kiểm tra JWT lại bằng decoder local; role Manager được phép GET endpoint này. `@PreAuthorize` trên controller kiểm tra role tại method thêm một lần.
6. **MVC** bind query string vào `AuditLogQuery`; các constraint như size 1–200 được kiểm tra trước khi thân controller xử lý.
7. **Controller** gọi service, không tự viết SQL hoặc trả entity.
8. **Service** đọc actor từ security context; `effectiveStore` giữ phạm vi quán 11. Specification bắt buộc thêm `storeId=11` và `actorRole=STAFF` cho Manager, rồi mới kết hợp filter được phép. Đây là helper riêng của Audit, **không phải AccessGuard tự chạy ngầm**.
9. **Repository** đọc `audit_service.audit_logs`, phân trang với sort `occurredAt DESC, id DESC`; không join sang database Identity để tìm user.
10. **Mapper** tạo response DTO và lọc detail theo allowlist của base. Query thành công không tự sinh một record audit mới.
11. **Response** được trả qua Gateway. Khi kết thúc, mỗi hop ghi một request log của chính nó cùng correlation ID. Các dòng này không phải lỗi ghi trùng.

Nếu database chưa có audit record, response minh họa là:

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Correlation-ID: example-audit-001
```

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0
}
```

Log Audit có dạng `event=http_request ... path=/api/audit-logs status=200 ... code=unknown`. `unknown` ở trường code nghĩa là request không có error code được gắn, không có nghĩa request bị lỗi.

**Không chạy trong luồng này:** Redis cache, Kafka producer/consumer, gửi mail, upload Cloudinary hoặc `PasswordEncoder`. Các bean có thể tồn tại lúc khởi động nhưng không phải request nào cũng sử dụng chúng. Audit base chưa ingest event nên trang rỗng không chứng minh luồng ghi audit đã hoàn thành.

## 6. Ví dụ luồng 2 — service ném ApiException

Dùng cùng tài khoản Manager quán 11, nhưng gửi khoảng thời gian bị đảo: `from` muộn hơn `to`. Cả hai timestamp đều đúng định dạng để minh họa **lỗi do service kiểm tra**, không phải lỗi bind query trước controller.

```http
GET /api/audit-logs?storeId=11&from=2026-11-04T00%3A00%3A00Z&to=2026-11-03T00%3A00%3A00Z HTTP/1.1
Authorization: Bearer <access-token-hợp-lệ>
X-Correlation-ID: example-audit-002
```

```text
Gateway xác thực và chuyển request
  → Audit filter + security
  → MVC bind/validate DTO
  → AuditLogController.search(query)
  → AuditLogService.search(query)
      → xác nhận actor/store hợp lệ
      → from.isAfter(to) == true
      → throw new ApiException(ErrorCode.VALIDATION_ERROR)
      ✕ không chạy repository.findAll(...)
  ↗ Exception đi ngược qua service/controller
  → Spring MVC chọn GlobalExceptionHandler.business(...)
      → lấy ErrorCode: status=400, code=VALIDATION_ERROR
      → gắn request attribute clucky.errorCode
      → tạo ApiError và ResponseEntity.status(400)
  → MVC serialize JSON lỗi
  → Audit filter ghi request log status=400, code=VALIDATION_ERROR
  → Gateway chuyển nguyên response downstream, ghi request log status=400
  → Frontend dùng code để hiện bản dịch Việt/Anh
```

### Response minh họa

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
X-Correlation-ID: example-audit-002
```

```json
{
  "timestamp": "2026-11-03T02:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "code": "VALIDATION_ERROR",
  "message": "The submitted information is invalid.",
  "path": "/api/audit-logs"
}
```

Timestamp trên chỉ là ví dụ. Frontend đang ở locale `vi` tra code và hiển thị **“Thông tin nhập chưa hợp lệ.”**; khi ở `en` dùng bản dịch tiếng Anh. Backend không cần đổi ErrorCode hoặc ném exception tiếng Việt.

Đây là lỗi dự kiến: handler không dump stack trace. Audit filter ghi `http_request` ở WARN vì status 400; chỉ 401/403 mới dùng event `security_denied`. Gateway nhận HTTP response 400 bình thường nên không chạy Gateway exception handler. Error code được gắn ở request attribute của Audit **không tự truyền thành exchange attribute của Gateway**; vì vậy log Gateway có thể là `code=unknown`, trong khi body trả frontend vẫn có `VALIDATION_ERROR`.

### Các biến thể để phân biệt nơi lỗi xảy ra

| Tình huống | Nơi xử lý | Controller/repository có chạy không? |
|---|---|---|
| JWT thiếu/hết hạn/sai chữ ký tại Gateway | Authentication entry point trong Gateway SecurityConfig → 401 | Không tới Audit |
| Token hợp lệ nhưng role STAFF đọc audit | Audit SecurityConfig → 403 | Không vào thân controller |
| Manager quán 11 yêu cầu `storeId=12` | `AuditLogService.effectiveStore` ném AccessDeniedException; advice MVC → 403 | Controller/service đã vào, repository chưa chạy |
| `size=500` hoặc timestamp sai định dạng | MVC binding/validation, exception handler → 400 | Không vào thân controller nếu validation thất bại |
| Repository ném DataIntegrityViolationException | Advice `conflict` → 409 theo mapping hiện có | Repository đã được gọi |
| Nghiệp vụ có NullPointerException không được xử lý | Advice `unexpected` → 500 + safe trace | Dừng tại vị trí lỗi; không chạy phần sau |
| Thiếu JWT_SECRET khi khởi động | Tạo bean decoder thất bại | Chưa có HTTP request để tạo ApiError |
| Kafka listener ném exception | Kafka error handler/retry, không phải MVC advice | Không có HTTP controller/response trong worker |

Lỗi trong filter ngoài phạm vi MVC không được hứa là sẽ qua `@RestControllerAdvice`. Security có error handler riêng; filter request có log riêng cho lỗi không được xử lý. Phân biệt này tránh việc thêm `@ExceptionHandler` rồi nghĩ mọi lỗi của toàn hệ thống đều đã được bắt.

## 7. Khi bổ sung nghiệp vụ mới

1. Controller nhận DTO và validate đầu vào; không expose JPA entity.
2. Service đọc `CurrentActor`, kiểm tra owner/store theo domain; không tin userId/role/storeId do client tự khai.
3. Lỗi dự kiến dùng ErrorCode có sẵn hoặc thêm vào catalog rồi generate; không bọc mọi exception thành VALIDATION_ERROR và không catch rồi trả 200.
4. Để advice/security handler tạo error shape thống nhất. Không log cùng một Throwable ở cả controller, service và advice; không đưa secret/PII vào error message/log.
5. Khi cần gọi HTTP/Kafka, dùng client/mapper/context đã cấu hình; không coi correlation ID là quyền truy cập hoặc bằng chứng đã commit nghiệp vụ.
6. Không sửa các config đang dùng chỉ để bỏ qua lỗi môi trường. Nếu cấu hình JWT/SMTP/Cloudinary không hợp lệ thì sửa nguồn env/Config Server tương ứng.

Xem thêm: [log và Audit base](../docs/observability.md), [quy ước error/i18n](../contracts/README.md), [cấu hình runtime](../config-repo/README.md). Tài liệu này chỉ giải thích code; không đánh dấu task DONE và không xác nhận endpoint đã nghiệm thu runtime.
