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

Workflow [Frontend CI/CD](.github/workflows/frontend-ci.yml) chạy khi mở/cập nhật pull request hoặc push vào `main` có thay đổi trong `frontend/`, `deploy/frontend/` hay chính workflow. Có thể chạy thủ công bằng **Actions → Frontend CI/CD → Run workflow** sau khi workflow đã được đưa lên GitHub.

- Hai job độc lập cho `frontend/nextjs` và `frontend/react`: Node.js 22 → `npm ci` → `npm run lint` → `npm test` → `npm run build`. Build Next.js có kiểm tra TypeScript; build React chạy `tsc -b` trước Vite.
- Job Playwright cài dependency của cả hai frontend, cài Chromium và build cả hai ứng dụng trước khi chạy `npm run test:ui`. Bộ test tự bật Next.js production server, React production preview và fixture server, dùng dữ liệu demo/mock nên không cần Docker, backend hoặc secret Firebase. Regression loading bao phủ vòng đời tác vụ, router thật, vị trí viewport và phạm vi request của trang quản trị.
- Báo cáo HTML, ảnh chụp và trace lỗi của Playwright được lưu trong artifact `playwright-results` trong 7 ngày.
- Khi `FRONTEND_CD_ENABLED=true`, CI trên `main` thành công mới đóng gói hai Docker image, kiểm tra health và chuyển artifact sang VPS bằng SSH để deploy riêng frontend. VPS không build source và không cần registry token; lỗi activation sẽ thử rollback về release trước.
- Khi chưa có domain: Customer qua cổng 80, Admin qua 8081 bằng Nginx; container chỉ bind localhost. Backend/Gateway không được pipeline này triển khai.

Xem [hướng dẫn cấu hình frontend CI/CD](docs/frontend-ci-cd.md) để chuẩn bị VPS sạch, GitHub environment/variables/secrets, Nginx và rollback. CD chưa bật khi thiếu `FRONTEND_CD_ENABLED=true`; không đưa secret triển khai lên VPS từng có truy cập trái phép trước khi xử lý máy và credential.

ESLint của từng ứng dụng kiểm tra JavaScript/TypeScript trong source, test và file cấu hình; bỏ qua dependency và thư mục sinh ra khi build/test. Các lỗi logic cơ bản và Rules of Hooks làm lint thất bại; `react-hooks/exhaustive-deps` vẫn là cảnh báo. Next.js giữ thêm kiểm tra script đồng bộ và Head trùng lặp. Chạy `npm run lint:fix` trong từng thư mục frontend khi muốn tự sửa các lỗi ESLint hỗ trợ sửa.

Khi tự kiểm tra tại máy, dùng Node.js 22 phiên bản mới nhất và chạy lần lượt `npm ci`, `npm run lint`, `npm test`, `npm run build` trong mỗi frontend. Với UI test, build cả hai ứng dụng trước, sau đó chạy `npx --no-install playwright install chromium` và `npm run test:ui` trong `frontend/nextjs`. Dừng Next dev trước khi build trên cùng checkout để tránh ghi chung `.next`. Theo `AGENTS.md`, agent chỉ chạy các lệnh kiểm thử này khi người dùng yêu cầu rõ.
