import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Store,
  Wallet,
  CheckCircle2,
  Clock3,
  Search,
  Printer,
  Link as LinkIcon,
  Landmark,
  X,
  FileCheck,
  AlertCircle,
  RefreshCw,
  Trash2,
  Receipt,
} from "lucide-react";
import { message } from "../../components/feedback";
import { useAuth } from "../../context/AuthContext";
import {
  type BankTransactionItem,
} from "../../mocks/mockPosCatalog";
import {
  paymentsApi,
  type BackendBankTransaction,
  type BackendCounterReceipt,
  type ShiftSummaryData,
  getErrorMessage,
} from "../../lib/api";
import styles from "./incoming-transfers.module.css";

const formatVnd = (val: number) => {
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
};

export function fromBackendBankTxToItem(
  b: BackendBankTransaction,
  storeId?: string,
  storeName?: string,
): BankTransactionItem {
  return {
    id: String(b.id),
    bankTxId: b.bankTxId,
    gateway: "MBBank",
    accountNumber: b.bankAccount || "0387654321",
    amount: b.amount,
    content: b.content,
    transactionDate: b.receivedAt,
    referenceCode: b.bankTxId,
    status: b.matchedOrderCode ? "RECONCILED" : "UNASSIGNED",
    orderCode: b.matchedOrderCode || undefined,
    storeId: storeId || "1",
    storeName: storeName || "Store #01 - Cầu Giấy",
  };
}

