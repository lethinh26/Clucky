import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Wallet,
  QrCode,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import { message } from "../../../components/feedback";
import type { PaymentMethod, StaffOrder } from "../../../mocks/mockStaffOrders";
import styles from "./counter-payment.module.css";

interface CounterPaymentModalProps {
  open: boolean;
  order: StaffOrder | null;
  onClose: () => void;
  onConfirmPayment: (data: {
    orderId: string;
    method: PaymentMethod;
    cashTendered: number;
    cashChange: number;
    bankDeclaredAmount: number;
    manualReason?: string;
    refCode?: string;
  }) => Promise<void> | void;
}

const formatVnd = (val: number) => {
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
};

// VietQR dynamic QR code image builder
const getVietQrUrl = (amount: number, memo: string) => {
  const bank = "mbbank";
  const acc = "0387654321";
  const template = "compact2";
  const accName = encodeURIComponent("CLUCKY FAST FOOD");
  const addInfo = encodeURIComponent(memo);
  return `https://img.vietqr.io/image/${bank}-${acc}-${template}.png?amount=${amount}&addInfo=${addInfo}&accountName=${accName}`;
};

export const CounterPaymentModal: React.FC<CounterPaymentModalProps> = ({
  open,
  order,
  onClose,
  onConfirmPayment,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PaymentMethod>("CASH");

  // Tab 1: CASH state
  const [cashTendered, setCashTendered] = useState<number>(0);

  // Tab 2: BANK_TRANSFER state
  const [manualReason, setManualReason] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string>("");

  // Tab 3: SPLIT state
  const [splitCash, setSplitCash] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset when order changes or modal opens
  useEffect(() => {
    if (open && order) {
      const total = order.total || 0;
      setActiveTab(order.paymentMethod === "SPLIT" ? "SPLIT" : order.paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CASH");
      setCashTendered(total);
      setSplitCash(Math.floor(total / 2));
      setManualReason("");
    }
  }, [open, order]);

  const totalDue = order?.total || 0;

  // CASH calculations
  const cashChange = Math.max(0, cashTendered - totalDue);
  const isCashSufficient = cashTendered >= totalDue;

  // SPLIT calculations
  const splitBank = Math.max(0, totalDue - splitCash);

  // Quick cash bill suggestions
  const quickBills = useMemo(() => {
    if (!order) return [];
    const list: { label: string; value: number }[] = [];
    list.push({ label: "Đủ tiền: " + formatVnd(totalDue), value: totalDue });

    const presets = [50000, 100000, 200000, 500000];
    presets.forEach((val) => {
      if (val >= totalDue && val !== totalDue) {
        list.push({ label: formatVnd(val), value: val });
      }
    });

    // In case totalDue is large (e.g. 520k)
    if (totalDue > 500000) {
      list.push({ label: formatVnd(Math.ceil(totalDue / 100000) * 100000), value: Math.ceil(totalDue / 100000) * 100000 });
      list.push({ label: formatVnd(1000000), value: 1000000 });
    }

    return list;
  }, [totalDue, order]);

  if (!open || !order) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    message.success("Đã sao chép " + label);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    if (activeTab !== "CASH" && !manualReason.trim()) {
      message.error(t("business:orderdemo.manualBankReasonRequired"));
      return;
    }
    let finalMethod: PaymentMethod = activeTab;
    let finalTendered = 0;
    let finalChange = 0;
    let finalBankDeclared = 0;
    let refCode = `TXN-${Date.now().toString().slice(-6)}`;

    if (activeTab === "CASH") {
      finalTendered = cashTendered;
      finalChange = cashChange;
      finalBankDeclared = 0;
    } else if (activeTab === "BANK_TRANSFER") {
      finalTendered = 0;
      finalChange = 0;
      finalBankDeclared = totalDue;
    } else if (activeTab === "SPLIT") {
      finalTendered = splitCash;
      finalChange = 0;
      finalBankDeclared = splitBank;
    }

    setIsSubmitting(true);
    try {
      await onConfirmPayment({
        orderId: order.id,
        method: finalMethod,
        cashTendered: finalTendered,
        cashChange: finalChange,
        bankDeclaredAmount: finalBankDeclared,
        manualReason: manualReason || undefined,
        refCode,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedQueue = `#${String(order.queueNumber).padStart(3, "0")}`;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Thu tiền quầy">
      <div className={styles.modalWindow}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.queueBadgeRow}>
              <span className={styles.queueNumber}>{formattedQueue}</span>
              <span className={styles.orderCode}>{order.orderCode}</span>
              <span className={styles.diningBadge}>
                {order.diningOption === "DINE_IN" ? "ĂN TẠI QUÁN" : "MANG VỀ"}
              </span>
            </div>
            <span style={{ fontSize: 13, color: "#6b6259" }}>
              Khách hàng: <strong>{order.customerName || "Khách vãng lai"}</strong>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <div className={styles.headerTotalDue}>
              <div className={styles.dueLabel}>Tổng tiền cần thu</div>
              <div className={styles.dueAmount}>{formatVnd(totalDue)}</div>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 3 Tabs Navigation */}
        <div className={styles.tabNav} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "CASH"}
            className={`${styles.tabBtn} ${
              activeTab === "CASH" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("CASH")}
          >
            <Wallet size={16} />
            <span>Tiền mặt (CASH)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "BANK_TRANSFER"}
            className={`${styles.tabBtn} ${
              activeTab === "BANK_TRANSFER" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("BANK_TRANSFER")}
          >
            <QrCode size={16} />
            <span>Chuyển khoản (VietQR)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "SPLIT"}
            className={`${styles.tabBtn} ${
              activeTab === "SPLIT" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("SPLIT")}
          >
            <Layers size={16} />
            <span>Kết hợp (SPLIT)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {/* TAB 1: TIỀN MẶT */}
          {activeTab === "CASH" && (
            <div className={styles.cashSection}>
              <div className={styles.fieldLabel}>
                <Wallet size={16} color="#8f1216" />
                <span>Số tiền khách đưa (VND):</span>
              </div>

              <div className={styles.cashInputWrapper}>
                <input
                  type="number"
                  step="1000"
                  className={styles.cashInput}
                  value={cashTendered || ""}
                  onChange={(e) => {
                    const num = parseInt(e.target.value, 10);
                    setCashTendered(isNaN(num) ? 0 : num);
                  }}
                  autoFocus
                />
                <span className={styles.currencyUnit}>đ</span>
              </div>

              {/* Nút chọn nhanh tiền chẵn */}
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6b6259", marginBottom: 6, display: "block" }}>
                  Gợi ý mệnh giá tiền nhanh:
                </span>
                <div className={styles.quickCashGrid}>
                  {quickBills.map((bill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.quickCashBtn} ${
                        cashTendered === bill.value ? styles.quickCashBtnExact : ""
                      }`}
                      onClick={() => setCashTendered(bill.value)}
                    >
                      {bill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Box hiển thị tiền thối tự động */}
              {isCashSufficient ? (
                <div className={styles.changeResultBox}>
                  <div className={styles.changeLabel}>
                    <CheckCircle2 size={20} />
                    <span>Tiền thối lại khách:</span>
                  </div>
                  <div className={styles.changeAmount}>
                    {formatVnd(cashChange)}
                  </div>
                </div>
              ) : (
                <div className={styles.shortageBox}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                    <AlertTriangle size={18} />
                    <span>Khách đưa chưa đủ tiền:</span>
                  </div>
                  <strong style={{ fontSize: 18 }}>
                    Thiếu {formatVnd(totalDue - cashTendered)}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHUYỂN KHOẢN VIETQR */}
          {activeTab === "BANK_TRANSFER" && (
            <div className={styles.bankSection}>
              <div className={styles.qrContainer}>
                <div className={styles.qrImageFrame}>
                  <img
                    src={getVietQrUrl(totalDue, order.orderCode)}
                    alt="Mã VietQR Thanh Toán"
                    className={styles.qrImg}
                    onError={(e) => {
                      // Fallback visually if offline
                      (e.target as HTMLImageElement).src = "/images/food-placeholder.svg";
                    }}
                  />
                </div>

                <div className={styles.bankDetails}>
                  <div className={styles.bankDetailRow}>
                    <span className={styles.bankDetailLabel}>Ngân hàng thụ hưởng</span>
                    <span className={styles.bankDetailValue}>MBBank (Quân Đội)</span>
                  </div>

                  <div className={styles.bankDetailRow}>
                    <span className={styles.bankDetailLabel}>Số tài khoản quán</span>
                    <div className={styles.bankDetailValue}>
                      <span>0387654321</span>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => handleCopy("0387654321", "STK")}
                      >
                        {copiedText === "STK" ? <Check size={14} color="#1e7a46" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.bankDetailRow}>
                    <span className={styles.bankDetailLabel}>Nội dung chuyển khoản</span>
                    <div className={styles.bankDetailValue}>
                      <span style={{ color: "#8f1216" }}>{order.orderCode}</span>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => handleCopy(order.orderCode, "Nội dung")}
                      >
                        {copiedText === "Nội dung" ? <Check size={14} color="#1e7a46" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.bankDetailRow}>
                    <span className={styles.bankDetailLabel}>Số tiền chuyển</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#1e7a46" }}>
                      {formatVnd(totalDue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nút ngoại lệ xác nhận thủ công */}
              <div className={styles.manualSection}>
                <div className={styles.manualHeader}>
                  <span className={styles.manualTitle}>
                    Xác nhận đã nhận chuyển khoản (Thủ công / Khách vội):
                  </span>
                </div>
                <div className={styles.quickTagsList}>
                  {[
                    "Khách đã đưa xem giao dịch thành công",
                    "Khách vội mang đi",
                    "Khách quen thanh toán sau",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.quickTagBtn} ${
                        manualReason === tag ? styles.quickTagBtnActive : ""
                      }`}
                      onClick={() => setManualReason(manualReason === tag ? "" : tag)}
                    >
                      {manualReason === tag ? `✓ ${tag}` : tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KẾT HỢP (SPLIT) */}
          {activeTab === "SPLIT" && (
            <div className={styles.splitSection}>
              <div className={styles.splitGrid}>
                {/* Cột 1: Tiền mặt */}
                <div className={styles.splitBox}>
                  <div className={styles.fieldLabel}>
                    <Wallet size={15} color="#8f1216" />
                    <span>1. Tiền mặt (VND):</span>
                  </div>
                  <input
                    type="number"
                    step="1000"
                    className={styles.cashInput}
                    style={{ fontSize: 20 }}
                    value={splitCash || ""}
                    onChange={(e) => {
                      const num = parseInt(e.target.value, 10);
                      const val = isNaN(num) ? 0 : Math.min(totalDue, Math.max(0, num));
                      setSplitCash(val);
                    }}
                  />
                  <div style={{ fontSize: 12, color: "#6b6259" }}>
                    Thu tiền mặt tại quầy: <strong>{formatVnd(splitCash)}</strong>
                  </div>
                </div>

                {/* Cột 2: Chuyển khoản còn lại */}
                <div className={styles.splitBox}>
                  <div className={styles.fieldLabel}>
                    <QrCode size={15} color="#22577a" />
                    <span>2. Chuyển khoản còn lại:</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#22577a", fontFamily: "Fredoka, sans-serif" }}>
                    {formatVnd(splitBank)}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b6259" }}>
                    Sinh mã QR động cho số tiền còn lại
                  </div>
                </div>
              </div>

              {/* VietQR nhỏ cho số tiền chuyển khoản còn lại */}
              {splitBank > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 14, backgroundColor: "#ffffff", padding: 12, borderRadius: 12, border: "1px solid #e8e2d9" }}>
                  <img
                    src={getVietQrUrl(splitBank, `${order.orderCode} SPLIT`)}
                    alt="VietQR Split"
                    style={{ width: 80, height: 80, objectFit: "contain" }}
                  />
                  <div style={{ fontSize: 12, color: "#4b443c", lineHeight: 1.5 }}>
                    Mã VietQR động cho khoản chuyển: <strong>{formatVnd(splitBank)}</strong>
                    <br />
                    Nội dung: <code>{order.orderCode}</code>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.footerHint}>
            {activeTab === "CASH" && (
              <span>Thu tiền mặt trực tiếp và trả lại tiền thừa cho khách</span>
            )}
            {activeTab === "BANK_TRANSFER" && (
              <span>Hệ thống tự động liên kết giao dịch MBBank hoặc xác nhận nhanh</span>
            )}
            {activeTab === "SPLIT" && (
              <span>Đơn kết hợp: {formatVnd(splitCash)} mặt + {formatVnd(splitBank)} CK</span>
            )}
          </div>

          <button
            type="button"
            className={styles.confirmButton}
            disabled={(activeTab === "CASH" && !isCashSufficient) || isSubmitting}
            onClick={handleConfirm}
          >
            <span>{t(isSubmitting ? "business:staffactions.processing" : "business:staffactions.confirmCollection")}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
