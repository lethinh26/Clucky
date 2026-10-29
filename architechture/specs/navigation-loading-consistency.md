# Spec: Loading chuyển trang nhất quán và căn giữa vùng nhìn thấy

- Ngày: 28/10/2026.
- Branch khảo sát: `feature/M3-cart-order-sprint1`.
- Trạng thái: **DRAFT — lưu để xem lại, chưa được phép triển khai**.
- Chỉ dẫn hiện tại: tạo và giữ lại spec; chưa sửa frontend, chưa tạo ticket triển khai, chưa publish, push hoặc deploy.

## Problem Statement

Người dùng thấy loading vừa kết thúc lại xuất hiện thêm một loading trong khoảng gần một giây. Người dùng cũng phản ánh loading không nằm ngay giữa màn hình đang nhìn thấy: nó đang căn giữa theo khối nội dung của trang.

Hai vấn đề làm giao diện có cảm giác tải hai lần, giật hoặc báo đang tải dù nội dung đã sẵn sàng. Trên trang dài, người dùng có thể chỉ thấy nền mờ mà không thấy biểu tượng và thông báo tải.

### Hiện trạng và mức độ kiểm chứng

| Quan sát | Bằng chứng và giới hạn |
| --- | --- |
| Next.js đã gắn provider và overlay tại layout gốc | Phạm vi cấu trúc bao phủ các trang Customer; không đồng nghĩa mọi tác vụ tải dữ liệu đều dùng chung loading. |
| Có nhiều nguồn hiển thị trạng thái tải | Fallback cấp route của Next.js, overlay tùy biến và trạng thái tải cục bộ tại một số trang cùng tồn tại; chưa có cơ chế phối hợp một chủ thể hiển thị cho cùng lần chuyển trang. |
| Overlay có thể xuất hiện sau khi điều hướng báo hoàn tất | Mô phỏng hook/timer chạy mã hiện tại: bắt đầu ở 0 ms, báo hoàn tất ở 60 ms, overlay xuất hiện ở 180 ms, tắt ở 310 ms. Đây là kiểm chứng logic với môi trường mô phỏng, không phải phép đo xác nhận chính xác khoảng gần một giây trong trình duyệt của người dùng. |
| Timer cũ có thể tắt loading của lần mới | Timer 250 ms trong thao tác kết thúc không được quản lý cùng các timer khác; đã tái hiện bằng mô phỏng hai lần điều hướng liên tiếp. |
| Back/Forward có thể bật loading khi chỉ đổi fragment | Listener history luôn khởi động loading, trong khi watcher chỉ so sánh pathname và query. Mô phỏng history event không đổi hai giá trị này vẫn còn loading sau một giây. Cần bổ sung kiểm chứng bằng history thật khi triển khai. |
| Vị trí hiện tại phụ thuộc chiều cao nội dung | Overlay đặt tuyệt đối phủ container và dùng flex căn giữa; đây là tâm container, không phải tâm viewport. Kết luận từ CSS, chưa có phép đo hình học E2E. |
| React quản trị chưa sử dụng bộ loading này | Có loading cục bộ ở bảng, nút và xuất báo cáo; chưa có bộ điều phối chuyển trang tương đương Next.js. |

## Solution

Mỗi lần chuyển trang phải có một trải nghiệm tải liên tục, đúng trạng thái thực tế. Không được phát sinh một đợt loading mới sau khi nội dung đích đã sẵn sàng. Thẻ loading phải xuất hiện ở giữa vùng màn hình người dùng đang nhìn thấy, kể cả khi trang rất dài hoặc đã cuộn xuống dưới.

Phạm vi chính của bản nháp là sửa trải nghiệm chuyển trang Customer trên Next.js. Giữ thiết kế loading hiện có làm cơ sở, chỉnh vòng đời và vị trí. Việc đưa cùng trải nghiệm sang toàn bộ React được ghi nhận là hướng mở rộng cần chốt, chưa tự động trở thành yêu cầu triển khai.

