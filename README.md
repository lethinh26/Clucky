<div align="center">
  <img src="architechture/logo/logo_primary.png" alt="Clucky" width="156" />
  <h1>Clucky 🍗</h1>
  <p><strong>Nền tảng đặt món gà rán và quản lý chuỗi cửa hàng</strong></p>
  <p><em>Crispy Outside, Happy Inside</em></p>
  <p><code>Microservices</code> · <code>Spring Boot</code> · <code>Next.js</code> · <code>React</code> · <code>PostgreSQL</code> · <code>Kafka</code></p>
</div>

---

## Giới thiệu

**Clucky** là dự án xây dựng hệ thống kinh doanh thức ăn nhanh, kết nối trải nghiệm **đặt món trực tuyến của khách hàng** với hoạt động **bán hàng, quản lý chi nhánh và quản trị hệ thống**. Hai ứng dụng giao diện sử dụng chung hệ thống backend được tổ chức theo kiến trúc microservices.

Dự án hướng tới việc phân tách rõ trách nhiệm nghiệp vụ, quản lý quyền truy cập theo vai trò và chi nhánh, đồng thời hỗ trợ mở rộng các luồng thanh toán, khuyến mãi, kho hàng và giao nhận.

| Kênh sử dụng | Công nghệ | Mục đích |
| --- | --- | --- |
| **Customer** | Next.js 15, React 19, TypeScript | Xem thực đơn, đặt món, thanh toán và theo dõi đơn hàng |
| **Staff / Store Manager / Admin** | React 19, Vite 6, TypeScript | Vận hành đơn hàng, quản lý cửa hàng và quản trị hệ thống |
| **Backend** | Java 21, Spring Boot 3.4, Spring Cloud | Cung cấp API, xử lý nghiệp vụ, xác thực và tích hợp các dịch vụ |

## Tính năng

<details open>
<summary><strong>Dành cho khách hàng</strong></summary>

- Xem thực đơn, tìm hiểu món ăn, combo và cửa hàng.
- Thêm món vào giỏ, tùy chỉnh lựa chọn và topping, đặt hàng và xem chi tiết đơn.
- Quản lý tài khoản, địa chỉ giao hàng, lịch sử đặt hàng và thông báo.
- Đăng ký, đăng nhập, xác minh OTP, khôi phục mật khẩu; hỗ trợ đăng nhập Google qua Firebase.
- Sử dụng voucher, theo dõi điểm thưởng và ưu đãi cá nhân.
- Xem trạng thái đơn hàng và thông tin giao nhận được hệ thống cung cấp.

</details>

<details>
<summary><strong>Dành cho nhân viên và quản lý cửa hàng</strong></summary>

- Tiếp nhận, xử lý, bàn giao đơn hàng và tạo đơn nhanh tại quầy.
- Xử lý thanh toán quầy, đối chiếu giao dịch và chứng từ theo quyền được cấp.
- Theo dõi tồn kho, tình trạng món và các nghiệp vụ nhập/chuyển hàng.
- Quản lý hoạt động trong phạm vi chi nhánh được phân công.

</details>

<details>
<summary><strong>Dành cho quản trị viên</strong></summary>

- Quản lý tài khoản, vai trò, nhân viên và chi nhánh.
- Quản lý thực đơn, sản phẩm, combo, cửa hàng và cấu hình bán hàng.
- Quản lý khuyến mãi, voucher, chương trình tích điểm và banner.
- Theo dõi đơn hàng, thanh toán, báo cáo, đánh giá và thông báo email.
- Soạn thảo, xem trước, quản lý phiên bản, xuất bản và khôi phục Điều khoản dịch vụ / Chính sách quyền riêng tư; ghi nhận phiên bản khách hàng đã chấp thuận khi đăng ký.
- Tra cứu thông tin vận hành và nhật ký quản trị theo phạm vi chức năng đã triển khai.

</details>

> **Phạm vi triển khai:** Một số khả năng phụ thuộc cấu hình tích hợp ngoài. Môi trường Docker cục bộ có chế độ mô phỏng giao hàng và thanh toán phục vụ phát triển; việc đối soát giao dịch thật, gửi email hoặc sử dụng bản đồ cần cấu hình dịch vụ tương ứng. Luồng nhật ký sự kiện audit và các tính năng giao hàng nâng cao vẫn có phần đang được hoàn thiện.

