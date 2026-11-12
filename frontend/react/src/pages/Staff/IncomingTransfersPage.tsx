import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Select } from "antd";
import {
  ArrowLeft,
  Store,
  Wallet,
  CheckCircle2,
  Clock3,
  Search,
  Landmark,
  X,
  AlertCircle,
  RefreshCw,
  Trash2,
  Receipt,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import { message } from "../../components/feedback";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrderContext";
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
import {
  exportCashLedgerExcel,
  formatDateLabelVn,
  shiftDateYmd,
} from "../../utils/orderExcelExport";
import "../Orders/admin-orders.css";
import styles from "./incoming-transfers.module.css";

const formatVnd = (val: number) => {
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
};
const businessDate = (date: Date = new Date()) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

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
    storeName: storeName || "Clucky",
  };
}

export const IncomingTransfersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { stores, currentStore } = useOrders();
  const navigate = useNavigate();

  // Admin can inspect any branch; Store Manager is locked to their own store
  const [selectedStoreId, setSelectedStoreId] = useState<number>(() =>
    user?.storeId ? Number(user.storeId) : currentStore?.id || 1
  );

  useEffect(() => {
    if (!isAdmin && user?.storeId) {
      setSelectedStoreId(Number(user.storeId));
    } else if (isAdmin && stores.length > 0 && !stores.some((s) => Number(s.id) === Number(selectedStoreId))) {
      setSelectedStoreId(Number(stores[0].id));
    }
  }, [isAdmin, user?.storeId, stores, selectedStoreId]);

  const activeStore = useMemo(
    () =>
      stores.find((s) => Number(s.id) === Number(selectedStoreId)) ||
      currentStore ||
      stores[0] ||
      null,
    [stores, selectedStoreId, currentStore]
  );

  const activeStoreName =
    activeStore?.name || user?.storeName || `Chi nhánh #${selectedStoreId}`;
  const activeStoreAddress = activeStore?.address;

  // Transactions & Receipts state
  const [transactions, setTransactions] = useState<BankTransactionItem[]>([]);
  const [receipts, setReceipts] = useState<BackendCounterReceipt[]>([]);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState(businessDate);
  const loadRevisionRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => setSelectedDate(current => current === businessDate(new Date(Date.now() - 60_000)) ? businessDate() : current), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Active section tab: RECEIPTS (Biên lai thu quầy) vs BANK_TX (Giao dịch ngân hàng)
  const [activeSection, setActiveSection] = useState<"RECEIPTS" | "BANK_TX">("RECEIPTS");

  // Load dữ liệu sổ quỹ và giao dịch ngân hàng từ payment-service
  const loadPaymentData = useCallback(async () => {
    const revision = ++loadRevisionRef.current;
    setIsLoading(true);
    try {
      const storeIdNum = isAdmin ? selectedStoreId : (user?.storeId ? Number(user.storeId) : 1);
      const [txList, rcList, summary] = await Promise.all([
        paymentsApi.listBankTransactions(storeIdNum, selectedDate).catch(() => null),
        paymentsApi.listReceipts(storeIdNum).catch(() => null),
        paymentsApi.getShiftSummary(storeIdNum, selectedDate).catch(() => null),
      ]);
      if (revision !== loadRevisionRef.current) return;

      if (txList !== null && txList !== undefined) {
        const converted = txList.map((tx) =>
          fromBackendBankTxToItem(
            tx,
            String(storeIdNum),
            activeStoreName,
          ),
        );
        setTransactions(converted.filter(tx => businessDate(new Date(tx.transactionDate)) === selectedDate));
      } else {
        setTransactions([]);
      }

      if (rcList !== null && rcList !== undefined) {
        setReceipts(rcList.filter(receipt => businessDate(new Date(receipt.createdAt)) === selectedDate));
      } else {
        setReceipts([]);
      }

      setShiftSummary(summary);
      setFetchError(txList === null || rcList === null || summary === null);
    } catch (err) {
      if (revision !== loadRevisionRef.current) return;
      console.warn("Lỗi tải dữ liệu payment từ backend:", err);
      setFetchError(true);
    } finally {
      if (revision === loadRevisionRef.current) setIsLoading(false);
    }
  }, [isAdmin, selectedStoreId, user?.storeId, activeStoreName, selectedDate]);

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

  // Void Receipt Dialog state
  const [voidingReceipt, setVoidingReceipt] = useState<BackendCounterReceipt | null>(null);
  const [voidReason, setVoidReason] = useState<string>(
    t("business:transfers.defaultVoidReason"),
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
      message.success(t("business:transfers.receiptVoided", { code: voidingReceipt.receiptCode }));
      setVoidingReceipt(null);
      await loadPaymentData();
    } catch (err: any) {
      console.error("receipt void failed:", err);
      message.error(t("business:transfers.voidFailed", { detail: getErrorMessage(err) }));
    } finally {
      setIsVoiding(false);
    }
  };

  // Export Excel Cash Ledger & Shift Drawer Report
  const handleExportExcel = () => {
    exportCashLedgerExcel({
      date: selectedDate,
      storeName: activeStoreName,
      storeAddress: activeStoreAddress,
      staffName: user?.fullName || "Manager",
      netCashInDrawer: shiftSummary?.netCashInDrawer ?? shiftCashStats.netCashInDrawer,
      totalCashCollected: shiftSummary?.totalCashCollected ?? shiftCashStats.totalCashCollected,
      totalCashChangeGiven: shiftSummary?.totalCashChangeGiven ?? shiftCashStats.totalCashChangeGiven,
      totalBankReconciled: shiftSummary?.totalBankReconciled ?? shiftCashStats.totalBankReconciled,
      totalBankPending: shiftSummary?.totalBankPending ?? shiftCashStats.totalBankPending,
      receipts,
      transactions,
    });
    message.success(t("business:transfers.exportLedgerSuccess", { date: selectedDate }));
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
            title={t("business:transfers.backToOrders")}
          >
            <ArrowLeft size={16} /> {t("business:transfers.backToOrders")}
          </button>
          <h1 className={styles.pageTitle}>
            <Landmark size={24} />
            {t("business:transfers.title")}
          </h1>
          <p className={styles.pageSubtitle}>
            {t("business:transfers.subtitle")}
          </p>
        </div>

        <div className={styles.headerActions}>
          {isAdmin && stores.length > 0 && (
            <Select
              aria-label={t("business:transfers.selectStore")}
              value={selectedStoreId}
              style={{ minWidth: 220 }}
              options={stores.map((s) => ({
                value: Number(s.id),
                label: s.name,
              }))}
              onChange={(val) => setSelectedStoreId(Number(val))}
            />
          )}

          <div className={styles.branchChip}>
            <Store size={18} color="#8f1216" />
            <div>
              <div className={styles.branchName}>{activeStoreName}</div>
              {activeStoreAddress ? (
                <div className={styles.branchStatus}>{activeStoreAddress}</div>
              ) : (
                <div className={styles.branchStatus}>{selectedDate}</div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Date Filter Card (Matches Quản lý đơn hàng UI + Export Excel) */}
      <section className="admin-orders-date-card" aria-label={t("business:dateFilter.ariaLabel")}>
        <div className="admin-orders-date-left">
          <div className="admin-orders-date-icon">
            <Calendar size={18} />
          </div>
          <div className="admin-orders-date-meta">
            <span className="admin-orders-date-eyebrow">
              {t("business:transfers.ledgerEyebrow")}
            </span>
            <strong className="admin-orders-date-title">
              {selectedDate === businessDate() ? t("business:dateFilter.todayPrefix") : ""}
              {formatDateLabelVn(selectedDate, i18n.language)}
            </strong>
          </div>
        </div>

        <div className="admin-orders-date-controls">
          <div className="admin-orders-date-stepper">
            <button
              type="button"
              className="admin-orders-date-step-btn"
              title={t("business:dateFilter.prevDay")}
              onClick={() => setSelectedDate((d) => shiftDateYmd(d, -1))}
            >
              <ChevronLeft size={15} />
            </button>
            <input
              id="ledger-date"
              type="date"
              aria-label={t("business:dateFilter.pickDateAria")}
              value={selectedDate}
              max={businessDate()}
              onChange={(event) => {
                if (event.target.value) setSelectedDate(event.target.value);
              }}
              className="admin-orders-date-input"
            />
            <button
              type="button"
              className="admin-orders-date-step-btn"
              title={t("business:dateFilter.nextDay")}
              disabled={selectedDate >= businessDate()}
              onClick={() => setSelectedDate((d) => shiftDateYmd(d, 1))}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <button
            type="button"
            className="admin-orders-date-step-btn"
            style={{ width: "auto", padding: "0 12px", fontWeight: 700, fontSize: 13 }}
            onClick={() => setSelectedDate(businessDate())}
          >
            {t("business:dateFilter.today")}
          </button>

          <button
            type="button"
            className="admin-orders-date-step-btn"
            style={{ width: "auto", padding: "0 12px", gap: 6, fontWeight: 700, fontSize: 13 }}
            onClick={() => void loadPaymentData()}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>{t("business:dateFilter.refresh")}</span>
          </button>

          <button
            type="button"
            className={styles.printHandoverBtn}
            onClick={handleExportExcel}
            title={t("business:transfers.exportLedgerExcel")}
          >
            <FileSpreadsheet size={16} />
            <span>{t("business:transfers.exportLedgerExcel")}</span>
          </button>
        </div>

        <div className="admin-orders-date-kpis">
          <div className="admin-orders-kpi-pill">
            <span>{t("business:transfers.receipts")}:</span>
            <strong>{receipts.length}</strong>
          </div>
          <div className="admin-orders-kpi-pill">
            <span>{t("business:transfers.bankTransactions")}:</span>
            <strong>{transactions.length}</strong>
          </div>
          <div className="admin-orders-kpi-pill admin-orders-kpi-highlight">
            <span>{t("business:transfers.cashDrawer")}:</span>
            <strong>{formatVnd(shiftSummary?.netCashInDrawer ?? shiftCashStats.netCashInDrawer)}</strong>
          </div>
        </div>
      </section>

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
      <section className={styles.shiftDrawerWidget} aria-label={t("business:transfers.title")}>
        {/* Card 1: Két tiền mặt thực tế */}
        <div className={styles.widgetCard}>
          <div className={styles.widgetCardHeader}>
            <span className={styles.widgetTitle}>{t("business:transfers.cashDrawer")}</span>
            <div className={`${styles.widgetIconWrapper} ${styles.iconCash}`}>
              <Wallet size={20} />
            </div>
          </div>
          <div className={`${styles.widgetAmount} ${styles.widgetAmountGreen}`}>
            {formatVnd(shiftSummary?.netCashInDrawer ?? shiftCashStats.netCashInDrawer)}
          </div>
          <div className={styles.widgetDescription}>
            {t("business:transfers.cashExplanation")} ({t("business:transfers.collected")}: {" "}
            {formatVnd(shiftSummary?.totalCashCollected ?? shiftCashStats.totalCashCollected)} - {t("business:transfers.change")}: {" "}
            {formatVnd(shiftSummary?.totalCashChangeGiven ?? shiftCashStats.totalCashChangeGiven)}).
          </div>
        </div>

        {/* Card 2: Chuyển khoản đã khớp sao kê */}
        <div className={styles.widgetCard}>
          <div className={styles.widgetCardHeader}>
            <span className={styles.widgetTitle}>{t("business:transfers.reconciledTransfers")}</span>
            <div className={`${styles.widgetIconWrapper} ${styles.iconReconciled}`}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className={`${styles.widgetAmount} ${styles.widgetAmountPrimary}`}>
            {formatVnd(shiftSummary?.totalBankReconciled ?? shiftCashStats.totalBankReconciled)}
          </div>
          <div className={styles.widgetDescription}>
            {t("business:transfers.reconciledExplanation")}
          </div>
        </div>

        {/* Card 3: Chuyển khoản chờ đối soát */}
        <div className={styles.widgetCard}>
          <div className={styles.widgetCardHeader}>
            <span className={styles.widgetTitle}>{t("business:transfers.pendingTransfers")}</span>
            <div className={`${styles.widgetIconWrapper} ${styles.iconPending}`}>
              <Clock3 size={20} />
            </div>
          </div>
          <div className={`${styles.widgetAmount} ${styles.widgetAmountOrange}`}>
            {formatVnd(shiftSummary?.totalBankPending ?? shiftCashStats.totalBankPending)}
          </div>
          <div className={styles.widgetDescription}>
            {t("business:transfers.pendingExplanation")}
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
            <span>{t("business:transfers.receipts")} ({receipts.length})</span>
          </button>

          <button
            type="button"
            className={`${styles.tableNavBtn} ${
              activeSection === "BANK_TX" ? styles.tableNavBtnActive : ""
            }`}
            onClick={() => setActiveSection("BANK_TX")}
          >
            <Landmark size={16} />
            <span>{t("business:transfers.bankTransactions")} ({transactions.length})</span>
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
                  ? t("business:transfers.searchReceipts")
                  : t("business:transfers.searchTransactions")
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.filtersRow}>
            {activeSection === "RECEIPTS" ? (
              <>
                {[
                  { key: "ALL", label: t("business:transfers.all") },
                  { key: "RECONCILED", label: t("business:transfers.reconciled") },
                  { key: "PENDING_RECONCILIATION", label: t("business:transfers.pending") },
                  { key: "VOIDED", label: t("business:transfers.voided") },
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
                  { key: "ALL", label: t("business:transfers.all") },
                  { key: "RECONCILED", label: t("business:transfers.reconciled") },
                  { key: "PENDING_RECONCILIATION", label: t("business:transfers.pending") },
                  { key: "UNASSIGNED", label: t("business:transfers.unassigned") },
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
                  <th>{t("business:transfers.receiptCode")}</th>
                  <th>{t("business:transfers.orderAndQueue")}</th>
                  <th>{t("business:transfers.time")}</th>
                  <th>{t("business:transfers.method")}</th>
                  <th>{t("business:transfers.totalCollected")}</th>
                  <th>{t("business:transfers.paymentDetails")}</th>
                  <th>{t("business:transfers.cashier")}</th>
                  <th>{t("business:transfers.status")}</th>
                  <th>{t("business:transfers.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleReceipts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ textAlign: "center", padding: 32, color: "#9c9186" }}
                    >
                      {t("business:transfers.noReceipts")}
                    </td>
                  </tr>
                ) : (
                  visibleReceipts.map((rc) => (
                    <tr key={rc.id}>
                      <td>
                        <strong>{rc.receiptCode}</strong>
                        {rc.printCount > 1 && (
                          <div style={{ fontSize: 11, color: "#22577a", fontWeight: 700 }}>
                            {t("business:transfers.printedTimes", { count: rc.printCount })}
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
                            ? t("business:transfers.cash")
                            : rc.method === "BANK_TRANSFER"
                            ? t("business:transfers.bankTransfer")
                            : t("business:transfers.split")}
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
                            {t("business:transfers.received")}: {formatVnd(rc.cashTendered)}
                            <br />
                            {t("business:transfers.change")}: {formatVnd(rc.cashChange)}
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
                            {t("business:transfers.cash")}: {formatVnd(rc.cashAmount)}
                            <br />
                            CK: {formatVnd(rc.bankAmountDeclared)}
                          </>
                        )}
                      </td>
                      <td>{rc.staffName || "Staff"}</td>
                      <td>
                        {rc.status === "RECONCILED" && (
                          <span className={`${styles.statusTag} ${styles.tagReconciled}`}>
                            <CheckCircle2 size={12} /> {t("business:transfers.reconciled")}
                          </span>
                        )}
                        {rc.status === "PENDING_RECONCILIATION" && (
                          <span className={`${styles.statusTag} ${styles.tagPending}`}>
                            <Clock3 size={12} /> {t("business:transfers.pending")}
                          </span>
                        )}
                        {rc.status === "VOIDED" && (
                          <span className={`${styles.statusTag} ${styles.tagVoided}`}>
                            <X size={12} /> {t("business:transfers.voided")}
                          </span>
                        )}
                        {rc.status === "DISCREPANCY" && (
                          <span className={`${styles.statusTag} ${styles.tagPending}`}>
                            {t("business:transfers.discrepancy")}
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
                              setVoidReason(t("business:transfers.defaultVoidReason"));
                            }}
                            title={t("business:transfers.voidReceipt")}
                          >
                            <Trash2 size={13} />
                            <span>{t("business:transfers.voidReceipt")}</span>
                          </button>
                        ) : (
                          <span style={{ color: "#9c9186", fontSize: 12, fontStyle: "italic" }}>
                            {t("business:transfers.voided")}
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
                  <th>{t("business:transfers.transactionCode")}</th>
                  <th>{t("business:transfers.time")}</th>
                  <th>{t("business:transfers.amount")}</th>
                  <th>{t("business:transfers.bankAccount")}</th>
                  <th>{t("business:transfers.transferContent")}</th>
                  <th>{t("business:transfers.linkedOrder")}</th>
                  <th>{t("business:transfers.status")}</th>
                  <th>{t("business:transfers.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: "center", padding: 32, color: "#9c9186" }}
                    >
                      {t("business:transfers.noTransactions")}
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
                            {t("business:transfers.none")}
                          </span>
                        )}
                      </td>
                      <td>
                        {tx.status === "RECONCILED" && (
                          <span className={`${styles.statusTag} ${styles.tagReconciled}`}>
                            <CheckCircle2 size={12} /> {t("business:transfers.reconciled")}
                          </span>
                        )}
                        {tx.status === "PENDING_RECONCILIATION" && (
                          <span className={`${styles.statusTag} ${styles.tagPending}`}>
                            <Clock3 size={12} /> {t("business:transfers.pending")}
                          </span>
                        )}
                        {tx.status === "UNASSIGNED" && (
                          <span className={`${styles.statusTag} ${styles.tagUnassigned}`}>
                            {t("business:transfers.unassigned")}
                          </span>
                        )}
                      </td>
                      <td>
                        {tx.orderCode || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 5. Void Receipt Modal (Hủy Biên Lai Thu Tiền Nhầm) */}
      {voidingReceipt && (
        <div className={styles.assignModalOverlay} role="dialog" aria-modal="true">
          <div className={styles.assignModalWindow}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.assignTitle} style={{ color: "#b42318" }}>
                {t("business:transfers.voidTitle")}
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
              {t("business:transfers.voidDescription", { receipt: voidingReceipt.receiptCode,
                order: voidingReceipt.orderCode, queue: String(voidingReceipt.queueNumber || 1).padStart(3, "0"),
                amount: formatVnd(voidingReceipt.totalDue) })}
              <br />
              {t("business:transfers.voidEffect")}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#16100d" }}>
                {t("business:transfers.voidReason")}
              </label>
              <input
                type="text"
                className={styles.assignInput}
                placeholder={t("business:transfers.voidReasonPlaceholder")}
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
                {t("business:transfers.cancel")}
              </button>
              <button
                type="button"
                className={styles.btnConfirm}
                style={{ backgroundColor: "#b42318" }}
                disabled={isVoiding || !voidReason.trim()}
                onClick={handleConfirmVoid}
              >
                {t(isVoiding ? "business:transfers.voiding" : "business:transfers.confirmVoid")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default IncomingTransfersPage;
