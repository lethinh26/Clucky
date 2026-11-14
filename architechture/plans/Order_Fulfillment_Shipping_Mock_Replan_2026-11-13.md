# Clucky — kế hoạch chuẩn hóa hình thức nhận hàng, trạng thái đơn và mô phỏng giao hàng

**Ngày khảo sát:** 13/11/2026  
**Trạng thái:** Đã triển khai mã nguồn ngày 14/11/2026; đã rebuild Docker local cho các service ảnh hưởng, đang chờ nghiệm thu chức năng thủ công. Các chính sách xử lý ngoại lệ ghi rõ là **đề xuất**.  
**Phạm vi:** Customer Next.js, Staff/Manager/Admin React, Cart & Order, Shipping, Payment, các consumer liên quan.

## 1. Mục tiêu và nguyên tắc

1. Trên màn hình nhân viên phân biệt chính xác **Ăn tại quán**, **Mang về**, **Giao hàng**; đơn giao hàng không còn mang nhãn Mang về trên card, bill/KOT hoặc chi tiết.
2. DINE_IN do khách tự ra quầy nhận, không cần số bàn, bước phục vụ tại bàn hay nhân viên mang món ra. TAKE_AWAY do khách tới lấy. DELIVERY chạy mô phỏng tự động sau khi READY.
3. Đơn DELIVERY luôn có **snapshot người nhận** (tên, điện thoại, địa chỉ, ghi chú và phí nếu có); nhân viên đúng chi nhánh thấy đủ dữ liệu để xử lý.
4. Sau DELIVERY.READY, mô phỏng **5 giây chờ tài xế → COD mới ứng tiền từ ví đối tác ảo, QR đã thanh toán trước không ứng → lấy hàng → 20 giây di chuyển theo đường đi Mapbox → đến nơi → gắn minh chứng giả lập → giao thành công**. Với COD, việc shipper thu tiền khách là **ngoài luồng, hệ thống không xác minh và không giả lập đã thu**. Customer/Staff chỉ thấy trạng thái thanh toán, giao hàng và bản đồ; không hiển thị ví hay thao tác ứng tiền. Staff được chủ động cho giao thất bại trong khoảng 20 giây. Các mốc lưu ở Shipping Service để hai phía đồng bộ qua reload.
5. Payment, Order và Shipment giữ trạng thái độc lập; không tự suy luận đã thu tiền hoặc đã giao thành công từ trạng thái bếp.
6. Theo AGENTS.md và `architechture/docs/SRS.md`, MVP Shipping chỉ tạo hồ sơ CREATED, còn phân công/theo dõi là Phase 2. Phần dưới đây là **phạm vi simulation bổ sung theo yêu cầu mới**, phải bật bằng cấu hình dành cho môi trường demo; giữ nguyên ranh giới nghiệp vụ thật.

## 2. Hiện trạng được xác minh bằng mã nguồn

| Khu vực | Phát hiện | Nguồn tham khảo |
| --- | --- | --- |
| Mô hình hiện tại | Order.type = PICKUP/DELIVERY; đơn tại quầy thêm diningOption = DINE_IN/TAKE_AWAY. Online DELIVERY hiện có diningOption mặc định TAKE_AWAY, nên nếu chỉ đọc diningOption sẽ hiển thị Mang về. | frontend/react/src/lib/api.ts:211-247; backend/cart-order-service/src/main/java/com/clucky/cartorderservice/entity/Order.java; architechture/specs/rbac-branch-operations/B2-counter-orders.md:23-35 |
| Card nhân viên | Nhãn chỉ dựa trên diningOption; không kiểm tra orderType DELIVERY. Giá trị diningOption thiếu còn được mặc định thành DINE_IN. | frontend/react/src/pages/Staff/components/OrderCard.tsx:146-155; StaffOrdersPage.tsx:110-132 |
| Bill/KOT | Dùng phép chọn DINE_IN hoặc mặc định MANG VỀ, vì vậy DELIVERY cũng có thể bị in thành Mang về. | frontend/react/src/pages/Staff/components/ReceiptBillModal.tsx:248-261,427-437 |
| Hàng đợi | Staff chỉ lọc PENDING_PAYMENT, CONFIRMED, PREPARING, READY, COMPLETED; không có tab SHIPPING / xử lý giao thất bại. | frontend/react/src/pages/Staff/StaffOrdersPage.tsx:55-60,634-702 |
| Thao tác cuối | Card ở READY cho nút hoàn tất bất kể DELIVERY/PICKUP; drawer cho hoàn tất từ READY hoặc SHIPPING. | frontend/react/src/pages/Staff/components/OrderCard.tsx:317-337; frontend/react/src/pages/Orders/components/OrderDetailDrawer.tsx:324-330 |
| API trạng thái Order | DELIVERY được READY→SHIPPING→COMPLETED, nhưng cũng có nhánh CONFIRMED/PREPARING→COMPLETED khi đã trả tiền; không cần bằng chứng shipment DELIVERED. | backend/cart-order-service/src/main/java/com/clucky/cartorderservice/service/OrderService.java:640-699 |
| Checkout người nhận | Customer frontend gửi receiverName, receiverPhone, deliveryAddress ở DELIVERY. Order Service lưu tên/điện thoại/địa chỉ và DTO trả các trường này. | frontend/nextjs/app/checkout/page.tsx:373-388; OrderService.java:303-324; dto/OrderResponse.java:7-35 |
| Lỗ hổng dữ liệu | CreateOrderRequest bắt buộc tên và SĐT, nhưng deliveryAddress chưa bắt buộc theo loại DELIVERY; Shipping consumer yêu cầu snapshot địa chỉ không rỗng, có thể không tạo shipment từ đơn thiếu địa chỉ. | backend/cart-order-service/src/main/java/com/clucky/cartorderservice/dto/CreateOrderRequest.java:9-24; backend/shipping-service/.../ShipmentServiceTemplate.java |
| Payment đầu vào | Order create hiện xem mọi paymentMethod khác COD là PENDING_PAYMENT, trong khi payment session web chỉ hỗ trợ BANK_TRANSFER. Cần giới hạn giá trị hợp lệ để tránh đơn bị kẹt. | backend/cart-order-service/src/main/java/com/clucky/cartorderservice/service/OrderService.java:298-301; OrderPaymentService.java:78-84 |
| Shipping thực tế | Kafka order.created tạo shipment CREATED cho DELIVERY, không tạo cho PICKUP; có GET theo orderId và phân quyền. Chưa có API gán/chuyển trạng thái shipment hay event đồng bộ ngược về Order. | backend/shipping-service (OrderCreatedConsumer, ShipmentServiceTemplate, ShipmentControllerTemplate); architechture/tasks/BE-33.md |
| Demo hiện tại | Customer có demo điều khiển trên bản sao UI/trình duyệt; không thay đổi state của Shipping Service và không đồng bộ với Staff. | frontend/nextjs/lib/order-demo.ts:52-139; components/order/order-provider.tsx:509-526 |

