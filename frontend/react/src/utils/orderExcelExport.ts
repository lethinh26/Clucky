import type { StaffOrder } from "../mocks/mockStaffOrders";
import type { BankTransactionItem } from "../mocks/mockPosCatalog";
import type { AdminOrder } from "../types/order";
import type { BackendCounterReceipt, Store } from "../lib/api";

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDateTimeVn(iso?: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateLabelVn(ymd?: string, locale = "vi"): string {
  const isEn = locale.toLowerCase().startsWith("en");
  if (!ymd) return isEn ? "All dates" : "Tất cả các ngày";
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return ymd;
  try {
    const dt = new Date(Date.UTC(y, m - 1, d, 5, 0, 0));
    const weekday = new Intl.DateTimeFormat(isEn ? "en-US" : "vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long",
    }).format(dt);
    return `${weekday}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  } catch {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
}

export function shiftDateYmd(ymd: string, deltaDays: number): string {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return ymd;
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getOrderVnDateYmd(iso?: string): string {
  if (!iso) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
    return parts;
  } catch {
    return iso.slice(0, 10);
  }
}

export function getTodayVn(): string {
  return getOrderVnDateYmd(new Date().toISOString());
}

function triggerExcelDownload(xmlContent: string, filename: string) {
  const blob = new Blob(["\uFEFF", xmlContent], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const EXCEL_STYLES = `
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#16100D"/>
    </Style>
    <Style ss:ID="Title">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="15" ss:Bold="1" ss:Color="#8F1216"/>
    </Style>
    <Style ss:ID="Subtitle">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Italic="1" ss:Color="#6B6259"/>
    </Style>
    <Style ss:ID="SectionHeader">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#8F1216" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="TableHeader">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#8F1216"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#16100D"/>
      <Interior ss:Color="#F5EDE0" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CellText">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
      </Borders>
    </Style>
    <Style ss:ID="CellCenter">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
      </Borders>
    </Style>
    <Style ss:ID="CellMoney">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8E2D9"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#8F1216"/>
      <NumberFormat ss:Format="#,##0 &quot;đ&quot;"/>
    </Style>
    <Style ss:ID="SummaryLabel">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#16100D"/>
      <Interior ss:Color="#FFFAF3" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="SummaryValue">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D6C9B9"/>
      </Borders>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#1E7A46"/>
    </Style>
  </Styles>
`;

function staffKitchenLabel(status: StaffOrder["status"]): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Chờ thanh toán";
    case "CONFIRMED":
      return "Mới xác nhận";
    case "PREPARING":
      return "Đang chế biến";
    case "READY":
      return "Sẵn sàng trả món";
    case "SHIPPING":
      return "Đang giao hàng";
    case "COMPLETED":
      return "Đã hoàn tất bàn giao";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

function staffPaymentStatusLabel(status: string): string {
  switch (status) {
    case "COLLECTED":
    case "PAID":
      return "Đã thu tiền";
    case "PENDING":
      return "Chờ thu tiền";
    case "DISCREPANCY":
      return "Cần đối soát";
    default:
      return status;
  }
}

function staffPaymentMethodLabel(method: StaffOrder["paymentMethod"]): string {
  switch (method) {
    case "CASH":
      return "Tiền mặt (CASH)";
    case "COD":
      return "Tiền mặt khi nhận (COD)";
    case "BANK_TRANSFER":
      return "Chuyển khoản (VietQR)";
    case "SPLIT":
      return "Kết hợp (Tiền mặt + QR)";
    default:
      return method;
  }
}

export function exportStaffDailyOrdersExcel(params: {
  date: string;
  storeName: string;
  staffName: string;
  orders: StaffOrder[];
  receiptsByCode?: Record<string, BackendCounterReceipt>;
}) {
  const { date, storeName, staffName, orders, receiptsByCode = {} } = params;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED");
  const processingOrders = orders.filter((o) =>
    ["CONFIRMED", "PREPARING", "READY", "SHIPPING"].includes(o.status)
  );
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");
  const collectedOrders = orders.filter((o) =>
    ["PAID", "COLLECTED"].includes(o.paymentStatus)
  );

  const totalRevenue = collectedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const cashRevenue = collectedOrders
    .filter((o) => ["CASH", "COD", "SPLIT"].includes(o.paymentMethod))
    .reduce((sum, o) => {
      const rec = receiptsByCode[o.orderCode];
      if (rec) return sum + (rec.cashAmount || 0);
      return sum + (o.paymentMethod === "CASH" || o.paymentMethod === "COD" ? o.total : o.cashTendered || 0);
    }, 0);
  const transferRevenue = collectedOrders
    .filter((o) => o.paymentMethod === "BANK_TRANSFER" || o.paymentMethod === "SPLIT")
    .reduce((sum, o) => {
      const rec = receiptsByCode[o.orderCode];
      if (rec) return sum + (rec.bankAmountDeclared || rec.bankAmountReconciled || 0);
      return sum + (o.paymentMethod === "BANK_TRANSFER" ? o.total : o.bankDeclaredAmount || 0);
    }, 0);
  const totalCashTendered = orders.reduce((sum, o) => {
    const rec = receiptsByCode[o.orderCode];
    const tendered =
      rec?.cashTendered ??
      o.cashTendered ??
      ((o.paymentMethod === "CASH" || o.paymentMethod === "COD") &&
      ["PAID", "COLLECTED"].includes(o.paymentStatus)
        ? o.total
        : 0);
    return sum + tendered;
  }, 0);
  const totalCashChange = orders.reduce((sum, o) => {
    const rec = receiptsByCode[o.orderCode];
    const change = rec?.cashChange ?? o.cashChange ?? 0;
    return sum + change;
  }, 0);

  const rowsXml = orders
    .map((o, idx) => {
      const rec = receiptsByCode[o.orderCode];
      const itemsText = o.items
        .map((it) => `${it.quantity}x ${it.itemName}${it.options ? ` (${it.options})` : ""}`)
        .join("; ");
      const totalQty = o.items.reduce((s, it) => s + it.quantity, 0);
      const cashTendered =
        rec?.cashTendered ??
        o.cashTendered ??
        ((o.paymentMethod === "CASH" || o.paymentMethod === "COD") &&
        ["PAID", "COLLECTED"].includes(o.paymentStatus)
          ? o.total
          : 0);
      const cashChange = rec?.cashChange ?? o.cashChange ?? 0;
      const cashier = rec?.staffName || o.cashierName || staffName || "Nhân viên ca trực";
      const receiptCode =
        rec?.receiptCode ||
        o.receiptCode ||
        o.bankRefCode ||
        (["PAID", "COLLECTED"].includes(o.paymentStatus) ? `REC-${o.orderCode}` : "—");

      return `
        <Row ss:AutoFitHeight="1" ss:Height="26">
          <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(o.orderCode)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">#${String(o.queueNumber).padStart(3, "0")}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(formatDateTimeVn(o.createdAt))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${o.orderSource === "COUNTER" ? "Tại quầy (POS)" : "Đặt Online (Web)"}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${o.diningOption === "DINE_IN" ? "Ăn tại quán" : "Mang về / Giao hàng"}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(o.customerName || "Khách tại quầy")}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(o.customerPhone || "—")}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(itemsText)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${totalQty}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${o.subtotal || o.total || 0}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${o.discount || 0}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${o.total || 0}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(staffPaymentMethodLabel(o.paymentMethod))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(staffPaymentStatusLabel(o.paymentStatus))}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${cashTendered}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${cashChange}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(receiptCode)}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(cashier)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(staffKitchenLabel(o.status))}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(o.note || "")}</Data></Cell>
        </Row>
      `;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Thong Ke Ngay ${escapeXml(date)}">
    <Table>
      <Column ss:Width="45"/>
      <Column ss:Width="135"/>
      <Column ss:Width="75"/>
      <Column ss:Width="135"/>
      <Column ss:Width="115"/>
      <Column ss:Width="120"/>
      <Column ss:Width="150"/>
      <Column ss:Width="105"/>
      <Column ss:Width="290"/>
      <Column ss:Width="70"/>
      <Column ss:Width="110"/>
      <Column ss:Width="95"/>
      <Column ss:Width="120"/>
      <Column ss:Width="145"/>
      <Column ss:Width="110"/>
      <Column ss:Width="120"/>
      <Column ss:Width="115"/>
      <Column ss:Width="125"/>
      <Column ss:Width="150"/>
      <Column ss:Width="140"/>
      <Column ss:Width="180"/>

      <Row ss:Height="28">
        <Cell ss:MergeAcross="20" ss:StyleID="Title">
          <Data ss:Type="String">CLUCKY FAST FOOD — BẢNG THỐNG KÊ HOẠT ĐỘNG &amp; ĐƠN HÀNG THEO NGÀY</Data>
        </Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="20" ss:StyleID="Subtitle">
          <Data ss:Type="String">Chi nhánh: ${escapeXml(storeName)} | Ngày hoạt động: ${escapeXml(formatDateLabelVn(date))} (${escapeXml(date)}) | Người xuất: ${escapeXml(staffName)} | Thời điểm xuất: ${escapeXml(formatDateTimeVn(new Date().toISOString()))}</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="5" ss:StyleID="SectionHeader">
          <Data ss:Type="String">I. TỔNG HỢP KẾT QUẢ XỬ LÝ ĐƠN HÀNG &amp; THU NGÂN TRONG NGÀY</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">Tổng số đơn hàng trong ngày</Data></Cell>
        <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${orders.length}</Data></Cell>
        <Cell ss:StyleID="SummaryLabel"><Data ss:Type="String">Tổng doanh thu đã thu (VND)</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${totalRevenue}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">Số đơn đã hoàn tất bàn giao</Data></Cell>
        <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${completedOrders.length}</Data></Cell>
        <Cell ss:StyleID="SummaryLabel"><Data ss:Type="String">Thực thu Tiền mặt / COD (VND)</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${cashRevenue}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">Số đơn đang chế biến / chờ giao</Data></Cell>
        <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${processingOrders.length}</Data></Cell>
        <Cell ss:StyleID="SummaryLabel"><Data ss:Type="String">Tổng tiền khách đưa / Tiền thối lại</Data></Cell>
        <Cell ss:StyleID="SummaryValue"><Data ss:Type="String">${new Intl.NumberFormat("vi-VN").format(totalCashTendered)} đ / Thối: ${new Intl.NumberFormat("vi-VN").format(totalCashChange)} đ</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">Số đơn đã hủy</Data></Cell>
        <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${cancelledOrders.length}</Data></Cell>
        <Cell ss:StyleID="SummaryLabel"><Data ss:Type="String">Tổng thu Chuyển khoản / VietQR (VND)</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${transferRevenue}</Data></Cell>
      </Row>
      <Row ss:Height="12"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="20" ss:StyleID="SectionHeader">
          <Data ss:Type="String">II. CHI TIẾT ĐƠN HÀNG &amp; CÔNG VIỆC ĐÃ THỰC HIỆN TRONG NGÀY (${orders.length} ĐƠN)</Data>
        </Cell>
      </Row>
      <Row ss:Height="28">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">STT</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mã đơn hàng</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Số Queue</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Thời gian tạo</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Nguồn đơn</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Hình thức</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Khách hàng</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Số điện thoại</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Chi tiết món ăn đã làm</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">SL món</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tạm tính</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Giảm giá</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tổng thanh toán</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Phương thức TT</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Trạng thái TT</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tiền khách đưa</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tiền thối lại</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mã biên lai / Tham chiếu</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Nhân viên thực hiện</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Trạng thái công việc</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Ghi chú</Data></Cell>
      </Row>
      ${rowsXml}
    </Table>
  </Worksheet>
</Workbook>`;

  const safeDate = date.replace(/[^0-9-]/g, "") || "today";
  triggerExcelDownload(xml, `Thong-ke-don-hang-ca-truc-${safeDate}.xls`);
}

function adminStatusLabel(status: AdminOrder["status"]): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Chờ thanh toán";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PREPARING":
      return "Đang chuẩn bị";
    case "READY":
      return "Sẵn sàng giao/nhận";
    case "SHIPPING":
      return "Đang giao hàng";
    case "COMPLETED":
      return "Đã hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

function adminPaymentMethodLabel(method?: string): string {
  switch (method) {
    case "CASH":
      return "Tiền mặt tại quầy";
    case "COD":
      return "Tiền mặt khi nhận (COD)";
    case "BANK_TRANSFER":
      return "Chuyển khoản ngân hàng (VietQR)";
    case "SPLIT":
      return "Thanh toán kết hợp";
    default:
      return method || "Chưa xác định";
  }
}

function adminPaymentStatusLabel(status?: string): string {
  switch (status) {
    case "PAID":
      return "Đã thanh toán";
    case "COLLECTED":
      return "Đã thu tiền";
    case "PENDING":
      return "Chờ thanh toán";
    case "REFUNDED":
      return "Đã hoàn tiền";
    default:
      return status || "Chưa xác minh";
  }
}

export function exportAdminOrdersByDateExcel(
  orders: AdminOrder[],
  stores: Store[],
  dateLabel = "",
  receiptsByCode: Record<string, BackendCounterReceipt> = {}
) {
  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
  const paidOrders = orders.filter((o) =>
    ["PAID", "COLLECTED"].includes(o.paymentStatus ?? "")
  );
  const totalRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalAllOrders = orders.reduce((s, o) => s + (o.total || 0), 0);

  const rowsXml = orders
    .map((o, idx) => {
      const storeName =
        stores.find((s) => Number(s.id) === Number(o.storeId))?.name || o.storeName;
      const rec = receiptsByCode[o.orderCode];
      const itemsText = (o.items || [])
        .map((it) => `${it.quantity}x ${it.itemName}`)
        .join("; ");
      const methodStr = String(o.paymentMethod || "");
      const isCashOrCod = methodStr === "CASH" || methodStr === "COD";
      const isCollected = ["PAID", "COLLECTED"].includes(o.paymentStatus ?? "");
      const cashTendered =
        rec?.cashTendered ?? (isCashOrCod && isCollected ? o.total : 0);
      const cashChange = rec?.cashChange ?? 0;
      const qrOrReceiptRef =
        rec?.receiptCode ||
        rec?.bankRefCode ||
        (methodStr === "BANK_TRANSFER" ? o.orderCode : "—");

      return `
        <Row ss:AutoFitHeight="1" ss:Height="25">
          <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(getOrderVnDateYmd(o.createdAt))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(formatDateTimeVn(o.createdAt))}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(o.orderCode)}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(storeName)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${o.orderType === "PICKUP" ? "Nhận tại quầy" : "Giao tận nơi"}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(o.customerName)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(o.customerPhone || "—")}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(itemsText || "Xem chi tiết đơn")}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${o.total || 0}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(adminStatusLabel(o.status))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(adminPaymentMethodLabel(o.paymentMethod))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(adminPaymentStatusLabel(o.paymentStatus))}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${cashTendered}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${cashChange}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(qrOrReceiptRef)}</Data></Cell>
        </Row>
      `;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="Quan Ly Don Hang">
    <Table>
      <Column ss:Width="45"/>
      <Column ss:Width="95"/>
      <Column ss:Width="135"/>
      <Column ss:Width="145"/>
      <Column ss:Width="190"/>
      <Column ss:Width="110"/>
      <Column ss:Width="150"/>
      <Column ss:Width="105"/>
      <Column ss:Width="260"/>
      <Column ss:Width="120"/>
      <Column ss:Width="125"/>
      <Column ss:Width="165"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      <Column ss:Width="115"/>
      <Column ss:Width="145"/>

      <Row ss:Height="28">
        <Cell ss:MergeAcross="15" ss:StyleID="Title">
          <Data ss:Type="String">CLUCKY ADMIN — BÁO CÁO QUẢN LÝ ĐƠN HÀNG &amp; TÀI CHÍNH THEO NGÀY</Data>
        </Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="15" ss:StyleID="Subtitle">
          <Data ss:Type="String">Kỳ lọc: ${escapeXml(formatDateLabelVn(dateLabel))} | Tổng số đơn: ${orders.length} | Hoàn thành: ${completedCount} | Doanh thu đã thu: ${new Intl.NumberFormat("vi-VN").format(totalRevenue)} đ | Tổng giá trị đơn: ${new Intl.NumberFormat("vi-VN").format(totalAllOrders)} đ</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="28">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">STT</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Ngày đặt</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Giờ tạo đơn</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mã đơn hàng</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Chi nhánh</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Hình thức</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Khách hàng</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Số điện thoại</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Món đã đặt</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tổng tiền</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Trạng thái đơn</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Phương thức TT</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Trạng thái TT</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tiền khách đưa</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tiền thối lại</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mã biên lai / QR</Data></Cell>
      </Row>
      ${rowsXml}
    </Table>
  </Worksheet>
</Workbook>`;

  const safeDate = dateLabel.replace(/[^0-9a-zA-Z-]/g, "") || "all-dates";
  triggerExcelDownload(xml, `Quan-ly-don-hang-Clucky-${safeDate}.xls`);
}

export function exportCashLedgerExcel(params: {
  date: string;
  storeName: string;
  storeAddress?: string;
  staffName: string;
  netCashInDrawer: number;
  totalCashCollected: number;
  totalCashChangeGiven: number;
  totalBankReconciled: number;
  totalBankPending: number;
  receipts: BackendCounterReceipt[];
  transactions: BankTransactionItem[];
}) {
  const {
    date,
    storeName,
    storeAddress,
    staffName,
    netCashInDrawer,
    totalCashCollected,
    totalCashChangeGiven,
    totalBankReconciled,
    totalBankPending,
    receipts,
    transactions,
  } = params;

  const receiptRowsXml = receipts
    .map(
      (rc, idx) => `
      <Row ss:AutoFitHeight="1" ss:Height="24">
        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(rc.receiptCode)}</Data></Cell>
        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(rc.orderCode)}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">#${String(rc.queueNumber || 1).padStart(3, "0")}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(formatDateTimeVn(rc.createdAt))}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(rc.method)}</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${rc.totalDue || 0}</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${rc.cashAmount || 0}</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${rc.cashTendered || 0}</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${rc.cashChange || 0}</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${rc.bankAmountDeclared || 0}</Data></Cell>
        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(rc.staffName || "")}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(rc.status)}</Data></Cell>
      </Row>
    `
    )
    .join("");

  const txRowsXml = transactions
    .map(
      (tx, idx) => `
      <Row ss:AutoFitHeight="1" ss:Height="24">
        <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(tx.bankTxId)}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(formatDateTimeVn(tx.transactionDate))}</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${tx.amount || 0}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(tx.gateway)} - ${escapeXml(tx.accountNumber)}</Data></Cell>
        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(tx.content)}</Data></Cell>
        <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(tx.orderCode || "—")}</Data></Cell>
        <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(tx.status)}</Data></Cell>
      </Row>
    `
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="So Quy Ca Truc">
    <Table>
      <Column ss:Width="45"/>
      <Column ss:Width="150"/>
      <Column ss:Width="140"/>
      <Column ss:Width="90"/>
      <Column ss:Width="140"/>
      <Column ss:Width="130"/>
      <Column ss:Width="120"/>
      <Column ss:Width="115"/>
      <Column ss:Width="120"/>
      <Column ss:Width="115"/>
      <Column ss:Width="125"/>
      <Column ss:Width="150"/>
      <Column ss:Width="135"/>

      <Row ss:Height="28">
        <Cell ss:MergeAcross="12" ss:StyleID="Title">
          <Data ss:Type="String">CLUCKY — BÁO CÁO SỔ QUỸ DÒNG TIỀN &amp; KÉT CA TRỰC (${escapeXml(date)})</Data>
        </Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="12" ss:StyleID="Subtitle">
          <Data ss:Type="String">Chi nhánh: ${escapeXml(storeName)}${storeAddress ? ` (${escapeXml(storeAddress)})` : ""} | Ngày: ${escapeXml(formatDateLabelVn(date))} | Người xuất: ${escapeXml(staffName)}</Data>
        </Cell>
      </Row>
      <Row ss:Height="8"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="2" ss:StyleID="KpiLabel"><Data ss:Type="String">Két tiền mặt thực tế (VND)</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="KpiValue"><Data ss:Type="Number">${netCashInDrawer}</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="KpiLabel"><Data ss:Type="String">Tiền mặt tổng thu / Đã thối (VND)</Data></Cell>
        <Cell ss:MergeAcross="3" ss:StyleID="KpiLabel"><Data ss:Type="String">${new Intl.NumberFormat("vi-VN").format(totalCashCollected)} đ / ${new Intl.NumberFormat("vi-VN").format(totalCashChangeGiven)} đ</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:MergeAcross="2" ss:StyleID="KpiLabel"><Data ss:Type="String">Chuyển khoản đã đối soát (VND)</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="KpiValue"><Data ss:Type="Number">${totalBankReconciled}</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="KpiLabel"><Data ss:Type="String">Chuyển khoản chờ đối soát (VND)</Data></Cell>
        <Cell ss:MergeAcross="3" ss:StyleID="KpiValue"><Data ss:Type="Number">${totalBankPending}</Data></Cell>
      </Row>
      <Row ss:Height="12"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="12" ss:StyleID="Title">
          <Data ss:Type="String">I. BIÊN LAI THU NGÂN (${receipts.length} biên lai)</Data>
        </Cell>
      </Row>
      <Row ss:Height="26">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">STT</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mã biên lai</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mã đơn hàng</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Số gọi món</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Thời gian</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Phương thức</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tổng thu</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tiền mặt thu</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Khách đưa</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tiền thối</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Chuyển khoản</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Thu ngân</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Trạng thái</Data></Cell>
      </Row>
      ${receiptRowsXml}
      <Row ss:Height="14"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="7" ss:StyleID="Title">
          <Data ss:Type="String">II. GIAO DỊCH NGÂN HÀNG (${transactions.length} giao dịch)</Data>
        </Cell>
      </Row>
      <Row ss:Height="26">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">STT</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mã giao dịch NH</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Thời gian nhận</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Số tiền</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Ngân hàng / STK</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Nội dung chuyển khoản</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Đơn liên kết</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Trạng thái</Data></Cell>
      </Row>
      ${txRowsXml}
    </Table>
  </Worksheet>
</Workbook>`;

  triggerExcelDownload(xml, `So-quy-ket-ca-Clucky-${date}.xls`);
}
