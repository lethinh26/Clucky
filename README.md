# Clucky scaffold

Bộ khung gồm Next.js Customer, React Admin, Config Server, Eureka Discovery Server, API Gateway và 8 microservice.

## Bắt đầu

1. Copy `.env.example` thành `.env` và thay secret development.
2. Khởi động hạ tầng: `docker compose up -d postgres redis kafka`.
3. Chạy backend: `cd backend && ./gradlew :config-server:bootRun`, sau đó discovery, services và gateway.
4. Frontend: `cd frontend/nextjs && npm install && npm run dev`; admin tương tự với `frontend/react`.

Config Server đọc native config từ `config-repo/`; các service import cấu hình qua `spring.config.import`. Eureka là bắt buộc cho discovery và Gateway dùng `lb://SERVICE-NAME`. Build backend bằng `cd backend && ./gradlew compileJava`; toolchain tự tải JDK 21 khi máy chưa có.

Đây là scaffold: migration bootstrap, dependency, health endpoint, config/discovery wiring và frontend shell đã có; nghiệp vụ đầy đủ sẽ triển khai theo từng service.