## Kiến trúc hệ thống

Hai ứng dụng **Customer** và **Admin** kết nối với các dịch vụ nghiệp vụ qua **API Gateway**. Các service thực hiện yêu cầu đồng bộ qua HTTP/REST và trao đổi sự kiện bất đồng bộ thông qua Kafka khi cần. **Config Server** cung cấp cấu hình tập trung, còn **Eureka** hỗ trợ đăng ký và khám phá dịch vụ.

### Các dịch vụ backend

| Thành phần | Trách nhiệm chính |
| --- | --- |
| `api-gateway` | Điểm truy cập API, định tuyến và kiểm soát truy cập |
| `identity-service` | Tài khoản, xác thực, phân quyền và thông tin người dùng |
| `catalog-store-service` | Món ăn, danh mục, combo, chi nhánh và tồn kho cơ bản |
| `cart-order-service` | Giỏ hàng, đặt hàng và vòng đời đơn hàng |
| `payment-service` | Thanh toán, QR, giao dịch và đối soát |
| `promotion-loyalty-service` | Khuyến mãi, voucher, điểm thưởng và khách hàng thân thiết |
| `shipping-service` | Phí giao hàng, bản ghi vận chuyển và tích hợp giao nhận |
| `notification-service` | Thông báo ứng dụng và email |
| `review-report-service` | Đánh giá khách hàng và báo cáo thống kê |
| `audit-service` | API và dữ liệu nhật ký quản trị; luồng ghi nhận sự kiện đang hoàn thiện |
| `config-server` | Cấu hình tập trung cho các service |
| `discovery-server` | Eureka Service Discovery |

### Hạ tầng và nguyên tắc thiết kế

- **PostgreSQL 16:** Các service sở hữu dữ liệu theo schema riêng trên hạ tầng PostgreSQL dùng chung; không truy vấn/join trực tiếp qua schema của service khác.
- **Redis 7:** Hỗ trợ giỏ hàng, cache và dữ liệu tạm theo từng nghiệp vụ.
- **Apache Kafka 3.9:** Truyền sự kiện giữa các service, giảm phụ thuộc trực tiếp trong các quy trình bất đồng bộ.
- **Docker Compose:** Khởi tạo hạ tầng, backend và frontend theo thứ tự phụ thuộc, kèm healthcheck và volume lưu trữ.
- **Tích hợp tùy cấu hình:** Firebase/Google, SePay, Mapbox và Cloudinary.

Mã nguồn kiến trúc và tài liệu phân tích được lưu trong [`architechture/`](architechture/). Sơ đồ ở trên được cung cấp dưới định dạng **Draw.io (`.drawio`)** để các thành viên chỉnh sửa; có thể tạo lại các tài nguyên đồ họa bằng [`scripts/generate-readme-architecture.py`](scripts/generate-readme-architecture.py) (yêu cầu Python và Pillow).

## Công nghệ sử dụng

| Nhóm | Công nghệ |
| --- | --- |
| Giao diện khách hàng | Next.js 15, React 19, TypeScript |
| Giao diện vận hành | React 19, Vite 6, Ant Design, TypeScript |
| Backend | Java 21, Spring Boot 3.4, Spring Cloud 2024, Spring Security |
| Xác thực và phân quyền | JWT, RBAC, Firebase Authentication |
| Dữ liệu và sự kiện | PostgreSQL 16, Redis 7, Apache Kafka 3.9 |
| Hạ tầng | Docker, Docker Compose, Config Server, Eureka, API Gateway |
| Kiểm thử và CI/CD | Gradle, npm, Playwright, GitHub Actions |

## Yêu cầu hệ thống

**Cách chạy được khuyến nghị:** Windows với PowerShell và Docker Desktop ở chế độ **Linux containers**.

- Git và Docker Desktop có Docker Compose v2; bảo đảm Docker Engine đang hoạt động.
- Kết nối Internet để tải image, dependency và sử dụng Firebase.
- Một **dự án Firebase** đã bật phương thức đăng nhập Google, có domain `localhost` trong danh sách được phép và có tệp Service Account JSON.
- Tài nguyên RAM, CPU và dung lượng đĩa phù hợp để build và chạy đồng thời các container backend, frontend và hạ tầng.