**Lưu ý dữ liệu khách:** Code tạo đơn online đã lưu snapshot tên và số điện thoại. Cần xác minh trên bản ghi bị phản ánh là thiếu (orderId, API response, shipment) để tách lỗi hiển thị khỏi dữ liệu cũ/thiếu; không khẳng định mọi đơn đang thiếu dữ liệu ở database.

## 3. Mô hình nghiệp vụ đề xuất

### 3.1. Hình thức nhận hàng hiển thị

- Giữ orderSource = WEB/COUNTER để chỉ nơi tạo đơn.
- Xây dựng hàm chuẩn hóa fulfillmentMode dùng chung:
  - type = DELIVERY → **DELIVERY** (luôn ưu tiên).
  - type = PICKUP, diningOption = DINE_IN → **DINE_IN**.
  - type = PICKUP, diningOption = TAKE_AWAY → **TAKE_AWAY**.
  - Đơn WEB/PICKUP không có diningOption → **TAKE_AWAY**, nếu contract web được chốt chỉ cho đến lấy.
  - Đơn COUNTER/PICKUP cũ không có diningOption → **UNKNOWN**, cần nhãn trung tính “Nhận tại quán” hoặc chính sách migration riêng; không mặc định là ăn tại quán.
- Ưu tiên dùng một helper/DTO hiển thị thống nhất trên Staff card, detail, invoice/KOT, Admin list/detail, báo cáo và Customer. Chỉ thêm enum persisted fulfillmentMode nếu có nhu cầu nghiệp vụ rõ ràng; không lưu hai nguồn chân lý trùng nhau.
- Đề xuất **DINE_IN chỉ tạo tại quầy** ở phạm vi này vì Customer checkout đang chỉ có DELIVERY/PICKUP.

### 3.2. Bảng trạng thái Order

| Bước | DINE_IN | TAKE_AWAY | DELIVERY |
| --- | --- | --- | --- |
| PENDING_PAYMENT | Chờ thu/ghi nhận tiền (nếu có) | Chờ thanh toán (nếu có) | Chờ thanh toán (nếu chuyển khoản) |
| CONFIRMED | Đã nhận đơn | Đã nhận đơn | Đã xác nhận đơn |
| PREPARING | Đang chế biến | Đang chế biến | Đang chế biến |
| READY | **Mời khách ra quầy nhận món** | **Sẵn sàng nhận món** | **Món đã xong, chờ shipper mô phỏng đến lấy (5 giây)** |
| SHIPPING | Không áp dụng | Không áp dụng | **Đang giao hàng**, được kích hoạt khi có xác nhận hàng đã lấy / bắt đầu vận chuyển |
| COMPLETED | **Khách đã nhận tại quầy** | **Khách đã nhận món** | **Giao thành công mô phỏng** (có kết quả Shipping và minh chứng mô phỏng) |
| CANCELLED | Đã hủy (theo luật trước chế biến) | Đã hủy | Đã hủy (theo luật trước chế biến) |
| DELIVERY_FAILED *(đề xuất thêm)* | Không áp dụng | Không áp dụng | **Giao không thành công, đã đóng xử lý** sau quyết định cuối của Manager; không tính là hoàn tất/bán thành công |

Order vẫn lưu một state machine chung. Với DINE_IN, nút ở READY là **“Xác nhận khách đã nhận món tại quầy”**; chỉ khi nhân viên bấm và điều kiện thanh toán đạt thì COMPLETED. Không phát sinh tableId, bàn ăn hoặc trạng thái “đã phục vụ”.

### 3.3. Shipment state machine

| Trạng thái Shipment | Ý nghĩa | Quy tắc |
| --- | --- | --- |
| CREATED | Tạo hồ sơ vận chuyển từ order.created | Tồn tại sớm dù món còn đang nấu; không có nghĩa đơn đang giao |
| ASSIGNED | Gán tài xế mô phỏng, bắt đầu mốc chờ 5 giây | Chỉ khi Order READY và đã có dữ liệu tuyến hợp lệ; không tạo tài khoản shipper thật |
| PICKED_UP | Shipper đến quán nhận món | Chỉ sau 5 giây; với COD phải debit ví ảo thành công trước bàn giao, với đơn trả trước không debit |
| SHIPPING | Đang di chuyển trên polyline Mapbox trong **20 giây** | Lưu `deliveryStartedAt`, `deliveryDueAt`, `routeGeometry`, `attemptId`; cả hai UI nội suy cùng vị trí |
| DELIVERED | Đã đến đích, kết thúc thao tác thu tiền/minh chứng mô phỏng | Chỉ khi trọn 20 giây và hoàn tất các bằng chứng mô phỏng bắt buộc |
| FAILED | Chuyến mô phỏng thất bại do nhân viên kích hoạt trong 20 giây | Lưu lý do, thời điểm, vị trí dừng, chờ xử lý hoàn hàng/giao lại hoặc kết thúc |

`Shipment` vẫn duy nhất theo `orderId`. Mỗi lần thử giao có một `attemptId` riêng, lịch sử bất biến. Các pha **WAITING_RIDER**, **ARRIVED**, **RESOLUTION_PENDING**, **RETURN_PENDING**, **RETURNED** là `simulationPhase` phụ, không bắt buộc mở rộng enum Shipping status công khai. `Order` ở READY cho tới khi Shipping bắt đầu. Khi Shipment.SHIPPING, Order.SHIPPING. Khi thất bại, Order giữ SHIPPING kèm cờ “Giao thất bại / Cần xử lý”, tránh tự đánh dấu đã hoàn thành hoặc huỷ.

### 3.4. Bất biến bắt buộc tại backend

