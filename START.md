# Clucky — Hướng dẫn chạy

## Chạy toàn bộ bằng Docker Desktop (Windows)

Bật Docker Desktop ở chế độ Linux containers. Đặt Firebase service account JSON tại `secrets/firebase-service-account.json` (Git bỏ qua), giữ ba biến `NEXT_PUBLIC_FIREBASE_*` trong `frontend/nextjs/.env`, rồi chạy tại thư mục repo:

```powershell
./start-docker.ps1
```

Script tự tạo `.env.docker` với mật khẩu database/JWT ngẫu nhiên một lần, lấy project ID từ JSON, đối chiếu với frontend, mount key read-only riêng cho Identity và chạy 17 container theo health dependencies. Không cần export env từng service, cài Java/Node trên host hay dùng GitHub Secrets. Firebase Console vẫn cần bật Google provider và cho phép domain `localhost`; máy phải có Internet.

Customer: http://localhost:3000 — Admin: http://localhost:3001 — Gateway: http://localhost:8080. Dùng `localhost` nhất quán khi thử đăng nhập. Cookie local không bật Secure; frontend gọi Gateway thật, không bật demo login. Tài khoản/mật khẩu seed không thay đổi. SMTP/SePay/Cloudinary tùy chọn đặt trong `.env.docker` theo các tên ở `.env.example`; Google login không cần SMTP.

```powershell
./start-docker.ps1 status
./start-docker.ps1 stop
./start-docker.ps1 check
```

Compose local tái sử dụng cấu hình deployment với `compose.local.yml`, nhưng dùng project/network/volumes `clucky-local` độc lập, không đụng dữ liệu Docker cũ hoặc VPS. Giữ `.env.docker` cùng volumes; không xóa file rồi tạo mật khẩu khác cho database đã khởi tạo. Script không xóa volumes, không chạy test/lint; lần đầu build có thể lâu. Không commit hoặc chia sẻ `.env.docker` hay file service account. Nếu PowerShell chặn script, dùng `powershell -ExecutionPolicy Bypass -File .\start-docker.ps1` cho riêng lần chạy đó.

Các bước bên dưới là cách chạy thủ công, không cần làm thêm nếu dùng script Docker.

Mục tiêu: khởi động được hạ tầng (PostgreSQL, Redis, Kafka), các ứng dụng backend theo đúng thứ tự, hai frontend và kiểm tra nhanh bằng lệnh `curl`.

