# Google + email — BE-76 / INT-74

Cập nhật 05/11/2026. Code đã bổ sung, chưa chạy test/build/typecheck/lint hoặc nghiệm thu Firebase/local/VPS. Người dùng xác nhận đã điền ba biến public Next.js; tài liệu này không xác nhận credential backend đã sẵn sàng.

## 1. Quy tắc đã triển khai

- Google mới: ID token → pending Redis 10 phút → đặt mật khẩu Clucky một lần → tạo CUSTOMER và phiên đăng nhập. Trước complete không có user/JWT/refresh cookie.
- Google quay lại: đăng nhập thẳng. Email login dùng chính mật khẩu đã đặt; Google không yêu cầu mật khẩu Clucky.
- Email-first đã verify OTP: link UID và đăng nhập cùng userId, giữ hash/profile/order/points; không đặt lại mật khẩu.
- Email chưa verify phải hoàn tất xác minh email hiện có trước; không tự link hoặc tự reset password. LOCKED, non-CUSTOMER và liên kết UID xung đột bị từ chối.
- Migration V4 chỉ thêm firebase_uid UNIQUE nullable. Giữ password_hash NOT NULL và phone nullable; không reset DB hoặc sửa migration đã áp dụng.
- Giới hạn Google login 10 lần mỗi UID/60 giây; Redis GETDEL bảo đảm token complete dùng một lần. Lỗi DB/mất response: bắt đầu Google lại, không gửi lại password với token đã dùng. Unique email/uid chặn tạo trùng.
- Avatar Google không được tự tải về hoặc ghi đè ảnh tài khoản. Tài khoản mới dùng avatar mặc định; profile hiện có giữ nguyên.

## 2. Firebase Console

1. Dùng cùng Firebase project với ba biến đã đặt trong Next.js.
2. Authentication → Sign-in method → bật Google, chọn support email khi console yêu cầu.
3. Authentication → Settings → Authorized domains: thêm localhost và hostname frontend production (không nhập scheme/path). Dùng HTTPS cho production.
4. Project settings → Service accounts → Generate new private key. Lưu JSON ngoài repository, chỉ process Identity được đọc. Không dán nội dung vào chat, terminal output hoặc Git.
5. Không đặt FIREBASE_AUTH_EMULATOR_HOST: implementation từ chối auth emulator khi bật Firebase để không nhận token unsigned.

Backend dùng Firebase Admin 9.11.0, `verifyIdToken(idToken, true)` để kiểm tra token và revocation/disabled user, cộng kiểm Google provider/verified email. Credential cần quyền đọc Firebase Authentication phù hợp; backend cần HTTPS outbound tới Google. Không cấu hình Firebase password provider hoặc tạo bản ghi password trong Firebase; password thuộc PostgreSQL Clucky.

