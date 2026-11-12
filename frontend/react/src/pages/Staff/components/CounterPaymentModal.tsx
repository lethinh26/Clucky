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
import { getErrorMessage } from "../../../lib/api";
import { adminFinance, type PaymentSnapshot } from "../../../lib/admin-finance";
import { buildVietQrUrl } from "../../../lib/vietqr";
import { CodEvidencePanel } from "../../Orders/components/CodEvidencePanel";

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
  }) => Promise<boolean>;
}

const formatVnd = (val: number) => {
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
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
  const [snapshot, setSnapshot] = useState<PaymentSnapshot | null>(null);
  const [bankError, setBankError] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const orderId = order?.id;
  const isWebCod = order?.orderSource === "WEB" && order.paymentMethod === "COD";
  const isWebBank = order?.orderSource === "WEB" && order.paymentMethod === "BANK_TRANSFER";

  useEffect(() => {
    setSnapshot(null); setBankError(""); setQrFailed(false);
    if (!open || !orderId) return;
    const controller = new AbortController();
    setBankLoading(true);
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await adminFinance.snapshot(Number(orderId), controller.signal);
        if (!controller.signal.aborted) { setSnapshot(result); setBankError(""); }
      } catch (failure) {
        if (!controller.signal.aborted) setBankError(getErrorMessage(failure));
      } finally { pending = false; if (!controller.signal.aborted) setBankLoading(false); }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [open, orderId]);

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
  const bankInfo = snapshot?.bankInfo;
  const reference = snapshot?.reference ?? "";
  const livePayment = snapshot?.payments.find(payment => payment.live_payment && payment.status === "PENDING");
  const bankAmountDue = isWebBank && livePayment ? Math.max(0, Number(livePayment.amount) - Number(livePayment.received_amount)) : totalDue;
  const canTransfer = snapshot?.order.orderId === Number(order?.id) && snapshot?.order.paymentStatus === "PENDING"
    && ["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY", "SHIPPING"].includes(snapshot.order.status)
    && (!isWebBank || Boolean(livePayment?.expires_at && new Date(livePayment.expires_at).getTime() > Date.now()));
  const transferQr = canTransfer && !bankError ? buildVietQrUrl(bankInfo, activeTab === "SPLIT" ? splitBank : bankAmountDue, reference) : null;

  useEffect(() => { setQrFailed(false); }, [transferQr]);

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

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      message.success("Đã sao chép " + label);
      setTimeout(() => setCopiedText(""), 2000);
    } catch (failure) { message.error(getErrorMessage(failure)); }
  };

  const handleConfirm = async () => {
    if (isSubmitting || isWebBank) return false;
    if (activeTab === "CASH" && !isCashSufficient) return false;
    if (activeTab !== "CASH" && (!transferQr || bankLoading || bankError)) return false;
    if (activeTab === "SPLIT" && (splitCash <= 0 || splitBank <= 0)) return false;
    if (activeTab !== "CASH" && !manualReason.trim()) {
      message.error(t("business:orderdemo.manualBankReasonRequired"));
      return false;
    }
    let finalMethod: PaymentMethod = activeTab;
    let finalTendered = 0;
    let finalChange = 0;
    let finalBankDeclared = 0;
    const refCode = activeTab === "CASH" ? undefined : reference;

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
      return await onConfirmPayment({
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
            disabled={isWebBank}
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
            disabled={isWebCod}
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
            disabled={order.orderSource !== "COUNTER"}
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

              {isWebCod && <CodEvidencePanel orderId={order.id} onCollect={handleConfirm} />}
            </div>
          )}

          {/* TAB 2: CHUYỂN KHOẢN VIETQR */}
          {activeTab === "BANK_TRANSFER" && (
            <div className={styles.bankSection}>
              {!transferQr || qrFailed ? <p role="alert" className={styles.bankUnavailable}>
                {bankLoading ? t("business:counterPayment.loadingBank") : bankError || t("business:counterPayment.bankUnavailable")}
              </p> :
              <div className={styles.qrContainer}>
                <div className={styles.qrImageFrame}>
                  <img
                    src={transferQr}
                    alt="Mã VietQR Thanh Toán"
                    className={styles.qrImg}
                    onError={() => setQrFailed(true)}
                  />
                </div>

                <div className={styles.bankDetails}>
                  <div className={styles.bankDetailRow}>
                    <span className={styles.bankDetailLabel}>Ngân hàng thụ hưởng</span>
                    <span className={styles.bankDetailValue}>{bankInfo?.bankName}</span>
                    <span>{bankInfo?.accountName}</span>
                  </div>

                  <div className={styles.bankDetailRow}>
                    <span className={styles.bankDetailLabel}>Số tài khoản quán</span>
                    <div className={styles.bankDetailValue}>
                      <span>{bankInfo?.accountNo}</span>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        aria-label={t("business:financeModal.copyAccount")}
                        onClick={() => handleCopy(bankInfo?.accountNo ?? "", "STK")}
                      >
                        {copiedText === "STK" ? <Check size={14} color="#1e7a46" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.bankDetailRow}>
                    <span className={styles.bankDetailLabel}>Nội dung chuyển khoản</span>
                    <div className={styles.bankDetailValue}>
                      <span style={{ color: "#8f1216" }}>{reference}</span>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        aria-label={t("business:financeModal.copyTransferReference")}
                        onClick={() => handleCopy(reference, "Nội dung")}
                      >
                        {copiedText === "Nội dung" ? <Check size={14} color="#1e7a46" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.bankDetailRow}>
                    <span className={styles.bankDetailLabel}>Số tiền chuyển</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#1e7a46" }}>
                      {formatVnd(bankAmountDue)}
                    </span>
                  </div>
                </div>
              </div>

              }
              {isWebBank ? <p>{t("business:counterPayment.onlineTransferOnly")}</p> : <>
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
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder={t("business:counterPayment.transferNotePlaceholder")}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #d6c9b9",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              </>}
            </div>
          )}

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

              {splitBank > 0 && (transferQr && !qrFailed ? (
                <div className={styles.qrContainer}>
                  <div className={styles.qrImageFrame}>
                  <img
                    src={transferQr}
                    alt="VietQR Split"
                    className={styles.qrImg}
                    onError={() => setQrFailed(true)}
                  />
                  </div>
                  <div className={styles.bankDetails}>
                    <strong>{bankInfo?.bankName}</strong>
                    <span>{bankInfo?.accountName}</span>
                    <span>{bankInfo?.accountNo}</span>
                    Mã VietQR động cho khoản chuyển: <strong>{formatVnd(splitBank)}</strong>
                    <br />
                    Nội dung: <code>{reference}</code>
                  </div>
                </div>
              ) : <p role="alert" className={styles.bankUnavailable}>{bankLoading ? t("business:counterPayment.loadingBank") : bankError || t("business:counterPayment.bankUnavailable")}</p>)}

              {/* Xác nhận phần chuyển khoản trong đơn kết hợp */}
              <div className={styles.manualSection}>
                <div className={styles.manualHeader}>
                  <span className={styles.manualTitle}>
                    {t("business:counterPayment.splitTransferConfirmLabel")}
                  </span>
                </div>
                <div className={styles.quickTagsList}>
                  {[
                    t("business:counterPayment.quickNoteReceiptChecked"),
                    t("business:counterPayment.quickNoteCustomerPaidRest"),
                    t("business:counterPayment.quickNoteSplitConfirmed"),
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
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder={t("business:counterPayment.transferNotePlaceholder")}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #d6c9b9",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
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
              <span>{t(isWebBank ? "business:counterPayment.onlineTransferOnly" : "business:orderdemo.manualBankReasonRequired")}</span>
            )}
            {activeTab === "SPLIT" && (
              <span>Đơn kết hợp: {formatVnd(splitCash)} mặt + {formatVnd(splitBank)} CK</span>
            )}
          </div>

          {!isWebCod && !isWebBank && <button
            type="button"
            className={styles.confirmButton}
            disabled={(activeTab === "CASH" && !isCashSufficient) || isSubmitting
              || (activeTab !== "CASH" && (!transferQr || bankLoading || Boolean(bankError) || !manualReason.trim()))
              || (activeTab === "SPLIT" && (splitCash <= 0 || splitBank <= 0))}
            onClick={() => void handleConfirm().catch(failure => message.error(getErrorMessage(failure)))}
          >
            <span>{t(isSubmitting ? "business:staffactions.processing" : "business:staffactions.confirmCollection")}</span>
            <ArrowRight size={18} />
          </button>}
        </div>
      </div>
    </div>
  );
};