1. DINE_IN và TAKE_AWAY: CONFIRMED→PREPARING→READY→COMPLETED, chỉ complete ở READY sau khi **khách thực sự nhận món ở quầy**; thanh toán phải đáp ứng policy Payment. Với đơn web chỉ cho các paymentMethod backend hỗ trợ, phân biệt lựa chọn thu tiền tại quầy ở đơn COUNTER.
2. DELIVERY: CONFIRMED→PREPARING→READY→SHIPPING→COMPLETED khi giao thành công. Khi giao thất bại, ở SHIPPING với cờ `RESOLUTION_PENDING` để xử lý/giao lại, sau đó Manager có thể kết thúc bằng `DELIVERY_FAILED` (trạng thái Order mới được đề xuất); tuyệt đối không đi tắt đến COMPLETED từ CONFIRMED/PREPARING/READY.
3. DELIVERY→COMPLETED đòi Shipment.DELIVERED của đúng order/attempt, minh chứng mock đã lưu và **điều kiện thanh toán theo chế độ**. Với QR, phải có Payment.PAID/COLLECTED thực trước khi chế biến/giao. Với COD, phải xác nhận merchant settlement nội bộ mô phỏng lúc shipper lấy món (`simulatedAdvanceConfirmed=true`), **không** yêu cầu hay phát `SIMULATED_COLLECTION_CONFIRMED` vì shipper thu khách ngoài luồng. Event hoàn tất mang cờ mô phỏng để downstream không ghi nhận doanh thu/điểm từ khoản tiền chưa thu thật. Không tin boolean client “đã giao/đã trả”.
4. Debit COD nội bộ và ảnh minh chứng giả lập không tạo giao dịch Payment thật, không đổi `PaymentStatus` thành PAID/COLLECTED, không phát webhook thanh toán thật hoặc kích hoạt refund thật. Chỉ projection giao diện mới hiển thị COD **đã thanh toán cho quán (mô phỏng)** sau pickup; không được gán là đã thu tiền khách.
5. Hủy theo luật hiện hữu: chỉ PENDING_PAYMENT/CONFIRMED, có lý do. FAILED sau chế biến là exception cần xử lý, không tự biến thành CANCELLED.
6. Store/owner/role xác thực ở backend; version/idempotency/transaction + outbox khi có side effect; không cross-service SQL.
7. Event `order.completed` chỉ được phát một lần khi đủ điều kiện vì ảnh hưởng Loyalty, Notification, báo cáo và review. Với COD giả lập, event phải có flag mô phỏng và consumer tài chính/điểm phải có quy tắc chặn hoặc phân biệt rõ số tiền đã thu thật.

## 4. Thông tin người nhận DELIVERY

- **Tạo đơn:** bắt buộc receiverName, receiverPhone hợp lệ, deliveryAddress không rỗng và điểm tọa độ/phạm vi đúng rule hiện hữu; trim và validate backend trước khi lưu hoặc phát order.created. PICKUP không buộc địa chỉ giao. Không tự điền tọa độ giả.
- **Dữ liệu:** giữ snapshot người nhận trên Order; shipment nhận snapshot qua Kafka. Không thay snapshot quá khứ theo profile/sổ địa chỉ thay đổi sau đó.
- **Staff card:** tên người nhận, SĐT có hành động gọi, địa chỉ giao gọn và có thể xem toàn bộ; badge DELIVERY, phí ship, ghi chú giao; khi thiếu dữ liệu thì báo “Thiếu thông tin giao hàng” và chặn bước bàn giao vận chuyển.
- **Staff/Admin detail:** hiển thị người đặt (customerId nếu có) tách với người nhận; receiverName/phone/address, shipment status, lịch sử, phương thức thanh toán và tiền COD còn phải thu. Nhân viên chỉ nhìn thấy dữ liệu quán mình.
- **Đơn cũ:** thống kê bản ghi DELIVERY thiếu receiver fields hoặc shipment; báo thiếu dữ liệu và cho Manager xử lý theo quy trình xác minh, không bịa hoặc tự lấy dữ liệu cá nhân của một người khác để backfill.
- **Receipt/KOT:** dùng đúng nhãn DELIVERY, in nội dung cần cho đóng gói/bàn giao; tránh phát tán thông tin riêng tư ở nơi không cần thiết.

## 5. Mô phỏng vận chuyển 5 giây + 20 giây

### 5.1. Bật mô phỏng và dữ liệu khởi tạo

- Shipping Service là nguồn dữ liệu chuẩn cho đồng hồ, chuyến giao, trạng thái, tuyến đường, ví ảo, thất bại và minh chứng. Bật tính năng bằng `shipping.simulation.enabled` ở Config Server cho môi trường demo, gắn `source=SIMULATOR` cho từng chuyến. Không sử dụng tài khoản shipper, giao dịch, webhook hoặc GPS thật.
- Checkout tạo DELIVERY vẫn phát `order.created`, Shipping tạo một Shipment.CREATED duy nhất theo `orderId`. Consumer cần xử lý đúng thứ tự bất kể sự kiện `order.ready` tới trước `order.created`; retry đến khi cả Order.READY và shipment tồn tại. Không tạo dữ liệu shipment giả trong trình duyệt.
- Chuẩn bị tuyến ngay từ lúc Order được xác nhận/đang chế biến. Điểm đi là tọa độ **chi nhánh thực tế** được Store Service cung cấp hoặc snapshot hợp lệ. Điểm đến là tọa độ giao hàng đã xác minh từ Order. Cần hoàn thành truy vấn đường đi trước khi bắt đầu chuyến.
- Khi nhận sự kiện READY hợp lệ, Shipping khởi tạo **lần giao số 1** và ghi `readyAt`, `riderArrivalDueAt=readyAt+5s`, `attemptId`, `simulationPhase=WAITING_RIDER` bằng thời gian server. Nếu tuyến chưa sẵn sàng hoặc tọa độ thiếu, hiển thị **“Chưa thể bắt đầu mô phỏng — cần tuyến đường hợp lệ”**, cho retry tải tuyến; không tự chạy đường thẳng, không tạo giao thành công ảo.

### 5.2. Timeline chính xác của một lần giao thành công