Nguồn: [Firebase Google Sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Admin setup](https://firebase.google.com/docs/admin/setup), [verify ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Firebase Admin Java](https://github.com/firebase/firebase-admin-java).

## 3. Local — PowerShell

Không cần thay lại các biến Next.js đã điền. Backend cần ba biến riêng trước khi khởi động Identity:

```powershell
$env:FIREBASE_AUTH_ENABLED = "true"
$env:FIREBASE_PROJECT_ID = "<cung-project-id-voi-nextjs>"
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\private\clucky\firebase-service-account.json"
$env:AUTH_ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:5173"
$env:AUTH_COOKIE_SECURE = "false"
```

Giá trị trong dấu <> và đường dẫn là placeholder, phải thay bằng cấu hình của bạn. Không đặt credential file trong frontend hoặc image build context. `backend/.env.example` có tên biến; `.env` không tự được Spring đọc, runner phải nạp chúng vào môi trường của process Identity. Khi chạy IDE, đặt vào Run Configuration hoặc khởi động IDE/process từ môi trường đã export.

Theo thứ tự startup hiện có: infrastructure → Config Server → Eureka → Identity và các service cần dùng → Gateway → Next.js. Từ thư mục backend, người dùng có thể chạy `./gradlew.bat :identity-service:bootRun` khi đã có prerequisite và các biến DB/JWT/Redis/Kafka hiện có. Không tự chạy lệnh này trong lượt triển khai.

FIREBASE_AUTH_ENABLED=false mặc định: email auth vẫn hoạt động, Google trả 503; không có mock success. Khi bật nhưng project/credential sai, sửa cấu hình và khởi động lại Identity; không bỏ xác thực để vượt lỗi.

## 4. VPS / GitHub

- Frontend workflow hiện lấy NEXT_PUBLIC_FIREBASE_API_KEY/AUTH_DOMAIN/PROJECT_ID từ Repository Variables và đưa vào build args. Đây là public web config, không phải server private key. Các giá trị local không tự đi lên VPS; điền Variables rồi rebuild/deploy frontend theo workflow hiện có.
- Workflow **Clucky full-stack CI/CD** giờ tự provision Firebase, build/deploy Identity cùng toàn bộ backend/hạ tầng và hai frontend. Cần thêm BACKEND_ENV_JSON theo [hướng dẫn full-stack](../../deploy/backend/README.md); không cần chạy provision riêng trước.
- Workflow riêng `.github/workflows/firebase-secret.yml` tên **Provision Firebase credential on VPS** vẫn có để rotate thủ công qua Actions → Run workflow (chỉ main), không chạy tự động trên push. Workflow riêng chỉ provision secret, không restart Identity; cả hai workflow dùng chung concurrency để không ghi secret giữa lúc deploy.
- Tại GitHub → Settings → Secrets and variables → Actions → New repository secret: tạo **FIREBASE_SERVICE_ACCOUNT_JSON**, value là toàn bộ nội dung file JSON (từ `{` đến `}`), không phải tên file/đường dẫn, không base64. Không gửi nội dung vào chat.
- Dùng lại VPS_SSH_KEY và VPS_HOST/VPS_PORT/VPS_USER/VPS_WORKDIR. Nên dùng repository scope để cả workflow chính (environment frontend-production) và workflow provision riêng (backend-production) cùng truy cập. Các environment scope không tự chia sẻ biến/secret; đặt approval rules phù hợp.
- Thêm secret **VPS_SSH_KNOWN_HOSTS** chứa dòng known_hosts của VPS đã xác minh qua phiên SSH tin cậy hoặc console nhà cung cấp. Với port khác 22, entry có dạng `[hostname]:port ssh-ed25519 ...`. Không dùng private key của VPS hay tự tin kết quả ssh-keyscan chưa xác minh. Job gửi private credential nên bật StrictHostKeyChecking=yes, không tự chấp nhận host lạ.
- VPS cần Python 3.9+, thư mục VPS_WORKDIR tồn tại và SSH user có quyền ghi. Workflow tạo `$VPS_WORKDIR/secrets/firebase-service-account.json` và `firebase.env`, thư mục mode 0700, file 0600, owner là SSH user. JSON lỗi bị từ chối, ghi qua file tạm rồi thay nguyên tử từng file; credential cũ không bị ghi dở. Rotation cùng project được hỗ trợ, đổi project phải chuẩn bị migration riêng.
- Project ID được lấy từ JSON; không cần thêm secret FIREBASE_PROJECT_ID riêng cho bước provision. Đảm bảo NEXT_PUBLIC_FIREBASE_PROJECT_ID trên frontend cùng project. Khi đổi giá trị GitHub Secret, bấm Run workflow vì thay secret không tự tạo push event.
- Identity process/container nhận FIREBASE_AUTH_ENABLED=true, FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS. Nếu container, mount file read-only và đặt GOOGLE_APPLICATION_CREDENTIALS thành đường dẫn **bên trong container**, không phải đường dẫn host.

Ví dụ đoạn cấu hình ghép vào service Identity trong deployment backend của bạn, không phải một compose stack hoàn chỉnh:

```yaml
environment:
  AUTH_COOKIE_SECURE: "true"
  AUTH_ALLOWED_ORIGINS: https://<customer-domain>
env_file:
  - /opt/clucky/secrets/firebase.env
volumes:
  - /opt/clucky/secrets/firebase-service-account.json:/run/secrets/firebase-service-account.json:ro
```

Giữ Config Server/Eureka và DB/JWT/Redis/Kafka config hiện có, Gateway là entrypoint. Dùng frontend và Gateway cùng site qua reverse proxy HTTPS để cookie SameSite=Lax hoạt động; domain cross-site cần thiết kế cookie/CORS riêng, không tự chuyển sang SameSite=None.

Thay `/opt/clucky` nếu VPS_WORKDIR khác. Mode 0600 không cho container user bất kỳ đọc; dùng đúng runtime UID/owner hoặc provision quyền phù hợp, không chmod 644/777 private key. Sau rotation phải recreate Identity để bind mount nhận inode mới và SDK nạp key mới; workflow full-stack làm việc này bằng release image tag mới, workflow provision riêng không làm. Nếu chạy JAR trực tiếp, override GOOGLE_APPLICATION_CREDENTIALS thành đường dẫn host trước khi khởi động.

Self-check stdlib cho người dùng: `python deploy/identity/test_firebase_secret.py` (chưa chạy). Chưa commit/push, chưa chạy GitHub Actions hoặc truy cập VPS trong lượt thêm workflow.

## 5. Hành vi lỗi cần biết

| Kết quả | Xử lý |
|---|---|
| 503 DEPENDENCY_UNAVAILABLE | Kiểm tra cấu hình backend, kết nối Redis/Google và quyền service account, không chỉ env Next.js. |
| 401 EMAIL_NOT_VERIFIED | Tài khoản email cũ chưa hoàn tất OTP. Không tạo user Google khác, không link vào mật khẩu chưa xác minh. |
| 401 UNAUTHENTICATED | Google token không hợp lệ, sai provider/project, hết hạn/revoked hoặc Firebase user disabled. |
| 401 TOKEN_REVOKED ở complete | Pending hết hạn/đã dùng; bấm Google lại. |
| 409 EMAIL_EXISTS/RESOURCE_CONFLICT | Không đổi mật khẩu/link UID đang thuộc tài khoản khác. Bắt đầu Google lại với đúng account; không sửa DB để bỏ unique constraint. |
| Complete 5xx/lỗi mạng | Có thể DB chưa commit hoặc đã commit nhưng mất response. Bấm Google lại; nếu đã tạo account sẽ đăng nhập ngay. |
| 403 FORBIDDEN ở tất cả request Google | Kiểm tra Origin/Referer, AUTH_ALLOWED_ORIGINS và role tài khoản. Không tắt CSRF để sửa. |

## 6. Người dùng tự kiểm thử

Các lệnh dưới đây chỉ là hướng dẫn, **chưa được agent chạy**:

```powershell
# Từ backend
./gradlew.bat :identity-service:test --tests "*GoogleAuthServiceTest" --tests "*FirebaseIdentityVerifierTest" --tests "*AuthControllerCookieTest" --tests "*CsrfOriginFilterTest"
# Từ frontend/nextjs
node --test tests/api.test.mjs
```

UI fixture regression nằm trong tests/ui/m4.spec.ts, chạy bằng Playwright hiện có sau khi người dùng chuẩn bị build cho hai frontend. Đây là fixture, không phải Firebase E2E thật.

| Ca kiểm chứng thật trên cả local và VPS | Kỳ vọng |
|---|---|
| Google mới, thoát trước khi đặt mật khẩu | Chưa tạo users/phiên. |
| Google mới → complete → logout → Google lại | Một user; lần sau không hiện form mật khẩu. |
| Sau Google registration → email/password | Đăng nhập cùng userId với mật khẩu đã đặt; sai mật khẩu bị từ chối. |
| Email registration + OTP → Google → email lại | Một userId; password_hash và hồ sơ cũ giữ nguyên. |
| Pending hết hạn/submit hai lần/hai tab | Không tạo trùng; token đã dùng bị từ chối. |
| Complete cạnh tranh email registration/mất response/DB rollback | Không overwrite; bấm Google lại phục hồi an toàn. |
| LOCKED, non-CUSTOMER, email chưa verified, token lỗi/sai project | Từ chối, không link/cấp phiên ngoài phạm vi. |
| Refresh/logout/reset password | Refresh HttpOnly, đúng Secure/SameSite/Path; reset ảnh hưởng email password nhưng Google vẫn là cùng account. |
| Log/API/frontend/network | Không private key, raw password, pending token hoặc ID token trong log/URL; credential chỉ nằm trong request body TLS hoặc runtime secret phù hợp. |

Lưu evidence đã lọc PII/secret kèm commit/môi trường và kết quả từng ca. Không đánh BE-76/INT-74 DONE chỉ từ code hoặc test mock.
