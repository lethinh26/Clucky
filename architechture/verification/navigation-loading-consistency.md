# Loading toàn frontend — bàn giao triển khai

- Ngày: 29/10/2026.
- Nhánh: `codex/navigation-loading-consistency`, base `96735a7`.
- Phạm vi: [kế hoạch đã chốt](../plans/navigation-loading-consistency.md), mở rộng [spec gốc](../specs/navigation-loading-consistency.md) sang cả Next.js Customer và React Admin/Manager/Staff.
- Trạng thái lúc bàn giao mã: regression test đã viết; **chưa chạy nghiệm thu tự động tại máy**.
- Phản hồi tiếp theo ngày 29/10/2026: người dùng đã trải nghiệm và xác nhận “quá mượt”, đồng thời yêu cầu commit, push, tạo PR và tự merge. Trạng thái CI/merge được ghi tại PR; phản hồi này không thay thế toàn bộ ma trận kiểm thử bên dưới.

## Thay đổi

### Vòng đời và trình bày chung

Hai frontend giữ module riêng để chạy/build độc lập, cùng contract `loading-store`/`loading-surface`:

- Mỗi nguồn chờ sở hữu một token và hàm kết thúc idempotent; callback cũ chỉ giải phóng token của nó. Subscriber chỉ cập nhật khi boolean pending thay đổi.
- Chỉ hiện overlay sau 180 ms. Hủy timer khi công việc kết thúc; bỏ timer kết thúc 250 ms và timeout giả định router đã xong.
- Bỏ backdrop blur. Spinner/progress dùng CSS transform; không cập nhật phần trăm bằng interval hoặc render toàn shell theo frame.
- Portal phủ phần nội dung giao với visual viewport, trừ header/footer/sidebar/menu di động. Căn tâm theo viewport, clamp và dùng thẻ gọn khi thiếu chỗ. Scroll/resize/ResizeObserver chỉ yêu cầu một lần đo trong frame và có cleanup.
- `aria-busy` và `inert` áp dụng từ lúc pending; chuyển focus ra khỏi nội dung và phục hồi khi còn hợp lệ. Chỉ một status cấp trang; hỗ trợ reduced motion.

### Next.js Customer

- Native `Link` vẫn điều khiển prefetch, scroll, cancellation và modifier/target/download semantics. Wrapper dùng public `onNavigate` + `useLinkStatus`; programmatic push/replace dùng transition.
- Theo dõi Back/Forward bằng canonical pathname/query, bỏ qua fragment và khác biệt mã hóa query tương đương. Task history kết thúc theo commit, error hoặc điều hướng thay thế.
- `app/loading.tsx` đăng ký vào cùng store; thông báo SSR bàn giao cho presenter sau hydration. `app/error.tsx` giải phóng trạng thái chờ và cung cấp retry.
- Các Link và push/replace Customer dùng adapter; root shell dùng `NavigationContent`. Giỏ hàng nổi ẩn trong lúc pending, loading không còn nằm trong `OrderProvider`.
- Cart/checkout/orders/order detail đăng ký hydration workspace vào cùng vùng tải, bỏ thông báo tải cấp trang trùng.
- Login/register/Google/OTP/password reset bỏ qua response sau unmount; timer redirect được vô hiệu hóa khi rời trang hoặc thử lại.
- Khai báo Next tối thiểu `^15.5.28` để khớp API public đang dùng và phiên bản đã có trong lockfile; không đổi resolved version hoặc nâng major.

### React Admin/Manager/Staff

- Store có phạm vi pathname/query/role/store; Outlet được remount theo phạm vi để dọn request, modal và timer cũ, trong khi shell vẫn giữ trạng thái sidebar.
- BrowserRouter và các route đồng bộ giữ điều hướng tức thì, không tạo loading giả khi URL thay đổi.
- Users initial request tham gia page loader; refresh chỉ tải bảng. AbortController chặn stale response và hủy request/list/action khi rời scope. Gateway URL và quyền truy cập giữ nguyên.
- Orders/Staff Orders dùng trạng thái khôi phục workspace thật. AdminTable phối hợp với page loader để tránh status và animation trùng.
- Modal đang submit khóa các đường đóng/cancel; auth và export demo dọn callback muộn. Export vẫn là demo hiện có, chưa phải tính năng xuất file thật.

