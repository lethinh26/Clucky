import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  ChefHat,
  FileText,
  X,
  CheckCircle2,
  Wifi,
  Sparkles,
} from "lucide-react";
import { message } from "../../../components/feedback";
import { useAuth } from "../../../context/AuthContext";
import type { StaffOrder } from "../../../mocks/mockStaffOrders";
import { paymentsApi } from "../../../lib/api";
import styles from "./receipt-bill.module.css";

interface ReceiptBillModalProps {
  open: boolean;
  order: StaffOrder | null;
  onClose: () => void;
  onPrintSuccess?: (orderId: string, newPrintCount: number) => void;
  initialMode?: "RECEIPT" | "KOT";
}

const formatVnd = (val: number) => {
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
};

export const ReceiptBillModal: React.FC<ReceiptBillModalProps> = ({
  open,
  order,
  onClose,
  onPrintSuccess,
  initialMode = "RECEIPT",
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"RECEIPT" | "KOT">(initialMode);
  const [isPaperFeeding, setIsPaperFeeding] = useState<boolean>(false);
  const [printCount, setPrintCount] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && order) {
      setMode(initialMode);
      setPrintCount(order.printCount || 0);
      setIsPaperFeeding(false);
    }
  }, [open, order, initialMode]);

  useEffect(() => {
    if (open && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [open, mode]);

  if (!open || !order) return null;

  const formattedQueue = `#${String(order.queueNumber || 0).padStart(3, "0")}`;
  const isReprint = printCount >= 1;

  // Print simulation action
  const handlePrint = async (printMode: "RECEIPT" | "KOT") => {
    setIsPaperFeeding(true);

    let updatedCount = printCount + 1;

    if (printMode === "RECEIPT") {
      try {
        let rId = order.receiptId;
        if (!rId && order.orderCode) {
          const fetched = await paymentsApi
            .getReceiptByOrderCode(order.orderCode)
            .catch(() => null);
          if (fetched?.id) {
            rId = fetched.id;
          }
        }
        if (rId) {
          const printRes = await paymentsApi.trackPrint(rId).catch(() => null);
          if (printRes?.printCount) {
            updatedCount = printRes.printCount;
          }
        }
      } catch (err) {
        console.warn("Lỗi gọi trackPrint:", err);
      }
    }

    setTimeout(() => {
      setPrintCount(updatedCount);
      onPrintSuccess?.(order.id, updatedCount);

      if (printMode === "RECEIPT") {
        message.success(
          isReprint
            ? "Đã in lại bản sao hóa đơn #" + updatedCount + " thành công! (Mô phỏng máy in nhiệt K80)"
            : "Đã in hóa đơn thành công! (Mô phỏng máy in nhiệt K80)",
        );
      } else {
        message.success("Đã in phiếu chế biến bếp (KOT) thành công! (Mô phỏng máy in nhiệt K80)");
      }

      setIsPaperFeeding(false);
    }, 400);
  };

  const nowString = new Date().toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Hóa đơn thanh toán K80">
      <div className={styles.modalWindow}>
        {/* Action Toolbar */}
        <div className={styles.actionsToolbar}>
          {mode === "RECEIPT" ? (
            <>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.printBtn}`}
                onClick={() => handlePrint("RECEIPT")}
                title="In hóa đơn bán lẻ cho khách"
              >
                <Printer size={16} />
                <span>In hóa đơn {isReprint ? "(Lần " + (printCount + 1) + ")" : ""}</span>
              </button>

              <button
                type="button"
                className={`${styles.actionBtn} ${styles.kotBtn}`}
                onClick={() => setMode("KOT")}
                title="Chuyển sang mẫu phiếu bếp"
              >
                <ChefHat size={16} />
                <span>Xem phiếu bếp (KOT)</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.kotBtn}`}
                onClick={() => handlePrint("KOT")}
                title="In phiếu chế biến gửi bếp"
              >
                <Printer size={16} />
                <span>In phiếu bếp (KOT)</span>
              </button>

              <button
                type="button"
                className={`${styles.actionBtn} ${styles.modeToggleBtn}`}
                onClick={() => setMode("RECEIPT")}
                title="Quay lại hóa đơn bán lẻ"
              >
                <FileText size={16} />
                <span>Xem hóa đơn khách</span>
              </button>
            </>
          )}

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.closeBtn}`}
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
            <span>Đóng</span>
          </button>
        </div>

        {/* Paper Scroll Area */}
        <div className={styles.paperScrollContainer} ref={scrollContainerRef}>
          <article
            className={`${styles.receiptPaper} ${
              isPaperFeeding ? styles.paperFeeding : ""
            }`}
            tabIndex={0}
            aria-label="Phiếu in nhiệt 80mm"
          >
            {/* =========================================================================
                CHẾ ĐỘ 1: HÓA ĐƠN BÁN LẺ (RECEIPT)
               ========================================================================= */}
            {mode === "RECEIPT" ? (
              <>
                {/* Watermark nếu là in lại từ lần 2 */}
                {isReprint && (
                  <div className={styles.reprintWatermark}>
                    *** BẢN SAO HÓA ĐƠN / REPRINT #{printCount} ***
                  </div>
                )}

                {/* Header Clucky */}
                <div className={styles.receiptHeader}>
                  <img
                    src="/logo_primary.png"
                    alt="Clucky Logo"
                    className={styles.logoImage}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <h1 className={styles.brandName}>CLUCKY</h1>
                  <div className={styles.brandSlogan}>
                    Gà Rán Giòn Cay - Đậm Vị Việt
                  </div>
                  <div className={styles.storeInfo}>
                    Chi nhánh: <strong>{order.storeName || "Store #01 - Cầu Giấy"}</strong>
                    <br />
                    123 Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội
                    <br />
                    Hotline: 1900 6868 · Website: clucky.vn
                  </div>
                </div>

                <div className={styles.doubleDivider} />

                {/* Số thứ tự gọi món & Hình thức dùng bữa */}
                <div className={styles.queueCallout}>
                  <div className={styles.queueCalloutLeft}>
                    <span className={styles.queueTitle}>SỐ THỨ TỰ GỌI MÓN</span>
                    <span className={styles.queueNumberLarge}>
                      {formattedQueue}
                    </span>
                  </div>
                  <span className={styles.diningOptionTag}>
                    {order.diningOption === "DINE_IN"
                      ? "[ ĂN TẠI QUÁN ]"
                      : "[ MANG VỀ ]"}
                  </span>
                </div>

                <div className={styles.dashedDivider} />

                {/* Metadata Đơn Hàng */}
                <div className={styles.metaRow}>
                  <span>Mã đơn hàng:</span>
                  <strong>{order.orderCode}</strong>
                </div>
                <div className={styles.metaRow}>
                  <span>Thời gian đặt:</span>
                  <span>{order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : nowString}</span>
                </div>
                <div className={styles.metaRow}>
                  <span>Thu ngân phục vụ:</span>
                  <span>{order.cashierName || (user?.fullName ? `${user.fullName} (${user.role === "STAFF" ? "Staff" : user.role})` : "Nhân viên")}</span>
                </div>
                {order.customerName && (
                  <div className={styles.metaRow}>
                    <span>Khách hàng:</span>
                    <span>{order.customerName}</span>
                  </div>
                )}

                <div className={styles.dashedDivider} />

                {/* Bảng Danh Sách Món Ăn */}
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th className={styles.itemColName}>TÊN MÓN</th>
                      <th className={styles.itemColQty}>SL</th>
                      <th className={styles.itemColPrice}>Đ.GIÁ</th>
                      <th className={styles.itemColTotal}>T.TIỀN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <React.Fragment key={item.id || index}>
                        <tr>
                          <td className={styles.itemColName}>
                            <strong>{item.itemName}</strong>
                            {item.options && (
                              <div className={styles.itemOptionsText}>
                                {item.options}
                              </div>
                            )}
                          </td>
                          <td className={styles.itemColQty}>
                            {String(item.quantity).padStart(2, "0")}
                          </td>
                          <td className={styles.itemColPrice}>
                            {formatVnd(item.unitPrice)}
                          </td>
                          <td className={styles.itemColTotal}>
                            {formatVnd(item.lineTotal || item.unitPrice * item.quantity)}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                <div className={styles.dashedDivider} />

                {/* Tổng kết tiền */}
                <div className={styles.totalSection}>
                  <div className={styles.totalRow}>
                    <span>Tổng tiền hàng:</span>
                    <span>{formatVnd(order.subtotal || order.total)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className={styles.totalRow}>
                      <span>Giảm giá khuyến mãi:</span>
                      <span>-{formatVnd(order.discount)}</span>
                    </div>
                  )}
                  <div className={styles.grandTotalRow}>
                    <span>TỔNG THANH TOÁN:</span>
                    <span className={styles.grandTotalAmount}>
                      {formatVnd(order.total)}
                    </span>
                  </div>
                </div>

                <div className={styles.dashedDivider} />

                {/* Chi tiết thanh toán */}
                <div className={styles.paymentSection}>
                  <div className={styles.metaRow}>
                    <span>Phương thức:</span>
                    <strong>
                      {order.paymentMethod === "CASH"
                        ? "TIỀN MẶT (CASH)"
                        : order.paymentMethod === "BANK_TRANSFER"
                        ? "CHUYỂN KHOẢN (VIETQR)"
                        : "KẾT HỢP (SPLIT)"}
                    </strong>
                  </div>

                  {order.cashTendered !== undefined && order.cashTendered > 0 && (
                    <>
                      <div className={styles.metaRow}>
                        <span>Tiền khách đưa:</span>
                        <span>{formatVnd(order.cashTendered)}</span>
                      </div>
                      <div className={styles.metaRow}>
                        <span>Tiền thối lại:</span>
                        <strong style={{ color: "#1e7a46" }}>
                          {formatVnd(order.cashChange || 0)}
                        </strong>
                      </div>
                    </>
                  )}

                  {order.bankRefCode && (
                    <div className={styles.metaRow}>
                      <span>Mã tham chiếu CK:</span>
                      <span>{order.bankRefCode}</span>
                    </div>
                  )}

                  {order.manualAcceptanceReason && (
                    <div className={styles.metaRow}>
                      <span>Ghi chú thu quầy:</span>
                      <span>{order.manualAcceptanceReason}</span>
                    </div>
                  )}
                </div>

                <div className={styles.doubleDivider} />

                {/* Lời cảm ơn & Wifi */}
                <div className={styles.receiptFooter}>
                  <div className={styles.thankYouText}>
                    CẢM ƠN QUÝ KHÁCH VÀ HẸN GẶP LẠI!
                  </div>
                  <div className={styles.wifiText}>
                    <Wifi size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Wifi: <strong>Clucky_Guest</strong> (Mật khẩu: <strong>12345678</strong>)
                  </div>

                  {isReprint && (
                    <div className={styles.reprintFooterNotice}>
                      Hóa đơn in lại vào lúc {nowString}.
                      <br />
                      Bản sao chỉ có giá trị đối chiếu đối soát nội bộ.
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* =========================================================================
                  CHẾ ĐỘ 2: PHIẾU CHẾ BIẾN CHO BẾP (KITCHEN ORDER TICKET - KOT)
                  TUYỆT ĐỐI KHÔNG CÓ GIÁ TIỀN, ĐƠN GIÁ, TỔNG TIỀN, TIỀN THỐI!
                 ========================================================================= */
              <>
                <div className={styles.kotHeader}>
                  <h2 className={styles.kotTitle}>PHIẾU CHẾ BIẾN BẾP</h2>
                  <div style={{ fontSize: 11, color: "#444444", marginTop: 4 }}>
                    Bếp Chi nhánh: <strong>{order.storeName || "Store #01 - Cầu Giấy"}</strong>
                    <br />
                    Thời gian nhận: {order.time || "Ngay bây giờ"} · {order.createdAt ? new Date(order.createdAt).toLocaleTimeString("vi-VN") : ""}
                  </div>
                </div>

                {/* Số thứ tự to bản cho bếp gọi */}
                <div className={styles.queueCallout} style={{ backgroundColor: "#000000", color: "#ffffff" }}>
                  <div className={styles.queueCalloutLeft}>
                    <span style={{ fontSize: 10, color: "#aaaaaa" }}>SỐ THỨ TỰ BẾP</span>
                    <span style={{ fontFamily: "Fredoka, sans-serif", fontSize: 28, fontWeight: 800, color: "#ffffff" }}>
                      {formattedQueue}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, padding: "4px 8px", backgroundColor: "#ffffff", color: "#000000", borderRadius: 4 }}>
                    {order.diningOption === "DINE_IN" ? "ĂN TẠI QUÁN" : "MANG VỀ"}
                  </span>
                </div>

                <div className={styles.metaRow} style={{ marginTop: 8 }}>
                  <span>Mã đơn: <strong>{order.orderCode}</strong></span>
                  <span>Nguồn: <strong>{order.orderSource === "COUNTER" ? "TẠI QUẦY" : "ĐẶT WEB"}</strong></span>
                </div>

                <div className={styles.doubleDivider} />

                {/* Danh sách món cho Bếp - CHỈ CÓ SỐ LƯỢNG & TÊN & TÙY CHỌN */}
                <table className={styles.itemsTable}>
                  <thead>
                    <tr>
                      <th style={{ width: "18%", textAlign: "center", fontSize: 13 }}>SL</th>
                      <th style={{ width: "82%", fontSize: 13 }}>MÓN ĂN & TÙY CHỌN CHẾ BIẾN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={item.id || index} style={{ borderBottom: "1px dashed #dddddd" }}>
                        <td style={{ textAlign: "center", fontSize: 16, fontWeight: 800, verticalAlign: "top" }}>
                          {item.quantity}x
                        </td>
                        <td style={{ padding: "6px 0" }}>
                          <strong style={{ fontSize: 14 }}>{item.itemName}</strong>
                          {item.options && (
                            <div style={{ fontSize: 12, color: "#222222", fontWeight: 700, marginTop: 2, paddingLeft: 6, borderLeft: "2px solid #000000" }}>
                              &gt;&gt;&gt; {item.options}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Ghi chú bếp nếu có */}
                {order.note && (
                  <div className={styles.kotNoteBox}>
                    ⚠️ GHI CHÚ ĐƠN BẾP: {order.note}
                  </div>
                )}

                <div className={styles.doubleDivider} />
                <div style={{ textAlign: "center", fontSize: 11, fontStyle: "italic", color: "#555555" }}>
                  Bếp chiên nấu nhanh theo thứ tự số gọi món.
                </div>
              </>
            )}

            {/* Viền răng cưa giấy in nhiệt dưới đáy */}
            <div className={styles.zigzagBottom} />
          </article>
        </div>
      </div>
    </div>
  );
};