Với cách chạy bằng Docker, **không cần cài riêng Java hoặc Node.js trên máy chủ**. Nếu muốn phát triển từng ứng dụng trực tiếp trên máy, cần **JDK 21**, **Node.js 22** và npm; backend sử dụng Gradle Wrapper có sẵn trong dự án.

## Hướng dẫn cài đặt và chạy

### Bước 1 — Lấy mã nguồn

```bash
git clone https://github.com/lethinh26/Clucky.git
cd Clucky
```

### Bước 2 — Cấu hình Firebase

Trong **PowerShell**, tại thư mục gốc dự án, tạo tệp cấu hình cho frontend khách hàng:

```powershell
Copy-Item frontend/nextjs/.env.example frontend/nextjs/.env
```

Mở `frontend/nextjs/.env` và điền ba giá trị được cung cấp trong **Firebase Console → Project settings → Your apps → Web app**:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=your_web_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

Tiếp theo, tải **Firebase Service Account JSON** của đúng dự án và lưu tại:

```text
secrets/firebase-service-account.json
```

**Lưu ý:** `project_id` trong Service Account phải trùng `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Các tệp chứa thông tin xác thực phải được giữ riêng tư và không đưa lên Git.

### Bước 3 — Khởi động toàn bộ hệ thống

Bật Docker Desktop (Linux containers), sau đó chạy trong PowerShell từ thư mục gốc:

```powershell
.\start-docker.ps1
```

Script sẽ kiểm tra cấu hình Firebase, tự tạo tệp `.env.docker` với thông tin xác thực nội bộ ở lần chạy đầu tiên, build image và khởi động stack Docker Compose cục bộ. Cấu hình được kết hợp từ `deploy/backend/compose.yml`, `deploy/frontend/compose.yml` và `compose.local.yml`.

> Giữ lại `.env.docker` khi khởi động lại dự án: tệp chứa thông tin kết nối đến volume PostgreSQL đã tạo. Nếu PowerShell chặn thực thi script, có thể dùng `powershell -ExecutionPolicy Bypass -File .\start-docker.ps1` cho lần chạy đó.

### Bước 4 — Truy cập ứng dụng

| Thành phần | Địa chỉ cục bộ |
| --- | --- |
| Website khách hàng | <http://localhost:3000> |
| Trang quản trị và nhân viên | <http://localhost:3001> |
| API Gateway | <http://localhost:8080> |
| Giao diện Kafka UI | <http://localhost:8088> |

Lệnh quản lý thường dùng (thực thi tại thư mục gốc):

```powershell
# Kiểm tra cấu hình Compose và Firebase, không khởi chạy container
.\start-docker.ps1 check

# Xem trạng thái các container
.\start-docker.ps1 status

# Chỉ build và cập nhật website khách hàng
.\start-docker.ps1 -Services customer