| Mốc server | Trạng thái và thao tác tự động | Customer và Staff nhìn thấy |
| --- | --- | --- |
| `T0` khi Order.READY + đủ route | Shipment.ASSIGNED, chờ tài xế mô phỏng | **“Món đã xong, shipper đến lấy sau 5 giây”** và đếm ngược |
| `T0 + 5s` (bình thường là `T1`) | COD ứng tiền nội bộ; QR trả trước không ứng. Sau đó ghi PICKED_UP và SHIPPING, snapshot `deliveryStartedAt=T1`, `deliveryDueAt=T1+20s` | “Shipper đã nhận món”, “Đang giao hàng”; COD hiển thị “Đã thanh toán (mô phỏng)”, QR hiển thị “Đã thanh toán”. Không hiển thị thông tin ví đối tác |
| `T1` đến trước `T1 + 20s` | Dữ liệu Shipment.SHIPPING duy trì, marker tiến từ đầu đến cuối polyline trong đúng **20 giây**; chỉ Staff có nút báo thất bại | Cùng tuyến, điểm hiện tại, thanh tiến độ và ETA giảm đến 0, badge **MÔ PHỎNG** |
| `T1 + 20s` (bình thường là `T0 + 25s`) | Marker tới điểm giao. Backend tạo minh chứng demo và chuyển Shipment.DELIVERED; Order.COMPLETED khi qua payment gate. COD thu tiền khách ngoài hệ thống, không ghi xác nhận thu | **“Shipper đã đến nơi”**, sau đó **“Giao thành công (mô phỏng)”**, xem minh chứng gắn với đơn |

`T0` là mốc **Shipping thực sự kích hoạt lần giao**, chỉ khi dữ liệu và route hợp lệ; Order.READY có thể đến trước do Kafka nên không lấy thời điểm trình duyệt thấy READY làm mốc. Nếu điều kiện đầy đủ ngay khi Order.READY được ghi thì `T0` trùng mốc READY. `T1` là **thời điểm backend commit nhận hàng (và ứng tiền COD nếu cần) rồi bắt đầu giao**, sớm nhất `T0+5s`. Bình thường `T1=T0+5s`, nhưng nếu worker chậm hoặc ví COD cần xử lý thì bắt đầu đủ **20 giây chuyển động kể từ T1**, không rút ngắn quãng thời gian di chuyển. Độ trễ bất thường hiển thị rõ trên UI. Các mốc server lưu dạng `Instant` UTC, không tạo lại khi refresh/restart.

Ở `T1+20s`, hệ thống phải ghi nhận **đã đến nơi** trước, rồi tự thực hiện mô phỏng thu tiền/minh chứng và xác nhận giao. Nếu job xử lý chậm, marker vẫn đứng ở đích và UI hiện **“Đã đến nơi — đang xác nhận giao”** cho đến khi nhận Shipment.DELIVERED thật từ backend. Không hiển thị DELIVERED chỉ vì đồng hồ trên trình duyệt hết 20 giây.

### 5.3. Mapbox di chuyển trên tuyến đường thực

1. Backend Shipping lấy đường đi bằng **Mapbox Directions API** từ `(storeLongitude, storeLatitude)` đến `(customerLongitude, customerLatitude)`, chọn profile đường xe phù hợp, lưu một snapshot GeoJSON/encoded polyline cho từng attempt; không dùng đường nối thẳng giữa hai điểm. Token và hạn mức Mapbox cấu hình riêng, không ghi secret vào repo.
2. Duyệt các đoạn polyline và tính **chiều dài tích lũy**. Tại thời điểm `now`, tính `progress = clamp((serverNow - deliveryStartedAt)/20000, 0, 1)`. Marker nằm tại vị trí nội suy tương ứng `progress × tổng chiều dài tuyến`, chứ không đi theo từng đoạn với số thời gian bằng nhau. Như vậy di chuyển đều dọc **đúng hình tuyến đường**, luôn tới đích sau 20 giây, bất kể quãng đường dài hay ngắn.
3. Trả về `routeGeometry`, `start/end`, `deliveryStartedAt`, `deliveryDueAt`, `serverNow`, `attemptId`, `status`, `simulationPhase`, `version`. Customer Next.js và Staff React đều vẽ polyline + marker từ **cùng snapshot** và đồng bộ độ lệch đồng hồ client/server. `requestAnimationFrame` chỉ để render mượt; backend vẫn quyết định state.
4. Tải lại trang, mở tab mới, mất kết nối hay tab chạy nền đều lấy thời gian server và **tính lại vị trí đúng tại thời điểm hiện tại**, không chạy lại 20 giây từ đầu. Có thể polling 1–2 giây trong lúc SHIPPING hoặc dùng SSE/WebSocket nếu đã có hạ tầng, luôn polling lại khi kết nối phục hồi.
5. Dữ liệu tuyến được cố định theo attempt để hai màn hình cùng xem một đường. Khi sửa địa chỉ cho lần giao lại, tạo route snapshot **mới cho attempt mới**. Nếu Mapbox lỗi/thiếu route/thiếu tọa độ, hiện lỗi và nút thử lại dành cho Staff, không giả vờ có GPS hoặc tự chuyển DELIVERED.

### 5.4. Ví shipper ảo, COD và ảnh minh chứng

| Khoản/kiểu đơn | Quy tắc mô phỏng | Tác động hệ thống thanh toán thật |
| --- | --- | --- |
| Tiền hàng shipper ứng khi lấy hàng **chỉ COD** | **Chỉ đơn COD chưa trả tiền thật mới debit nội bộ**, bắt buộc thành công trước PICKED_UP. `goodsAdvance = max(0, Order.totalAmount - Order.shippingFee)`, lấy từ snapshot giá trị đã giảm giá/đổi điểm. **Không hiển thị số dư, biên nhận ví, khoản ứng trên Customer/Staff UI.** | Không thu tiền ngân hàng/quầy thật, không cập nhật Payment.COLLECTED/PAID |
| Đơn COD | Shipper thu tiền khách **ngoài hệ thống** khi giao; Clucky không kiểm soát hoặc giả xác nhận khoản thu. Khi tới đích, chỉ tạo minh chứng giao hàng demo và hoàn tất trạng thái giao hàng. | Payment của COD vẫn chưa được xác nhận thu thật. Báo cáo, Loyalty và refund không ghi nhận tiền ảo là tiền thực |
| Đơn đã thanh toán trước | **Bỏ qua hoàn toàn debit ví shipper**, vẫn chờ 5 giây rồi PICKED_UP/SHIPPING. Khi tới đích, hiển thị **“Đã thanh toán trước — shipper không thu thêm”**. | Giữ nguyên Payment.PAID đã xác minh, không thu khách lần hai |
| Giao thất bại | COD mock chưa thu; nếu có debit COD thì khoản ứng đang **chờ đối soát hoàn hàng**. Credit lại ví ảo đúng một lần **sau khi nhân viên xác nhận hoàn hàng**. Đơn trả trước không có debit/credit ví shipper. | Không tự tạo refund giao dịch thực, không tạo dòng doanh thu hay ghi nhận giao thành công |

