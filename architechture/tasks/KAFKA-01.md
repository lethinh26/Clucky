## KAFKA-01 — Cấu hình topic, producer và consumer Kafka cho các service, thống nhất JSON event, group, serializer và cách xác nhận xử lý

**Phụ trách:** Mai Sơn Việt · **Sprint:** 1 · **Ước lượng:** 5 SP
**Phụ thuộc:** UI-06

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn cấu hình topic, producer và consumer Kafka cho các service, thống nhất JSON event, group, serializer và cách xác nhận xử lý để triển khai và tích hợp đúng dữ liệu, quyền và contract của hệ thống.

### 2. Công việc

- Đối chiếu cấu hình chung với bản KafkaConfig trong từng service và tên application; lập bảng service → producer/consumer topic → group theo tài liệu kiến trúc.
- Dùng KafkaTemplate/factory do Spring Boot cấu hình sẵn. Chỉ tạo bean riêng khi có yêu cầu được chốt và ghi rõ lý do; nếu tùy biến phải nối lại error handler/logging hooks.
- Chuẩn bị envelope fixture qua EventMapper; validate trước gửi, deserialize/validate trước gọi business handler. Payload nghiệp vụ phải theo owner, không dùng fixture để tự chốt DTO đơn hàng.
- Xử lý kết quả gửi bất đồng bộ: ghi nhận broker ack hoặc lỗi, không báo publish thành công ngay sau khi gọi send. Broker ack cũng không có nghĩa consumer đã xử lý xong.
- Listener record ack sau commit thành công. Lỗi phải đi qua handler, không catch rồi bỏ qua/ack. Có replay vẫn cần domain dedup eventId.
- Bàn giao ranh giới retry cho KAFKA-08: code hiện backoff 1000ms với 2 retry; recovery ném lỗi vì chưa có durable DLQ và ackAfterHandle=false. Không mô tả đó là DLQ đã hoạt động.

### 3. Contract và đầu ra

| Cấu hình hiện có | Ý nghĩa / giới hạn |
| --- | --- |
| KAFKA_BOOTSTRAP_SERVERS | Địa chỉ broker từ Config Server/environment, không hardcode trong producer |
| clucky.kafka.partitions / replicas | Mặc định 3 / 1, phải dương; replica phải phù hợp số broker, không coi default local là cấu hình production |
| group-id=${spring.application.name} | Service khác nhau nhận độc lập; nhiều instance cùng service chia partition trong cùng group |
| StringSerializer / StringDeserializer | Value là chuỗi JSON do EventMapper tạo; không gửi object trực tiếp rồi trông chờ StringSerializer xử lý |
| enable-auto-commit=false, manual_immediate | Listener chỉ ack sau khi xử lý thành công; không ack trước transaction nghiệp vụ hoàn tất |
| read_committed, acks=all, enable.idempotence=true | Là thiết lập transport; không tự tạo transaction Kafka/DB hoặc xử lý trùng nghiệp vụ |

### 4. Tiêu chí hoàn thành

- Đọc effective config của một service trong môi trường kiểm tra: Đúng broker/group/serializer/ack và topic settings; không lộ credential trong bằng chứng
- Serialize rồi deserialize event fixture với eventId=map-event-01, correlationId=map-request-01 và payload object: Metadata/payload giữ nguyên, header khớp envelope; JSON sai/type sai bị từ chối trước business handler
- Broker không nhận được publish trong môi trường kiểm tra: Kết quả gửi thất bại được xử lý; không báo nghiệp vụ publish thành công giả hoặc log raw payload
- Hai group khác nhau đọc cùng topic; hai instance trong một group: Mỗi group có luồng nhận riêng; instance cùng group chia công việc, không khẳng định mọi instance nhận mọi event
- Consumer lỗi trước commit; kiểm tra vị trí ack và hành vi handler: Không ack sớm/nuốt lỗi; retry theo config, chưa có DLQ phải ghi chưa hoàn thành recovery
- Gửi lại cùng event fixture: eventId/key không đổi; kết quả này chỉ xác nhận transport, chưa thay bằng chứng consumer idempotent
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Payload, version và aggregate key của từng event là gì?: Mai Sơn Việt phối hợp KAFKA-02, KAFKA-03 và domain producer/consumer; chặn tích hợp payload thật, không chặn envelope/config
- Retry hết thì lưu DLQ ở đâu, ack khi nào?: KAFKA-08 chốt topic recovery, lỗi không retry và cách replay; không đổi handler thành bỏ qua lỗi. Chặn nghiệm thu recovery bền vững
- Partitions/replicas và quyền tạo topic từng môi trường?: PIC phối hợp UI-06/deploy; NewTopics có trong source chưa chứng minh broker đã tạo đúng. Không xóa/tạo lại topic đang có dữ liệu
