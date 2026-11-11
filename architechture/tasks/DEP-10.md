## DEP-10 — Chuẩn bị kịch bản demo, ảnh minh chứng và slide Sprint Review, phân biệt rõ chức năng đã nghiệm thu với phần còn hạn chế

**Phụ trách:** Trần Nguyễn Hữu Khánh · **Sprint:** 3 · **Ước lượng:** 2 SP
**Phụ thuộc:** BE-25, BE-17, BE-20, BE-23, BE-24, BE-32, UI-09, UI-11, UI-17, UI-18, UI-30, BE-19, BE-42, UI-15, UI-29, BE-21, BE-34, UI-25, UI-26, UI-28, BE-09, BE-22, BE-26, BE-27, BE-33, BE-40, BE-43, BE-63, BE-72

### 1. User Story

- **Là người vận hành**, tôi muốn chuẩn bị kịch bản demo, ảnh minh chứng và slide Sprint Review, phân biệt rõ chức năng đã nghiệm thu với phần còn hạn chế để triển khai và vận hành hệ thống ổn định.

### 2. Công việc

- Script theo actor/flow, evidence/screenshots, slides, danh sách limitation/bug và điều kiện demo
- Lấy tên task và SP từ backlog hiện hành; chỉ tổng hợp task thuộc sprint trình bày, không dùng tổng snapshot lịch sử
- Không tự chạy test/demo/deploy, không làm bù feature hoặc tạo evidence giả
- Thu status/evidence từ owner, không suy DONE từ commit
- Chọn critical path đã sẵn sàng, viết script actor/setup/step/expected/fallback
- Biên soạn ảnh/slide và phân biệt actual vs planned/blocked
- Rà đối chiếu task/SP/limitations và bàn giao cho người trình bày

### 3. Contract và đầu ra

- Mỗi bước demo liên kết task, commit/environment, fixture, expected và evidence thật nếu có
- Đánh dấu live/recorded/mock/blocked; screenshot UI không chứng minh Payment/webhook/Kafka đã đạt
- Dữ liệu khách/sender/bank/account dùng fixture được phép, không secret; lịch Review cũ không tự thành lịch mới

### 4. Tiêu chí hoàn thành

- Script critical path hợp lệ với fixture/actor rõ: Người trình bày biết setup, thao tác, expected và cleanup
- Mỗi claim hoàn thành trên slide: Có task/commit/environment/evidence owner xác nhận
- Flow Payment hiện QR nhưng chưa webhook: Trình bày đúng pending, không nói đã nhận tiền
- Kafka/email/audit chỉ có code hoặc mock: Ghi chưa nghiệm thu runtime, không gán PASS
- Phần chưa sẵn sàng hoặc dependency lỗi: Có nhánh dừng/giới hạn rõ, không sửa feature trong demo để che lỗi
- Ảnh/video/tài liệu chứa user/credential thật: Redact hoặc dùng fixture, không leak secret
- Tổng task/SP và tên task trên slides khớp backlog hiện hành và sprint được chọn; không dùng số lịch sử như kế hoạch mới
- Actor Staff/Manager/Admin trong demo: Chỉ dùng quyền đúng, không Admin giả làm Staff để vượt lỗi
- Bug/limitation và Phase 2: Nêu owner/impact/trạng thái, không quảng bá shipping tracking hoặc policy hoãn
- Evidence chưa được cung cấp: Đánh BLOCKED/chưa chạy, bản draft không xem là nghiệm thu
- Handoff thiếu version hoặc artifact không mở/nhập được: Ghi blocker/PIC, không coi đã export là bàn giao xong; không sửa môi trường production để né
- Sửa artifact sau khi owner cập nhật evidence/contract: Các bản cùng version hoặc ghi rõ phần chưa đồng bộ, không dùng evidence cũ cho claim mới
- Bàn giao contract, mã lỗi và kết quả tự kiểm thử kèm commit, môi trường, bằng chứng; ghi rõ lỗi hoặc phần còn bị chặn.

### 5. Điểm cần chốt

- Nhóm chốt demo scope/môi trường/recipient và người trình bày, lịch mới nếu cần
- Evidence chưa có thì ghi chưa nghiệm thu, không dựng screenshot thành công giả hoặc tự chuyển tiền để có minh chứng
