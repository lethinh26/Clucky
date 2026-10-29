# Kế hoạch sửa loading trên toàn bộ frontend Clucky

- Ngày: 29/10/2026.
- Mốc khảo sát: `main`, commit `96735a7`.
- Trạng thái: **ĐÃ VIẾT BẢN TRIỂN KHAI — CHỜ KIỂM THỬ/NGHIỆM THU**.
- Yêu cầu cập nhật: người dùng đã cho phép triển khai cả Next.js Customer và React quản trị ngày 29/10/2026. Theo `AGENTS.md`, chưa chạy test/lint/typecheck/build hoặc kiểm thử trình duyệt khi chưa có yêu cầu rõ.
- Bàn giao triển khai và các checkpoint còn chờ: [navigation-loading-consistency](../verification/navigation-loading-consistency.md). Nội dung bên dưới giữ nguyên kế hoạch và tiêu chí nghiệm thu; không coi các điều kiện hoàn tất là đã đạt.
- Nguồn: `architechture/specs/navigation-loading-consistency.md`, source hiện tại và kết quả chẩn đoán trình duyệt ngày 29/10/2026.
- Phạm vi React trong tài liệu này mở rộng phạm vi Next.js của spec nháp theo yêu cầu mới. Giữ nguyên spec gốc để lưu lịch sử; không coi các mục “chưa mở rộng React” trong bản nháp là phạm vi của kế hoạch mới.

## 1. Mục tiêu và giới hạn

Một công việc chờ thực sự có một trạng thái tải đúng vòng đời, mượt, nhìn thấy được và phù hợp phạm vi tác vụ. Cả hai ứng dụng dùng cùng quy tắc UX, nhưng có bộ tích hợp router riêng và tiếp tục chạy/build độc lập.

Các kết quả cần đạt:

1. Không có overlay hiện sau khi trang đích đã sẵn sàng; không có hai thẻ loading cấp trang cho cùng điều hướng.
2. Loading không bị kẹt hoặc bị timer của điều hướng cũ đóng nhầm.
3. Thẻ loading nằm trong visual viewport; header/footer/sidebar tiếp tục sử dụng được.
4. Loại bỏ nguyên nhân lag đã kiểm chứng và tránh thêm công việc render mỗi frame.
5. Tải bảng, nút, modal và báo cáo giữ phạm vi phù hợp; không biến mọi request thành khóa toàn trang.
6. Bao phủ Customer, Admin, Store Manager, Staff và các màn hình xác thực của hai ứng dụng.

Không đổi API/backend, RBAC, `storeId`, nghiệp vụ đơn hàng/thanh toán, cấu hình hạ tầng hoặc nhận diện thương hiệu. Không xây tính năng export báo cáo thật trong task loading. Không thay router, nâng major framework, thêm package chia sẻ xuyên frontend hoặc thư viện animation chỉ để thực hiện kế hoạch này. Không tự publish/deploy/push từ yêu cầu lập kế hoạch.

## 2. Bằng chứng và hiện trạng

### 2.1. Next.js: lỗi đã tái hiện

