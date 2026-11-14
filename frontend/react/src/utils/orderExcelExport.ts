import type { StaffOrder } from "../mocks/mockStaffOrders";
import type { BankTransactionItem } from "../mocks/mockPosCatalog";
import type { AdminOrder } from "../types/order";
import type { BackendCounterReceipt, Store } from "../lib/api";
import { getBrowserLocale } from "../i18n/locale";
import { getTranslator } from "../i18n/translator";
import { getFulfillmentMode } from "../lib/order-fulfillment";

function getExcelTranslator(locale?: string) {
  if (locale && locale.toLowerCase().startsWith("en")) {
    return getTranslator("en");
  }
  if (locale && locale.toLowerCase().startsWith("vi")) {
    return getTranslator("vi");
  }
  return getTranslator(getBrowserLocale());
}

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

export function formatDateLabelVn(ymd?: string, locale?: string): string {
  const tr = getExcelTranslator(locale);
  const resolved = locale ?? getBrowserLocale();
  const isEn = resolved.toLowerCase().startsWith("en");
  if (!ymd) return tr("business:excel.allDates");
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

export function formatVnShortDate(iso?: string): string {
  const ymd = getOrderVnDateYmd(iso);
  if (!ymd || !ymd.includes("-")) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export function formatQueueWithDate(queueNumber?: number | null, createdAt?: string): {
  queueLabel: string;
  dateLabel: string;
  combinedLabel: string;
} {
  const queueLabel = queueNumber != null && queueNumber > 0
    ? `#${String(queueNumber).padStart(3, "0")}`
    : "—";
  const dateLabel = formatVnShortDate(createdAt);
  const combinedLabel = dateLabel ? `${queueLabel} · ${dateLabel}` : queueLabel;
  return { queueLabel, dateLabel, combinedLabel };
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
      <NumberFormat ss:Format="#,##0 &quot;&#273;&quot;"/>
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

function staffKitchenLabel(status: StaffOrder["status"], tr: ReturnType<typeof getTranslator>): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return tr("business:excel.staffStatus.PENDING_PAYMENT");
    case "CONFIRMED":
      return tr("business:excel.staffStatus.CONFIRMED");
    case "PREPARING":
      return tr("business:excel.staffStatus.PREPARING");
    case "READY":
      return tr("business:excel.staffStatus.READY");
    case "SHIPPING":
      return tr("business:excel.staffStatus.SHIPPING");
    case "COMPLETED":
      return tr("business:excel.staffStatus.COMPLETED");
    case "CANCELLED":
      return tr("business:excel.staffStatus.CANCELLED");
    default:
      return status;
  }
}

function staffPaymentStatusLabel(status: string, tr: ReturnType<typeof getTranslator>): string {
  switch (status) {
    case "COLLECTED":
    case "PAID":
      return tr("business:excel.staffPayStatus.COLLECTED");
    case "PENDING":
      return tr("business:excel.staffPayStatus.PENDING");
    case "DISCREPANCY":
      return tr("business:excel.staffPayStatus.DISCREPANCY");
    default:
      return status;
  }
}

function staffPaymentMethodLabel(method: StaffOrder["paymentMethod"], tr: ReturnType<typeof getTranslator>): string {
  switch (method) {
    case "CASH":
      return tr("business:excel.staffMethod.CASH");
    case "COD":
      return tr("business:excel.staffMethod.COD");
    case "BANK_TRANSFER":
      return tr("business:excel.staffMethod.BANK_TRANSFER");
    case "SPLIT":
      return tr("business:excel.staffMethod.SPLIT");
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
  const locale = getBrowserLocale();
  const tr = getTranslator(locale);
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
      const cashier = rec?.staffName || o.cashierName || staffName || tr("business:excel.defaultShiftStaff");
      const receiptCode =
        rec?.receiptCode ||
        o.receiptCode ||
        o.bankRefCode ||
        (["PAID", "COLLECTED"].includes(o.paymentStatus) ? `REC-${o.orderCode}` : "—");
      const orderSourceText =
        o.orderSource === "COUNTER"
          ? tr("business:excel.staffOrderSourceCounter")
          : tr("business:excel.staffOrderSourceWeb");
      const fulfillment = getFulfillmentMode(o);
      const diningOptionText = fulfillment === 'DELIVERY'
        ? tr('shipping:ui.delivery')
        : fulfillment === 'DINE_IN'
          ? tr("business:excel.diningDineIn")
          : fulfillment === 'TAKE_AWAY'
            ? tr("business:excel.diningTakeAway")
            : tr('shipping:ui.storePickup');

      return `
        <Row ss:AutoFitHeight="1" ss:Height="26">
          <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(o.orderCode)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">#${String(o.queueNumber).padStart(3, "0")}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(formatDateTimeVn(o.createdAt))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(orderSourceText)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(diningOptionText)}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(o.customerName || tr("business:excel.walkInCustomer"))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(o.customerPhone || "—")}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(itemsText)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${totalQty}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${o.subtotal || o.total || 0}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${o.discount || 0}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${o.total || 0}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(staffPaymentMethodLabel(o.paymentMethod, tr))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(staffPaymentStatusLabel(o.paymentStatus, tr))}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${cashTendered}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${cashChange}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(receiptCode)}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(cashier)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(staffKitchenLabel(o.status, tr))}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(o.note || "")}</Data></Cell>
        </Row>
      `;
    })
    .join("");

  const fmt = new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN");
  const subtitleText = tr("business:excel.staffReportSubtitle", {
    storeName,
    dateLabel: formatDateLabelVn(date, locale),
    date,
    staffName,
    exportedAt: formatDateTimeVn(new Date().toISOString()),
  });
  const cashTenderedChangeVal = tr("business:excel.staffCashTenderedChangeValue", {
    tendered: fmt.format(totalCashTendered),
    change: fmt.format(totalCashChange),
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${EXCEL_STYLES}
  <Worksheet ss:Name="${escapeXml(tr("business:excel.staffSheetName", { date }))}">
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
          <Data ss:Type="String">${escapeXml(tr("business:excel.staffReportTitle"))}</Data>
        </Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="20" ss:StyleID="Subtitle">
          <Data ss:Type="String">${escapeXml(subtitleText)}</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="5" ss:StyleID="SectionHeader">
          <Data ss:Type="String">${escapeXml(tr("business:excel.staffSectionSummary"))}</Data>
        </Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.staffTotalOrders"))}</Data></Cell>
        <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${orders.length}</Data></Cell>
        <Cell ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.staffTotalRevenue"))}</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${totalRevenue}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.staffCompletedOrders"))}</Data></Cell>
        <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${completedOrders.length}</Data></Cell>
        <Cell ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.staffCashRevenue"))}</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${cashRevenue}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.staffProcessingOrders"))}</Data></Cell>
        <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${processingOrders.length}</Data></Cell>
        <Cell ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.staffCashTenderedChangeLabel"))}</Data></Cell>
        <Cell ss:StyleID="SummaryValue"><Data ss:Type="String">${escapeXml(cashTenderedChangeVal)}</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.staffCancelledOrders"))}</Data></Cell>
        <Cell ss:StyleID="SummaryValue"><Data ss:Type="Number">${cancelledOrders.length}</Data></Cell>
        <Cell ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.staffTransferRevenue"))}</Data></Cell>
        <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${transferRevenue}</Data></Cell>
      </Row>
      <Row ss:Height="12"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="20" ss:StyleID="SectionHeader">
          <Data ss:Type="String">${escapeXml(tr("business:excel.staffSectionDetails", { count: orders.length }))}</Data>
        </Cell>
      </Row>
      <Row ss:Height="28">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colNo"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colOrderCode"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colQueueNumber"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colCreatedAt"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colOrderSource"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colOrderType"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colCustomer"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colPhone"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colItemsDone"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colItemQty"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colSubtotal"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colDiscount"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colTotal"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colPaymentMethod"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colPaymentStatus"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colCashTendered"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colCashChange"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colReceiptRef"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colHandledBy"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colWorkStatus"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colNote"))}</Data></Cell>
      </Row>
      ${rowsXml}
    </Table>
  </Worksheet>