Thư mục làm việc trong các lệnh dưới đây là `D:\Work\Ptit\Lap-Trinh-Mang\Clucky\` (hoặc `~/Clucky` nếu bạn đặt ở đâu đó trong bash).

## Mapbox và cập nhật từng container

- QR thanh toán hiển thị lớn, dùng template `qr_only` theo [VietQR Quick Link](https://www.vietqr.io/qr-dong). Customer không còn nút mô phỏng thanh toán. QR quầy/kết hợp lấy ngân hàng được cấu hình cho chi nhánh từ Payment, không dùng tài khoản mẫu; mã hiển thị/copy và `addInfo` giống nhau, không thêm hậu tố `SPLIT`. QR online giữ reference của phiên thanh toán; QR quầy dùng mã đơn đã bỏ dấu phân cách để khớp đối soát.
- Thu COD online cần ảnh bằng chứng và tài khoản quản lý khác người tải ảnh duyệt trước khi ghi thu. Modal thu quầy dùng lại panel tải/xem/duyệt bằng chứng; không tự duyệt hoặc bỏ kiểm tra backend. Chuyển khoản online chỉ xác nhận qua đối soát ngân hàng, không dùng nút thu thủ công của đơn quầy.
- Trang tác nghiệp báo cả đơn mới chờ thanh toán lẫn đã xác nhận, cập nhật theo chi nhánh đang chọn. Âm thanh cần một lần click/gõ phím trên trang để trình duyệt cho phép phát; thông báo chữ vẫn hoạt động độc lập.

- Xác thực local: Gateway và Identity cùng chấp nhận Customer ở `localhost:3000`/`127.0.0.1:3000`, Admin ở `localhost:3001`/`127.0.0.1:3001` và Vite ở cổng `5173`. Cookie vẫn gắn với hostname; không trộn URL frontend `127.0.0.1` với Gateway `localhost`. Khi thiếu `Origin`, Gateway chỉ chấp nhận `Referer` thuộc đúng allowlist của ứng dụng; không tắt CSRF hoặc cho phép wildcard.
- Phiên bị từ chối `401`/`403` được xác minh và refresh tối đa một lần; nếu endpoint session/refresh vẫn từ chối thì xóa trạng thái đăng nhập ở UI. Lỗi phân quyền nghiệp vụ `403` với session hợp lệ không làm đăng xuất. Test hồi quy đã bổ sung, không tự chạy theo yêu cầu.
- Đã ngừng tính năng đặt tiệc: xóa `/party`, `/admin/party-orders` và API `/api/party-orders` khỏi runtime. Giữ migration Flyway đã áp dụng và bảng/dữ liệu lịch sử; không xóa volumes hoặc chạy migration phá hủy dữ liệu.

- Token thật đặt trong `.env.docker`; `.env.example` chỉ chứa tên biến trống. Hai frontend dùng `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` và `VITE_MAPBOX_ACCESS_TOKEN` dạng public `pk.`. Script từ chối token bí mật trong các biến frontend. Token public nằm trong bundle nên cần giới hạn URL và quyền ở Mapbox; không dùng `sk.` cho frontend.
- `MAPBOX_GEOCODING_TOKEN` chỉ truyền cho Catalog Store Service. Frontend gọi Gateway, không gọi geocoding trực tiếp. Bản đồ/styles gọi Mapbox bằng public token theo cơ chế SDK.
- Tìm kiếm/reverse dùng Geocoding v6, `permanent=true` vì kết quả có thể được lưu vào địa chỉ hoặc chi nhánh. Tài khoản cần đủ điều kiện Permanent Geocoding; không tự hạ về temporary khi bị từ chối. Không cache kết quả geocoding. Tìm kiếm ưu tiên Việt Nam, debounce 650 ms; backend giới hạn tổng 2 request/giây mỗi instance.
- Mã lỗi geocoding: `MAPBOX_NOT_CONFIGURED` (503), `MAPBOX_ACCESS_DENIED` (503; token/quyền/billing), `MAPBOX_RATE_LIMITED` (429), `MAPBOX_UPSTREAM_ERROR` (502), `MAPBOX_UNAVAILABLE` (503). Không có kết quả trả danh sách rỗng; không coi nhiều kết quả là lỗi.
- Quản trị → Cửa hàng → lọc **Chưa có tọa độ** → biểu tượng la bàn. Tìm địa chỉ, chọn một kết quả, chỉnh ghim và xác nhận lưu. Không tự đoán tọa độ hoặc sửa địa chỉ cửa hàng. Store Manager chỉ sửa được chi nhánh được giao.
- Trang cửa hàng lấy tọa độ đã lưu, không gọi geocoding khi khách bấm quán. Có vị trí người dùng thì xếp gần–xa theo đường chim bay, không đổi phí giao hàng. Giữ nguyên tọa độ cũ, sổ địa chỉ, dữ liệu/volumes và attribution bắt buộc của Mapbox.
- Khi không có token, mạng hoặc WebGL, vẫn giữ danh sách cửa hàng và nhập địa chỉ thủ công. Địa chỉ local cũ chỉ nhập lên tài khoản khi người dùng xác nhận.
- Chỉ cập nhật các container bị ảnh hưởng, theo thứ tự phụ thuộc. Các dependency khác phải đang chạy; `--no-deps` không tự bật/recreate chúng:

```powershell
./start-docker.ps1 -Services catalog-store-service,customer,admin
# Chỉ sửa giao diện khách:
./start-docker.ps1 -Services customer
```

- Không truyền `-Services` thì script vẫn khởi động toàn bộ stack như trước. Backend image chỉ biên dịch service được chọn.
- Test bổ sung đã viết nhưng không tự chạy: `./gradlew :catalog-store-service:test --tests '*LocationControllerTest'`; UI case `tests/ui/store-map.spec.ts` trong frontend Next.js.
- Tham khảo: [Geocoding v6 và quyền lưu trữ](https://docs.mapbox.com/api/search/geocoding/), [quyền và giới hạn URL của token](https://docs.mapbox.com/help/dive-deeper/access-tokens/).

## 1. Chuẩn bị biến môi trường

```bash
cp .env.example .env
```

Mở `.env` và thay các giá trị placeholder (ít nhất `POSTGRES_PASSWORD`, `JWT_SECRET`, `SEPAY_WEBHOOK_SECRET`, `CASSO_WEBHOOK_SECRET`). Không commit `.env` lên Git.

## 2. Khởi động hạ tầng

```bash
docker compose up -d postgres redis kafka
docker compose ps
```

Chờ tới khi các container `postgres`, `redis`, `kafka` ở trạng thái `Up`.

## 3. Chạy backend

Từ thư mục `backend/`:

```bash
cd backend
./gradlew clean build -x test --no-daemon
```

Sau khi build xong, chạy theo thứ tự. Mỗi `bootRun` block, nên tốt nhất mở nhiều terminal/tab hoặc chạy nền.

Terminal A — Config Server:

```bash
cd backend
./gradlew :config-server:bootRun
```

Terminal B — Eureka Discovery Server:

```bash
cd backend
./gradlew :discovery-server:bootRun
```

Terminal C–J — 8 business service (mở mỗi cái một tab/terminal, hoặc để chạy nền):

```bash
./gradlew :identity-service:bootRun
./gradlew :catalog-store-service:bootRun
./gradlew :cart-order-service:bootRun
./gradlew :payment-service:bootRun
./gradlew :promotion-loyalty-service:bootRun
./gradlew :shipping-service:bootRun
./gradlew :notification-service:bootRun
./gradlew :review-report-service:bootRun
```

Terminal K — API Gateway:

```bash
cd backend
./gradlew :api-gateway:bootRun
```

## 4. Kiểm tra backend

Thay `<service>` bằng tên container khi cần.

- Config Server health:

```bash
curl http://localhost:8888/actuator/health
```

- Eureka health:

```bash
curl http://localhost:8761/actuator/health
curl http://localhost:8761/eureka/apps | head
```

- Gateway health:

```bash
curl http://localhost:8080/actuator/health
```

- Ví dụ nhanh routing tới một service (sau khi service đã đăng ký Eureka và Gateway đã load cấu hình):

```bash
curl http://localhost:8080/actuator/info
```

Nếu một service chưa xuất hiện trong `/eureka/apps`, kiểm tra log của nó (`./gradlew :<service>:bootRun`) và xem nó có đọc được Config Server không (`spring.config.import`, `CONFIG_SERVER_URL`).

## 5. Chạy frontend

Frontend Customer (Next.js):

```bash
cd frontend/nextjs
npm install
npm run dev
```

Mở `http://localhost:3000`. Trang sẽ hiển thị logo + favicon và dùng `NEXT_PUBLIC_API_URL` trong `frontend/nextjs/.env.example` (mặc định `http://localhost:8080`).