| Vấn đề | Bằng chứng khảo sát | Điểm liên quan |
| --- | --- | --- |
| Lag do lớp blur | Trên `/menu` 1440×900: nguyên bản khoảng 17–25 FPS; chỉ tắt backdrop blur trở về khoảng 60 FPS. Khi cuộn: khoảng 15 FPS → 60 FPS. Đã lặp A/B. | `components/ui-loader/navigation-loader.module.css`, overlay phủ toàn chiều cao nội dung với `backdrop-filter: blur(4px)`. |
| Loading hiện lại | Một lượt: fallback route ở 132 ms, nội dung ở 169 ms, overlay mới bật ở 253 ms, tắt ở 399 ms. Các lượt route đã nóng cũng tái hiện. | Timer hiện 180 ms và timer kết thúc 250 ms đang tác động trên cùng `isLoading`. |
| Timer cũ đóng điều hướng mới | Request RSC của B vẫn bị giữ, URL còn ở A nhưng progress và overlay đã tắt. | Timer kết thúc không được quản lý trong `clearTimers()`. |
| Back fragment bị kẹt | Chỉ thay fragment trên `/menu`, overlay tồn tại đến khoảng 8.278 ms. | Listener `popstate` luôn start; watcher chỉ so pathname/query; guard 8 giây cộng delay kết thúc. |
| Điều hướng bị hủy vẫn loading | `preventDefault()` tại link giữ nguyên URL nhưng overlay vẫn bật. | Listener click ở capture phase chạy trước handler hủy. |
| Thẻ nằm ngoài màn hình | Desktop: lệch tâm dọc khoảng 767 px. Cũng sai ở 390×844 và 844×390, đầu/giữa/cuối trang. | Absolute overlay, flex center theo container. |
| Lớp phủ sai tương tác | Khi cuộn overlay che header; giỏ hàng nổi vẫn nhận pointer; nội dung bị phủ vẫn nhận focus. | Header z-index 30, overlay 40, giỏ hàng nổi 45; chưa vô hiệu hóa tương tác nội dung. |
| Giảm chuyển động chưa áp dụng | Emulate `prefers-reduced-motion: reduce`, vòng xoay vẫn chạy. | CSS loading thiếu override. |

Đây là số liệu Chromium headless trên dev server hiện có, không phải cam kết FPS trên mọi máy hay số liệu production. Chi phí re-render do context/progress là rủi ro nhận diện từ code, chưa được profiler chứng minh là nguyên nhân chính.

### 2.2. React: hiện trạng khảo sát source

- `src/App.tsx` dùng `BrowserRouter`, `Routes`, các page được import sẵn; chưa có điều phối loading route tương đương Next.js.
- Không được đưa `useNavigation()` của Data Router trực tiếp vào cấu trúc này. Không đổi sang Data Router chỉ để có spinner.
- `AdminLayout` giữ header/sidebar và `Outlet`; menu chủ yếu dùng `navigate()`. `ProtectedRoute` trả giao diện 403 khi thiếu quyền.
- `UsersPage` có request thật qua Gateway; có tải ban đầu, refresh bảng, khóa/mở khóa và gán chi nhánh.
- `OrderContext` khôi phục workspace từ localStorage; Orders/Staff Orders đang dùng loading/skeleton cục bộ.
- Auth sử dụng loading của nút/form. Một số màn hình giữ thông báo thành công 800/1200 ms trước điều hướng; thời gian đọc thông báo không được báo thành route đang tải.
- Reports hiện mô phỏng xuất báo cáo bằng toast và timer 1200 ms. Giữ ranh giới demo và phạm vi toast; không nâng thành overlay toàn trang.
- Các trang còn lại phần lớn dùng dữ liệu mock có sẵn. Không thêm thời gian chờ giả cho thao tác đồng bộ.

### 2.3. Kiểm thử hiện có

CI đã có lint, unit test và build cho cả hai frontend, cùng Playwright cho auth/payment/order. Chưa có assertion về vòng đời, vị trí hoặc hiệu năng navigation loader. Bộ Playwright hiện dùng Next.js production server, React dev server và fixture server; fixture Google auth có mock `next/navigation`, không đủ để kiểm chứng điều hướng thật.

## 3. Quy tắc loading thống nhất