</Workbook>`;

  const safeDate = date.replace(/[^0-9-]/g, "") || "today";
  triggerExcelDownload(xml, `Thong-ke-don-hang-ca-truc-${safeDate}.xls`);
}

function adminStatusLabel(status: AdminOrder["status"], tr: ReturnType<typeof getTranslator>): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return tr("business:excel.adminStatus.PENDING_PAYMENT");
    case "CONFIRMED":
      return tr("business:excel.adminStatus.CONFIRMED");
    case "PREPARING":
      return tr("business:excel.adminStatus.PREPARING");
    case "READY":
      return tr("business:excel.adminStatus.READY");
    case "SHIPPING":
      return tr("business:excel.adminStatus.SHIPPING");
    case "COMPLETED":
      return tr("business:excel.adminStatus.COMPLETED");
    case "CANCELLED":
      return tr("business:excel.adminStatus.CANCELLED");
    default:
      return status;
  }
}

function adminPaymentMethodLabel(method: string | undefined, tr: ReturnType<typeof getTranslator>): string {
  switch (method) {
    case "CASH":
      return tr("business:excel.adminMethod.CASH");
    case "COD":
      return tr("business:excel.adminMethod.COD");
    case "BANK_TRANSFER":
      return tr("business:excel.adminMethod.BANK_TRANSFER");
    case "SPLIT":
      return tr("business:excel.adminMethod.SPLIT");
    default:
      return method || tr("business:excel.adminMethod.UNKNOWN");
  }
}

function adminPaymentStatusLabel(status: string | undefined, tr: ReturnType<typeof getTranslator>): string {
  switch (status) {
    case "PAID":
      return tr("business:excel.adminPayStatus.PAID");
    case "COLLECTED":
      return tr("business:excel.adminPayStatus.COLLECTED");
    case "PENDING":
      return tr("business:excel.adminPayStatus.PENDING");
    case "REFUNDED":
      return tr("business:excel.adminPayStatus.REFUNDED");
    default:
      return status || tr("business:excel.adminPayStatus.UNKNOWN");
  }
}

export function exportAdminOrdersByDateExcel(
  orders: AdminOrder[],
  stores: Store[],
  dateLabel = "",
  receiptsByCode: Record<string, BackendCounterReceipt> = {}
) {
  const locale = getBrowserLocale();
  const tr = getTranslator(locale);
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
      const orderTypeLabel =
        o.orderType === "PICKUP"
          ? tr("business:excel.orderTypePickup")
          : tr("business:excel.orderTypeDelivery");

      return `
        <Row ss:AutoFitHeight="1" ss:Height="25">
          <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(formatQueueWithDate(o.queueNumber, o.createdAt).combinedLabel)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(getOrderVnDateYmd(o.createdAt))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(formatDateTimeVn(o.createdAt))}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(o.orderCode)}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(storeName)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(orderTypeLabel)}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(o.customerName)}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(o.customerPhone || "—")}</Data></Cell>
          <Cell ss:StyleID="CellText"><Data ss:Type="String">${escapeXml(itemsText || tr("business:excel.viewOrderDetails"))}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${o.total || 0}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(adminStatusLabel(o.status, tr))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(adminPaymentMethodLabel(o.paymentMethod, tr))}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(adminPaymentStatusLabel(o.paymentStatus, tr))}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${cashTendered}</Data></Cell>
          <Cell ss:StyleID="CellMoney"><Data ss:Type="Number">${cashChange}</Data></Cell>
          <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(qrOrReceiptRef)}</Data></Cell>
        </Row>
      `;
    })
    .join("");

  const fmt = new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN");
  const subtitleText = tr("business:excel.adminReportSubtitle", {
    dateLabel: formatDateLabelVn(dateLabel, locale),
    totalOrders: orders.length,
    completedCount,
    revenue: fmt.format(totalRevenue),
    grossTotal: fmt.format(totalAllOrders),
  });

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
      <Column ss:Width="125"/>
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
        <Cell ss:MergeAcross="16" ss:StyleID="Title">
          <Data ss:Type="String">${escapeXml(tr("business:excel.adminReportTitle"))}</Data>
        </Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="16" ss:StyleID="Subtitle">
          <Data ss:Type="String">${escapeXml(subtitleText)}</Data>
        </Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="28">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colNo"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colQueueWithDate"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colOrderDate"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colOrderTime"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colOrderCode"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colBranch"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colOrderType"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colCustomer"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colPhone"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colItemsOrdered"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colAmountTotal"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colOrderStatus"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colPaymentMethod"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colPaymentStatus"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colCashTendered"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colCashChange"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colReceiptOrQr"))}</Data></Cell>
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
  const locale = getBrowserLocale();
  const tr = getTranslator(locale);
  const fmt = new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN");

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

  const ledgerSubtitle = tr("business:excel.ledgerReportSubtitle", {
    storeName,
    storeAddress: storeAddress ? ` (${storeAddress})` : "",
    dateLabel: formatDateLabelVn(date, locale),
    staffName,
  });
  const cashCollectedChangeVal = tr("business:excel.ledgerCashCollectedChangeVal", {
    collected: fmt.format(totalCashCollected),
    change: fmt.format(totalCashChangeGiven),
  });

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
          <Data ss:Type="String">${escapeXml(tr("business:excel.ledgerReportTitle", { date }))}</Data>
        </Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="12" ss:StyleID="Subtitle">
          <Data ss:Type="String">${escapeXml(ledgerSubtitle)}</Data>
        </Cell>
      </Row>
      <Row ss:Height="8"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.ledgerCashDrawer"))}</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryValue"><Data ss:Type="Number">${netCashInDrawer}</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.ledgerCashCollectedChange"))}</Data></Cell>
        <Cell ss:MergeAcross="3" ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(cashCollectedChangeVal)}</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.ledgerBankReconciled"))}</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryValue"><Data ss:Type="Number">${totalBankReconciled}</Data></Cell>
        <Cell ss:MergeAcross="2" ss:StyleID="SummaryLabel"><Data ss:Type="String">${escapeXml(tr("business:excel.ledgerBankPending"))}</Data></Cell>
        <Cell ss:MergeAcross="3" ss:StyleID="SummaryValue"><Data ss:Type="Number">${totalBankPending}</Data></Cell>
      </Row>
      <Row ss:Height="12"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="12" ss:StyleID="Title">
          <Data ss:Type="String">${escapeXml(tr("business:excel.ledgerSectionReceipts", { count: receipts.length }))}</Data>
        </Cell>
      </Row>
      <Row ss:Height="26">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colNo"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colReceiptCode"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colOrderCode"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colTicketQueue"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colTime"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colMethod"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colTotalCollected"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colCashCollected"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colCustomerTendered"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colChange"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colBankTransfer"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colCashier"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colStatus"))}</Data></Cell>
      </Row>
      ${receiptRowsXml}
      <Row ss:Height="14"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="7" ss:StyleID="Title">
          <Data ss:Type="String">${escapeXml(tr("business:excel.ledgerSectionBankTx", { count: transactions.length }))}</Data>
        </Cell>
      </Row>
      <Row ss:Height="26">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colNo"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colBankTxId"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colReceivedAt"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colAmount"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colBankAccount"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colTransferContent"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colLinkedOrder"))}</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(tr("business:excel.colStatus"))}</Data></Cell>
      </Row>
      ${txRowsXml}
    </Table>
  </Worksheet>
</Workbook>`;

  triggerExcelDownload(xml, `So-quy-ket-ca-Clucky-${date}.xls`);
}