### Quy tắc hiển thị

1. Loading chỉ phản ánh một công việc đang chờ thực sự. Trang đã có sẵn không bị thêm thời gian chờ chỉ để trình diễn animation.
2. Giữ ngưỡng chống nhấp nháy đề xuất là 180 ms. Công việc kết thúc trước ngưỡng phải hủy lịch hiển thị; overlay không được xuất hiện sau đó.
3. Khi nội dung đích sẵn sàng, kết thúc trạng thái chặn nội dung ngay ở lần cập nhật giao diện kế tiếp. Animation kết thúc thanh tiến trình không được giữ overlay hoặc khởi động nó trở lại.
4. Fallback cấp route và overlay phải phối hợp: tối đa một thẻ/spinner tải cấp trang nhìn thấy tại một thời điểm. Thanh tiến trình mảnh có thể tồn tại cùng thẻ loading nhưng không tạo thêm thông báo trạng thái trùng lặp.
5. Nếu một tác vụ đã bị thay thế hoặc hủy, callback của tác vụ đó không được đóng hay mở loading của tác vụ mới.
6. Không phát sinh loading chuyển trang cho link cùng URL, fragment trong cùng trang, link ngoài, tải file, mở tab mới hoặc điều hướng bị hủy. Back/Forward giữa các trang khác nhau vẫn phải xử lý đúng.

### Quy tắc căn giữa và vùng phủ

- “Màn hình người dùng” là visual viewport hiện tại của trình duyệt. Không dùng chiều cao toàn bộ document hoặc chiều cao container nội dung làm mốc căn giữa.
- Mục tiêu mặc định là tâm của toàn bộ thẻ loading trùng tâm visual viewport theo cả hai chiều; đây không phải chỉ căn riêng vòng xoay rồi để phần chữ đẩy cả thẻ lệch đi.
- Khi cuộn, thay đổi kích thước cửa sổ hoặc xoay thiết bị trong lúc chờ, loading phải tiếp tục nằm trong vùng nhìn thấy. Không tự cuộn trang để đưa loading vào giữa.
- Giữ hành vi hiện có: vùng phủ chỉ chặn nội dung đang tải; header và footer vẫn nhìn thấy và thao tác được. Vùng phủ và điểm neo thẻ loading phải được thiết kế độc lập để yêu cầu này không buộc thẻ quay về tâm document.
- Nếu header/footer hoặc màn hình thấp khiến thẻ ở tâm viewport bị chồng lên vùng cần thao tác, dịch thẻ tối thiểu vào phần nội dung đang nhìn thấy. Nếu không đủ chỗ, dùng biến thể gọn. Đây là ngoại lệ cần kiểm thử, không phải lý do dùng tâm container cho mọi trường hợp.
- Giữ khoảng an toàn với mép viewport; không tạo thanh cuộn ngang, không làm thay đổi chiều cao bố cục hoặc gây nhảy vị trí cuộn.
- Khi đang chặn nội dung, giỏ hàng nổi hoặc phần tử nổi của vùng nội dung không được che thẻ loading hay cho phép thao tác với dữ liệu chưa sẵn sàng. Điều hướng ở header/footer vẫn có thể bắt đầu tác vụ mới.

## User Stories