| Phạm vi | Khi áp dụng | Cách hiển thị | Vùng bị chặn |
| --- | --- | --- | --- |
| Điều hướng/trang | Router thật đang chờ hoặc dữ liệu thiết yếu đầu trang chưa có | Một thẻ loading và progress mảnh, có ngưỡng 180 ms | Nội dung đích đang chờ, gồm các phần tử nổi thuộc nội dung đó |
| Khu vực dữ liệu | Refresh, lọc, phân trang hoặc tải một bảng | Skeleton/spinner trong khu vực, trạng thái lỗi tại khu vực | Khu vực đang cập nhật; giữ điều hướng chung |
| Hành động | Submit auth, lưu modal, khóa tài khoản, thao tác thanh toán | Loading trên nút/form hoặc modal tương ứng | Nút và các trường cần ngăn gửi lặp |
| Tác vụ nền | Refetch khi đã có dữ liệu, toast xuất báo cáo demo | Chỉ báo không chặn nếu cần | Không khóa trang |
| Điều hướng đồng bộ/cache nóng | Nội dung sẵn sàng trước 180 ms | Không dựng thẻ loading | Không kéo dài thời gian chờ |

Quy tắc chung:

- Chỉ bắt đầu loading khi router/tác vụ đã chấp nhận công việc. Không suy đoán từ mọi click hay mọi request mạng.
- Khi xong, mở tương tác ngay ở lần commit giao diện tiếp theo. Không giữ nội dung thêm 250 ms vì animation kết thúc progress.
- Giữ ngưỡng 180 ms để chống nhấp nháy; không đặt minimum display time cho overlay chặn nội dung.
- Một lần chuyển trang có tối đa một thẻ/status cấp trang. Loading cục bộ không tạo thêm thông báo trùng cho chính công việc đang được thẻ cấp trang đại diện.
- Không spinner cấp trang cho cùng URL, hash-only, link ngoài, download, modifier-click, target khác cửa sổ hiện tại hoặc điều hướng bị hủy.
- Không coi guard hết thời gian là thành công. Công việc chậm phải có trạng thái rõ và đường thoát/chọn route khác; request lỗi hiển thị lỗi hoặc fallback dữ liệu theo hành vi sản phẩm hiện có.

## 4. Thiết kế vòng đời và tín hiệu router

### 4.1. Mô hình tối thiểu

Tách ba việc độc lập:

1. **Công việc chờ:** định danh điều hướng hiện hành và các nguồn chờ thuộc lần đó.
2. **Hiển thị:** ngưỡng 180 ms, vùng bị chặn, status và thông báo.
3. **Animation:** progress indeterminate và fade kết thúc; không được điều khiển trạng thái công việc.

Mỗi lần điều hướng có generation/token riêng. Mỗi nguồn chờ giữ một handle hoàn tất/hủy đúng tác vụ của mình; gọi kết thúc hai lần phải an toàn. Callback của generation cũ không được thay đổi generation mới.

| Trạng thái | Điều kiện | Chuyển tiếp |
| --- | --- | --- |
| `idle` | Không có công việc blocking hiện hành | Router/tác vụ chấp nhận → `pending-hidden` |
| `pending-hidden` | Có công việc, chưa qua 180 ms | Xong → `idle`; còn chờ qua ngưỡng → `pending-visible` |
| `pending-visible` | Có công việc và đã hiện thẻ | Xong/hủy/lỗi được xử lý → ngừng blocking ngay; điều hướng mới → thay owner hợp lệ |
| Progress đang kết thúc | Chỉ là trạng thái trình bày riêng | Callback chỉ được dọn animation đúng generation; không bật/tắt overlay |

Khi A được B thay thế: hủy timer hiển thị/kết thúc của A, vô hiệu hóa handle A, chuyển quyền sở hữu sang B. Không chớp tắt thẻ nếu B vẫn đang chờ và thẻ đã hiện. Khi unmount: hủy timer, listener và callback đo viewport.

Không để progress tạo object context mới cho toàn bộ shell mỗi 200 ms. Ưu tiên CSS `transform`/`opacity`, progress indeterminate không phần trăm ngẫu nhiên. Nếu giữ state animation, đặt ở component progress riêng. Tách loading khỏi `OrderProvider`; giỏ hàng/đơn hàng không làm bộ điều phối router.

### 4.2. Next.js App Router

