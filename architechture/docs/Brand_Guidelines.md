# BRAND GUIDELINES — QUY CHUẨN THƯƠNG HIỆU CLUCKY
## Phiên bản 2.0 — 23/10/2026 (thông số thương hiệu do chủ dự án cung cấp và chốt)

## 1. Thương hiệu
- **Tên thương hiệu:** Clucky
- **Slogan:** *Clucky - Crispy Outside, Happy Inside*
  - Dịch nghĩa: "Giòn tan bên ngoài, vui vẻ bên trong" — câu slogan dùng nguyên văn tiếng Anh trên các ấn phẩm, tiêu đề trang và banner chính.
- **Lĩnh vực:** Chuỗi cửa hàng gà rán / thức ăn nhanh bán trực tuyến.
- **Tính cách thương hiệu:** Cao cấp như nhà hàng nhưng vẫn gần gũi, vui vẻ và dễ thương — thể hiện qua cặp font bo tròn (Baloo 2/Quicksand) trên nền bảng màu sẫm sang trọng. Tránh cảm giác rẻ tiền, tránh lòe loẹt trẻ con kiểu đồ chơi.
- **Đối tượng chính:** Khách hàng trẻ, gia đình, học sinh — sinh viên và dân văn phòng đặt món trực tuyến.

## 2. Logo
> **Trạng thái: Chủ dự án sẽ tự bổ sung sau.** Tài liệu này để sẵn vị trí và quy cách cho 3 hạng mục logo; khi có file logo chính thức, chèn vào đúng các mục dưới đây và cập nhật đường dẫn file.

### 2.1. Logo Primary (logo chính)
- *[VỊ TRÍ ĐỂ CHÈN: Logo Primary — file vector (SVG/AI) và bản PNG nền trong suốt]*
- Dùng trên: header website Customer, header trang quản trị, bao bì chính, tài liệu, biển hiệu.
- Là bản logo đầy đủ: biểu tượng + chữ "Clucky", màu theo Mục 3 trên nền Kem `#F5EDE0` hoặc nền Espresso `#16100D` (bản âm bản).

### 2.2. Logo Secondary (logo phụ / rút gọn)
- *[VỊ TRÍ ĐỂ CHÈN: Logo Secondary — bản rút gọn của logo chính]*
- Dùng khi không gian hẹp hoặc logo chính quá chi tiết: avatar mạng xã hội, watermark ảnh món, tem dán hộp, đồng phục.

### 2.3. Favicon
- *[VỊ TRÍ ĐỂ CHÈN: Favicon — xuất file .ico/.png các kích thước 16×16, 32×32, 180×180 (Apple touch icon)]*
- Dùng trên: tab trình duyệt của cả website Customer (Next.js) và trang quản trị (React), cấu hình trong thẻ `<head>` / file manifest.
- Yêu cầu: chỉ dùng biểu tượng (symbol) của logo, không kèm chữ, vẫn nhận diện được ở 16×16 px.

### 2.4. Quy cách sử dụng logo (áp dụng khi đã có logo)
- Khoảng trống an toàn xung quanh logo tối thiểu bằng chiều cao của ký tự "C" trong logo.
- Kích thước tối thiểu: bản in 30 mm, bản màn hình 120 px chiều ngang (logo đầy đủ); favicon/symbol không nhỏ hơn 16 px.
- Không kéo giãn, không xoay, không đổi màu ngoài bảng màu Mục 3, không đặt logo trên nền ảnh rối hoặc nền có độ tương phản thấp.
- Trên nền Espresso/tối: dùng bản logo sáng (chữ Kem/Vàng đồng). Trên nền Kem/trắng: dùng bản logo sẫm (chữ Espresso/Đỏ rượu).

