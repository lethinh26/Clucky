"use client";
import { notify } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";

import { useEffect, useState } from "react";
import Link from "@/components/ui-loader/navigation-link";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import { useOrder } from "@/components/order/order-provider";
import { useNavigationTask } from "@/components/ui-loader";
import { OrderProgress } from "@/components/order/order-progress";
import type { Order } from "@/lib/types/order";
import {
  ArrowRight,
  Store,
  RotateCcw,
  Clock3,
  Calendar,
  CreditCard,
  Wallet,
  ArrowUpDown,
} from "lucide-react";
import { OrderStatusChip } from "@/components/order";
import { FoodImage } from "@/components/order/food-image";
import { displayOrderTime } from "@/lib/order-demo";
import styles from "./orders.module.css";

type FilterTab = "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED";
type PaymentFilter = "ALL" | "BANK_TRANSFER" | "COD";
type SortOption = "NEWEST" | "OLDEST" | "TOTAL_DESC" | "TOTAL_ASC";

function formatDateYmdInVn(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return year && month && day ? `${year}-${month}-${day}` : "";
}

function toVnDateYmd(isoString?: string): string {
  if (!isoString) return "";
  let normalized = String(isoString).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(normalized)) {
    normalized = normalized.replace(" ", "T") + (normalized.includes("+") || normalized.endsWith("Z") ? "" : "+07:00");
  }
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    return formatDateYmdInVn(d);
  }
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function getTodayVnYmd(): string {
  return formatDateYmdInVn(new Date());
}

function normalizePaymentMethod(method?: string): string {
  const m = String(method || "").trim().toUpperCase();
  if (m === "CASH") return "COD";
  return m;
}