- Giữ provider tại root layout và shell hiện tại. Giữ khả năng server-render, SEO, prefetch, scroll mặc định của Next.js.
- Ưu tiên tín hiệu điều hướng được chấp nhận từ `Link.onNavigate` (đã xác nhận có trong phiên bản đang cài) và hook điều hướng cho `router.push/replace`. Wrapper mỏng phải giữ nguyên props/link semantics và kết quả hủy của handler người gọi.
- Không dùng listener click capture hiện tại làm nguồn truth. Không monkey-patch history/router private API hoặc chờ Promise giả từ `router.push()`.
- Theo dõi transition thực và fallback của route. `app/loading.tsx` tham gia cùng cơ chế hiển thị thay vì tự dựng một thẻ độc lập. Các boundary phân giải phải thông báo đúng owner.
- Chỉ kết thúc khi transition/route commit hợp lệ và không còn fallback blocking của generation hiện hành. Pathname/query đổi là tín hiệu, không phải bằng chứng độc lập rằng nội dung hết suspend.
- Back/Forward: chỉ xử lý khi pathname/query thực sự thay đổi; đối chiếu route boundary/transition và trạng thái fallback để hoàn tất. Hash-only không được tạo task. Không lấy timeout làm tín hiệu xong.
- Cold reload/SSR: fallback ban đầu phải có trạng thái truy cập được trước khi shell nhận quyền hiển thị, rồi bàn giao mà không nhân đôi status hoặc hiện lại overlay lúc hydrate.
- Error/not-found/redirect/unmount phải giải phóng đúng owner; giữ lỗi thật, không biến thành loading vô hạn hoặc trạng thái thành công giả.

**Checkpoint kỹ thuật bắt buộc trước khi thay hàng loạt Link:** dựng test tích hợp trên router thật cho cold route, cache nóng, query, Back/Forward, Suspense và A→B. Xác nhận contract hoàn tất bằng số đo DOM/transition. Nếu tín hiệu public dự kiến không đủ, điều chỉnh tại boundary trong phạm vi app; không thay bằng timeout đoán. Sau checkpoint mới áp dụng wrapper/hook toàn Customer.

### 4.3. React với BrowserRouter hiện có

- Giữ `BrowserRouter`; định danh scope bằng location/route. Hủy công việc của route cũ khi rời route, redirect hoặc đổi quyền khiến trang bị thay thế; cleanup idempotent trong StrictMode.
- Các route import sẵn, dùng mock đồng bộ sẽ hiển thị ngay. Không start overlay chỉ vì `navigate()` hoặc `useLocation()` thay đổi.
- Page có công việc bất đồng bộ thiết yếu khai báo pending thực qua hook/region tại shell. Khi page chưa có dữ liệu để sử dụng: dùng thẻ cấp trang; khi đã có dữ liệu và refresh: dùng loading bảng.
- `UsersPage`: tải đầu vào scope của route; success, error/fallback, cancel đều settle đúng task. Refresh/action vẫn cục bộ. Bổ sung cancellation hoặc request generation để response cũ không ghi đè lần mới hay giữ loading sau khi rời trang; vẫn gọi Gateway như hiện tại.
- `OrdersPage`/`StaffOrdersPage`: nối loading khôi phục workspace thực; nếu xong trước ngưỡng thì không tạo flash. Các cập nhật trạng thái đơn đồng bộ không giả lập tải route.
- Auth: submit loading trong form; sau thành công chuyển giao cho route đích nếu có việc chờ thật. Timer thông báo/redirect phải cleanup khi rời trang hoặc bắt đầu thao tác mới.
- `ProtectedRoute`, redirect và chuyển vai trò không mở thêm quyền, không hiển thị dữ liệu của role/store cũ trong khi chờ, không để loader che giao diện 403.
- Hỗ trợ Suspense/lazy ở boundary nếu ứng dụng đã có nhu cầu thực khi triển khai; kế hoạch này không bắt buộc chuyển toàn bộ page sang lazy chỉ để tạo spinner.

## 5. Trình bày, vị trí và tương tác

### Hiệu năng