## 3. Bảng màu chính thức
| Vai trò | Tên gọi | Hex | Tỉ lệ sử dụng | Cách dùng |
|---|---|---|---|---|
| Màu nền tối / chữ chính | Espresso (nâu-đen) | `#16100D` | Thuộc nhóm 65% cùng Kem | Header tối, footer, chữ chính, nền khối cinematic |
| Màu nền sáng | Kem (Cream) | `#F5EDE0` | Thuộc nhóm 65% cùng Espresso | Nền section, nền thẻ trên nền tối, bao bì |
| Màu chủ đạo | Đỏ rượu (Wine Red) | `#8F1216` | 25% | Nút chính (Đặt hàng, Thanh toán), tiêu đề nhấn, giá, banner khuyến mãi, trạng thái quan trọng |
| Màu điểm nhấn | Vàng đồng (Burnished Gold) | `#C9A227` | 10% | Điểm nhấn cao cấp: viền mảnh, badge khuyến mãi, sao đánh giá, nhãn hạng thành viên, chi tiết logo |

**Quy tắc tỉ lệ 65 – 25 – 10:** khoảng 65% diện tích là màu trung tính (nâu-đen Espresso và Kem), 25% là Đỏ rượu, chỉ 10% là Vàng đồng. Đây là nguyên tắc cốt lõi tạo cảm giác "sang như nhà hàng, không hề trẻ con": màu đỏ và vàng vẫn là chủ đạo về nhận diện nhưng không bao giờ chia khối đều nhau hay dùng ở độ bão hòa chói.

**Màu trạng thái (UI, ngoài bảng màu thương hiệu):**
| Trạng thái | Hex | Dùng cho |
|---|---|---|
| Thành công | `#1E7A46` | Hoàn thành, Đã thanh toán, Còn món |
| Cảnh báo | `#D97706` | Chờ thanh toán, Sắp hết hàng, Chờ duyệt |
| Lỗi / Hủy | `#B42318` | Đã hủy, Thanh toán lỗi, Hết hàng (kèm icon/chữ để phân biệt với đỏ thương hiệu) |
| Thông tin | `#22577A` | Liên kết, trạng thái đang giao, thông báo hệ thống |
| Chữ phụ trên nền sáng | `#6B6259` | Mô tả món, metadata (kcal, thời gian), ghi chú |
| Viền trên nền sáng | `#E8E2D9` | Viền thẻ, đường kẻ bảng |

## 4. Typography (Phông chữ) — CHÍNH THỨC
| Vai trò | Font | Đặc điểm & cách dùng |
|---|---|---|
| **Tựa đề (Headings)** | **Baloo 2** — dùng weight Bold / SemiBold (bản mô tả gốc: "Baloo 2 (Black)") | Các góc chữ được bo tròn mềm mại, mang lại cảm giác gần gũi, vui vẻ và dễ thương. Dùng cho: logo wordmark, H1/H2, tên món nổi bật, số giá lớn, chữ trên banner. Không dùng Baloo 2 cho đoạn văn dài. |
| **Văn bản (Body)** | **Quicksand** — Regular / Medium / Bold | Khoảng cách chữ rộng rãi, thoáng mắt, rất dễ đọc ở kích thước nhỏ như các đoạn mô tả thành phần món ăn. Dùng cho: toàn bộ nội dung, mô tả, nút bấm, form, bảng dữ liệu quản trị, thông báo. |

- Cả hai font đều có trên Google Fonts, tải qua fontsource/webfont và khai báo dùng chung cho cả hai frontend: Customer (Next.js — khai báo trong `app/layout.tsx` bằng `next/font`) và trang quản trị (React — khai báo trong `index.html` / CSS global). Cấu hình dự phòng (fallback): `'Baloo 2', 'Quicksand', system-ui, sans-serif`.
- Lưu ý tiếng Việt: khi nhúng font phải chọn subset **vietnamese** trên Google Fonts để hiển thị đúng dấu tiếng Việt ở cả Baloo 2 và Quicksand.
- Thang chữ gợi ý: H1 = 40-48 px Baloo 2, H2 = 30-34 px Baloo 2, H3 = 22-24 px Baloo 2/Quicksand Bold, Body = 15-16 px Quicksand, Caption/metadata = 13 px Quicksand.
- Slogan trên ấn phẩm luôn viết: **Clucky - Crispy Outside, Happy Inside** (Baloo 2, có thể đặt dưới logo chính).