Ví shipper là **dữ liệu vận hành demo áp dụng riêng COD** trong Shipping Service, không phải tài khoản tài chính/người giao hàng thật. Đề xuất một ví ảo cấu hình theo cửa hàng/định danh tài xế demo và ledger bất biến `DEBIT_ADVANCE`, `CREDIT_RETURN`, `DEMO_TOPUP` với số dư tính từ ledger. Lệnh debit COD phải có khóa duy nhất `(attemptId, DEBIT_ADVANCE)`; nếu số dư ảo không đủ, tạm dừng ở WAITING_RIDER và cho Manager nạp tiền demo có audit rồi mới chuyển PICKED_UP. Đơn đã thanh toán trước bỏ qua mọi kiểm tra số dư/debit/credit ví shipper.

Không có shipper thật cầm máy chụp ảnh. Khi tới đích, **backend tự đính kèm một ảnh mẫu có watermark “MINH CHỨNG MÔ PHỎNG”** và metadata `orderId`, `attemptId`, `simulated=true`, `deliveredAt`, `collectionType`; ảnh phải xuất hiện trong lịch sử/chi tiết đơn cho cả Customer và Staff. Ảnh mẫu không được trình bày thành ảnh hiện trường hay gắn EXIF vị trí không có thật. Nếu không thể tạo/lưu minh chứng, job lưu pha `ARRIVED_PENDING_PROOF`, retry an toàn và chưa đặt DELIVERED.

### 5.5. Nút “Giả lập giao hàng thất bại” trong 20 giây

- Chỉ **Staff/Store Manager/Admin thuộc chi nhánh** nhìn thấy nút trên đơn DELIVERY có `status=SHIPPING` và `serverNow < deliveryDueAt`. Customer chỉ xem trạng thái. Nhấn mở modal có **lý do bắt buộc** và ghi chú tùy chọn (lý do OTHER bắt buộc ghi chú); cần xác nhận gửi.
- Request đính kèm `orderId`, `attemptId`, `reasonCode`, `note`, `expectedVersion`, `idempotencyKey`. Shipping kiểm tra quyền/storeId, deadline và trạng thái trong **một transaction/lock**. Commit thành công ghi Shipment.FAILED, `simulationPhase=RESOLUTION_PENDING`, `failedAt`, `failureReason`, `failureLocation` tính theo progress tại thời điểm server nhận lệnh, và audit actor. Marker đóng băng tại vị trí cuối, hủy job auto-success của attempt đó.
- Race **FAIL vs AUTO_DELIVER** xét theo thời điểm server và khóa transaction. Lệnh thất bại chỉ hợp lệ khi được xử lý trước deadline và attempt vẫn SHIPPING; khi đã tới hạn/đã DELIVERED thì API trả `409 Conflict` với state mới để UI cập nhật. Double click hoặc retry cùng idempotency key chỉ nhận lại cùng kết quả; không thể vừa FAILED vừa DELIVERED.

### 5.6. Ma trận lý do thất bại và cách xử lý đề xuất

| `reasonCode` hiển thị | Nhân viên làm ngay sau khi bấm thất bại | Hướng xử lý của Manager |
| --- | --- | --- |
| `CUSTOMER_UNREACHABLE` — Không liên lạc được | Ghi lần gọi/thử liên hệ, thông báo khách xác minh số điện thoại | Nếu liên hệ lại được, nhận hoàn hàng và lên lần giao lại; nếu không, đóng giao không thành công |
| `CUSTOMER_ABSENT` — Khách không có mặt/không nhận máy | Ghi chú thời gian, đề nghị khách xác nhận thời điểm nhận | Sau xác nhận, hoàn hàng rồi giao lại; hết thời hạn xử lý thì đóng thất bại |
| `WRONG_ADDRESS` — Sai hoặc thiếu địa chỉ | Không tự suy đoán địa chỉ, yêu cầu khách cung cấp địa chỉ và tọa độ mới | Xác minh còn trong vùng giao và chi nhánh, lưu thay đổi có audit, hoàn hàng rồi tạo attempt mới với route mới; không hợp lệ thì đóng |
| `ACCESS_BLOCKED` — Không vào được tòa nhà/khu vực | Ghi thông tin cổng/điểm hẹn, yêu cầu khách phối hợp | Khi tiếp cận được thì giao lại sau hoàn hàng; nếu không thì đóng thất bại |
| `CUSTOMER_REFUSED` — Khách từ chối nhận | Ghi lý do từ chối, yêu cầu xác nhận từ Manager | Ưu tiên đóng thất bại; chỉ cho giao lại nếu khách chủ động đổi ý và Manager chấp thuận |
| `ITEM_DAMAGED` — Hàng đổ/vỡ, không đủ điều kiện giao | Đánh dấu món không thể giao và báo quản lý | Không dùng lại món đã hỏng. Manager quyết định chế biến lại bằng nghiệp vụ riêng hoặc đóng thất bại, cân nhắc hoàn tiền thực theo chính sách |
| `RIDER_INCIDENT` — Sự cố tài xế/phương tiện mô phỏng | Ghi sự cố, tạm dừng chuyến | Hoàn hàng về chi nhánh, cho lần giao lại bằng tài xế demo khác nếu món còn đạt điều kiện |
| `OTHER` — Lý do khác | Bắt buộc ghi chú rõ sự cố | Manager chọn hướng xử lý, ghi quyết định và lý do vào audit |

Các reasonCode trên là **đề xuất nghiệp vụ phiên bản mô phỏng**; không có thao tác tự động gọi khách hay khẳng định shipper thật đã liên hệ. “Gọi khách” là công việc do nhân viên thực hiện ngoài hệ thống và ghi log kết quả nếu cần.

### 5.7. Quy trình sau khi FAILED

