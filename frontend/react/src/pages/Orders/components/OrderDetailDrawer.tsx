import { useTranslation } from "react-i18next";
import { useLocaleTools } from "../../../i18n/hooks";
import { useState } from "react";
import { Drawer, Button, Modal, Input } from "antd";
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
  ) => Promise<boolean> | boolean;
  onOpenRefundModal?: (order: AdminOrder) => void;
}

export function OrderDetailDrawer({
  order,
  open,
  onClose,
  onStatusChange,
  onOpenRefundModal,
}: Props) {
  const { t } = useTranslation();


  const { locale, money: money } = useLocaleTools();
  const { actionError } = useOrders();
  const { isStaff } = useAuth();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!order) return null;
  return (
    <>
      <Drawer
        title={
          <div className={styles.drawerTitle}>
            <span>{t("business:orderdetaildrawer.details")} {order.orderCode}</span>
            <OrderStatusBadge status={order.status} />
          </div>
        }
        size="min(720px, 100vw)"
        open={open}
        onClose={onClose}
      >
        <div className={styles.drawerMeta}>
          <span>
            <Clock3 size={14} /> {t("business:orderdetaildrawer.placed")} {displayOrderTime(order.createdAt, locale)}
          </span>
          <span> {t("business:orderdetaildrawer.updated")} {displayOrderTime(order.updatedAt ?? order.createdAt, locale)}
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
              <CircleAlert size={17} /> {t("business:orderdetaildrawer.refundRequestAwaitingReview")} </strong>
            <p>
              {money(order.refundAmount ?? order.total)} · {order.refundReason}
            </p>
            {!isStaff && onOpenRefundModal && (
              <Button danger onClick={() => onOpenRefundModal(order)}> {t("business:orderdetaildrawer.reviewRefundRequest")} </Button>
            )}
          </div>
        )}
        {order.refundStatus && !order.hasRefundRequest && (
          <p className={styles.drawerNotice}> {t("business:orderdetaildrawer.refundDecision")}{" "}
            {order.refundStatus === "APPROVED"
              ? t("business:orderdetaildrawer.approved")
              : order.refundStatus === "REJECTED"
                ? t("business:orderdetaildrawer.rejected")
                : order.refundStatus}
            .
          </p>
        )}
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>
            <UserRound size={18} /> {t("business:orderdetaildrawer.customerFulfilment")} </h2>
          <dl className={styles.drawerInfoGrid}>
            <div>
              <dt>{t("business:dashboard.customer")}</dt>
              <dd>{order.customerName}</dd>
            </div>
            <div>
              <dt>{t("business:orderdetaildrawer.phone")}</dt>
              <dd>
                <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
              </dd>
            </div>
            <div>
              <dt>{t("business:orderdetaildrawer.fulfilmentMethod")}</dt>
              <dd className={styles.inlineValue}>
                {order.orderType === "PICKUP" ? (
                  <Store size={15} />
                ) : (
                  <Truck size={15} />
                )}
                {order.orderType === "PICKUP"
                  ? t("business:orderdetaildrawer.counterPickup")
                  : t("business:checkout.homeDelivery")}
              </dd>
            </div>
            <div>
              <dt>{t("business:party.store")}</dt>
              <dd>{order.storeName}</dd>
            </div>
            {order.deliveryAddress && (
              <div className={styles.wideField}>
                <dt>
                  <MapPin size={13} /> {t("business:shipmentcard.deliveryAddress")} </dt>
                <dd>{order.deliveryAddress}</dd>
              </div>
            )}
          </dl>
        </section>
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>
            <ShoppingBag size={18} /> {t("business:id.orderedItems")}{" "}
            <span>
              {order.items.reduce((sum, item) => sum + item.quantity, 0)} {t("business:cart.servings")} </span>
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
                    {item.quantity} {t("business:orderdetaildrawer.servings")} {money(item.unitPrice)}
                  </p>
                  {item.options && <small>{item.options}</small>}
                  {item.note && <small>{t("business:orderitemcard.note")} {item.note}</small>}
                </div>
                <b>{money(item.lineTotal)}</b>
              </article>
            ))}
          </div>
          {order.note && (
            <div className={styles.drawerNote}>
              <MessageSquare size={17} />
              <div>
                <strong>{t("business:orderdetaildrawer.customerNotes")}</strong>
                <p>{order.note}</p>
              </div>
            </div>
          )}
        </section>
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>
            <Wallet size={18} /> {t("business:orderdetaildrawer.paymentReceipt")} </h2>
          <dl className={styles.receiptRows}>
            <div>
              <dt>{t("business:orderdetaildrawer.method")}</dt>
              <dd>
                {order.paymentMethod === "COD"
                  ? t("business:orderdetaildrawer.cashCod")
                  : t("business:id.bankTransfer")}
              </dd>
            </div>
            <div>
              <dt>{t("business:catalog.status")}</dt>
              <dd data-paid={["PAID", "COLLECTED"].includes(order.paymentStatus)}>
                {t(`admin:paymentStates.${order.paymentStatus}`)}
              </dd>
            </div>
            <div>
              <dt>{t("business:cart.subtotal")}</dt>
              <dd>{money(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div>
                <dt>{t("business:ordersummarycard.discount")}</dt>
                <dd>-{money(order.discount)}</dd>
              </div>
            )}
            <div>
              <dt>{t("business:ordersummarycard.deliveryFee")}</dt>
              <dd>{money(order.shippingFee)}</dd>
            </div>
            <div className={styles.receiptTotal}>
              <dt>{t("business:checkout.totalDue")}</dt>
              <dd>{money(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section className={styles.drawerSection}>
          <h2 className={styles.drawerHeading}>{t("business:orderdetaildrawer.orderActions")}</h2>
          <p className={styles.actionHint}> {t("business:orderdetaildrawer.actionsDependOnTheCurrentStatusAndYourDemoRole")} </p>
          <div className={styles.drawerActions}>
            {order.status === "CONFIRMED" && (
              <Button
                type="primary"
                icon={<ChefHat size={16} />}
                onClick={() => onStatusChange(order.id, "PREPARING")}
              > {t("business:orderdetaildrawer.startPreparation")} </Button>
            )}
            {order.status === "PREPARING" && (
              <Button
                type="primary"
                icon={<PackageCheck size={16} />}
                onClick={() => onStatusChange(order.id, "READY")}
              > {t("business:orderdetaildrawer.mealReady")} </Button>
            )}
            {order.paymentMethod === "COD" &&
              order.paymentStatus === "PENDING" &&
              !["CANCELLED", "COMPLETED"].includes(order.status) && (
                <Button
                  type="primary"
                  icon={<Wallet size={16} />}
                  onClick={() => onStatusChange(order.id, order.status, "COLLECT_COD")}
                >
                  {t("business:orderdetaildrawer.confirmCodCollection")}
                </Button>
              )}
            {["READY", "SHIPPING"].includes(order.status) && (
              <Button
                type="primary"
                disabled={!["PAID", "COLLECTED"].includes(order.paymentStatus)}
                icon={<CheckCircle2 size={16} />}
                onClick={() => onStatusChange(order.id, "COMPLETED")}
              > {t("business:orderdetaildrawer.completeOrder")} </Button>
            )}
            {["PENDING_PAYMENT", "CONFIRMED"].includes(order.status) && (
              <Button
                danger
                icon={<XCircle size={16} />}
                onClick={() => {
                  setReason("");
                  setCancelOpen(true);
                }}
              > {t("business:orderdetaildrawer.rejectCancelOrder")} </Button>
            )}
            {["COMPLETED", "CANCELLED"].includes(order.status) && (
              <p className={styles.drawerNotice}> {t("business:orderdetaildrawer.thisOrderHasEndedNoFurtherStatusChangesAreAvailable")} </p>
            )}
          </div>
          {["READY", "SHIPPING"].includes(order.status) &&
            !["PAID", "COLLECTED"].includes(order.paymentStatus) && (
              <p className={styles.actionHint}> {t("business:orderdetaildrawer.confirmPaymentCollectionBeforeCompletingTheOrder")} </p>
            )}
        </section>
      </Drawer>
      <Modal
        title={t("business:orderdetaildrawer.cancelOrder", { value1: order.orderCode })}
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        okText={t("business:id.confirmCancellation")}
        cancelText={t("business:id.keepOrder")}
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onOk={async () => {
          const success = await onStatusChange(order.id, "CANCELLED", reason.trim());
          if (success) {
            setCancelOpen(false);
            onClose();
          }
        }}
      >
        <p> {t("business:orderdetaildrawer.enterACancellationReasonPaidOrdersWillCreateARefundRequestIn")} </p>
        <label htmlFor="staff-cancel-reason">{t("business:id.cancellationReason")}</label>
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
