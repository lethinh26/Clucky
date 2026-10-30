# Clucky scaffold

Bộ khung gồm Next.js Customer, React Admin, Config Server, Eureka Discovery Server, API Gateway và 8 microservice.

## Bắt đầu

1. Copy `.env.example` thành `.env` và thay secret development.
2. Khởi động hạ tầng: `docker compose up -d postgres redis kafka`.
3. Chạy backend: `cd backend && ./gradlew :config-server:bootRun`, sau đó discovery, services và gateway.
4. Frontend: `cd frontend/nextjs && npm install && npm run dev`; admin tương tự với `frontend/react`.

Config Server đọc native config từ `config-repo/`; các service import cấu hình qua `spring.config.import`. Eureka là bắt buộc cho discovery và Gateway dùng `lb://SERVICE-NAME`. Build backend bằng `cd backend && ./gradlew compileJava`; toolchain tự tải JDK 21 khi máy chưa có.

Đây là scaffold: migration bootstrap, dependency, health endpoint, config/discovery wiring và frontend shell đã có; nghiệp vụ đầy đủ sẽ triển khai theo từng service.

## Frontend CI/CD

Workflow [Frontend CI/CD](.github/workflows/frontend-ci.yml) chạy với mọi push vào `main`; pull request chạy khi thay đổi `frontend/`, `deploy/frontend/` hoặc chính workflow. Có thể chạy thủ công bằng **Actions → Frontend CI/CD → Run workflow → main**.

- Hai job độc lập cho `frontend/nextjs` và `frontend/react`: Node.js 22 → `npm ci` → `npm run lint` → `npm test` → `npm run build`. Build Next.js có kiểm tra TypeScript; build React chạy `tsc -b` trước Vite.
- Job Playwright cài dependency của cả hai frontend, cài Chromium và build cả hai ứng dụng trước khi chạy `npm run test:ui`. Bộ test tự bật Next.js production server, React production preview và fixture server, dùng dữ liệu demo/mock nên không cần Docker, backend hoặc secret Firebase. Regression loading bao phủ vòng đời tác vụ, router thật, vị trí viewport và phạm vi request của trang quản trị.
- Báo cáo HTML, ảnh chụp và trace lỗi của Playwright được lưu trong artifact `playwright-results` trong 7 ngày.
- CI trên `main` thành công sẽ tự động đóng gói hai Docker image, kiểm tra health và chuyển artifact sang VPS bằng SSH để deploy riêng frontend. Không cần cờ bật CD. Pull request chỉ chạy CI. VPS không build source và không cần registry token; lỗi activation sẽ thử rollback về release trước.
- Khi chưa có domain: Customer qua cổng 80, Admin qua 8081 bằng Nginx; container chỉ bind localhost. Backend/Gateway không được pipeline này triển khai.

Job deploy dùng environment `frontend-production`. Cấu hình `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_WORKDIR` ở Variables hoặc Secrets; private key đặt trong Secret `VPS_SSH_KEY`. SSH tự chấp nhận host key ở lần kết nối đầu của mỗi job (`accept-new`), lưu tạm trên runner và từ chối key thay đổi trong cùng job; không cần Secret host key. Với `VPS_WORKDIR=/opt/clucky`, chuẩn bị `/opt/clucky/frontend/runtime.env` theo [file mẫu](deploy/frontend/runtime.env.example) và Nginx theo [cấu hình mẫu](deploy/frontend/nginx.conf.example). User SSH cần quyền chạy Docker và ghi thư mục frontend. Rollback bằng `VPS_WORKDIR=/opt/clucky bash /opt/clucky/frontend/current/deploy.sh rollback`. Chuẩn bị VPS sạch và thu hồi credential cũ sau sự cố truy cập trái phép trước khi triển khai.

ESLint của từng ứng dụng kiểm tra JavaScript/TypeScript trong source, test và file cấu hình; bỏ qua dependency và thư mục sinh ra khi build/test. Các lỗi logic cơ bản và Rules of Hooks làm lint thất bại; `react-hooks/exhaustive-deps` vẫn là cảnh báo. Next.js giữ thêm kiểm tra script đồng bộ và Head trùng lặp. Chạy `npm run lint:fix` trong từng thư mục frontend khi muốn tự sửa các lỗi ESLint hỗ trợ sửa.

Khi tự kiểm tra tại máy, dùng Node.js 22 phiên bản mới nhất và chạy lần lượt `npm ci`, `npm run lint`, `npm test`, `npm run build` trong mỗi frontend. Với UI test, build cả hai ứng dụng trước, sau đó chạy `npx --no-install playwright install chromium` và `npm run test:ui` trong `frontend/nextjs`. Dừng Next dev trước khi build trên cùng checkout để tránh ghi chung `.next`. Theo `AGENTS.md`, agent chỉ chạy các lệnh kiểm thử này khi người dùng yêu cầu rõ.