1. **Ngay khi FAILED:** dừng marker và tất cả job hoàn thành của attempt, thông báo Staff/Manager “Giao thất bại — cần xử lý”, Customer thấy **“Giao chưa thành công, quán đang hỗ trợ”** cùng lý do được phép công khai. COD mock chưa thu; tiền shipper ứng đang ở trạng thái `ADVANCE_PENDING_RETURN`.
2. **Xác minh với khách:** Staff ghi ghi chú liên hệ, cập nhật thông tin điều chỉnh qua quyền phù hợp. Nếu đổi địa chỉ, phải kiểm tra lại tọa độ, phạm vi giao/chi phí và lưu phiên bản địa chỉ riêng cho attempt kế tiếp; không ghi đè snapshot của attempt đã FAILED. Mọi thay đổi giá/phí, nếu được hỗ trợ, phải qua quy trình duyệt riêng chứ không tự thu thêm.
3. **Hoàn hàng về quán:** nhân viên chọn **“Xác nhận hàng đã quay về quán (mô phỏng)”**, ghi `returnedAt`/actor, khóa attempt; với COD đã debit, backend credit lại khoản `DEBIT_ADVANCE` đúng một lần, có ledger đối ứng. Với đơn trả trước không đụng ví. Nếu hàng hỏng/mất/không thể hoàn, Manager ghi rõ tình trạng và xử lý khoản ứng COD bằng quyết định riêng có audit, không tự credit giả.
4. **Giao lại:** chỉ Manager (hoặc Admin có quyền chi nhánh) bấm **“Tạo lần giao lại”** sau khi hàng đã hoàn, kiểm tra món còn sử dụng được/địa chỉ hợp lệ. Giữ một Shipment của order, tạo `attemptNumber+1`, route snapshot mới, **chạy lại đủ 5 giây + 20 giây**, có debit mới **chỉ nếu COD**. Đề xuất `maxAttempts=2` (một lần đầu, một lần giao lại), cấu hình được; vượt số lần thì chỉ cho đóng thất bại hoặc xử lý ngoại lệ có audit.
5. **Không giao lại:** Manager bấm **“Đóng xử lý — giao không thành công”**, ghi quyết định, tình trạng hoàn hàng và khoản phải đối soát. Shipment giữ FAILED với `resolution=CLOSED_UNDELIVERABLE`; Order chuyển trạng thái terminal đề xuất `DELIVERY_FAILED`, không phát `order.completed`/cộng điểm. COD vẫn không thu. Nếu đơn đã trả tiền thực, chuyển qua **quy trình yêu cầu/duyệt hoàn tiền hiện hữu**; không tự xác nhận đã hoàn khi Payment chưa xác nhận.
6. **Không có hàng hoàn:** trạng thái `RETURN_PENDING/EXCEPTION` vẫn nằm trong hàng đợi Manager; bắt buộc giải quyết tình trạng hàng và ứng tiền ảo trước khi đóng. Khi bản demo chỉ có tài xế giả, nút xác nhận hoàn hàng là thao tác nhân viên có audit, không giả vờ có biên bản từ đối tác thật.

Không cho retry nếu Shipment đã DELIVERED hoặc Order đã COMPLETED/DELIVERY_FAILED; không tạo Shipment thứ hai cho cùng order, không tái sử dụng ảnh minh chứng hoặc debit của attempt cũ.

### 5.8. API, dữ liệu và event đề xuất

**API qua Gateway, tên route dự kiến:**

| Endpoint | Người dùng | Kết quả |
| --- | --- | --- |
| `GET /api/shipping/shipments/{orderId}/tracking` | Chủ đơn, Staff/Manager/Admin đúng store | Trạng thái, version, đồng hồ server, route, tiến độ, lần giao, minh chứng có kiểm tra quyền |
| `POST /api/shipping/shipments/{orderId}/simulation/fail` | Staff/Manager/Admin đúng store | Chỉ hợp lệ trong 20 giây đang SHIPPING, nhận reason, attemptId, version và idempotencyKey |
| `POST /api/shipping/shipments/{orderId}/simulation/return` | Staff/Manager/Admin đúng store | Xác nhận hoàn hàng/ảnh tình trạng nếu cần, credit ví ảo duy nhất một lần |
| `POST /api/shipping/shipments/{orderId}/simulation/retry` | Manager/Admin đúng store | Kiểm tra điều kiện, tạo attempt mới theo 5s + 20s |
| `POST /api/shipping/shipments/{orderId}/simulation/close` | Manager/Admin đúng store | Chốt thất bại, lưu quyết định và phát event cho Order |

Lưu bằng **Flyway migration mới** trong Shipping Service cho `shipment_simulation_attempts` (unique shipment + attemptNumber), route snapshot và coordinates, timestamps/phase/version, failure fields, return/resolution fields, `mock_wallet_ledger` (unique attempt + operation), metadata `simulation_proofs`, operation idempotency/inbox/outbox. Shipment bản cũ vẫn đọc được, `simulationMode` mặc định `NONE`; lịch sử `shipment_status_history` được cập nhật theo mỗi mốc chuyển thật, không ghi một dòng mỗi khung hình.

Shipping cần đọc tín hiệu Order.READY đáng tin cậy bằng event/outbox hoặc internal API xác thực và idempotent, thay vì chờ Staff bấm hoàn tất. Consumer Order cần nhận các sự kiện Shipping `shipping.started`, `shipping.delivered`, `shipping.failed`, `shipping.resolved` với `eventId`, `orderId`, `storeId`, `shipmentId`, `attemptId`, `source`, `version`, `occurredAt`, trạng thái và cờ thu tiền giả lập. Bên Order chỉ cập nhật khi transition hợp lệ, xử lý replay/out-of-order bằng event identity + version; không join database chéo service. Tất cả chức năng chỉ thực thi khi feature flag demo bật và backend xác thực owner/store.

### 5.9. Khả năng chịu lỗi và nhất quán

- Dùng job scheduler có lưu deadline và **reconciliation worker** tìm attempt quá hạn để chạy lại bước chờ lấy hàng/kết thúc giao sau restart, mất Kafka hoặc timeout. Không dựa vào `setTimeout` của frontend để cập nhật Shipping.
- Mỗi mốc debit, PICKED_UP, SHIPPING, mock COD, ảnh minh chứng, DELIVERED và `order.completed` có khóa idempotency riêng. Với thao tác liên service, dùng outbox + consumer idempotent và trạng thái trung gian để retry; không mất tiền ảo/đánh dấu hoàn tất một nửa khi lỗi giữa các bước.
- Nếu job thanh toán ví demo lỗi hoặc ví hết số dư, giữ WAITING_RIDER và hiển thị cần xử lý. Nếu Mapbox mất kết nối sau khi đã lưu tuyến, animation vẫn chạy từ route snapshot. Nếu chưa có tuyến, chặn bắt đầu. Nếu tạo ảnh demo lỗi lúc đến đích, đứng ở ARRIVED_PENDING_PROOF và retry.
- Nếu Staff ấn thất bại trùng lúc timeout, backend quyết định theo lock/deadline; client nhận 409 + trạng thái mới để đồng bộ. `serverNow`/version trả về mọi lần đọc để hạn chế lệch đồng hồ. Không bao giờ để `deliveredAt` và `failedAt` cùng là kết quả cuối của một attempt.
- Trạng thái FAILED phải có phân quyền hiển thị lý do riêng tư phù hợp; số điện thoại/địa chỉ chỉ trả cho chủ đơn và nhân viên đúng chi nhánh. UI customer/staff luôn có nhãn nổi bật **“Đang mô phỏng — chưa có tài xế đối tác”**.