- Bỏ backdrop blur trên lớp phủ nội dung ở cả hai frontend; dùng nền bán trong suốt theo palette hiện có. Spinner dùng transform; không animate blur, kích thước layout hoặc shadow lớn trên diện tích trang.
- Progress dùng `transform`/`opacity`; không set state mỗi frame và không cập nhật width liên tục trên toàn shell.
- Không đo DOM mỗi animation frame. Khi cần tính hình học: gom scroll/resize vào một `requestAnimationFrame`, chỉ ghi vị trí khi thay đổi, dùng observer/listener có cleanup.

### Hình học

- Tách **vùng phủ nội dung** và **vị trí thẻ**. Thẻ có thể dùng portal/fixed layer để tránh tâm container và stacking context của trang dài.
- Tâm mục tiêu: tâm visual viewport; khi không có API thì dùng viewport thông thường. Tính cả offset và kích thước visual viewport khi thanh địa chỉ, bàn phím hoặc zoom thay đổi.
- Vùng đặt thẻ hợp lệ là phần nội dung đang nhìn thấy, trừ khu vực header/footer/sidebar cần tương tác và khoảng an toàn mép màn hình.
- Nếu tâm mục tiêu hợp lệ, giữ chính xác; nếu va shell, dịch tối thiểu vào vùng hợp lệ; nếu vùng quá nhỏ dùng thẻ gọn. Với admin, sidebar mở/thu gọn/mobile drawer đều phải được tính.
- Overlay chỉ nhận pointer trong vùng nội dung. Không dùng một lớp fixed toàn màn hình bắt pointer rồi vô tình chặn header/sidebar.
- Kiểm tra quy tắc stacking rõ: nội dung và giỏ hàng/popover thuộc nội dung < lớp loading < điều hướng chung cần dùng. Popup thuộc nội dung phải đóng hoặc bị vô hiệu hóa khi nội dung bị khóa; popup điều hướng chung vẫn hoạt động.

### Accessibility

- `aria-busy` trên đúng vùng dữ liệu, một status/live region cho tác vụ cấp trang; progress trang trí dùng `aria-hidden`.
- Vô hiệu hóa pointer và focus của nội dung blocking, gồm portal của nội dung nếu có; loader/status không nằm trong subtree bị `inert`.
- Nếu focus đang ở vùng bị khóa, di chuyển có chủ đích sang phần còn thao tác được; khi hoàn tất/cancel/error phục hồi phù hợp, không tạo focus trap và không tự cuộn để tìm loading.
- `prefers-reduced-motion: reduce`: dừng spin/pulse/translate và progress chuyển động; vẫn giữ thông báo rõ.
- Không gộp thay font, logo hay thiết kế thương hiệu vào sửa loading.

## 6. Ma trận phạm vi theo ứng dụng

### Next.js Customer

| Nhóm | Route/điểm vào | Việc cần làm |
| --- | --- | --- |
| Shell và điều hướng | Root layout, CustomerHeader, CustomerFooter, Hero, các Link trong card/page | Dùng cùng contract điều hướng; phủ link thật, mobile menu, Back/Forward, query, fragment và canceled navigation. |
| Khám phá | `/`, `/menu`, `/menu/[slug]`, `/stores`, `/party` | Loading route/fallback nhất quán; trang cache/mock sẵn không chờ giả; giữ query lọc menu. |
| Đơn hàng | `/cart`, `/checkout`, `/orders`, `/orders/[id]`, OrderDock, OrderProgress | Tách hydration giỏ hàng, submit đơn demo và chuyển route; loại start/stop router khỏi OrderContext; giữ đặt lại/hủy đơn/QR. |
| Tài khoản | `/account`, `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`, GoogleAuthFlow | Nút/form loading cục bộ; điều hướng bằng code vào adapter; cleanup redirect timer, không kéo dài overlay vì thông báo thành công. |
| Fallback/lỗi | `app/loading.tsx`, các Suspense hiện có, route lỗi/not-found | Một owner và một status cấp trang; hoạt động trên truy cập trực tiếp/hydration. |