## Regression đã thêm (chưa chạy)

- Unit test cho token ownership, callback lặp/cũ, reset, subscription; Next có canonical query/hash.
- Component fixture chạy presenter/provider thật: công việc 60 ms, A→B, ba viewport, scroll, focus/inert, reduced motion và không blur.
- Playwright trên router Customer thật: RSC chậm, kết thúc không hiện lại, điều hướng thay thế từ header/menu mobile, canceled link, hash history, cached query Back/Forward và reload.
- Playwright React: Users initial/refresh/error/leave, role switch giữa request, modal action cục bộ, synchronous navigation theo ba role và 403.
- Playwright auth: rời form sau thành công không bị timer redirect kéo về trang cũ.
- Test thu frame timing tại fixture: idle/loading/scrolling × ba lượt, xuất `loading-performance.json` (FPS, p95, frame >34 ms, long tasks và raw samples). Không gate CI bằng FPS tuyệt đối; fixture không thay thế profile production trên trang Customer nặng.
- Bộ auth/payment/order/Axe cũ được giữ lại. Workflow build cả hai app trước UI test; dùng Next production server + Vite preview. Fixture mock chỉ dành cho component/Google/payment; không dùng fixture navigation để chứng minh router Customer.

## Đã thực hiện và còn chờ

Đã rà mã nguồn/call site, định dạng các module mới, kiểm tra whitespace bằng `git diff --check`. GitNexus đã reindex workspace bằng `gitnexus analyze --force --index-only`; không ghi đè AGENTS/CLAUDE/skills. Đây là kiểm tra tĩnh và index, **không phải bằng chứng test pass**.

Theo quy định Verification trong `AGENTS.md`, agent chưa chạy lint, unit test, typecheck, build, Playwright, đo FPS hoặc bật Docker/backend tại máy. CI tự chạy theo workflow khi PR được tạo; xem kết quả thực tế tại PR. Ma trận AC-01…AC-22 chưa được nghiệm thu đầy đủ; đặc biệt:

1. P0: contract native router/transition/fallback đã được đối chiếu source phiên bản cài và viết test, nhưng chưa được xác nhận bằng chạy router thật sau sửa. Việc migration đã được viết theo yêu cầu triển khai; checkpoint thực nghiệm chưa đạt.
2. P1/P2: kiểm tra cold SSR/streaming, fallback suspend, aborted route/chunk error, redirect/not-found và ba điều hướng liên tiếp. Các test mới không bao phủ hết các biến thể này.
3. P3/P4: kiểm tra role/store scope, sidebar collapse/mobile drawer, local action error/retry và export timer khi đổi trang; regression mới chỉ bao phủ một phần ma trận.
4. P5: chạy bộ hiện có cùng regression; đo A/B cùng máy/viewport/browser và profile production trên trang dài. Không dùng kết quả chẩn đoán bản cũ để tuyên bố bản mới đạt 60 FPS.
5. Accessibility/geometry: kiểm tra thêm cuối trang/footer clamp, resize, zoom/bàn phím mobile làm đổi visual viewport, hit-test shell và screen reader thực. Ba viewport headless không thay thế thiết bị thật.

Khi người dùng yêu cầu kiểm thử: dùng Node 22, `npm ci`, `npm run lint`, `npm test`, `npm run build` trong từng frontend; sau đó `npx --no-install playwright install chromium` và `npm run test:ui` trong `frontend/nextjs`. Dừng Next dev trước build cùng checkout để tránh dùng chung `.next`; không cần Docker/backend cho bộ test mock này. Chỉ đánh dấu nghiệm thu sau khi có kết quả thực tế và xử lý các lỗi phát hiện được.
