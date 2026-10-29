# Clucky scaffold

Bộ khung gồm Next.js Customer, React Admin, Config Server, Eureka Discovery Server, API Gateway và 8 microservice.

## Bắt đầu

1. Copy `.env.example` thành `.env` và thay secret development.
2. Khởi động hạ tầng: `docker compose up -d postgres redis kafka`.
3. Chạy backend: `cd backend && ./gradlew :config-server:bootRun`, sau đó discovery, services và gateway.
4. Frontend: `cd frontend/nextjs && npm install && npm run dev`; admin tương tự với `frontend/react`.

Config Server đọc native config từ `config-repo/`; các service import cấu hình qua `spring.config.import`. Eureka là bắt buộc cho discovery và Gateway dùng `lb://SERVICE-NAME`. Build backend bằng `cd backend && ./gradlew compileJava`; toolchain tự tải JDK 21 khi máy chưa có.

Đây là scaffold: migration bootstrap, dependency, health endpoint, config/discovery wiring và frontend shell đã có; nghiệp vụ đầy đủ sẽ triển khai theo từng service.

## Frontend CI

Workflow [Frontend CI](.github/workflows/frontend-ci.yml) chạy khi mở/cập nhật pull request hoặc push vào `main` có thay đổi trong `frontend/` hay chính workflow. Có thể chạy thủ công bằng **Actions → Frontend CI → Run workflow** sau khi workflow đã được đưa lên GitHub.

- Hai job độc lập cho `frontend/nextjs` và `frontend/react`: Node.js 22 → `npm ci` → `npm run lint` → `npm test` → `npm run build`. Build Next.js có kiểm tra TypeScript; build React chạy `tsc -b` trước Vite.
- Job Playwright cài dependency của cả hai frontend, cài Chromium và build Next.js trước khi chạy `npm run test:ui`. Bộ test hiện tại tự bật Next.js production server, React dev server và fixture server, dùng dữ liệu demo/mock nên không cần Docker, backend hoặc secret Firebase.
- Báo cáo HTML, ảnh chụp và trace lỗi của Playwright được lưu trong artifact `playwright-results` trong 7 ngày. Workflow chỉ kiểm tra và build, không deploy.

ESLint của từng ứng dụng kiểm tra JavaScript/TypeScript trong source, test và file cấu hình; bỏ qua dependency và thư mục sinh ra khi build/test. Các lỗi logic cơ bản và Rules of Hooks làm lint thất bại; `react-hooks/exhaustive-deps` vẫn là cảnh báo. Next.js giữ thêm kiểm tra script đồng bộ và Head trùng lặp. Chạy `npm run lint:fix` trong từng thư mục frontend khi muốn tự sửa các lỗi ESLint hỗ trợ sửa.

Khi tự kiểm tra tại máy, dùng Node.js 22 phiên bản mới nhất và chạy lần lượt `npm ci`, `npm run lint`, `npm test`, `npm run build` trong mỗi frontend. Với UI test, cài dependency cả hai ứng dụng, sau đó chạy `npx --no-install playwright install chromium`, `npm run build` và `npm run test:ui` trong `frontend/nextjs`.