1. Là Khách hàng, tôi muốn một lần chuyển trang chỉ có một trải nghiệm loading liên tục, để không nghĩ rằng trang bị tải lại hai lần.
2. Là Khách hàng, tôi muốn trang tải nhanh hiển thị ngay, để không phải chờ animation không cần thiết.
3. Là Khách hàng, tôi muốn loading kết thúc khi nội dung đích sẵn sàng, để có thể tiếp tục thao tác ngay.
4. Là Khách hàng, tôi muốn thấy thông báo tải ở giữa vùng màn hình đang xem, để biết hệ thống vẫn đang xử lý.
5. Là Khách hàng đang ở giữa hoặc cuối một trang dài, tôi muốn loading vẫn nằm trong tầm nhìn, để không phải cuộn tìm thông báo.
6. Là Khách hàng sử dụng điện thoại, tôi muốn loading thích ứng khi xoay máy hoặc thay đổi vùng hiển thị, để thông báo không bị cắt mất.
7. Là Khách hàng, tôi muốn đổi sang một trang khác trong lúc chờ mà loading vẫn theo đúng lần chuyển trang mới, để giao diện không báo xong nhầm.
8. Là Khách hàng, tôi muốn Back/Forward và liên kết trong cùng trang hoạt động tự nhiên, để không bị chặn bởi loading không cần thiết.
9. Là Khách hàng đặt món, tôi muốn chuyển từ thanh toán sang chi tiết đơn và từ đặt lại sang giỏ hàng có loading nhất quán, để không thấy nhiều thông báo tải nối tiếp.
10. Là Khách hàng, tôi muốn vẫn dùng được điều hướng chung trong lúc nội dung tải, để có thể chọn một trang khác.
11. Là Khách hàng dùng bàn phím hoặc trình đọc màn hình, tôi muốn được thông báo trạng thái rõ ràng và không thao tác nhầm nội dung đang bị chặn.
12. Là Khách hàng ưu tiên giảm chuyển động, tôi muốn vẫn nhận biết trạng thái tải mà không cần animation xoay/phóng lớn liên tục.

## Implementation Decisions

Các mục sau là định hướng của bản nháp, chưa phải thay đổi đã thực hiện.

1. Điều chỉnh bộ điều phối loading chuyển trang, thẻ loading, fallback cấp route và điểm tích hợp vào shell Customer. Chỉ sửa các luồng hiện có liên quan; tránh refactor toàn bộ frontend.
2. Dùng một nguồn trạng thái cho cùng một lần điều hướng. Phối hợp nguồn tín hiệu từ router và fallback thay vì để mỗi nơi tự dựng một lớp phủ độc lập.
3. Phân biệt công việc đang chờ, độ trễ trước khi hiện overlay và animation kết thúc thanh tiến trình. Việc đổi URL đơn thuần chưa đủ chứng minh mọi phần nội dung đang suspend đã sẵn sàng.
4. Quản lý mọi timer/callback của vòng đời tải, bao gồm callback kết thúc. Khi chuyển sang tác vụ mới hoặc unmount, hủy hoặc vô hiệu hóa callback cũ; không đặt lại trạng thái của tác vụ mới.
5. Trạng thái kết thúc phải xử lý được thành công, lỗi, hủy và điều hướng thay thế. Không dùng timeout 8 giây hiện tại như bằng chứng tải thành công. Cơ chế chống kẹt, nếu giữ lại, phải cho phép thoát/chuyển trang mà không mở tương tác sai với nội dung chưa sẵn sàng.
6. Tách bài toán vùng phủ nội dung khỏi bài toán vị trí thẻ trong viewport. Không chốt trước thư viện, portal hoặc công thức CSS cụ thể; chọn cách nhỏ nhất đáp ứng các tiêu chí hình học và tương tác.
7. Loading dữ liệu trong bảng/nút hoặc một phần trang có thể giữ phạm vi cục bộ. Không tự động biến mọi thao tác tải dữ liệu thành overlay cấp trang; không gộp nhầm tải nền với điều hướng.
8. Bổ sung semantics cho vùng đang bận và thông báo trạng thái; tránh thông báo lặp, focus trap không cần thiết, hoặc để bàn phím tiếp cận phần nội dung bị chặn. Tôn trọng thiết lập giảm chuyển động.
9. Giữ nhận diện Clucky và tài sản logo/favicon. Không mở rộng task thành thay font hoặc thiết kế lại thương hiệu. Tài liệu thương hiệu hiện tại và hướng dẫn gốc có khác biệt tên font heading; dùng style hiện có cho phạm vi sửa lỗi này và ghi nhận khác biệt thay vì tự đổi toàn ứng dụng.
10. Không đổi API, schema, nghiệp vụ đặt hàng, trạng thái thanh toán, RBAC hoặc cấu hình backend. Hai frontend tiếp tục chạy độc lập.

