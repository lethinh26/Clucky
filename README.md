# Clucky scaffold

Bộ khung gồm Next.js Customer, React Admin, Config Server, Eureka Discovery Server, API Gateway, 8 business service và base Audit Service độc lập.

Log kỹ thuật, cách chạy self-check và giới hạn của Audit base: [docs/observability.md](docs/observability.md). Audit hiện có API đọc/phân quyền; producer/consumer ghi thay đổi quản trị chưa được nối.

## Bắt đầu

1. Copy `.env.example` thành `.env` và thay secret development.
2. Khởi động hạ tầng: `docker compose up -d postgres redis kafka`.
3. Chạy backend: `cd backend && ./gradlew :config-server:bootRun`, sau đó discovery, services và gateway.
4. Frontend: `cd frontend/nextjs && npm install && npm run dev`; admin tương tự với `frontend/react`.

Config Server đọc native config từ `config-repo/`; các service import cấu hình qua `spring.config.import`. Eureka là bắt buộc cho discovery và Gateway dùng `lb://SERVICE-NAME`. Build backend bằng `cd backend && ./gradlew compileJava`; toolchain tự tải JDK 21 khi máy chưa có.

Đây là scaffold: migration bootstrap, dependency, health endpoint, config/discovery wiring và frontend shell đã có; nghiệp vụ đầy đủ sẽ triển khai theo từng service.

## Full-stack CI/CD

Customer demo được điều khiển lúc build qua `NEXT_PUBLIC_M3_DEMO_ENABLED` (Repository Variable, mặc định `false` khi deploy backend thật). Đặt `true` rồi build lại nếu muốn UI demo; đổi env container không thay cờ đã đóng gói. Cờ này không đổi tài khoản/mật khẩu mẫu trong PostgreSQL: chúng được giữ nguyên theo yêu cầu. Các nút demo chỉ cập nhật trình duyệt, không xác nhận thanh toán thật.

Workflow [Clucky full-stack CI/CD](.github/workflows/frontend-ci.yml) giữ CI frontend trên PR vào `main`; push/merge main đóng gói và deploy toàn stack. Chạy tay bằng **Actions → Clucky full-stack CI/CD → Run workflow → main**. Xem [hướng dẫn backend, Secrets và rollback](deploy/backend/README.md).

- Trên PR, hai job độc lập cho `frontend/nextjs` và `frontend/react`: Node.js 22 → `npm ci` → `npm run lint` → `npm test` → `npm run build`. Build Next.js có kiểm tra TypeScript; build React chạy `tsc -b` trước Vite.
- Trên PR, job Playwright cài dependency của cả hai frontend, cài Chromium và build cả hai ứng dụng trước khi chạy `npm run test:ui`. Bộ test tự bật Next.js production server, React production preview và fixture server, dùng dữ liệu demo/mock nên không cần Docker, backend hoặc secret Firebase. Regression loading bao phủ vòng đời tác vụ, router thật, vị trí viewport và phạm vi request của trang quản trị.
- Báo cáo HTML, ảnh chụp và trace lỗi của Playwright được lưu trong artifact `playwright-results` trong 7 ngày.
- Trên `main`, build 12 image Java và 2 frontend trên runner; chuyển artifact qua SSH rồi chạy PostgreSQL/Redis/Kafka → Config Server → Eureka → 9 business services → Gateway → frontends. Không chạy lại CI/Playwright; kiểm health/Eureka không thay nghiệm thu nghiệp vụ. Backend backup trước Flyway, không tự rollback DB; frontend giữ automatic rollback.
- Giữ host Nginx hiện có: Customer cổng 80, Admin 8081, `/api` qua Gateway localhost:8080. Chỉ publish loopback 3000/3001/8080, không mở DB/Eureka/Config Server ra Internet. Firebase trên production cần domain HTTPS; pipeline không tự cấp TLS hoặc sửa cấu hình Nginx host.

Ruleset `Protect main` yêu cầu ba check `nextjs / lint, test, build`, `react / lint, test, build`, `Playwright / customer and admin` thành công từ GitHub Actions và nhánh PR cập nhật với `main` trước khi merge. PR không lọc theo đường dẫn để luôn cung cấp đủ các check bắt buộc. Việc bỏ test sau merge dựa vào quy tắc này; không tắt các required checks khi vận hành CD.

Job deploy giữ environment `frontend-production` nhưng nay deploy cả backend. Cấu hình VPS_HOST/PORT/USER/WORKDIR như cũ, Secrets VPS_SSH_KEY và VPS_SSH_KNOWN_HOSTS đã xác minh, FIREBASE_SERVICE_ACCOUNT_JSON và BACKEND_ENV_JSON; ba NEXT_PUBLIC_FIREBASE_* là Repository Variables. SSH bắt buộc host key khớp, không accept-new. Pipeline tạo env/credential private trực tiếp trên VPS, mount Firebase chỉ vào Identity, giữ volumes và backup. Mẫu JSON, quyền/host prerequisites và rollback ở [deploy/backend/README.md](deploy/backend/README.md). Không public dữ liệu thật khi giữ tài khoản/mật khẩu mẫu.

ESLint của từng ứng dụng kiểm tra JavaScript/TypeScript trong source, test và file cấu hình; bỏ qua dependency và thư mục sinh ra khi build/test. Các lỗi logic cơ bản và Rules of Hooks làm lint thất bại; `react-hooks/exhaustive-deps` vẫn là cảnh báo. Next.js giữ thêm kiểm tra script đồng bộ và Head trùng lặp. Chạy `npm run lint:fix` trong từng thư mục frontend khi muốn tự sửa các lỗi ESLint hỗ trợ sửa.

Khi tự kiểm tra tại máy, dùng Node.js 22 phiên bản mới nhất và chạy lần lượt `npm ci`, `npm run lint`, `npm test`, `npm run build` trong mỗi frontend. Với UI test, build cả hai ứng dụng trước, sau đó chạy `npx --no-install playwright install chromium` và `npm run test:ui` trong `frontend/nextjs`. Dừng Next dev trước khi build trên cùng checkout để tránh ghi chung `.next`. Theo `AGENTS.md`, agent chỉ chạy các lệnh kiểm thử này khi người dùng yêu cầu rõ.
