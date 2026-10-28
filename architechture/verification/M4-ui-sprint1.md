# M4 Sprint 1 — rà soát UI sau merge main

## Phạm vi

PR #11, nhánh `feat/M4-payment-shipping-ui-sprint1`; main đã pull về `91af640`.
Chỉ hoàn thiện UI theo yêu cầu người dùng. Không triển khai backend, migration,
Docker, kiểm tra Actuator/Eureka/Config Server hoặc thanh toán/xác thực thật.
Các request trong test Google được chặn và trả dữ liệu giả lập ở trình duyệt.

## Đối chiếu bốn task

| Task | Trước rà soát | Phần hoàn thiện |
| --- | --- | --- |
| UI-44 | ShipmentCard import sai CSS; badge dùng enum không khớp; QR luôn hiển thị khi hết hạn và tự tạo thông tin ngân hàng mặc định. | Sửa import và các trạng thái; tích hợp QR, badge, shipment và phí giao vào trang đơn mới từ main; QR loading/error/retry/empty/expired; QR demo không dùng để chuyển tiền. Pickup không hiển thị phiếu giao. |
| UI-27 | Có các tab mock nhưng Manager thấy giao dịch chưa có storeId và thông tin cấu hình ngân hàng; lý do modal có thể sót từ lần trước; payload lỗi làm crash; thiếu nhãn truy cập. | Giữ route/menu Payments bên cạnh các route mới từ main; Manager chỉ thấy dữ liệu quán mình; webhook/bank config chỉ Admin trong UI; xác nhận bắt buộc lý do, có nhật ký trong phiên demo; reset draft; kiểm tra số tài khoản; payload đọc an toàn; bảng/Drawer co theo màn hình. |
| UI-47 | Chưa có checklist/evidence; màu badge thiếu tương phản; tab mobile gặp lỗi ARIA. | Sửa màu, focus, font Fredoka/Quicksand; tab xuống dòng; kiểm tra 320/375/768/1440px, không tràn trang; axe WCAG A/AA trên vùng Payment/Shipping và Payments. |
| UI-49 | Có hai component rời nhưng không hiện trong login/register, chưa có luồng hoàn tất mật khẩu. | Gắn cả hai trang customer; Firebase client lấy ID token, API client dùng Gateway; chuyển sang form khi REQUIRES_PASSWORD; xác nhận mật khẩu tối thiểu 8 ký tự; loading/error/cancel/retry/phiên hết hạn; chỉ lưu JWT cuối, pending token ở memory. Admin không có nút Google. |

## Standards

Các lỗi CSS import, kiểu trạng thái, typography, UI scope theo store và accessibility
đã xử lý. Không thay đổi backend/schema, không thêm service URL trực tiếp hoặc secret.
Thông tin cấu hình Firebase trong `.env.example` để trống.
Phân quyền frontend ở đây là hành vi demo, không phải bằng chứng bảo mật backend.
Không thêm nghiệp vụ gán shipper/tracking Phase 2; shipment MVP chỉ thể hiện record.

## Spec

Đã bổ sung phần UI thiếu của cả bốn task. Payment Admin giữ dữ liệu trong phiên UI,
reload sẽ reset; banner giải thích rõ. Google được kiểm thử bằng identity và API giả
lập; đăng nhập Google thật cần cấu hình Firebase và backend ở sprint tích hợp.
Chưa đánh dấu review chéo/merge PR hoàn tất.

## Chạy lại kiểm tra

```powershell
npm --prefix frontend/react ci
npm --prefix frontend/nextjs ci
npm --prefix frontend/react run lint
npm --prefix frontend/react test
npm --prefix frontend/react run build
npm --prefix frontend/nextjs run lint
npm --prefix frontend/nextjs test
npm --prefix frontend/nextjs run build
cd frontend/nextjs
npx playwright install chromium
npm run test:ui
```

UI tests tự khởi động React ở 4173, Next production preview ở 4174 và component
harness ở 4175, sau đó tự dừng. Cần cài dependencies của cả hai frontend;
hai frontend vẫn có thể build/chạy ứng dụng độc lập. Không cần Docker/backend.
Fixture nằm ngoài thư mục Next `app`, không tạo route demo trong production.
Ảnh kiểm chứng ở `frontend/nextjs/test-results/` (gitignored).

## Kết quả kiểm chứng

- Hai frontend: lint và production build thành công.
- Test hiện có: Next 12/12, React 5/5.
- Playwright Chromium: 12/12, bao gồm 4 độ rộng 320/375/768/1440px.
- Axe không còn vi phạm WCAG A/AA trong các vùng được kiểm tra.
- Xem trực tiếp ảnh mobile của bảng Payments và các widget QR/shipment/fee.
- Không còn conflict marker hoặc unmerged path; `git diff --check` sạch.

## Giới hạn kiểm chứng

- Chưa kiểm chứng OAuth Google thật, webhook thật, chuyển khoản thật hoặc API backend.
- Axe là kiểm tra tự động trong các vùng UI nêu trên, không phải chứng nhận accessibility toàn ứng dụng.
- React build có cảnh báo kích thước bundle lớn; build vẫn thành công.
- File người dùng `architechture/specs/navigation-loading-consistency.md` được giữ nguyên và không đưa vào commit.
