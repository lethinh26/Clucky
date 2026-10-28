import { useState } from "react";
import { App as AntApp, Drawer, Button, Modal, Input, Popconfirm } from "antd";
import {
  Clock3,
  UserRound,
  ShoppingBag,
  MapPin,
  Wallet,
  MessageSquare,
  CircleAlert,
  ChefHat,
  PackageCheck,
  CheckCircle2,
  XCircle,
  Store,
  Truck,
} from "lucide-react";
import type { AdminOrder } from "../../../types/order";
import { OrderProgress } from "../../../components/ui/OrderProgress";
import { OrderStatusBadge } from "../../../components/ui/OrderStatusBadge";
import { FoodImage } from "../../../components/ui/FoodImage";
import { displayOrderTime } from "../../../lib/order-demo";
import { useOrders } from "../../../context/OrderContext";
import { useAuth } from "../../../context/AuthContext";
import styles from "../orders.module.css";

interface Props {
  order: AdminOrder | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (
    id: string,
    status: AdminOrder["status"],
    reason?: string,
  ) => boolean;
  onOpenRefundModal?: (order: AdminOrder) => void;
}
const money = (amount: number) =>
  new Intl.NumberFormat("vi-VN").format(amount) + "đ";
export function OrderDetailDrawer({
  order,
  open,
  onClose,
  onStatusChange,
  onOpenRefundModal,
}: Props) {
  const { confirmCOD, actionError } = useOrders();
  const { isStaff } = useAuth();
  const { message } = AntApp.useApp();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!order) return null;
  const collect = () => {
    if (confirmCOD(order.id))
      message.success("Đã xác nhận thu COD trong bản demo.");
    else message.warning("Đơn không còn khoản COD cần xác nhận.");
  };
  return (
    <>
      <Drawer
        title={
          <div className={styles.drawerTitle}>
            <span>Chi tiết {order.orderCode}</span>
            <OrderStatusBadge status={order.status} />
          </div>
        }
        size="min(720px, 100vw)"
        open={open}
        onClose={onClose}
      >
        <div className={styles.drawerMeta}>
          <span>
            <Clock3 size={14} />
            Đặt: {displayOrderTime(order.createdAt)}
          </span>
          <span>
            Cập nhật: {displayOrderTime(order.updatedAt ?? order.createdAt)}
          </span>
        </div>
        <OrderProgress order={order} surface="detail" />
        {actionError && (
          <p role="alert" className={styles.drawerError}>
            <CircleAlert size={16} />
            {actionError}
          </p>
        )}
        {order.hasRefundRequest && (
          <div className={styles.refundAlert}>
            <strong>
              <CircleAlert size={17} />
              Yêu cầu hoàn tiền đang chờ duyệt
            </strong>
            <p>
              {money(order.refundAmount ?? order.total)} · {order.refundReason}
            </p>
            {!isStaff && onOpenRefundModal && (
              <Button danger onClick={() => onOpenRefundModal(order)}>
                Xử lý yêu cầu hoàn tiền
              </Button>
            )}
          </div>
        )}
        {order.refundStatus && !order.hasRefundRequest && (
          <p className={styles.drawerNotice}>
            Quyết định hoàn tiền:{" "}
            {order.refundStatus === "APPROVED"
              ? "Đã duyệt"
              : order.refundStatus === "REJECTED"
                ? "Đã từ chối"
                : order.refundStatus}
            .
          </p>
        )}
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>
            <UserRound size={18} />
            Khách hàng & giao nhận
          </h2>
          <dl className={styles.drawerInfoGrid}>
            <div>
              <dt>Người nhận</dt>
              <dd>{order.customerName}</dd>
            </div>
            <div>
              <dt>Điện thoại</dt>
              <dd>
                <a href={`tel:${order.customerPhone}`}>
                  {order.customerPhone}
                </a>
              </dd>
            </div>
            <div>
              <dt>Hình thức</dt>
              <dd className={styles.inlineValue}>
                {order.orderType === "DELIVERY" ? (
                  <>
                    <Truck size={14} /> Giao tận nơi
                  </>
                ) : (
                  <>
                    <Store size={14} /> Nhận tại quầy
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Chi nhánh phụ trách</dt>
              <dd>{order.storeName}</dd>
            </div>
            {order.orderType === "DELIVERY" && (
              <div className={styles.wideField}>
                <dt>
                  <MapPin size={13} /> Địa chỉ giao
                </dt>
                <dd>{order.deliveryAddress || "Chưa cập nhật"}</dd>
              </div>
            )}
          </dl>
        </section>
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>
            <ShoppingBag size={18} />
            Món đã gọi
            <span>
              {order.items.reduce((sum, item) => sum + item.quantity, 0)} phần
            </span>
          </h2>
          <div className={styles.drawerItems}>
            {order.items.map((item) => (
              <article key={item.id} className={styles.drawerItem}>
                <FoodImage
                  src={item.image}
                  alt={item.itemName}
                  width={64}
                  height={64}
                />
                <div>
                  <strong>{item.itemName}</strong>
                  <p>
                    {item.quantity} phần × {money(item.unitPrice)}
                  </p>
                  {item.options && <small>{item.options}</small>}
                  {item.note && <small>Ghi chú: {item.note}</small>}
                </div>
                <b>{money(item.lineTotal)}</b>
              </article>
            ))}
          </div>
          {order.note && (
            <div className={styles.drawerNote}>
              <MessageSquare size={17} />
              <div>
                <strong>Ghi chú của khách</strong>
                <p>{order.note}</p>
              </div>
            </div>
          )}
        </section>
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>
            <Wallet size={18} />
            Thanh toán & hóa đơn
          </h2>
          <dl className={styles.receiptRows}>
            <div>
              <dt>Phương thức</dt>
              <dd>
                {order.paymentMethod === "COD"
                  ? "Tiền mặt (COD)"
                  : "Chuyển khoản"}
              </dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd data-paid={["PAID", "COLLECTED"].includes(order.paymentStatus)}>
                {["PAID", "COLLECTED"].includes(order.paymentStatus)
                  ? "Đã thanh toán"
                  : order.paymentStatus === "FAILED"
                    ? "Thất bại"
                    : "Chưa thanh toán"}
              </dd>
            </div>
            <div>
              <dt>Tạm tính</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div>
                <dt>Giảm giá</dt>
                <dd>-{money(order.discount)}</dd>
              </div>
            )}
            <div>
              <dt>Phí giao hàng</dt>
              <dd>{money(order.shippingFee)}</dd>
            </div>
            <div className={styles.receiptTotal}>
              <dt>Tổng thanh toán</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>Thao tác đơn hàng</h2>
          <p className={styles.actionHint}>
            Thao tác theo trạng thái hiện tại và vai trò demo của bạn.
          </p>
          <div className={styles.drawerActions}>
            {order.status === "CONFIRMED" && (
              <Button
                type="primary"
                icon={<ChefHat size={16} />}
                onClick={() => onStatusChange(order.id, "PREPARING")}
              >
                Bắt đầu chế biến
              </Button>
            )}
            {order.status === "PREPARING" && (
              <Button
                type="primary"
                icon={<PackageCheck size={16} />}
                onClick={() => onStatusChange(order.id, "READY")}
              >
                Món sẵn sàng
              </Button>
            )}
            {order.paymentMethod === "COD" &&
              !["PAID", "COLLECTED"].includes(order.paymentStatus) &&
              !["CANCELLED", "COMPLETED"].includes(order.status) && (
                <Popconfirm
                  title="Xác nhận đã thu COD?"
                  description={`${money(order.total)} · ${order.orderCode}`}
                  okText="Đã thu"
                  cancelText="Đóng"
                  onConfirm={collect}
                >
                  <Button icon={<Wallet size={16} />}>Xác nhận thu COD</Button>
                </Popconfirm>
              )}
            {["READY", "SHIPPING"].includes(order.status) && (
              <Button
                type="primary"
                disabled={!["PAID", "COLLECTED"].includes(order.paymentStatus)}
                icon={<CheckCircle2 size={16} />}
                onClick={() => onStatusChange(order.id, "COMPLETED")}
              >
                Hoàn thành đơn hàng
              </Button>
            )}
            {["PENDING_PAYMENT", "CONFIRMED"].includes(order.status) && (
              <Button
                danger
                icon={<XCircle size={16} />}
                onClick={() => {
                  setReason("");
                  setCancelOpen(true);
                }}
              >
                Từ chối / hủy đơn
              </Button>
            )}
            {["COMPLETED", "CANCELLED"].includes(order.status) && (
              <p className={styles.drawerNotice}>
                Đơn đã kết thúc. Không còn thao tác chuyển trạng thái.
              </p>
            )}
          </div>
          {["READY", "SHIPPING"].includes(order.status) &&
            !["PAID", "COLLECTED"].includes(order.paymentStatus) && (
              <p className={styles.actionHint}>
                Xác nhận thu tiền trước khi hoàn thành đơn.
              </p>
            )}
        </section>
      </Drawer>
      <Modal
        title={`Hủy đơn ${order.orderCode}`}
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        okText="Xác nhận hủy"
        cancelText="Giữ đơn"
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onOk={() => {
          if (onStatusChange(order.id, "CANCELLED", reason.trim()))
            setCancelOpen(false);
        }}
      >
        <p>
          Nhập lý do hủy. Đơn đã thanh toán sẽ tạo yêu cầu hoàn tiền trong bản
          demo.
        </p>
        <label htmlFor="staff-cancel-reason">Lý do hủy *</label>
        <Input.TextArea
          id="staff-cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={500}
        />
      </Modal>
    </>
  );
}