## Testing Decisions

### Điểm kiểm thử đề xuất

Ưu tiên kiểm thử tích hợp tại shell Customer thực tế, bao gồm router, provider, fallback và overlay. Đây là điểm quan sát chung cho cả lỗi xuất hiện hai lần và sai vị trí. Kiểm thử qua thao tác điều hướng, số lượng loading nhìn thấy, khả năng tương tác và bounding box; không kiểm tra tên biến hoặc chỉ so sánh nội dung source.

Dùng điều khiển độ trễ tải trang có chủ đích trong môi trường test để tái hiện nhanh/chậm và hai điều hướng liên tiếp. Kiểm thử timer bổ sung chỉ dùng tại điểm tích hợp component thực, không coi harness mock hook ở bước khảo sát là regression test đủ mạnh. Không thêm endpoint chậm hoặc logic test vào sản phẩm.

Bộ test hiện có chủ yếu kiểm thử logic giỏ hàng và đơn demo bằng Node test runner. Chưa có regression test cho router/loading; công cụ chạy component/browser sẽ được chọn khi được phép triển khai. Các điểm kiểm thử ở đây là đề xuất để xem lại cùng spec, chưa được người dùng xác nhận riêng.

### Tiêu chí chấp nhận

| ID | Kịch bản | Kết quả bắt buộc |
| --- | --- | --- |
| AC-01 | Điều hướng kết thúc ở 60 ms, trước ngưỡng 180 ms | Không xuất hiện overlay sau khi kết thúc; tiếp tục quan sát tối thiểu một giây để bắt lần hiện dư. |
| AC-02 | Route chậm, fallback của Next.js được hiển thị | Không có hai thẻ/spinner cấp trang cùng lúc và không có đợt loading mới khi fallback được thay bằng nội dung sẵn sàng. |
| AC-03 | Route đã được tải trước hoặc lấy từ cache | Không thêm thời gian chờ giả; nếu hoàn tất trước ngưỡng, không hiện overlay. |
| AC-04 | A kết thúc, B bắt đầu trước khi timer kết thúc A chạy | B giữ đúng trạng thái tải; callback của A không đóng hoặc đặt lại tiến trình B. |
| AC-05 | Chuyển trang lỗi, bị hủy, bị thay thế hoặc unmount | Không có timer tồn đọng gây loading hiện lại; không khóa vĩnh viễn shell. Lỗi không bị trình bày thành thành công. |
| AC-06 | Nhấp cùng URL, fragment, link ngoài, tải file, Ctrl/Cmd-click hoặc mở tab mới | Không bật overlay chuyển trang trên trang hiện tại. |
| AC-07 | Back/Forward giữa hai route hoặc hai query khác nhau | Loading theo đúng tác vụ thực và kết thúc đúng; không phụ thuộc timeout dự phòng để biến mất. |
| AC-08 | Back/Forward chỉ thay fragment hoặc không đổi route/query | Không phát sinh overlay chặn nội dung không cần thiết. |
| AC-09 | Trang ngắn và trang dài ít nhất ba lần viewport; thử ở đầu, giữa và cuối trang | Với đủ không gian, tâm thẻ cách tâm visual viewport không quá 4 CSS px mỗi trục sau khi animation ổn định; không lấy tâm document làm chuẩn. |
| AC-10 | Cuộn, resize và xoay thiết bị trong khi tải | Thẻ vẫn trong viewport và cập nhật vị trí; không tự cuộn, không tạo layout shift do loading. |
| AC-11 | Header/footer hiện trong viewport hoặc màn hình rất thấp | Không che vùng điều hướng chung; áp dụng ngoại lệ dịch thẻ tối thiểu/biến thể gọn và giữ thẻ đọc được. |
| AC-12 | Loading xuất hiện khi có giỏ hàng nổi hoặc menu điều hướng | Không có phần tử nổi che thẻ hoặc cho phép thao tác nội dung bị chặn; header/footer vẫn điều hướng được. |
| AC-13 | Thanh toán demo sang chi tiết đơn; đặt lại sang giỏ hàng | Cùng quy tắc vòng đời và vị trí, không có loading cục bộ nối thêm một đợt sau khi trang đích sẵn sàng. Không gọi thanh toán thật trong test. |
| AC-14 | Bàn phím, trình đọc màn hình và giảm chuyển động | Không focus nội dung bị chặn, không phát thông báo tải trùng lặp, trạng thái vẫn rõ khi giảm animation. |
| AC-15 | Reload trực tiếp và truy cập route chưa được tải trước | Fallback ban đầu hoạt động, không tạo đợt overlay thừa khi hydrate; nội dung cuối cùng vẫn hiển thị đúng. |

