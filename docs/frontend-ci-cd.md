# CI/CD frontend Clucky

Phạm vi: Next.js Customer và React/Vite Admin. Backend, PostgreSQL, Redis, Kafka và Gateway không được khởi động, build hoặc deploy bởi pipeline này.

## Trạng thái triển khai

Cấu hình CI/CD nằm trong repo. Push workflow lên `main` sẽ kích hoạt CI; CD chỉ hoạt động khi đặt repository variable `FRONTEND_CD_ENABLED=true` và hoàn tất cấu hình bên dưới. Khi chưa bật CD, pipeline vẫn chạy CI như trước. Việc push cấu hình không đồng nghĩa VPS đã được triển khai thành công.

VPS được khảo sát là `160.30.160.103`, SSH cổng `8686`, x86-64, 1 vCPU/2 GB RAM. Ngày 30/10/2026 đã phát hiện phiên SSH trái phép qua tài khoản có quyền sudo, binary giả tên shell, cron và launcher tự khởi động. Đã dừng các tiến trình và dọn dữ liệu theo yêu cầu, nhưng chưa cài lại hệ điều hành hoặc thu hồi mọi quyền/credential cũ. **Chỉ bật CD trên máy sạch sau khi xử lý quyền truy cập này; không dùng tài khoản deployer/devops cũ để cấp quyền cho pipeline.**

## Luồng chạy

1. Pull request hoặc push `main` thay đổi frontend, workflow hoặc `deploy/frontend/`: lint, unit test, production build cả hai app và Playwright với fixture hiện có.
2. Chỉ `main`, CI thành công và CD đã bật: build Docker image production trên GitHub-hosted runner; kiểm tra health từng image.
3. Lưu hai image thành GitHub Actions artifact với thời hạn 3 ngày. Không cần Docker Hub/GHCR token trên VPS.
4. Job `deploy` qua GitHub environment `frontend-production`, kiểm tra commit vẫn là đầu `main`, tải artifact và chuyển bằng SSH/SCP đã pin host key.
5. VPS kiểm tra SHA-256, load image, chạy riêng Compose project `clucky-frontend` và chờ health tối đa 120 giây.
6. Chỉ cập nhật symlink `current` sau khi cả hai container healthy. Khi lỗi activation, script khôi phục release trước; lần đầu thất bại thì dừng project frontend vừa tạo. Nếu rollback cũng lỗi, job báo thất bại để xử lý.

Release ID là `<commit SHA>-<run ID>-<run attempt của job đóng gói>`. Hai image nằm trong cùng một artifact theo release ID. Chạy lại toàn bộ workflow tạo release khác; chạy lại riêng job deploy dùng đúng artifact và tag đã đóng gói. Nếu lần deploy trước đã tạo thư mục release rồi mới lỗi, chọn **Re-run all jobs** để tạo release mới. Không dùng tag `latest`. Rollout thay container có thể gián đoạn ngắn; đây không phải triển khai zero-downtime.

Main workflow không bị cancel giữa chừng; các job deploy được tuần tự hóa. Workflow cũ không được deploy nếu `main` đã có commit mới. Pull request không nhận SSH secret hoặc chạy CD.

## Các file

| File | Mục đích |
|---|---|
| `.github/workflows/frontend-ci.yml` | CI và build/package/deploy frontend |
| `frontend/nextjs/Dockerfile` | Node 22, build standalone, runtime chạy user `node` |
| `frontend/react/Dockerfile` | Build Vite, serve static bằng Nginx không chạy root |
| `frontend/react/nginx.conf` | SPA fallback, cache asset và health endpoint |
| `deploy/frontend/compose.yml` | Hai container độc lập với backend, bind localhost |
| `deploy/frontend/deploy.sh` | Lock deployment, xác minh bundle, health và rollback |
| `deploy/frontend/nginx.conf.example` | Reverse proxy khi chưa có domain |
| `deploy/frontend/runtime.env.example` | Cổng nội bộ trên VPS |

`NEXT_STANDALONE=true` chỉ được đặt trong Docker build. Chạy `npm run build/start` tại máy và Playwright vẫn sử dụng Next.js build thông thường. Docker image chứa cả `public` và `.next/static`, gồm `logo_primary.png` và `favicon.png`.

## Cấu hình GitHub