### React quản trị

| Nhóm | Route/điểm vào | Việc cần làm |
| --- | --- | --- |
| Shell | `App`, `AdminLayout`, menu desktop/mobile, breadcrumbs, `ProtectedRoute` | Cùng loader contract, vùng phủ chính xác; điều hướng tức thì không thêm delay; giữ role/store scope và 403. |
| Auth | `/login`, `/forgot-password`, `/reset-password`; redirect `/register`, `/verify-otp` | Loading form, lỗi/retry và chuyển giao sang đích; không bật spinner thừa ở redirect đồng bộ. |
| Dữ liệu thật | `/admin/users` | Tải ban đầu cấp trang khi cần; refresh bảng và action/modal cục bộ; chống callback/request cũ. |
| Đơn hàng | `/admin/orders`, `/admin/staff/orders` | Bao phủ khôi phục workspace, Orders/Staff Orders, reload và đổi vai trò; giữ loading theo tác vụ thực. |
| Mock/sẵn có | `/admin/dashboard`, `/admin/catalog`, `/admin/stores`, `/admin/inventory`, `/admin/reviews`, `/admin/payments` | Rà soát mọi entry point và trạng thái rỗng/lỗi; không tạo chờ giả; chuẩn hóa loading cục bộ khi phát sinh tác vụ. |
| Báo cáo | `/admin/reports` | Giữ toast/indicator cục bộ cho export demo; cleanup timer, không khóa shell hoặc báo thành tải trang. |
| Thành phần tái sử dụng | `AdminTable`, `AdminModal`, `ConfirmModal`, nút/form | Chuẩn hóa busy/disabled/status, giảm chuyển động, tránh duplicate spinner khi page loader đã đại diện cùng tác vụ. |

## 7. Trình tự triển khai đề xuất

Các bước là kế hoạch cục bộ, chưa tạo ticket hay PR.

| Bước | Công việc và file chính | Điều kiện hoàn tất | Phụ thuộc |
| --- | --- | --- | --- |
| P0 | Chuyển các tình huống chẩn đoán thành test tích hợp có kiểm soát độ trễ; chốt contract router ở Next và scope dữ liệu ở React. | Test tái hiện đúng loading muộn, race, hash, canceled click, lệch tâm; cơ chế public router được chứng minh trên app thật. | Không |
| P1 | Sửa presenter Next trong `components/ui-loader/*`: bỏ blur, transform progress, viewport anchor, stacking, reduced motion. | Thẻ đúng vị trí; shell/giỏ hàng/focus đúng; A/B cùng môi trường cải thiện; không đổi vòng đời nghiệp vụ. | P0 |
| P2 | Sửa coordinator + adapter Next, `app/loading.tsx`, root layout; đổi các Link/router call site và bỏ coupling trong OrderProvider. | AC vòng đời đạt; SSR/hydration, cache, Back/Forward và điều hướng thay thế không kẹt/nháy. | P0, P1 |
| P3 | Thêm vùng loading React trong `src/components/ui-loader/` (tên dự kiến), nối `App`, `AdminLayout`, AuthLayout và page data cần chờ. | Mọi nhóm route/role có hành vi đúng; Users initial/refresh tách scope; static route không flash; rời trang không giữ loader. | P0; tái sử dụng quy tắc hình học đã chốt ở P1 |
| P4 | Rà soát loading cục bộ hai app: table, modal, form, auth redirect, checkout/reorder và export demo. | Không duplicate status/khóa quá phạm vi; action lỗi/retry hoạt động, timers được dọn. | P2, P3 |
| P5 | Chạy toàn ma trận, production builds, tích hợp bộ regression vào Frontend CI; cập nhật spec và verification. | Báo cáo AC có bằng chứng, test hiện có không hồi quy, hiệu năng so sánh đạt; không còn instrumentation tạm. | P4 |

