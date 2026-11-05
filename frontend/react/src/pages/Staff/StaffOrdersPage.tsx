import { useLocaleTools } from "../../i18n/hooks";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  App as AntApp,
  Button,
  Input,
  Select,
  Skeleton,
  Popconfirm,
} from "antd";
import {
  Search,
  ChefHat,
  CheckCircle2,
  Clock3,
  Wallet,
  Store,
  Eye,
  ArrowRight,
  MessageSquare,
  PackageCheck,
  Truck,
  CircleAlert,
  CalendarDays,
  SlidersHorizontal,
} from "lucide-react";
import type { AdminOrderStatus } from "../../types/order";
import { useOrders } from "../../context/OrderContext";
import { useAuth } from "../../context/AuthContext";
import { OrderProgress } from "../../components/ui/OrderProgress";
import { OrderStatusBadge } from "../../components/ui/OrderStatusBadge";
import { FoodImage } from "../../components/ui/FoodImage";
import { OrderDetailDrawer } from "../Orders/components/OrderDetailDrawer";
import styles from "./staff-orders.module.css";
import { usePageLoading } from "../../components/ui-loader/page-loading";




export function StaffOrdersPage() {
  const { t } = useTranslation();
  const { money: formatMoney } = useLocaleTools();


  const filters = [
  ["ACTIVE", t("business:orders.inProgress")],
  ["PENDING_PAYMENT", t("business:checkout.awaitingPayment")],
  ["CONFIRMED", t("business:stafforderspage.newOrders")],
  ["PREPARING", t("business:orderprogress.preparing")],
  ["READY", t("business:orderprogress.ready")],
  ["COMPLETED", t("business:orders.completed")],
  ["ALL", t("business:stafforderspage.all")],
];

  const { message } = AntApp.useApp();
  const {
    orders,
    updateStatus,
    confirmCOD,
    loading,
    storageError,
    actionError,
  } = useOrders();
  usePageLoading(loading);
  const { user } = useAuth();
  const [filter, setFilter] = useState("ACTIVE");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("DESC");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedOrder = orders.find((order) => order.id === selectedId) ?? null;
  const metrics = useMemo(
    () => [
      {
        label: t("business:stafforderspage.awaitingAcceptance"),
        count: orders.filter((order) => order.status === "CONFIRMED").length,
        icon: Clock3,
        filter: "CONFIRMED",
      },
      {
        label: t("business:orderprogress.preparing"),
        count: orders.filter((order) => order.status === "PREPARING").length,
        icon: ChefHat,
        filter: "PREPARING",
      },
      {
        label: t("business:orderdetaildrawer.mealReady"),
        count: orders.filter((order) => order.status === "READY").length,
        icon: PackageCheck,
        filter: "READY",
      },
      {
        label: t("business:stafforderspage.codNotCollected"),
        count: orders.filter(
          (order) =>
            order.paymentMethod === "COD" &&
            order.paymentStatus === "PENDING" &&
            !["CANCELLED", "COMPLETED"].includes(order.status),
        ).length,
        icon: Wallet,
        filter: "COD",
      },
    ],
    [orders, t],
  );
  const visible = useMemo(
    () =>
      orders
        .filter((order) => {
          const text =
            `${order.orderCode} ${order.customerName} ${order.customerPhone}`.toLocaleLowerCase(
              "vi-VN",
            );
          if (
            query.trim() &&
            !text.includes(query.trim().toLocaleLowerCase("vi-VN"))
          )
            return false;
          if (date && order.createdAt.slice(0, 10) !== date) return false;
          if (filter === "ACTIVE")
            return !["COMPLETED", "CANCELLED"].includes(order.status);
          if (filter === "COD")
            return (
              order.paymentMethod === "COD" &&
              order.paymentStatus === "PENDING" &&
              !["COMPLETED", "CANCELLED"].includes(order.status)
            );
          return filter === "ALL" || order.status === filter;
        })
        .sort((a, b) =>
          sort === "DESC"
            ? b.createdAt.localeCompare(a.createdAt)
            : a.createdAt.localeCompare(b.createdAt),
        ),
    [orders, query, date, sort, filter],
  );
  const changeStatus = async (
    id: string,
    status: AdminOrderStatus,
    reason?: string,
  ) => {
    const result = await updateStatus(id, status, reason);
    if (result) message.success(t("business:stafforderspage.demoOrderProgressUpdated"));
    else
      message.warning(
        actionError || t("business:stafforderspage.unableToPerformThisActionCheckTheStatusStoreAndPayment"),
      );
    return result;
  };
  const collect = async (id: string) => {
    const ok = await confirmCOD(id);
    if (ok) message.success(t("business:orderdetaildrawer.codCollectionConfirmedInTheDemo"));
    else message.warning(actionError || t("business:orderdetaildrawer.thisOrderNoLongerHasACodPaymentToConfirm"));
  };
  return (
    <div className={`${styles.staffContainer} m3-admin-page`}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>{t("business:stafforderspage.staffWorkspace")}</span>
          <h1>{t("business:stafforderspage.storeOrders")}</h1>
          <p> {t("business:stafforderspage.acceptOrdersTrackProgressAndConfirmCashCollectionInOnePlace")} </p>
        </div>
        <div className={styles.branchChip}>
          <Store size={18} />
          <div>
            <strong>{orders[0]?.storeName ?? user.storeName}</strong>
            <span>{t("business:stafforderspage.activeStore")}</span>
          </div>
        </div>
      </header>
      {(storageError || actionError) && (
        <p className={styles.alert} role="alert">
          <CircleAlert size={17} />
          {actionError || storageError}
        </p>
      )}
      <div className={styles.metricsGrid}>
        {metrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            className={styles.metricCard}
            aria-pressed={filter === metric.filter}
            onClick={() => setFilter(metric.filter)}
          >
            <metric.icon size={20} />
            <span>{metric.label}</span>
            <strong>{metric.count}</strong>
          </button>
        ))}
      </div>
      <section className={styles.toolbar} aria-label={t("business:stafforderspage.searchAndFilterShiftOrders")}>
        <Input
          aria-label={t("business:stafforderspage.searchShiftOrders")}
          prefix={<Search size={16} />}
          placeholder={t("business:stafforderspage.orderCodeNameOrPhoneNumber")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          allowClear
        />
        <label className={styles.dateFilter}>
          <CalendarDays size={16} />
          <input
            aria-label={t("business:stafforderspage.filterOrderDate")}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <Select
          aria-label={t("business:stafforderspage.sortByTime")}
          value={sort}
          onChange={setSort}
          options={[
            { value: "DESC", label: t("business:stafforderspage.newestFirst") },
            { value: "ASC", label: t("business:stafforderspage.oldestFirst") },
          ]}
        />
        <Button
          onClick={() => {
            setFilter("ACTIVE");
            setQuery("");
            setDate("");
            setSort("DESC");
          }}
          icon={<SlidersHorizontal size={15} />}
        > {t("business:paymentspage.resetFilters")} </Button>
      </section>
      <div
        className={styles.filterPills}
        aria-label={t("business:stafforderspage.filterShiftOrderStatus")}
      >
        {filters.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.resultCount}>
        <span>{visible.length} {t("business:stafforderspage.matchingOrders")}</span>
        <small> {t("business:stafforderspage.onlyOrdersFromTheStoreAssignedToYourDemoRoleAreShown")} </small>
      </div>
      {loading ? (
        <div className={styles.cardsGrid} aria-hidden="true">
          {[1, 2, 3].map((key) => (
            <div key={key} className={styles.orderCard}>
              <Skeleton />
            </div>
          ))}
        </div>
      ) : !visible.length ? (
        <div className={styles.emptyState}>
          <CheckCircle2 size={40} />
          <h2>{t("business:stafforderspage.noOrdersInThisSection")}</h2>
          <p>{t("business:stafforderspage.changeTheStatusDateOrSearchTermToContinue")}</p>
          <Button
            onClick={() => {
              setFilter("ALL");
              setQuery("");
              setDate("");
            }}
          > {t("business:stafforderspage.viewAllOrders")} </Button>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {visible.map((order) => (
            <article
              key={order.id}
              className={styles.orderCard}
              data-status={order.status}
            >
              <div className={styles.cardTop}>
                <div>
                  <strong className={styles.orderCode}>
                    {order.orderCode}
                  </strong>
                  <span className={styles.orderTime}>
                    {order.time} ·{" "}
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "} {t("business:cart.servings")} </span>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className={styles.customerRow}>
                <div>
                  <strong>{order.customerName}</strong>
                  <a href={`tel:${order.customerPhone}`}>
                    {order.customerPhone}
                  </a>
                </div>
                <span className={styles.typeBadge}>
                  {order.orderType === "PICKUP" ? (
                    <Store size={14} />
                  ) : (
                    <Truck size={14} />
                  )}
                  {order.orderType === "PICKUP"
                    ? t("business:orderdetaildrawer.counterPickup")
                    : t("business:checkout.homeDelivery")}
                </span>
              </div>
              <div className={styles.itemList}>
                {order.items.slice(0, 2).map((item) => (
                  <div key={item.id} className={styles.itemRow}>
                    <FoodImage
                      src={item.image}
                      alt={item.itemName}
                      width={48}
                      height={48}
                    />
                    <div>
                      <strong>{item.itemName}</strong>
                      <p>
                        {item.quantity} {t("business:stafforderspage.servings")} {item.options || t("business:stafforderspage.standard")}
                      </p>
                    </div>
                    <span>{formatMoney(item.lineTotal)}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <button
                    type="button"
                    className={styles.moreItems}
                    onClick={() => setSelectedId(order.id)}
                  > {t("business:reviews.showMore")} {order.items.length - 2} {t("business:orderspage.items")} </button>
                )}
              </div>
              {order.note && (
                <div className={styles.note}>
                  <MessageSquare size={15} />
                  <p>{order.note}</p>
                </div>
              )}
              <OrderProgress order={order} />
              <div className={styles.paymentRow}>
                <span>
                  <Wallet size={15} />
                  {order.paymentMethod === "COD" ? "COD" : t("business:id.bankTransfer")}
                  <b data-paid={order.paymentStatus === "PAID"}>
                    {order.paymentStatus === "PAID"
                      ? t("business:orderdetaildrawer.collected")
                      : order.paymentStatus === "FAILED"
                        ? t("business:orderdetaildrawer.failed")
                        : t("business:orderspage.notCollected")}
                  </b>
                </span>
                <strong>{formatMoney(order.total)}</strong>
              </div>
              {order.paymentMethod === "COD" &&
                order.paymentStatus === "PENDING" &&
                !["CANCELLED", "COMPLETED"].includes(order.status) && (
                  <Popconfirm
                    title={t("business:stafforderspage.confirmCashOnDeliveryPaymentCollected")}
                    description={t("business:stafforderspage.recordForOrderInTheDemo", { value1: formatMoney(order.total), value2: order.orderCode })}
                    okText={t("business:stafforderspage.paymentCollected")}
                    cancelText={t("business:orderdetaildrawer.close")}
                    onConfirm={() => collect(order.id)}
                  >
                    <button type="button" className={styles.codButton}>
                      <Wallet size={16} /> {t("business:orderdetaildrawer.confirmCodCollection")} </button>
                  </Popconfirm>
                )}
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.detailButton}
                  onClick={() => setSelectedId(order.id)}
                >
                  <Eye size={16} /> {t("business:orderspage.viewDetails")} </button>
                {order.status === "CONFIRMED" && (
                  <button
                    type="button"
                    className={styles.statusButton}
                    onClick={() => changeStatus(order.id, "PREPARING")}
                  >
                    <ChefHat size={16} /> {t("business:orderdetaildrawer.startPreparation")} </button>
                )}
                {order.status === "PREPARING" && (
                  <button
                    type="button"
                    className={styles.statusButton}
                    onClick={() => changeStatus(order.id, "READY")}
                  >
                    <PackageCheck size={16} /> {t("business:orderdetaildrawer.mealReady")} </button>
                )}
                {["READY", "SHIPPING"].includes(order.status) && (
                  <button
                    type="button"
                    disabled={order.paymentStatus !== "PAID"}
                    title={
                      order.paymentStatus !== "PAID"
                        ? t("business:stafforderspage.confirmCashCollectionBeforeCompletion")
                        : undefined
                    }
                    className={styles.statusButton}
                    onClick={() => changeStatus(order.id, "COMPLETED")}
                  >
                    <CheckCircle2 size={16} /> {t("business:orders.completed")} </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <OrderDetailDrawer
        order={selectedOrder}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        onStatusChange={changeStatus}
      />
    </div>
  );
}