Tạo environment **`frontend-production`**, giới hạn deployment từ `main`. Có thể đặt required reviewer nếu muốn duyệt mỗi lần deploy. SSH secrets có thể đặt ở repository hoặc environment này.

### Repository variables

| Variable | Giá trị / ý nghĩa |
|---|---|
| `FRONTEND_CD_ENABLED` | Ban đầu `false`; đặt `true` sau khi máy sạch và setup hoàn tất |
| `VPS_HOST` | IP hoặc hostname VPS sạch; chưa có domain có thể dùng IP |
| `VPS_PORT` | `8686`, hoặc cổng SSH thực tế của máy mới |
| `VPS_USER` | Ví dụ `clucky-ci`; dùng tài khoản mới riêng cho deployment |
| `VPS_WORKDIR` | `/opt/clucky`; frontend sử dụng thư mục con `/opt/clucky/frontend` |
| `FRONTEND_API_URL` | Để trống: browser gọi `/api/*` cùng origin, Nginx chuyển đến Gateway; hoặc URL gốc Gateway công khai, không thêm `/api` vào cuối |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Cấu hình Firebase client, tùy chọn nếu chưa dùng Google login |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |

`NEXT_PUBLIC_*` và `VITE_*` được đóng vào bundle tại build-time, là dữ liệu công khai. Không đặt App Password, Firebase service-account JSON, API secret hoặc JWT signing key vào các biến này. Đổi các giá trị public cần chạy lại pipeline; thay env trên container không thay bundle đã build. Production image luôn tắt `NEXT_PUBLIC_M3_DEMO_ENABLED`.

`VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_WORKDIR` đọc từ Variables trước, rồi Secrets nếu Variable trống. Cấu hình hiện có trong Repository Secrets dùng được, không cần chuyển chỗ. `VPS_WORKDIR` phải là đường dẫn tuyệt đối, không chứa khoảng trắng, đoạn `.`/`..` hoặc dấu `/` cuối. Các ví dụ VPS bên dưới dùng `/opt/clucky`; nếu đổi thư mục thì sửa đường dẫn tương ứng và truyền `VPS_WORKDIR` khi rollback thủ công.

### Repository hoặc environment secrets

| Secret | Giá trị |
|---|---|
| `VPS_SSH_KEY` | Private key deployment mới, đúng authorized key của tài khoản deployment |
| `VPS_KNOWN_HOSTS` | Dòng known_hosts đã xác minh cho `[HOST]:8686`; vẫn hỗ trợ tên cũ `FRONTEND_SSH_KNOWN_HOSTS` |

Xác minh fingerprint host key qua console của nhà cung cấp hoặc kênh tin cậy trước khi lưu known_hosts. Workflow không dùng `StrictHostKeyChecking=no` và không tự tin khóa mới chỉ từ `ssh-keyscan`.

SSH key chỉ nằm tạm trên GitHub runner và được xóa trong bước `always()`. VPS chỉ nhận image, Compose và script; không nhận GitHub token/registry password. Không đưa khóa SSH vào repo.

## Chuẩn bị VPS sạch một lần

Các lệnh dưới đây là hướng dẫn cho operator, chưa được thực thi tự động bởi lần sửa repo này. Cần Docker Engine, Docker Compose có `up --wait`, Bash, `flock`, `sha256sum`, Nginx và dung lượng trống đủ cho image hiện tại + release trước + archive đang truyền.

Sau khi cài hệ điều hành sạch và Docker từ nguồn chính thức, tạo tài khoản triển khai mới:

```bash
sudo adduser --disabled-password --gecos '' clucky-ci
sudo usermod -aG docker clucky-ci
sudo install -d -o clucky-ci -g clucky-ci -m 0750 /opt/clucky/frontend
sudo install -d -o clucky-ci -g clucky-ci -m 0750 /opt/clucky/frontend/incoming /opt/clucky/frontend/releases
sudo install -d -o clucky-ci -g clucky-ci -m 0700 /home/clucky-ci/.ssh
# Operator thêm public key deployment mới vào authorized_keys, quyền 0600, owner clucky-ci.
# Không dùng private key trong các lệnh/document này.
```

Quyền nhóm Docker tương đương quyền quản trị máy; chỉ cấp cho tài khoản deployment tin cậy. Không dùng runner tự host trên VPS này. Đăng nhập lại để quyền nhóm có hiệu lực; đảm bảo user chạy được `docker info` không cần sudo/password tương tác.