Mỗi bước giữ hai app chạy độc lập. Khi bắt đầu thực thi, dùng nhánh `codex/navigation-loading-consistency` hoặc tên được người dùng chọn; commit theo phần có thể review/revert. GitNexus cập nhật sau thay đổi cấu trúc. Push/PR/merge/deploy chỉ thực hiện khi được yêu cầu cho đợt triển khai đó.

## 8. Kế hoạch kiểm thử và nghiệm thu

### 8.1. Vòng đời trên component/router thực

Giữ toàn bộ AC-01 đến AC-15 của spec gốc cho Customer. Dùng network interception/fixture ở phía test để điều khiển chậm/nhanh/lỗi; không thêm endpoint ngủ hoặc cờ test vào production. Test component thực hỗ trợ timing chính xác, nhưng không thay thế E2E trên shell/router thật.

- Hoàn tất 60 ms trước ngưỡng 180 ms: không overlay; quan sát thêm ít nhất một giây.
- Việc chờ dài: một thẻ; hoàn tất là ngừng blocking ở commit tiếp theo, không trailing 250 ms.
- A kết thúc/B bắt đầu sát nhau, A bị hủy, ba route liên tiếp, fallback mount/unmount: owner cũ không sửa owner mới.
- Same URL, hash click, Back/Forward hash, Back/Forward route/query, modifier-click, download, external link, target khác và `preventDefault`.
- Route cache nóng/lạnh, reload trực tiếp, SSR/hydration, lỗi chunk/route, redirect, not-found và unmount.
- Checkout demo → đơn hàng; đặt lại → giỏ hàng; auth thành công/lỗi/Google retry. Không gọi thanh toán thật.

### 8.2. Các AC bổ sung cho toàn frontend

| ID | Tiêu chí |
| --- | --- |
| AC-16 | Loading không có backdrop blur trên diện tích nội dung; progress không gây layout/re-render toàn app mỗi frame. |
| AC-17 | React: route đồng bộ đã sẵn không dựng overlay; initial data chậm mới có page loader, refresh/action giữ loading cục bộ. |
| AC-18 | React: Admin/Manager/Staff, role switch, store scope, 403 và redirect không giữ task của route/role cũ hoặc hé dữ liệu ngoài quyền. |
| AC-19 | Users: success/error/fallback/abort, refresh liên tiếp, rời trang giữa request; không stale response hay loader mồ côi. |
| AC-20 | Shell hai app vẫn thao tác bằng pointer/bàn phím khi loading; sidebar collapse/drawer và giỏ hàng nổi đúng tầng; phần nội dung blocking không nhận focus. |
| AC-21 | Auth/table/modal/export demo không phát status trùng, không có callback redirect/toast muộn sau unmount hoặc task mới. |
| AC-22 | Kết quả hiệu năng sau sửa được đo A/B ở cùng điều kiện và có trace; kiểm tra thêm production, không chỉ dựa vào dev hoặc build thành công. |

### 8.3. Hình học và accessibility

- Viewport 1440×900, 390×844, 844×390; trang ngắn và trang dài ít nhất ba viewport, đầu/giữa/cuối trang.
- Tâm toàn thẻ lệch tâm visual viewport không quá 4 CSS px khi đủ chỗ. Trường hợp clamp có kiểm tra vùng không chồng shell và khoảng an toàn.
- Scroll, resize, mobile menu/sidebar, thay đổi visual viewport/zoom; không tự cuộn hoặc tạo horizontal overflow/layout shift.
- Kiểm tra hit-test header/footer/sidebar/cart và Tab/focus thực, không chỉ `z-index` trong source.
- Kiểm tra reduced motion, live region/status, aria-busy và Axe; manual screen-reader/thiết bị thật nếu có thì ghi riêng kết quả, không coi Axe thay thế.

### 8.4. Hiệu năng

