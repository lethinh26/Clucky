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

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("vi-VN").format(amount) + "đ";
const filters = [
  ["ACTIVE", "Đang xử lý"],
  ["PENDING_PAYMENT", "Chờ thanh toán"],
  ["CONFIRMED", "Đơn mới"],
  ["PREPARING", "Chế biến"],
  ["READY", "Sẵn sàng"],
  ["COMPLETED", "Hoàn thành"],
  ["ALL", "Tất cả"],
];

export function StaffOrdersPage() {
  const { message } = AntApp.useApp();
  const {
    orders,
    updateStatus,
    confirmCOD,
    loading,
    storageError,
    actionError,
  } = useOrders();
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
        label: "Chờ tiếp nhận",
        count: orders.filter((order) => order.status === "CONFIRMED").length,
        icon: Clock3,
        filter: "CONFIRMED",
      },
      {
        label: "Đang chế biến",
        count: orders.filter((order) => order.status === "PREPARING").length,
        icon: ChefHat,
        filter: "PREPARING",
      },
      {
        label: "Món sẵn sàng",
        count: orders.filter((order) => order.status === "READY").length,
        icon: PackageCheck,
        filter: "READY",
      },
      {
        label: "COD chưa thu",
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
    [orders],
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
  const changeStatus = (
    id: string,
    status: AdminOrderStatus,
    reason?: string,
  ) => {
    const result = updateStatus(id, status, reason);
    if (result) message.success("Đã cập nhật tiến trình đơn demo.");
    else
      message.warning(
        "Không thể thực hiện thao tác. Kiểm tra trạng thái, chi nhánh và thanh toán.",
      );
    return result;
  };
  const collect = (id: string) => {
    if (confirmCOD(id)) message.success("Đã xác nhận thu COD trong bản demo.");
    else message.warning("Đơn không còn khoản COD cần xác nhận.");
  };
  return (
    <div className={`${styles.staffContainer} m3-admin-page`}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>KHÔNG GIAN NHÂN VIÊN</span>
          <h1>Đơn hàng của chi nhánh</h1>
          <p>
            Tiếp nhận món, theo dõi tiến trình và xác nhận thu tiền trong một
            nơi.
          </p>
        </div>
        <div className={styles.branchChip}>
          <Store size={18} />
          <div>
            <strong>{orders[0]?.storeName ?? user.storeName}</strong>
            <span>Chi nhánh hoạt động</span>
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
      <section className={styles.toolbar} aria-label="Tìm và lọc đơn ca trực">
        <Input
          aria-label="Tìm đơn ca trực"
          prefix={<Search size={16} />}
          placeholder="Mã đơn, tên hoặc số điện thoại…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          allowClear
        />
        <label className={styles.dateFilter}>
          <CalendarDays size={16} />
          <input
            aria-label="Lọc ngày đặt đơn"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <Select
          aria-label="Sắp xếp thời gian"
          value={sort}
          onChange={setSort}
          options={[
            { value: "DESC", label: "Mới nhất trước" },
            { value: "ASC", label: "Cũ nhất trước" },
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
        >
          Đặt lại bộ lọc
        </Button>
      </section>
      <div
        className={styles.filterPills}
        aria-label="Lọc trạng thái đơn ca trực"
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
        <span>{visible.length} đơn phù hợp</span>
        <small>
          Chỉ hiển thị đơn của chi nhánh được gán trong vai trò demo.
        </small>
      </div>
      {loading ? (
        <div className={styles.cardsGrid}>
          {[1, 2, 3].map((key) => (
            <div key={key} className={styles.orderCard}>
              <Skeleton active />
            </div>
          ))}
        </div>
      ) : !visible.length ? (
        <div className={styles.emptyState}>
          <CheckCircle2 size={40} />
          <h2>Không có đơn trong mục này</h2>
          <p>Đổi trạng thái, ngày hoặc từ khóa để tiếp tục kiểm tra.</p>
          <Button
            onClick={() => {
              setFilter("ALL");
              setQuery("");
              setDate("");
            }}
          >
            Xem tất cả đơn
          </Button>
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
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                    phần
                  </span>
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
                    ? "Nhận tại quầy"
                    : "Giao tận nơi"}
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
                        {item.quantity} phần · {item.options || "Tiêu chuẩn"}
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
                  >
                    Xem thêm {order.items.length - 2} món
                  </button>
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
                  {order.paymentMethod === "COD" ? "COD" : "Chuyển khoản"}
                  <b data-paid={order.paymentStatus === "PAID"}>
                    {order.paymentStatus === "PAID"
                      ? "Đã thu"
                      : order.paymentStatus === "FAILED"
                        ? "Thất bại"
                        : "Chưa thu"}
                  </b>
                </span>
                <strong>{formatMoney(order.total)}</strong>
              </div>
              {order.paymentMethod === "COD" &&
                order.paymentStatus === "PENDING" &&
                !["CANCELLED", "COMPLETED"].includes(order.status) && (
                  <Popconfirm
                    title="Xác nhận đã thu tiền COD?"
                    description={`Ghi nhận ${formatMoney(order.total)} cho đơn ${order.orderCode} trong bản demo.`}
                    okText="Đã thu tiền"
                    cancelText="Đóng"
                    onConfirm={() => collect(order.id)}
                  >
                    <button type="button" className={styles.codButton}>
                      <Wallet size={16} />
                      Xác nhận thu COD
                    </button>
                  </Popconfirm>
                )}
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.detailButton}
                  onClick={() => setSelectedId(order.id)}
                >
                  <Eye size={16} />
                  Xem chi tiết
                </button>
                {order.status === "CONFIRMED" && (
                  <button
                    type="button"
                    className={styles.statusButton}
                    onClick={() => changeStatus(order.id, "PREPARING")}
                  >
                    <ChefHat size={16} />
                    Bắt đầu chế biến
                  </button>
                )}
                {order.status === "PREPARING" && (
                  <button
                    type="button"
                    className={styles.statusButton}
                    onClick={() => changeStatus(order.id, "READY")}
                  >
                    <PackageCheck size={16} />
                    Món sẵn sàng
                  </button>
                )}
                {["READY", "SHIPPING"].includes(order.status) && (
                  <button
                    type="button"
                    disabled={order.paymentStatus !== "PAID"}
                    title={
                      order.paymentStatus !== "PAID"
                        ? "Xác nhận thu tiền trước khi hoàn thành"
                        : undefined
                    }
                    className={styles.statusButton}
                    onClick={() => changeStatus(order.id, "COMPLETED")}
                  >
                    <CheckCircle2 size={16} />
                    Hoàn thành
                  </button>
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