## 6. Trình tự triển khai đề xuất

| Đợt | Công việc | Module chính | Điều kiện nghiệm thu |
| --- | --- | --- | --- |
| 1. Chuẩn hóa nghiệp vụ | Cập nhật SRS/API/state machine/BE-47, ba hình thức nhận, cổng COD mock, lý do thất bại, quyền xử lý và flag DEMO; thêm Order.DELIVERY_FAILED vào contract đề xuất | `architechture/docs`, specs, diagrams, tasks | Mọi màn hình, service thống nhất mode, trạng thái và vai trò |
| 2. Sửa Order và dữ liệu đầu vào | Kiểm tra receiver, address, tọa độ, paymentMethod; bổ sung chuẩn hóa mode; chặn DELIVERY completed sớm từ READY/PREPARING; dùng `order.status-changed` có `status=READY` (outbox hiện hữu) và consumer shipping result idempotent; phân biệt completed mock | `backend/cart-order-service`, migrations/DTO | READY không thể bị hoàn thành bởi nút Staff; trường hợp dữ liệu cũ có thông báo rõ |
| 3. Xây Shipping engine | Migrations mới cho attempts/clock/version/ledger/mock proof/fail/return/resolution/outbox; worker 5s, 20s + reconciliation; kiểm soát timeout race, route/cancel/retry, phân quyền | `backend/shipping-service`, `config-repo`, Gateway nếu cần | Đúng 5s chờ + 20s chạy tuyến khi điều kiện bình thường, dữ liệu bền qua restart, fail chặn success |
| 4. Tích hợp Mapbox | Lấy route Directions từ store tới customer và lưu geometry, tracking API có timestamp server, nội suy theo cumulative length, xử lý route lỗi | Shipping + Mapbox, Gateway | Marker đi trên đường thực từ quán tới nhà, Customer/Staff cùng tọa độ tại một thời điểm |
| 5. Giao diện Staff | Sửa `OrderCard`, `StaffOrdersPage`, `OrderDetailDrawer`, `ReceiptBillModal`; chia tab Đang giao/Cần xử lý, hiển thị 5s countdown, trạng thái thanh toán, map 20s, modal thất bại/lý do, hoàn hàng/giao lại/đóng, ảnh minh chứng. Không hiển thị ví đối tác | `frontend/react` | Không ghi DELIVERY là Mang về, không có nút Completed sai, Staff xử lý được tất cả case thất bại |
| 6. Giao diện Customer | Dùng tracking backend thay browser-only demo, hiển thị đúng 3 mode, route/map, ETA, giao thành công demo + ảnh; khi FAILED hiển thị trạng thái hỗ trợ và tiến trình giao lại | `frontend/nextjs` | Cùng order cùng route/tiến độ sau reload và trên hai máy |
| 7. Tiền & sự kiện liên quan | Không cho mock wallet/COD vào Payment thực; đảm bảo `order.completed` có source mock để Loyalty/Report/Notification không ghi doanh thu hay điểm chưa phát sinh, luồng refund đã trả trước theo nghiệp vụ hiện hữu | Payment, Order, Loyalty, Report, Notification nơi có consumer | Không có tiền, điểm, refund hay sự kiện thành công bị ghi nhận sai hoặc lặp |
| 8. Áp dụng | Khi thực sự sửa mã/config, rebuild từng service có ảnh hưởng bằng `./start-docker.ps1 -Services ...`, giữ volumes và xem trạng thái container; người dùng tự kiểm thử tính năng theo AGENTS.md | Các service/frontend bị thay đổi | Build/deploy thành công từng phần, không thay dữ liệu cũ ngoài migration được chấp thuận |

**Không sửa Flyway migration đã áp.** Shipment hiện có `orderId` unique, schema đã có tọa độ trong migration nhưng DTO đọc shipment còn thiếu dữ liệu track. Các màn hình Next.js/React hiện có state demo cục bộ, phải thay bằng một nguồn Shipping Service; không cấu hình hai simulator cùng vận hành. Đặc biệt cần sửa nhánh `OrderService.updateStatus` hiện cho phép DELIVERY hoàn tất sớm khi đã PAID.

## 7. Bộ tình huống nghiệm thu thủ công