Ma trận viewport tối thiểu đề xuất: desktop 1440×900, mobile 390×844 và mobile ngang 844×390. Kiểm tra thêm thay đổi visual viewport trên thiết bị hỗ trợ. Chụp hình hoặc lưu trace ở các vị trí cuộn để xác nhận lỗi căn giữa, không chỉ dựa vào build thành công.

Khi triển khai: chạy lint, formatter và build liên quan, test hồi quy giỏ hàng/đơn hàng hiện có, rồi kiểm chứng các kịch bản trên trình duyệt. Nếu có thay đổi tích hợp backend, thực hiện các kiểm tra hạ tầng, Config Server, Eureka và Gateway theo quy định dự án; báo rõ kiểm tra nào bị chặn.

## Out of Scope

- Triển khai code hoặc bổ sung test trong lượt tạo spec này.
- Tự tạo ticket sẵn sàng giao agent, gửi lên issue tracker, commit, push, publish hoặc deploy.
- Mặc định thêm overlay toàn trang cho tất cả route và tác vụ của React quản trị.
- Viết lại toàn bộ loading dữ liệu cục bộ, skeleton, cơ chế fetch hoặc caching.
- Thay nghiệp vụ đặt hàng/thanh toán, phân quyền, API, database hay kiến trúc microservice.
- Thiết kế lại thương hiệu, đổi font toàn dự án hoặc bổ sung chức năng Phase 2.

## Further Notes

1. **Điểm cần chốt trước khi mở rộng:** chỉ sửa Next.js hay đồng bộ thêm React. Nếu mở rộng, cần kiểm kê các luồng Staff, Store Manager và Admin có công việc chờ thực sự; không thêm delay vào việc chuyển trang đồng bộ. Hai ứng dụng dùng cùng quy tắc UX nhưng không phụ thuộc runtime của nhau.
2. **Diễn giải vị trí trong bản nháp:** ưu tiên tâm visual viewport; giữ header/footer có thể thao tác và chỉ điều chỉnh vị trí khi cần tránh chồng lấn. Đây là cách dung hòa phản ánh mới với hành vi vùng phủ hiện có, có thể được sửa khi duyệt spec.
3. **Kết quả khảo sát trước spec:** 17 test logic hiện có và TypeScript của hai frontend đạt. Lint lúc khảo sát bị chặn do thiếu ESLint; các endpoint Config Server, Eureka và Gateway không phản hồi. Các kết quả đó không phải xác nhận bản sửa loading đã hoàn tất.
4. **Bàn giao hiện tại:** chỉ lưu tài liệu nháp này. Bắt đầu triển khai sau một yêu cầu tiếp theo của người dùng; không tự chuyển trạng thái thành ready-for-agent.
