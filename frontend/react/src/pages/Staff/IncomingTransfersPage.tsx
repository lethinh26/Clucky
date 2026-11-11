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

  // Transactions state
  const [transactions, setTransactions] = useState<BankTransactionItem[]>([]);
  const [receipts, setReceipts] = useState<BackendCounterReceipt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<boolean>(false);

  // Load dữ liệu sổ quỹ và giao dịch ngân hàng từ payment-service
  const loadPaymentData = useCallback(async () => {
    setIsLoading(true);
    try {
      const storeIdNum = user?.storeId ? Number(user.storeId) : 1;
      const [txList, rcList] = await Promise.all([
        paymentsApi.listBankTransactions().catch(() => null),
        paymentsApi.listReceipts(storeIdNum).catch(() => null),
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

  // Assign Order Dialog state
  const [assigningTx, setAssigningTx] = useState<BankTransactionItem | null>(null);
  const [assignedOrderCode, setAssignedOrderCode] = useState("");

  // Calculate Shift Drawer Widget stats (tính trực tiếp từ hóa đơn thu ngân và giao dịch ngân hàng)
  const shiftCashStats = useMemo(() => {
    let totalCashCollected = 0;
    let totalCashChangeGiven = 0;

    if (receipts.length > 0) {
      totalCashCollected = receipts.reduce(
        (acc, r) => acc + (r.cashAmount || 0),
        0,
      );
      totalCashChangeGiven = receipts.reduce(
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
            {formatVnd(shiftCashStats.netCashInDrawer)}
          </div>
          <div className={styles.widgetDescription}>
            Tổng tiền mặt thu được trong ca sau khi trừ tiền thối (Tổng thu:{" "}
            {formatVnd(shiftCashStats.totalCashCollected)} - Đã thối:{" "}
            {formatVnd(shiftCashStats.totalCashChangeGiven)}).
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
            {formatVnd(shiftCashStats.totalBankReconciled)}
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
            {formatVnd(shiftCashStats.totalBankPending)}
          </div>
          <div className={styles.widgetDescription}>
            Khoản thu do thu ngân xác nhận thủ công hoặc webhook về muộn đang chờ
            đối chiếu.
          </div>
        </div>
      </section>

      {/* 3. Bảng Danh Sách Giao Dịch Ngân Hàng */}
      <section className={styles.tableSection}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={16} color="#6b6259" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo mã giao dịch, số tiền, nội dung CK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.filtersRow}>
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
          </div>
        </div>

        {/* Table Content */}
        <div className={styles.tableWrapper}>
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
                  <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#9c9186" }}>
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
    </div>
  );
};
export default IncomingTransfersPage;
