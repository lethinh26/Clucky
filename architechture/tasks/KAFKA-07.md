## KAFKA-07 — Xử lý sự kiện Order và Payment để cập nhật thống kê từng quán theo ngày, không cộng doanh thu hai lần khi nhận lại sự kiện

**Phụ trách:** Mai Sơn Việt · **Sprint:** 2 · **Ước lượng:** 8 SP
**Phụ thuộc:** KAFKA-02, KAFKA-03, BE-08

### 1. User Story

- **Là người phát triển dịch vụ**, tôi muốn xử lý sự kiện Order và Payment để cập nhật thống kê từng quán theo ngày, không cộng doanh thu hai lần khi nhận lại sự kiện.

### 2. Công việc

- Consumer event→daily stats, metric/timezone/state/refund mapping và idempotent projection
- Ordering, recovery và reconciliation fixture với BE-42
- Không cross-service SQL, không suy daily stats thành số liệu ca hoặc đơn đang chờ chưa có nguồn
- Lập event→metric contribution matrix với Order/Payment/Report
- Thiết kế projection transaction/identity/version, không cộng cả hai event cùng revenue
- Triển khai replay/order handling và lỗi schema
- Đối chiếu fixture tổng ngày/quán với API/file báo cáo

### 3. Contract và đầu ra

- Schema daily_store_stats theo ngày/quán và processed event/business operation theo policy
- Metric dictionary include/exclude payment state/cancel/refund và amount base được owner chốt
- EventId dedup không đủ nếu cùng nghiệp vụ xuất hiện ở cả confirmed/completed: cần rule đóng góp rõ
- Handoff watermark/freshness và date timezone cho BE-42

### 4. Tiêu chí hoàn thành

- Chuỗi event hợp lệ của một đơn: Revenue/count đúng matrix, một lần đóng góp
- confirmed rồi completed cùng đơn: Không cộng đôi doanh thu nếu cùng contribution
- Replay cùng event và concurrent consumers: Projection không nhân effect
- Event đảo thứ tự hoặc delayed qua ngày: Theo policy/version/timezone, không gán ngày xử lý tùy ý
- Hai quán cùng ngày: Tách đúng totals, không lẫn store
- Cancel/refund/failed theo policy: Chỉ metric đủ điều kiện thay đổi, không doanh thu âm vô cớ
- DB failure giữa dedup và stats: Atomic rollback, không mất contribution khi retry
- Event malformed/unknown version: Không stats sai, failure/DLQ có identity
- Replay/recovery sau restart: Totals khớp expected, không cần xóa dữ liệu nghiệp vụ
- BE-42 dashboard/revenue/export cùng filter: Khớp projection, watermark/giới hạn STAFF minh bạch
- Hai operation dùng cùng correlationId và một operation bị retry: Correlation chỉ trace; mỗi operation có identity riêng, retry cùng operation giữ eventId/operation key theo contract
- Đối chiếu đầu ra qua API/domain readback sau event và recovery: Nguồn sự thật persisted khớp expected, không chỉ log consumed/sent; thiếu downstream ghi BLOCKED phạm vi đó
- Config runtime hoặc payload lỗi có dữ liệu nhạy cảm: Config Server/Eureka và error policy được giữ; không log secret/raw sensitive payload khi báo lỗi
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Chốt revenue gross/net/refund, ngày ghi nhận/timezone và count qualifying states
- Chốt late/out-of-order/correction version và replay/rebuild có giới hạn, không reset bảng production để demo