# Dừng hệ thống nhưng vẫn giữ lại dữ liệu
.\start-docker.ps1 stop
```

Môi trường Docker local hiện khai báo **18 container** gồm hạ tầng, 12 ứng dụng Java, 2 frontend và Kafka UI. Các volume cục bộ được đặt tên riêng để hạn chế ảnh hưởng đến những môi trường Compose khác.

### Cấu hình tích hợp tùy chọn

Sau khi `.env.docker` được tạo, có thể bổ sung các biến môi trường phù hợp từ [`.env.example`](.env.example):

| Tích hợp | Mục đích | Nhóm biến cấu hình |
| --- | --- | --- |
| Mapbox | Bản đồ, tìm kiếm địa chỉ, tuyến giao hàng | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, `VITE_MAPBOX_ACCESS_TOKEN`, `MAPBOX_GEOCODING_TOKEN` |
| SePay | Đối soát giao dịch ngân hàng, QR thanh toán quầy | `SEPAY_API_KEY`, `SEPAY_POS_ENABLED` |
| Gmail SMTP | Gửi email thông báo, xác minh | `MAIL_SENDER_*` |
| Cloudinary | Lưu trữ ảnh món ăn và các nội dung đa phương tiện | `CLOUDINARY_*` |

Token Mapbox sử dụng trong frontend phải là **public token** bắt đầu bằng `pk.`. Các tính năng liên quan đến nhà cung cấp ngoài có thể không hoạt động đầy đủ khi chưa cấu hình tài khoản và quyền truy cập tương ứng.

### Phát triển và kiểm thử từng ứng dụng

Sau khi chuẩn bị các biến môi trường và backend phù hợp, có thể chạy riêng từng giao diện:

```bash
# Customer (http://localhost:3000)
cd frontend/nextjs
npm ci
npm run dev
```

```bash
# Admin (thường là http://localhost:5173)
cd frontend/react
npm ci
npm run dev
```

Để chạy kiểm tra theo từng phần, sử dụng `npm run lint`, `npm test`, `npm run build` trong thư mục frontend; backend có `backend/gradlew` (Windows: `backend/gradlew.bat`) để chạy các Gradle task. Bộ kiểm thử giao diện Playwright được đặt trong `frontend/nextjs` và chạy bằng `npm run test:ui` sau khi chuẩn bị môi trường kiểm thử.

## Cấu trúc thư mục

```text
Clucky/
├── architechture/       # Tài liệu thiết kế, sơ đồ, đặc tả và backlog
├── backend/             # 12 module Java: gateway, config, discovery, 9 service
├── config-repo/         # Cấu hình dùng cho Spring Cloud Config
├── contracts/           # Các hợp đồng giao tiếp/dữ liệu
├── deploy/              # Dockerfile và Compose triển khai
├── docs/assets/         # GIF, PNG và sơ đồ Draw.io dùng trong README
├── frontend/
│   ├── nextjs/         # Website khách hàng
│   └── react/          # Giao diện nhân viên, quản lý và quản trị
├── scripts/             # Công cụ và script hỗ trợ
├── start/               # Tài nguyên khởi động dự án
├── compose.local.yml    # Cấu hình Compose bổ sung cho môi trường local
├── start-docker.ps1     # Script chạy Docker trên Windows
└── README.md
```

## Tài liệu và CI/CD

> **Lưu ý triển khai điều khoản pháp lý:** Việc bổ sung trang điều khoản và yêu cầu khách hàng xác nhận cần phát hành theo hai giai đoạn `bootstrap` và `enforce`. Chỉ bật bắt buộc chấp thuận sau khi đã xuất bản đủ hai văn bản được duyệt. Xem [hướng dẫn chuyển đổi không gián đoạn đăng ký](backend/identity-service/LEGAL_CONTENT_ROLLOUT.md) trước khi triển khai bản này lên production.

- [Thiết kế kiến trúc hệ thống](architechture/docs/Kiến%20trúc%20hệ%20thống.md) và [các sơ đồ nghiệp vụ](architechture/diagrams/).
- [Đặc tả yêu cầu phần mềm (SRS)](architechture/docs/SRS.md), [Backlog](architechture/docs/backlog.md) và [Quy chuẩn thương hiệu](architechture/docs/Brand_Guidelines.md).
- [Hướng dẫn khởi động chi tiết](START.md) và [triển khai backend/VPS](deploy/backend/README.md).
- [Quy trình CI/CD trên GitHub Actions](.github/workflows/frontend-ci.yml): kiểm tra backend, frontend và Playwright cho pull request; đóng gói, triển khai từ nhánh `main` theo workflow.

## Người đóng góp

Dự án được phát triển bởi các thành viên trong nhóm Clucky (theo [bảng phân công công việc](architechture/docs/backlog.md)):

| STT | Thành viên |
| :--: | --- |
| 1 | Lê Phú Thịnh |
| 2 | Trần Đức Anh |
| 3 | Nguyễn Duy Quang Nhật |
| 4 | Mai Sơn Việt |
| 5 | Cao Tất Thành |
| 6 | Trần Nguyễn Hữu Khánh |

Lịch sử đóng góp mã nguồn được ghi nhận tại [GitHub Contributors](https://github.com/lethinh26/Clucky/graphs/contributors).

## Giấy phép

**Dự án hiện chưa công bố giấy phép sử dụng hoặc phân phối cho toàn bộ mã nguồn.** Nếu cần sử dụng, chỉnh sửa hoặc phân phối lại dự án, vui lòng liên hệ nhóm phát triển để được cho phép.