Chép `deploy/frontend/runtime.env.example` thành `/opt/clucky/frontend/runtime.env`:

```dotenv
CUSTOMER_PORT=3000
ADMIN_PORT=3001
```

Owner file là `clucky-ci`, quyền `0640`. File được Compose đọc trực tiếp, không được shell `source`. `release.env` của mỗi release chỉ chứa tag image. Nếu đổi hai cổng này phải sửa upstream Nginx tương ứng.

Chép `deploy/frontend/nginx.conf.example` vào `/etc/nginx/sites-available/clucky-frontend`, tạo symlink trong `sites-enabled` và tắt default site nếu trùng listener/server mặc định. Operator kiểm tra và bật Nginx:

```bash
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
sudo ufw allow 80/tcp
sudo ufw allow 8081/tcp
```

Giữ rule SSH 8686 đang dùng; không reset firewall. Pipeline chỉ thay container, không tự sửa Nginx/UFW/SSH hay triển khai backend.

## Địa chỉ khi chưa có domain

- Customer: `http://VPS_IP/` → host Nginx → `127.0.0.1:3000` → Next.js.
- Admin: `http://VPS_IP:8081/` → host Nginx → `127.0.0.1:3001` → React static.
- `/api/*` trên cả hai origin → Gateway tại `127.0.0.1:8080`, giữ nguyên URI `/api/...`.

Gateway hiện chưa được pipeline này triển khai nên API sẽ trả lỗi upstream cho đến khi backend sẵn sàng. Login, checkout và dữ liệu nghiệp vụ cần Gateway không được coi là hoạt động chỉ vì frontend healthy. Healthcheck chỉ xác nhận server frontend phục vụ tài nguyên; không cần backend hoặc database.

HTTP bằng IP dành cho xem UI ban đầu, không nhập credential thật. Google popup/Firebase cần origin/domain hợp lệ; cấu hình authorized domains và HTTPS khi có domain trước khi nghiệm thu Google login.

Khi có domain, đổi `server_name` cho hai server, cho Admin nghe cổng 80 thay 8081 với tên miền riêng, cấu hình chứng chỉ TLS/HTTPS cho từng domain và đóng public 8081. Hai port container 3000/3001 vẫn chỉ bind loopback. API cùng origin có thể tiếp tục giữ `FRONTEND_API_URL` trống.

## Bật và vận hành

1. Chuẩn bị máy sạch, tài khoản/key mới, known_hosts, runtime.env và Nginx như trên.
2. Điền repository variables và environment secrets. Đặt `FRONTEND_CD_ENABLED=true`.
3. Sau khi người dùng chủ động push/merge workflow vào `main`, workflow chạy khi có thay đổi đúng path. Hoặc chọn **Actions → Frontend CI/CD → Run workflow → main**.
4. CI thất bại thì không package/deploy; image không healthy thì không upload release; deploy lỗi không đánh thành công.

Theo dõi container của release hiện tại trên VPS:

```bash
cd /opt/clucky/frontend/current
docker compose -p clucky-frontend --env-file /opt/clucky/frontend/runtime.env --env-file release.env -f compose.yml ps
docker compose -p clucky-frontend --env-file /opt/clucky/frontend/runtime.env --env-file release.env -f compose.yml logs --tail 100
```

Rollback thủ công về release thành công trước đó, không rebuild/pull:

```bash
VPS_WORKDIR=/opt/clucky bash /opt/clucky/frontend/current/deploy.sh rollback
```

Image cũ được giữ để rollback; archive truyền `.tar.gz` được xóa sau thành công. Theo dõi disk định kỳ. Khi cần dọn, xác định ID `current` và `previous`, chỉ xóa image `clucky-customer:<ID>` / `clucky-admin:<ID>` và thư mục release cũ khác hai ID đó. Không chạy `docker system prune -a --volumes` trên máy có backend/database.

## Tài liệu tham chiếu

- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Docker Compose up và --wait](https://docs.docker.com/reference/cli/docker/compose/up/)
- [GitHub upload-artifact](https://github.com/actions/upload-artifact/tree/v4)
- [Nginx official image tags](https://github.com/docker-library/official-images/blob/master/library/nginx)
