# Clucky — Hướng dẫn chạy

Mục tiêu: khởi động được hạ tầng (PostgreSQL, Redis, Kafka), các ứng dụng backend theo đúng thứ tự, hai frontend và kiểm tra nhanh bằng lệnh `curl`.

Thư mục làm việc trong các lệnh dưới đây là `D:\Work\Ptit\Lap-Trinh-Mang\Clucky\` (hoặc `~/Clucky` nếu bạn đặt ở đâu đó trong bash).

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