Frontend Admin (React):

```bash
cd frontend/react
npm install
npm run dev
```

Mở port Vite in ra (thường `http://localhost:5173`). Admin shell có logo + favicon và dùng `VITE_API_URL`.

## 6. Chạy toàn bộ backend bằng Docker Compose (tùy chọn)

```bash
docker compose up -d --build
docker compose logs -f api-gateway
```

Lệnh này build Dockerfile backend với Gradle + JDK 21 và khởi động Config Server, Eureka, 8 service và Gateway. Frontend vẫn chạy riêng bằng `npm run dev` vì hiện tại chưa có Dockerfile riêng cho Next.js và React.

## 7. Dừng và reset

Dừng các service bạn đang chạy bằng Ctrl+C trong terminal Gradle. Dừng hạ tầng:

```bash
docker compose down
```

Nếu muốn reset sạch volume (xóa dữ liệu postgres/redis/kafka):

```bash
docker compose down -v
```

Sau đó chạy lại `docker compose up -d postgres redis kafka` rồi lặp lại phần backend.

## Ghi chú nhanh

- Java toolchain: Gradle sẽ tự tải JDK 21 khi compile nếu máy chưa có. Không cần cài Maven.
- Config Server đọc cấu hình từ `config-repo/` bằng native profile. Muốn chuyển sang Git-backed, chỉnh `CONFIG_REPO_URI`, `CONFIG_REPO_BRANCH` trong `.env` và cập nhật `config-server` env.
- Eureka bắt buộc phải chạy trước Gateway; các service khác sẽ không route nếu chưa đăng ký.
- Đây vẫn là scaffold: entity, migration bootstrap, endpoint health, wiring config/discovery đã có; các API nghiệp vụ chi tiết sẽ triển khai tiếp theo từng service.