export default function OrdersHistoryPage() {
  const t = useTranslations();

  const { locale, money: formatPrice, errorMessage } = useLocaleTools();
  const router = useRouter();
  const { orders, reorder, refreshOrders, ready } = useOrder();
  useNavigationTask(!ready);

  // Sync server orders on mount (INT-08)
  useEffect(() => {
    refreshOrders().catch((err) => {
      notify.error(errorMessage(err));
    });
  }, [refreshOrders, errorMessage]);

  const activeOrder = orders.find(
    (order) => !["COMPLETED", "CANCELLED"].includes(order.status),
  );
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");
  const todayVn = getTodayVnYmd();

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedDate || paymentFilter !== "ALL" || sortBy !== "NEWEST" || activeTab !== "ALL"
  );

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedDate("");
    setPaymentFilter("ALL");
    setSortBy("NEWEST");
    setActiveTab("ALL");
  };

  // Base filters (Search + Date + Payment Method) applied before status tab counts
  const baseFilteredOrders = orders.filter((order) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchCode = (order.orderCode || "").toLowerCase().includes(q);
      const matchStore = (order.storeName || "").toLowerCase().includes(q);
      const matchAddress = (order.storeAddress || "").toLowerCase().includes(q);
      const matchItems = (order.items || []).some((it) =>
        (it.itemName || "").toLowerCase().includes(q)
      );
      if (!matchCode && !matchStore && !matchAddress && !matchItems) return false;
    }

    if (selectedDate) {
      const orderDate = toVnDateYmd(order.createdAt);
      if (orderDate !== selectedDate) return false;
    }

    if (paymentFilter !== "ALL") {
      if (normalizePaymentMethod(order.paymentMethod) !== paymentFilter) return false;
    }

    return true;
  });

  const tabCounts = {
    ALL: baseFilteredOrders.length,
    ACTIVE: baseFilteredOrders.filter((order) =>
      ["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY", "SHIPPING"].includes(order.status)
    ).length,
    COMPLETED: baseFilteredOrders.filter((order) => order.status === "COMPLETED").length,
    CANCELLED: baseFilteredOrders.filter((order) => order.status === "CANCELLED").length,
  };

  const filteredOrders = [...baseFilteredOrders]
    .filter((order) => {
      if (activeTab === "ALL") return true;
      if (activeTab === "ACTIVE") {
        return (
          order.status === "PENDING_PAYMENT" ||
          order.status === "CONFIRMED" ||
          order.status === "PREPARING" ||
          order.status === "READY" ||
          order.status === "SHIPPING"
        );
      }
      if (activeTab === "COMPLETED") return order.status === "COMPLETED";
      if (activeTab === "CANCELLED") return order.status === "CANCELLED";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "TOTAL_DESC") return Number(b.totalAmount || 0) - Number(a.totalAmount || 0);
      if (sortBy === "TOTAL_ASC") return Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortBy === "OLDEST" ? timeA - timeB : timeB - timeA;
    });

  const handleReorder = async (order: Order) => {
    try {
      await reorder(order);
      notify.success(t("business.orders.itemsFromOrderHaveBeenAddedToYourCart", { value1: order.orderCode }));
      router.push(`/checkout?storeId=${encodeURIComponent(order.storeId)}`);
    } catch {}
  };

  return (
    <>
      <main className={`${styles.historyContainer} m3-page`}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>
            {t("business.orders.purchaseHistory")}
          </span>
          <h1 className={styles.title}>{t("business.orders.myOrders")}</h1>
          <p className={styles.sub}>
            {t(
              "business.orders.trackYourDeliveryViewReceiptsOrReorderYourFavourites",
            )}
          </p>
        </div>

        {activeOrder && (
          <div className={styles.activeBanner}>
            <Clock3 size={20} />
            <div>
              <strong>{t("business.orders.youHaveAnActiveOrder")}</strong>
              <span>
                {activeOrder.orderCode} · {activeOrder.storeName}
              </span>
            </div>
            <Link href={`/orders/${activeOrder.id}`}>
              {t("business.orders.trackOrder")} <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {/* Quick Search & Filter Controls (Date, Payment Method, Sort) */}
        <div className={styles.filterToolbar}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder={t("business.orders.searchByOrderCodeCluOrStoreName")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label={t("business.orders.searchOrders")}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className={styles.searchBtn}
                style={{ background: "#6b6259" }}
              >
                {t("business.account.delete")}
              </button>
            )}
          </div>

          <div className={styles.filterControlsRow}>
            {/* Date Filter */}
            <div className={styles.filterGroup}>
              <span className={styles.filterGroupLabel}>
                <Calendar size={14} /> {t("business.orders.filterByDate")}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={styles.filterDateInput}
                aria-label={t("business.orders.filterByDate")}
              />
              <button
                type="button"
                className={`${styles.filterPillBtn} ${selectedDate === todayVn ? styles.filterPillActive : ""}`}
                onClick={() => setSelectedDate(selectedDate === todayVn ? "" : todayVn)}
              >
                {t("business.orders.today")}
              </button>
              {selectedDate && (
                <button
                  type="button"
                  className={styles.filterPillBtn}
                  onClick={() => setSelectedDate("")}
                >
                  {t("business.orders.allDates")}
                </button>
              )}
            </div>

            {/* Payment Method Filter */}
            <div className={styles.filterGroup}>
              <span className={styles.filterGroupLabel}>
                <Wallet size={14} /> {t("business.orders.filterPayment")}
              </span>
              <div className={styles.paymentChipGroup}>
                <button
                  type="button"
                  className={`${styles.filterPillBtn} ${paymentFilter === "ALL" ? styles.filterPillActive : ""}`}
                  onClick={() => setPaymentFilter("ALL")}
                >
                  {t("business.orders.allPaymentMethods")}
                </button>
                <button
                  type="button"
                  className={`${styles.filterPillBtn} ${paymentFilter === "BANK_TRANSFER" ? styles.filterPillActive : ""}`}
                  onClick={() => setPaymentFilter("BANK_TRANSFER")}
                >
                  <CreditCard size={13} /> {t("business.orders.paymentVietQr")}
                </button>
                <button
                  type="button"
                  className={`${styles.filterPillBtn} ${paymentFilter === "COD" ? styles.filterPillActive : ""}`}
                  onClick={() => setPaymentFilter("COD")}
                >
                  <Wallet size={13} /> {t("business.orders.paymentCod")}
                </button>
              </div>
            </div>

            {/* Sort Selector */}
            <div className={styles.filterGroup}>
              <span className={styles.filterGroupLabel}>
                <ArrowUpDown size={14} /> {t("business.orders.sortBy")}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.filterSelect}
                aria-label={t("business.orders.sortBy")}
              >
                <option value="NEWEST">{t("business.orders.sortNewest")}</option>
                <option value="OLDEST">{t("business.orders.sortOldest")}</option>
                <option value="TOTAL_DESC">{t("business.orders.sortTotalDesc")}</option>
                <option value="TOTAL_ASC">{t("business.orders.sortTotalAsc")}</option>
              </select>
            </div>
          </div>

          <div className={styles.filterSummaryRow}>
            <span className={styles.filterSummaryText}>
              {t("business.orders.showingFilteredOrders", {
                matched: filteredOrders.length,
                total: orders.length,
              })}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                className={styles.filterResetBtn}
                onClick={resetAllFilters}
              >
                {t("business.orders.resetFilters")}
              </button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div
          className={styles.tabsList}
          aria-label={t("business.orders.filterOrderStatus")}
        >
          <button
            type="button"
            aria-pressed={activeTab === "ALL"}
            className={`${styles.tabItem} ${
              activeTab === "ALL" ? styles.tabItemActive : ""
            }`}
            onClick={() => setActiveTab("ALL")}
          >
            {t("business.orders.allOrders")} ({tabCounts.ALL})
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "ACTIVE"}
            className={`${styles.tabItem} ${
              activeTab === "ACTIVE" ? styles.tabItemActive : ""
            }`}
            onClick={() => setActiveTab("ACTIVE")}
          >
            {t("business.orders.inProgress")} ({tabCounts.ACTIVE})
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "COMPLETED"}
            className={`${styles.tabItem} ${
              activeTab === "COMPLETED" ? styles.tabItemActive : ""
            }`}
            onClick={() => setActiveTab("COMPLETED")}
          >
            {t("business.orders.completed")} ({tabCounts.COMPLETED})
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "CANCELLED"}
            className={`${styles.tabItem} ${
              activeTab === "CANCELLED" ? styles.tabItemActive : ""
            }`}
            onClick={() => setActiveTab("CANCELLED")}
          >
            {t("business.orders.cancelled")} ({tabCounts.CANCELLED})
          </button>
        </div>

        {/* Order Cards */}
        {!ready ? (
          <div className="order-skeleton" aria-hidden="true" />
        ) : filteredOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>
              {t("business.orders.noOrdersFound")}
            </h3>
            <p className={styles.emptyDesc}>
              {t(
                "business.orders.thereAreNoOrdersInThisSectionOrYourSearchDidNot",
              )}
            </p>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {filteredOrders.map((order) => (
              <article key={order.id} className={styles.orderCard}>
                <div className={styles.cardHead}>
                  <div>
                    <span className={styles.orderCode}>{order.orderCode}</span>
                    <span className={styles.orderDate}>
                      {" "}
                      · {displayOrderTime(order.createdAt, locale)}
                    </span>
                    <span className={styles.paymentMethodBadge} data-method={order.paymentMethod}>
                      {order.paymentMethod === "BANK_TRANSFER" ? "VietQR" : "COD"}
                    </span>
                  </div>
                  <OrderStatusChip status={order.status} type={order.type} />
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.storeInfo}>
                    <div className={styles.orderThumbs}>
                      {order.items.slice(0, 3).map((item) => (
                        <FoodImage
                          key={item.id}
                          src={item.image}
                          alt={item.itemName}
                        />
                      ))}
                    </div>
                    <span className={styles.storeName}>
                      <Store size={15} /> {order.storeName}{order.storeAddress ? ` · ${order.storeAddress}` : ""}
                    </span>
                    <span className={styles.itemsSummary}>
                      {order.items
                        .map((i) => `${i.itemName} (x${i.quantity})`)
                        .join(", ")}
                    </span>
                  </div>

                  <div className={styles.cardPriceGroup}>
                    <span className={styles.cardPriceLabel}>
                      {t("business.checkout.totalDue")}
                    </span>
                    <span className={styles.cardPriceVal}>
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </div>

                <OrderProgress
                  status={order.status}
                  type={order.type}
                  paymentStatus={order.paymentStatus}
                  paymentMethod={order.paymentMethod}
                  compact
                  orderCode={order.orderCode}
                  updatedAt={order.updatedAt ?? order.createdAt}
                  history={order.timeline}
                />
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    className={styles.reorderBtn}
                  >
                    <RotateCcw size={15} /> {t("business.orders.reorderThisMeal")}
                  </button>

                  <Link
                    href={`/orders/${order.id}`}
                    className={styles.detailBtn}
                  >
                    {t("business.orders.viewDetails")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

      </main>
    </>
  );
}