## 5. Phong cách giao diện (UI Style)
- Hai mảng nền chính: Kem `#F5EDE0` cho các section sáng và Espresso `#16100D` cho các khối tạo điểm nhấn (hero, footer, banner lớn) — theo đúng tỉ lệ Mục 3.
- Thẻ món (card): nền trắng/Kem, bo góc lớn 16-20 px (đồng bộ với tinh thần bo tròn của Baloo 2), viền mảnh vàng đồng hoặc không viền + bóng đổ rất nhẹ; ảnh món lớn phía trên; tên món Baloo 2; mô tả Quicksand; giá Đỏ rượu đậm; nút thêm món nền Đỏ rượu, chữ trắng.
- Nút bấm: bo góc dạng pill hoặc bo 12-14 px, chữ Quicksand Bold; nút chính = Đỏ rượu, nút phụ = viền Espresso trên nền trong suốt/Kem, nút nhấn đặc biệt (khuyến mãi) = Vàng đồng chữ Espresso.
- Badge/sticker khuyến mãi: nền Vàng đồng, chữ Espresso, bo tròn, có thể xoay nhẹ -3° đến -6° cho cảm giác vui vẻ nhưng không lạm dụng.
- Ảnh món ăn: chụp nền tối Espresso hoặc nền Kem, ánh sáng ấm, món ăn (gà vàng giòn) là trung tâm và chiếm tỉ lệ lớn; tránh ảnh nền trắng lạnh kiểu stock công nghiệp.
- Icon: nét bo tròn, độ dày nét đều, màu Espresso hoặc Đỏ rượu; tránh icon góc cạnh sắc nhọn.

## 6. Ứng dụng theo kênh
- **Website Customer (Next.js):** áp dụng đầy đủ nhận diện: hero Espresso + chữ Baloo 2 Kem/Vàng đồng, section Kem, thẻ món như Mục 5, footer Espresso.
- **Trang quản trị (React — Staff / Store Manager / Admin):** dùng cùng bảng màu và font nhưng tiết chế: nền Kem/trắng ấm là chính, Espresso cho sidebar/header, Đỏ rượu chỉ cho nút hành động chính và cảnh báo, Vàng đồng cho điểm nhấn trạng thái; ưu tiên mật độ thông tin và tốc độ thao tác.
- **Bao bì:** hộp Kem, logo Primary sẫm, dải Đỏ rượu, chi tiết Vàng đồng; cốc/túi cùng hệ.
- **Mạng xã hội:** template nền Espresso hoặc Kem, chữ Baloo 2, ảnh món lớn, slogan đặt cố định ở chân bài.
- **Tài liệu/báo cáo đồ án:** tiêu đề Baloo 2 (nếu nhúng được font) hoặc font thay thế gần nhất, màu tiêu đề Đỏ rượu `#8F1216`, điểm nhấn Vàng đồng.

## 7. Không làm (Don'ts)
- Không phá tỉ lệ 65-25-10 (đặc biệt: không tăng Vàng đồng/Đỏ rượu thành nền chính diện rộng gây lòe, trẻ con).
- Không dùng các bảng màu đã bị loại trong quá trình thiết kế: xanh cobalt color-blocking; đỏ tươi + vàng chanh chói kiểu fast-food truyền thống.
- Không thay font tựa đề/văn bản bằng font khác khi chưa cập nhật tài liệu này; không dùng font serif cho thương hiệu Clucky.
- Không sao chép nhận diện của KFC hay chuỗi gà rán có sẵn (màu đỏ tươi, sọc, hình người sáng lập...).
- Không dùng logo ở trạng thái chưa chính thức thay cho 3 hạng mục tại Mục 2 trong bản phát hành cuối — mục Logo phải được bổ sung file chính thức trước khi nộp/in ấn.