- Đo idle, loading đứng yên, loading khi cuộn; lặp ít nhất ba lượt trên cùng máy/viewport và giữ animation thật. Đối chiếu số frame, p95, frame >34 ms, long task và layout/paint.
- Mục tiêu trên môi trường baseline 60 Hz hiện tại: p95 gần 16,7 ms, không còn suy giảm kéo dài 17–25 FPS; dùng 20 ms như mục tiêu tham chiếu trong cùng điều kiện, không cam kết mọi thiết bị.
- Profile thêm progress/context; chưa tối ưu suy đoán hoặc thêm memo khắp cây trước khi có bằng chứng.
- CI shared runner: gate các lỗi chức năng, hình học và quy tắc render có thể kiểm chứng ổn định; lưu trace/perf report. Không đặt một ngưỡng FPS tuyệt đối làm test flaky trên mọi runner.

### 8.5. Lệnh và CI khi được yêu cầu thực thi kiểm thử

Trong từng frontend: `npm run lint`, `npm test`, `npm run build`. Chạy bộ Playwright hiện có cộng regression navigation mới bằng `npm run test:ui` tại frontend Next.js theo cấu hình repo; các test router Customer không đi qua fixture mock `next/navigation` của Google auth.

Tổ chức nhóm test Customer và Admin rõ ràng dù dùng cùng runner hiện có. Không tạo phụ thuộc runtime giữa hai ứng dụng. Cho lượt production verification, build cả hai và chạy Vite preview thay React dev server; fixture server chỉ dùng cho các test cần mock Google/payment đã có. Cập nhật workflow để có đủ build đầu vào và lưu trace/screenshot/report khi fail. Không bật Docker/backend cho bộ test UI; mock request Gateway cần thiết ở trình duyệt, không đổi base URL sản phẩm để gọi trực tiếp business service.

Theo `AGENTS.md`, lần lập kế hoạch này không tự chạy test/lint/typecheck/build/browser. Khi triển khai, thực hiện các lệnh kiểm chứng khi người dùng yêu cầu; nếu chưa có yêu cầu thì bàn giao phần code cùng trạng thái kiểm thử chưa chạy, không tuyên bố đã đạt AC.

## 9. Rủi ro, rollout và điều kiện bàn giao

- App Router có Suspense/streaming/redirect: P0 là điều kiện bắt buộc trước khi áp adapter toàn Customer; kiểm tra cả Back/Forward và initial reload.
- BrowserRouter không có sẵn trạng thái pending kiểu Data Router: pending dữ liệu được khai báo tại page, không giả lập bằng timeout hoặc global Axios counter.
- React StrictMode và request lỗi: mọi handle/cleanup phải idempotent; stale response phải bị hủy hoặc bỏ qua.
- Portal của Ant Design và fixed/sticky shell: phải test pointer/focus thực; không giải quyết bằng tăng z-index tùy ý.
- Dev server đang chạy có thể ghi chung `.next` với build: khi kiểm chứng production dùng môi trường/checkout riêng hoặc phối hợp dừng server đúng phạm vi; không build đè vào server đang dùng để đo rồi coi lỗi phát sinh là regression.
- Giữ change set theo presenter, coordinator/router, tích hợp React và regression để rollback phần lỗi qua commit riêng; không xóa test hồi quy để làm CI xanh.

Bàn giao thực thi phải liệt kê: file đã đổi, route/role đã kiểm tra, AC đạt/chưa đạt/bị chặn, số liệu hiệu năng trước/sau cùng điều kiện, ảnh/trace, và các giới hạn chưa đo. Không gọi là “hoàn tất toàn frontend” khi còn nhóm route hoặc lifecycle chưa được kiểm chứng.

## 10. Trạng thái của lượt lập kế hoạch

- Đã đọc spec, báo cáo chẩn đoán trước đó, router/shell/loading/API integration của hai frontend và workflow hiện có.
- Đã chốt phạm vi và thiết kế dự kiến trong tài liệu này.
- Chưa sửa source, spec gốc hoặc workflow; chưa thêm test; chưa chạy kiểm thử mới; chưa commit/push/deploy.