export const IncomingTransfersPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Transactions & Receipts state
  const [transactions, setTransactions] = useState<BankTransactionItem[]>([]);
  const [receipts, setReceipts] = useState<BackendCounterReceipt[]>([]);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<boolean>(false);

  // Active section tab: RECEIPTS (Biên lai thu quầy) vs BANK_TX (Giao dịch ngân hàng)
  const [activeSection, setActiveSection] = useState<"RECEIPTS" | "BANK_TX">("RECEIPTS");

  // Load dữ liệu sổ quỹ và giao dịch ngân hàng từ payment-service
  const loadPaymentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const storeIdNum = user?.storeId ? Number(user.storeId) : 1;
      const [txList, rcList, summary] = await Promise.all([
        paymentsApi.listBankTransactions(storeIdNum).catch(() => null),
        paymentsApi.listReceipts(storeIdNum).catch(() => null),
        paymentsApi.getShiftSummary(storeIdNum).catch(() => null),
      ]);

      if (txList !== null && txList !== undefined) {
        const converted = txList.map((tx) =>
          fromBackendBankTxToItem(
            tx,
            user?.storeId ? String(user.storeId) : "1",
            user?.storeName || "Store #01 - Cầu Giấy",
          ),
        );
        setTransactions(converted);
      } else {
        setTransactions([]);
      }

      if (rcList !== null && rcList !== undefined) {
        setReceipts(rcList);
      } else {
        setReceipts([]);
      }

      if (summary !== null && summary !== undefined) {
        setShiftSummary(summary);
      }
      setFetchError(false);
    } catch (err) {
      console.warn("Lỗi tải dữ liệu payment từ backend:", err);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.storeId, user?.storeName]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "RECONCILED" | "PENDING_RECONCILIATION" | "UNASSIGNED"
  >("ALL");

  const [receiptStatusFilter, setReceiptStatusFilter] = useState<
    "ALL" | "RECONCILED" | "PENDING_RECONCILIATION" | "VOIDED"
  >("ALL");

  // Assign Order Dialog state
  const [assigningTx, setAssigningTx] = useState<BankTransactionItem | null>(null);
  const [assignedOrderCode, setAssignedOrderCode] = useState("");

  // Void Receipt Dialog state
  const [voidingReceipt, setVoidingReceipt] = useState<BackendCounterReceipt | null>(null);
  const [voidReason, setVoidReason] = useState<string>(
    "Thu ngân bấm nhầm tiền mặt, khách chuyển sang quét QR",
  );
  const [isVoiding, setIsVoiding] = useState<boolean>(false);

  // Calculate Shift Drawer Widget stats (fallback nếu chưa có shiftSummary)
  const shiftCashStats = useMemo(() => {
    let totalCashCollected = 0;
    let totalCashChangeGiven = 0;

    if (receipts.length > 0) {
      const validReceipts = receipts.filter((r) => r.status !== "VOIDED");
      totalCashCollected = validReceipts.reduce(
        (acc, r) => acc + (r.cashAmount || 0),
        0,
      );
      totalCashChangeGiven = validReceipts.reduce(
        (acc, r) => acc + (r.cashChange || 0),
        0,
      );
    }

    const netCashInDrawer = totalCashCollected - totalCashChangeGiven;

    const reconciledSum = transactions
      .filter((tx) => tx.status === "RECONCILED")
      .reduce((acc, tx) => acc + tx.amount, 0);

    const pendingSum = transactions
      .filter((tx) => tx.status === "PENDING_RECONCILIATION")
      .reduce((acc, tx) => acc + tx.amount, 0);

    return {
      netCashInDrawer,
      totalCashCollected,
      totalCashChangeGiven,
      totalBankReconciled: reconciledSum,
      totalBankPending: pendingSum,
    };
  }, [transactions, receipts]);

  // Filtered transactions
  const visibleTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== "ALL" && tx.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = tx.bankTxId.toLowerCase().includes(q);
        const matchContent = tx.content.toLowerCase().includes(q);
        const matchOrder = (tx.orderCode || "").toLowerCase().includes(q);
        const matchAmount = String(tx.amount).includes(q);
        return matchCode || matchContent || matchOrder || matchAmount;
      }
      return true;
    });
  }, [transactions, statusFilter, searchQuery]);

  // Filtered receipts
  const visibleReceipts = useMemo(() => {
    return receipts.filter((rc) => {
      if (receiptStatusFilter !== "ALL" && rc.status !== receiptStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchReceipt = rc.receiptCode.toLowerCase().includes(q);
        const matchOrder = rc.orderCode.toLowerCase().includes(q);
        const matchQueue = rc.queueNumber ? String(rc.queueNumber).includes(q) : false;
        const matchStaff = (rc.staffName || "").toLowerCase().includes(q);
        const matchAmount = String(rc.totalDue).includes(q);
        return matchReceipt || matchOrder || matchQueue || matchStaff || matchAmount;
      }
      return true;
    });
  }, [receipts, receiptStatusFilter, searchQuery]);

  // Xử lý xác nhận hủy biên lai thu tiền nhầm
  const handleConfirmVoid = async () => {
    if (!voidingReceipt) return;
    setIsVoiding(true);
    try {
      await paymentsApi.voidReceipt(voidingReceipt.id, voidReason);
      message.success(`Đã hủy biên lai ${voidingReceipt.receiptCode} thành công!`);
      setVoidingReceipt(null);
      await loadPaymentData();
    } catch (err: any) {
      console.error("Lỗi hủy biên lai:", err);
      message.error(
        "Lỗi hủy biên lai: " +
          (err?.response?.data?.message || getErrorMessage(err)),
      );
    } finally {
      setIsVoiding(false);
    }
  };

  // Handle assign transaction to order
  const handleConfirmAssign = () => {
    if (!assigningTx || !assignedOrderCode.trim()) return;

    const trimmedCode = assignedOrderCode.trim().toUpperCase();
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== assigningTx.id) return tx;
        return {
          ...tx,
          status: "RECONCILED",
          orderCode: trimmedCode,
        };
      }),
    );

    message.success(
      "Đã liên kết giao dịch " + assigningTx.bankTxId + " với đơn " + trimmedCode + " thành công!",
    );
    setAssigningTx(null);
    setAssignedOrderCode("");
  };

  // Shift handover print simulation
  const handlePrintHandover = () => {
    message.success("Đã xuất biên bản bàn giao két tiền ca trực thành công! (Mô phỏng)");
  };

  return (
    <div className={styles.container}>
      {/* 1. Page Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backLinkBtn}
            onClick={() => navigate("/admin/orders")}
            title="Quay lại không gian quản lý đơn hàng"
          >
            <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
          </button>
          <h1 className={styles.pageTitle}>
            <Landmark size={24} />
            Sổ Quỹ Dòng Tiền & Két Ca Trực Chi Nhánh
          </h1>
          <p className={styles.pageSubtitle}>
            Theo dõi dòng tiền ngân hàng MBBank, đối soát VietQR và chốt ca tiền mặt quầy.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.branchChip}>
            <Store size={18} color="#8f1216" />
            <div>
              <div className={styles.branchName}>
                {user?.storeName || "Store #01 - Cầu Giấy"}
              </div>
              <div className={styles.branchStatus}>Ca sáng: 06:00 - 14:00</div>
            </div>
          </div>

          <button
            type="button"
            className={styles.printHandoverBtn}
            onClick={handlePrintHandover}
            title="In biên bản bàn giao két ca trực"
          >
            <Printer size={16} />
            <span>In biên bản bàn giao két</span>
          </button>
        </div>
      </header>

      {/* Cảnh báo lỗi kết nối backend */}
      {fetchError && (
        <div
          style={{
            margin: "0 0 20px 0",
            padding: "12px 18px",
            backgroundColor: "#FEF3F2",
            border: "1px solid #FECDCA",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#B42318",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            <AlertCircle size={20} />
            <span>{t("admin:system.notConnected")}</span>
          </div>
          <button
            type="button"
            onClick={() => loadPaymentData()}
            style={{
              padding: "6px 16px",
              backgroundColor: "#B42318",
              color: "#FFF",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {t("admin:system.retry")}
          </button>
        </div>
      )}

      {/* 2. Shift Drawer Widget (3 Cards) */}
      {/* 2. Shift Drawer Widget (3 Cards) */}
      <section className={styles.shiftDrawerWidget} aria-label="Widget két tiền ca trực">
        {/* Card 1: Két tiền mặt thực tế */}
        <div className={styles.widgetCard}>
          <div className={styles.widgetCardHeader}>
            <span className={styles.widgetTitle}>Két Tiền Mặt Thực Tế</span>
            <div className={`${styles.widgetIconWrapper} ${styles.iconCash}`}>
              <Wallet size={20} />
            </div>
          </div>
          <div className={`${styles.widgetAmount} ${styles.widgetAmountGreen}`}>
            {formatVnd(shiftSummary?.netCashInDrawer ?? shiftCashStats.netCashInDrawer)}
          </div>
          <div className={styles.widgetDescription}>
            Tổng tiền mặt thu được trong ca sau khi trừ tiền thối (Tổng thu:{" "}
            {formatVnd(shiftSummary?.totalCashCollected ?? shiftCashStats.totalCashCollected)} - Đã thối:{" "}
            {formatVnd(shiftSummary?.totalCashChangeGiven ?? shiftCashStats.totalCashChangeGiven)}).
          </div>
        </div>

        {/* Card 2: Chuyển khoản đã khớp sao kê */}
        <div className={styles.widgetCard}>
          <div className={styles.widgetCardHeader}>
            <span className={styles.widgetTitle}>CK Đã Khớp Sao Kê</span>
            <div className={`${styles.widgetIconWrapper} ${styles.iconReconciled}`}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className={`${styles.widgetAmount} ${styles.widgetAmountPrimary}`}>
            {formatVnd(shiftSummary?.totalBankReconciled ?? shiftCashStats.totalBankReconciled)}
          </div>
          <div className={styles.widgetDescription}>
            Tổng chuyển khoản trạng thái <strong>RECONCILED</strong> đã khớp chính
            xác với đơn hàng trên hệ thống.
          </div>
        </div>

        {/* Card 3: Chuyển khoản chờ đối soát */}
        <div className={styles.widgetCard}>
          <div className={styles.widgetCardHeader}>
            <span className={styles.widgetTitle}>CK Chờ Đối Soát</span>
            <div className={`${styles.widgetIconWrapper} ${styles.iconPending}`}>
              <Clock3 size={20} />
            </div>
          </div>
          <div className={`${styles.widgetAmount} ${styles.widgetAmountOrange}`}>
            {formatVnd(shiftSummary?.totalBankPending ?? shiftCashStats.totalBankPending)}
          </div>
          <div className={styles.widgetDescription}>
            Khoản thu do thu ngân xác nhận thủ công hoặc webhook về muộn đang chờ
            đối chiếu.
          </div>
        </div>
      </section>

      {/* 3. Bảng Dữ Liệu: Biên Lai Thu Ngân & Giao Dịch Ngân Hàng */}
      <section className={styles.tableSection}>
        {/* Navigation Tabs giữa Biên Lai và Giao Dịch */}
        <div className={styles.tableNav}>
          <button
            type="button"
            className={`${styles.tableNavBtn} ${
              activeSection === "RECEIPTS" ? styles.tableNavBtnActive : ""
            }`}
            onClick={() => setActiveSection("RECEIPTS")}
          >
            <Receipt size={16} />
            <span>Biên lai thu ngân chi nhánh ({receipts.length})</span>
          </button>

          <button
            type="button"
            className={`${styles.tableNavBtn} ${
              activeSection === "BANK_TX" ? styles.tableNavBtnActive : ""
            }`}
            onClick={() => setActiveSection("BANK_TX")}
          >
            <Landmark size={16} />
            <span>Giao dịch ngân hàng MBBank ({transactions.length})</span>
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={16} color="#6b6259" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={
                activeSection === "RECEIPTS"
                  ? "Tìm theo mã biên lai, mã đơn, số tiền, thu ngân..."
                  : "Tìm theo mã giao dịch, số tiền, nội dung CK..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.filtersRow}>
            {activeSection === "RECEIPTS" ? (
              <>
                {[
                  { key: "ALL", label: "Tất cả" },
                  { key: "RECONCILED", label: "Hợp lệ (RECONCILED)" },
                  { key: "PENDING_RECONCILIATION", label: "Chờ đối soát" },
                  { key: "VOIDED", label: "Đã hủy (VOIDED)" },
                ].map((f) => {
                  const isActive = receiptStatusFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      className={`${styles.filterBtn} ${
                        isActive ? styles.filterBtnActive : ""
                      }`}
                      onClick={() =>
                        setReceiptStatusFilter(
                          f.key as
                            | "ALL"
                            | "RECONCILED"
                            | "PENDING_RECONCILIATION"
                            | "VOIDED",
                        )
                      }
                    >
                      {f.label}
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {[
                  { key: "ALL", label: "Tất cả" },
                  { key: "RECONCILED", label: "Đã khớp (RECONCILED)" },
                  { key: "PENDING_RECONCILIATION", label: "Chờ đối soát" },
                  { key: "UNASSIGNED", label: "Chưa gán đơn" },
                ].map((f) => {
                  const isActive = statusFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      className={`${styles.filterBtn} ${
                        isActive ? styles.filterBtnActive : ""
                      }`}
                      onClick={() =>
                        setStatusFilter(
                          f.key as
                            | "ALL"
                            | "RECONCILED"
                            | "PENDING_RECONCILIATION"
                            | "UNASSIGNED",
                        )
                      }
                    >
                      {f.label}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className={styles.tableWrapper}>
          {activeSection === "RECEIPTS" ? (
            <table className={styles.txTable}>
              <thead>
                <tr>
                  <th>MÃ BIÊN LAI</th>
                  <th>ĐƠN HÀNG & STT</th>
                  <th>THỜI GIAN</th>
                  <th>PHƯƠNG THỨC</th>
                  <th>TỔNG THU</th>
                  <th>CHI TIẾT TIỀN</th>
                  <th>THU NGÂN</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {visibleReceipts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ textAlign: "center", padding: 32, color: "#9c9186" }}
                    >
                      Không có biên lai thu ngân nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  visibleReceipts.map((rc) => (
                    <tr key={rc.id}>
                      <td>
                        <strong>{rc.receiptCode}</strong>
                        {rc.printCount > 1 && (
                          <div style={{ fontSize: 11, color: "#22577a", fontWeight: 700 }}>
                            Đã in: {rc.printCount} lần
                          </div>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: "#8f1216" }}>{rc.orderCode}</strong>
                        <div style={{ fontSize: 11, color: "#6b6259" }}>
                          STT: #{String(rc.queueNumber || 1).padStart(3, "0")}
                        </div>
                      </td>
                      <td>{new Date(rc.createdAt).toLocaleTimeString("vi-VN")}</td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>
                          {rc.method === "CASH"
                            ? "TIỀN MẶT"
                            : rc.method === "BANK_TRANSFER"
                            ? "CHUYỂN KHOẢN"
                            : "KẾT HỢP"}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: 14, color: "#1e7a46" }}>
                          {formatVnd(rc.totalDue)}
                        </strong>
                      </td>
                      <td style={{ fontSize: 12, lineHeight: 1.4 }}>
                        {rc.method === "CASH" && (
                          <>
                            Nhận: {formatVnd(rc.cashTendered)}
                            <br />
                            Thối: {formatVnd(rc.cashChange)}
                          </>
                        )}
                        {rc.method === "BANK_TRANSFER" && (
                          <>
                            CK: {formatVnd(rc.bankAmountDeclared)}
                            {rc.bankRefCode && (
                              <div style={{ fontSize: 11, color: "#6b6259" }}>
                                Ref: {rc.bankRefCode}
                              </div>
                            )}
                          </>
                        )}
                        {rc.method === "SPLIT" && (
                          <>
                            Tiền mặt: {formatVnd(rc.cashAmount)}
                            <br />
                            CK: {formatVnd(rc.bankAmountDeclared)}
                          </>
                        )}
                      </td>
                      <td>{rc.staffName || "Staff"}</td>
                      <td>
                        {rc.status === "RECONCILED" && (
                          <span className={`${styles.statusTag} ${styles.tagReconciled}`}>
                            <CheckCircle2 size={12} /> HỢP LỆ
                          </span>
                        )}
                        {rc.status === "PENDING_RECONCILIATION" && (
                          <span className={`${styles.statusTag} ${styles.tagPending}`}>
                            <Clock3 size={12} /> CHỜ ĐỐI SOÁT
                          </span>
                        )}
                        {rc.status === "VOIDED" && (
                          <span className={`${styles.statusTag} ${styles.tagVoided}`}>
                            <X size={12} /> ĐÃ HỦY
                          </span>
                        )}
                        {rc.status === "DISCREPANCY" && (
                          <span className={`${styles.statusTag} ${styles.tagPending}`}>
                            LỆCH TIỀN
                          </span>
                        )}
                      </td>
                      <td>
                        {rc.status !== "VOIDED" ? (
                          <button
                            type="button"
                            className={styles.voidBtn}
                            onClick={() => {
                              setVoidingReceipt(rc);
                              setVoidReason(
                                "Thu ngân bấm nhầm tiền mặt, khách chuyển sang quét QR",
                              );
                            }}
                            title="Hủy biên lai thu tiền nhầm"
                          >
                            <Trash2 size={13} />
                            <span>Hủy biên lai</span>
                          </button>
                        ) : (
                          <span style={{ color: "#9c9186", fontSize: 12, fontStyle: "italic" }}>
                            Đã hủy
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className={styles.txTable}>
              <thead>
                <tr>
                  <th>MÃ GIAO DỊCH</th>
                  <th>THỜI GIAN</th>
                  <th>SỐ TIỀN</th>
                  <th>NGÂN HÀNG & STK</th>
                  <th>NỘI DUNG CHUYỂN KHOẢN</th>
                  <th>MÃ ĐƠN LIÊN KẾT</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: "center", padding: 32, color: "#9c9186" }}
                    >
                      Không có giao dịch ngân hàng nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  visibleTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <strong>{tx.bankTxId}</strong>
                        <div style={{ fontSize: 11, color: "#6b6259" }}>
                          Ref: {tx.referenceCode}
                        </div>
                      </td>
                      <td>{new Date(tx.transactionDate).toLocaleTimeString("vi-VN")}</td>
                      <td>
                        <strong style={{ fontSize: 14, color: "#1e7a46" }}>
                          +{formatVnd(tx.amount)}
                        </strong>
                      </td>
                      <td>
                        <strong>{tx.gateway}</strong>
                        <div style={{ fontSize: 11, color: "#6b6259" }}>
                          STK: {tx.accountNumber}
                        </div>
                      </td>
                      <td style={{ maxWidth: 280, wordBreak: "break-word" }}>
                        {tx.content}
                      </td>
                      <td>
                        {tx.orderCode ? (
                          <span style={{ fontWeight: 700, color: "#8f1216" }}>
                            {tx.orderCode}
                          </span>
                        ) : (
                          <span style={{ color: "#9c9186", fontStyle: "italic" }}>
                            (Chưa có)
                          </span>
                        )}
                      </td>
                      <td>
                        {tx.status === "RECONCILED" && (
                          <span className={`${styles.statusTag} ${styles.tagReconciled}`}>
                            <CheckCircle2 size={12} /> ĐÃ KHỚP ĐƠN
                          </span>
                        )}
                        {tx.status === "PENDING_RECONCILIATION" && (
                          <span className={`${styles.statusTag} ${styles.tagPending}`}>
                            <Clock3 size={12} /> CHỜ ĐỐI SOÁT
                          </span>
                        )}
                        {tx.status === "UNASSIGNED" && (
                          <span className={`${styles.statusTag} ${styles.tagUnassigned}`}>
                            CHƯA GÁN ĐƠN
                          </span>
                        )}
                      </td>
                      <td>
                        {tx.status !== "RECONCILED" && (
                          <button
                            type="button"
                            className={styles.assignBtn}
                            onClick={() => {
                              setAssigningTx(tx);
                              setAssignedOrderCode(tx.orderCode || "CLU-20261110-0015");
                            }}
                            title="Gán mã đơn hàng quầy cho giao dịch này"
                          >
                            <LinkIcon size={13} />
                            <span>Gán đơn</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 4. Assign Order Modal */}
      {assigningTx && (
        <div className={styles.assignModalOverlay} role="dialog" aria-modal="true">
          <div className={styles.assignModalWindow}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.assignTitle}>Gán Giao Dịch Vào Đơn Quầy</h2>
              <button
                type="button"
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
                onClick={() => setAssigningTx(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: "#6b6259", lineHeight: 1.5 }}>
              Khớp giao dịch <strong>{assigningTx.bankTxId}</strong> (+{formatVnd(assigningTx.amount)})
              vào đơn hàng tại quầy để chuyển trạng thái sang <strong>RECONCILED</strong>.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#16100d" }}>
                Nhập hoặc chọn mã đơn hàng (ví dụ: CLU-20261110-0015):
              </label>
              <input
                type="text"
                className={styles.assignInput}
                placeholder="CLU-20261110-XXXX"
                value={assignedOrderCode}
                onChange={(e) => setAssignedOrderCode(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.assignFooter}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={() => setAssigningTx(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={styles.btnConfirm}
                onClick={handleConfirmAssign}
              >
                Xác nhận gán đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Void Receipt Modal (Hủy Biên Lai Thu Tiền Nhầm) */}
      {voidingReceipt && (
        <div className={styles.assignModalOverlay} role="dialog" aria-modal="true">
          <div className={styles.assignModalWindow}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.assignTitle} style={{ color: "#b42318" }}>
                Hủy Biên Lai Thu Tiền Nhầm
              </h2>
              <button
                type="button"
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
                onClick={() => setVoidingReceipt(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: "#6b6259", lineHeight: 1.5 }}>
              Xác nhận hủy biên lai <strong>{voidingReceipt.receiptCode}</strong> cho đơn hàng{" "}
              <strong style={{ color: "#8f1216" }}>{voidingReceipt.orderCode}</strong> (Số thứ tự #{String(voidingReceipt.queueNumber || 1).padStart(3, "0")}) với số tiền{" "}
              <strong>{formatVnd(voidingReceipt.totalDue)}</strong>.
              <br />
              Đơn hàng sẽ được chuyển về trạng thái <strong>CHƯA THU TIỀN</strong> (PENDING) để thu ngân thu lại đúng phương thức.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#16100d" }}>
                Lý do hủy biên lai (bắt buộc):
              </label>
              <input
                type="text"
                className={styles.assignInput}
                placeholder="Nhập lý do hủy biên lai..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.assignFooter}>
              <button
                type="button"
                className={styles.btnCancel}
                disabled={isVoiding}
                onClick={() => setVoidingReceipt(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={styles.btnConfirm}
                style={{ backgroundColor: "#b42318" }}
                disabled={isVoiding || !voidReason.trim()}
                onClick={handleConfirmVoid}
              >
                {isVoiding ? "Đang xử lý hủy..." : "Xác nhận hủy biên lai"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default IncomingTransfersPage;