| Nhóm | Tình huống cần thử | Kết quả mong đợi |
| --- | --- | --- |
| Hiển thị | DINE_IN, TAKE_AWAY, DELIVERY trên card, bill/KOT, danh sách, detail, Customer | Mode đúng; DINE_IN hiển thị tự ra quầy nhận, không có bàn |
| Nhận tại quầy | DINE_IN READY, khách chưa tới; sau đó nhân viên xác nhận khách đã lấy và đã trả tiền | READY được giữ đến khi xác nhận, rồi COMPLETED một lần |
| Dữ liệu giao | Tạo DELIVERY thiếu tên, SĐT, địa chỉ, tọa độ hoặc ngoài vùng; Kafka `order.created` trễ | Chặn dữ liệu invalid; shipment chưa có thì trạng thái chờ; không giả địa chỉ |
| Đếm 5 giây | READY, route sẵn, COD ví ảo đủ tiền hoặc đơn đã thanh toán trước | Trong 5s chờ, COD debit đúng một lần trước PICKED_UP; đơn đã trả trước không debit và vẫn tự PICKED_UP/SHIPPING |
| Mapbox 20 giây | Store→customer tuyến ngắn/dài, hai màn hình cùng mở | Marker đi theo polyline đường thực, tới đúng điểm cuối khi đủ 20s, ETA/tiến độ đồng bộ |
| Mất kết nối | Reload ở giây 8, chuyển tab ở giây 12, mở máy thứ hai | Marker tính từ thời gian server, không quay về đầu, không chạy lại timer |
| Success COD | Đến điểm cuối, tạo mock proof, khách trả tiền cho shipper ngoài hệ thống | Có `simulatedAdvanceConfirmed` lúc pickup, ảnh watermark, Shipment.DELIVERED, Order.COMPLETED demo; **không có `SIMULATED_COLLECTION_CONFIRMED`**, Payment thực chưa COLLECTED, không cộng doanh thu/điểm ảo |
| Success prepaid | Order có Payment.PAID từ trước | **Không trừ ví shipper, không thu tiền khách**, ảnh mock, Order.COMPLETED đúng một lần |
| Fail sớm | Staff bấm thất bại ở giây 3 của 20s và chọn `CUSTOMER_UNREACHABLE` | Marker dừng đúng chỗ, Shipment.FAILED, không auto delivered ở giây 20, vào hàng đợi cần xử lý |
| Fail các loại | Sai địa chỉ, khách vắng, từ chối, hàng hỏng, sự cố rider, OTHER thiếu note | Hiện workflow đúng từng case, OTHER yêu cầu note, customer chỉ thấy thông báo phù hợp |
| Return/retry | Thất bại→xác nhận hoàn hàng→ví ảo credit→Manager giao lại | Attempt #2 riêng, chạy lại đủ 5s+20s, debit mới đúng một lần, history attempt #1 còn nguyên |
| Đóng thất bại | Manager quyết định không giao lại, có/không có tiền chuyển khoản trước | Shipment.FAILED/CLOSED, Order.DELIVERY_FAILED, không completed/loyalty; refund thực chỉ qua quy trình hiện hữu |
| Cạnh tranh | Staff fail lúc 19,9 giây, lúc 20,1 giây, double-click và job timeout đồng thời | Backend trả một kết quả cuối duy nhất hoặc 409 đúng, không đồng thời failed+delivered |
| Sự cố hệ thống | Restart service ở giây 4/giây 17, mất consumer, Mapbox timeout, ví demo thiếu tiền, lỗi lưu ảnh | Scheduler phục hồi đúng mốc, không duplicate debit/proof/event; không tự tạo delivery thành công khi thiếu dữ liệu |
| Phân quyền | Staff cửa hàng A truy cập B, khách truy cập đơn khác, người không có role gọi fail/retry | Backend 403/404 phù hợp, không lộ thông tin người nhận hay tuyến |
| Dữ liệu cũ | Đơn đã tồn tại, không có geo hoặc thiếu thông tin người nhận | Hiển thị cảnh báo và quy trình xác minh, không tự backfill dữ liệu tưởng tượng |

## 8. Các quyết định nghiệp vụ đã có và phần đề xuất mặc định

**Đã xác định từ yêu cầu:** (1) DINE_IN khách tự lấy tại quầy, không bàn và không phục vụ tại bàn. (2) DELIVERY.READY tự chờ 5s; **chỉ COD** ứng tiền nội bộ trước bàn giao, rồi đi tuyến Mapbox 20s; QR khách thanh toán thật trước, shipper không ứng tiền. (3) Customer và Staff theo dõi cùng một lần giao, bản đồ Customer nằm ngay khung trạng thái. (4) Khi đến nơi, COD shipper thu tiền khách **ngoài luồng, không xác minh**, hai phương thức đều gắn minh chứng mock và hoàn tất. (5) Staff được bấm thất bại khi còn trong 20s và hệ thống phải có hướng giải quyết. (6) Giao diện **không hiển thị ví shipper, debit/credit hay số dư**, chỉ các trạng thái chính.

**Đề xuất để triển khai nhất quán, có thể thay đổi khi duyệt chính sách:**

1. **Giới hạn giao lại** một lần, tức tối đa 2 attempts cho một order. Manager là người quyết định retry/đóng. Không có shipper thật, mọi xác nhận hoàn hàng đều là thao tác mock có audit.
2. **Mức ứng tiền ảo chỉ áp dụng cho COD chưa được thanh toán thực**, bằng tổng thanh toán trừ phí giao hàng. Đơn đã thanh toán trước (kể cả COD đã được xác nhận PAID/COLLECTED trước khi sẵn sàng giao) bỏ qua bước debit và mọi đối soát ví shipper. Ví có số dư khởi tạo qua config, không chạm Payment thực; phiên bản hiện tại chưa có chức năng nạp ví demo riêng.
3. **Chính sách COD mô phỏng** ứng tiền nội bộ lúc pickup, không ghi customer collection, không đổi Payment.COLLECTED. Khi COD được giao thành công giả lập, Order phát `order.status-changed` với cờ `mockDelivery` và `simulationOnly`, **không phát `order.completed`** để consumer hiện tại không ghi doanh thu/điểm từ tiền giả lập. Chỉ đơn QR trả trước được xác nhận thật mới phát `order.completed`.
4. **Minh chứng** là ảnh mẫu có watermark và metadata order/attempt. Không có thao tác chụp ảnh thật từ tài xế trong bản này.
5. **Đóng xử lý thất bại** dùng Order `DELIVERY_FAILED` terminal mới. Các trường hợp refund, làm lại món, phí phát sinh hoặc hoàn đồ ăn vẫn cần Manager áp dụng quy trình và chính sách kinh doanh hiện hữu, không tự động sinh refund/hủy đơn sau khi chế biến.

## 9. Phạm vi khảo sát và trạng thái thực hiện

Ngày 14/11/2026 đã triển khai Shipping engine, Kafka projection sang Order, 2 giao diện tracking Mapbox, quy tắc COD/đơn trả trước và xử lý thất bại. Docker local đã build và restart thành công các container `cart-order-service`, `shipping-service`, `customer`, `admin` với healthcheck đạt; chỉnh sửa nhỏ về trạng thái COD đã thanh toán được rebuild bổ sung sau đó. Môi trường Docker local có `SHIPPING_MOCK_ENABLED=true`, production giữ mặc định tắt; cần Mapbox Directions token hợp lệ và tọa độ chi nhánh/khách hàng chính xác để bắt đầu tuyến đường. Toàn bộ thao tác ứng/thu COD, tài xế và minh chứng chỉ là mô phỏng. Chưa chạy bộ kiểm thử chức năng, test/lint/typecheck riêng hoặc trình duyệt theo AGENTS.md; người dùng tự chạy bộ tình huống nghiệm thu thủ công ở mục 7. Nhận định về đơn thiếu thông tin người nhận cần đối chiếu orderId cụ thể trên môi trường đang chạy.
