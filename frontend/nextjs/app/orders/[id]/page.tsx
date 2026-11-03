"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";

import { useState, useEffect, use } from "react";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Wallet,
  CreditCard,
  CircleX,
  History,
  MessageSquare,
  CircleAlert,
  MailCheck,
} from "lucide-react";
import { displayOrderTime } from "@/lib/order-demo";
import { useOrder, mapBackendOrderToOrder } from "@/components/order/order-provider";
import { useNavigationTask } from "@/components/ui-loader";
import { OrderProgress } from "@/components/order/order-progress";
import { OrderDialog } from "@/components/order/order-dialog";
import { DemoOrderControls } from "@/components/order/demo-order-controls";
import { PaymentWidget, PaymentStatusBadge } from "@/components/payment";
import { ShipmentCard } from "@/components/shipping";
import { MOCK_PAYMENT_BANK } from "@/lib/mock/payment-mock-data";
import {
  OrderStatusChip,
  OrderItemCard,
  OrderSummaryCard,
} from "@/components/order";
import { orderApi } from "@/lib/api";
import type { Order } from "@/lib/types/order";
import styles from "./tracking.module.css";

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations();

  const { locale, money: formatPrice } = useLocaleTools();
  const { id } = use(params);
  const router = useRouter();
  const { orders, ready, cancelOrder, reorder, demoEnabled } = useOrder();
  useNavigationTask(!ready);

  const localOrder = orders.find(
    (entry) => entry.id === id || entry.orderCode === id,
  );
  const [serverOrder, setServerOrder] = useState<Order | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [feedback, setFeedback] = useState("");

  // INT-68: 5-second polling interval for order status until terminal status
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isMounted = true;

    const fetchCurrentOrder = async () => {
      try {
        const beOrder = await orderApi.getById(id);
        if (!isMounted || !beOrder) return;
        const mapped = mapBackendOrderToOrder(beOrder);
        setServerOrder(mapped);

        if (["COMPLETED", "CANCELLED"].includes(mapped.status)) {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          setIsPolling(false);
        } else {
          setIsPolling(true);
        }
      } catch {
        // Fallback gracefully to local mock if server is offline or order is local
        setIsPolling(false);
      }
    };

    fetchCurrentOrder();
    timer = setInterval(fetchCurrentOrder, 5000);

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [id]);

  const order = serverOrder || localOrder;

  if (!ready || !order)
    return (
      <>
        <main className={`${styles.trackingContainer} m3-page`}>
          {!ready ? (
            <div className="order-skeleton" aria-hidden="true" />
          ) : (
            <div className="order-empty">
              <PackageCheck size={44} />
              <h1>{t("business.id.orderNotFound")}</h1>
              <p>{t("business.id.checkTheOrderCodeOrReturnToYourPurchaseHistory")}</p>
              <Link href="/orders" className="btn-primary">
                {t("business.id.viewMyOrders")}
              </Link>
            </div>
          )}
        </main>
      </>
    );

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const awaitingPayment =
    order.paymentMethod === "BANK_TRANSFER" &&
    order.paymentStatus === "PENDING" &&
    order.status === "PENDING_PAYMENT";
  const terminal = ["COMPLETED", "CANCELLED"].includes(order.status);
  const paymentCopy = {
    PAID: {
      label: t("business.id.amountPaid"),
      message: t("business.id.yourPaymentHasBeenReceivedThankYouForChoosingClucky"),
      icon: CheckCircle2,
    },
    PENDING: {
      label: t("business.id.amountDue"),
      message:
        order.paymentMethod === "COD"
          ? t("business.id.payInCashWhenYouReceiveYourMeal")
          : t("business.id.scanTheCodeBelowToCompletePayment"),
      icon: Wallet,
    },
    FAILED: {
      label: t("business.id.orderValue"),
      message: t("business.id.paymentWasUnsuccessfulPleaseCheckYourOrderStatus"),
      icon: CircleAlert,
    },
    EXPIRED: {
      label: t("business.id.orderValue"),
      message: t("business.id.thePaymentSessionHasExpiredPleaseCheckYourOrderBeforePaying"),
      icon: Clock3,
    },
  }[order.paymentStatus];
  const PaymentIcon = paymentCopy.icon;

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    try {
      await cancelOrder(order.id, cancelReason.trim());
      setCancelOpen(false);
      setFeedback(t("business.id.yourOrderHasBeenCancelled"));
      try {
        const updated = await orderApi.getById(id);
        if (updated) setServerOrder(mapBackendOrderToOrder(updated));
      } catch {}
    } catch (err: any) {
      setCancelOpen(false);
      setFeedback(err?.message || t("business.orderprovider.orderNotFound"));
    }
  };

  return (
    <>
      <main className={`${styles.trackingContainer} m3-page`}>
        <nav className={styles.breadcrumb} aria-label={t("business.id.breadcrumb")}>
          <Link href="/orders">
            <ArrowLeft size={15} /> {t("business.orders.myOrders")}
          </Link>
          <span>/</span>
          <span>{order.orderCode}</span>
        </nav>
        <header className={styles.detailHeader}>
          <div>
            <span className={styles.eyebrow}>{t("business.cart.yourMeal")}</span>
            <h1>{t("business.id.orderDetails")}</h1>
            <p>
              <Clock3 size={14} /> {t("business.id.placedAt")}{" "}
              {displayOrderTime(order.createdAt, locale)}
              <span>·</span>
              {order.storeName}
            </p>
          </div>
          <OrderStatusChip status={order.status} />
        </header>

        {/* INT-70: Email notification status indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "14px",
            padding: "12px 18px",
            marginBottom: "16px",
            color: "#166534",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          <MailCheck size={20} style={{ flexShrink: 0, color: "#15803d" }} />
          <div>
            <strong>Email ({order.orderCode}):</strong>{" "}
            {order.status === "CONFIRMED" || order.status === "PENDING_PAYMENT"
              ? t("business.checkout.yourCashOnDeliveryOrderHasBeenConfirmed")
              : order.status === "CANCELLED"
                ? t("business.orderprogress.orderCancelledProgressHasStopped")
                : order.status === "COMPLETED"
                  ? t("business.demoordercontrols.yourOrderIsCompleteThankYouForChoosingClucky")
                  : order.status}
          </div>
        </div>

        {/* Realtime polling status indicator */}
        {isPolling && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "#6b6259",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#16a34a",
              }}
            />
            Live Status ({order.status}) · 5s
          </div>
        )}

        <OrderProgress
          orderCode={order.orderCode}
          status={order.status}
          type={order.type}
          updatedAt={order.updatedAt ?? order.createdAt}
          history={order.timeline}
        />
        {feedback && (
          <p className={styles.feedback} role="status">
            <CheckCircle2 size={16} />
            {feedback}
          </p>
        )}
        {demoEnabled && (
          <details className={styles.demoDisclosure} open>
            <summary>{t("business.id.orderStatusSimulator")}</summary>
            <DemoOrderControls order={order} />
          </details>
        )}
        <div
          className={`${styles.detailGrid} ${
            awaitingPayment ? styles.awaitingPayment : ""
          }`}
        >
          <div className={styles.detailMain}>
            <section className={styles.detailCard}>
              <div className={styles.sectionHeading}>
                <h2>
                  <ShoppingBag size={19} /> {t("business.id.orderedItems")}
                </h2>
                <span>
                  {itemCount} {t("business.cart.servings")}
                </span>
              </div>
              <div className={styles.detailItems}>
                {order.items.map((item) => (
                  <OrderItemCard
                    key={item.id}
                    image={item.image}
                    name={item.itemName}
                    unitPrice={item.unitPrice}
                    quantity={item.quantity}
                    lineTotal={item.lineTotal}
                    options={item.optionsSnapshot}
                    toppings={item.toppingsSnapshot}
                    note={item.note}
                  />
                ))}
              </div>
              {order.note && (
                <div className={styles.orderNote}>
                  <MessageSquare size={17} />
                  <div>
                    <strong>{t("business.checkout.orderNotes")}</strong>
                    <p>{order.note}</p>
                  </div>
                </div>
              )}
              <OrderSummaryCard
                embedded
                title={t("business.id.total")}
                subtotal={order.subtotal}
                discountAmount={order.discountAmount}
                voucherCode={order.voucherCode}
                pointsUsed={order.pointsUsed}
                pointsAmount={order.pointsAmount}
                shippingFee={order.shippingFee}
                totalAmount={order.totalAmount}
              />
            </section>
            <div className={styles.detailActions}>
              {terminal ? (
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.exploreAction}`}
                  onClick={async () => {
                    await reorder(order);
                    router.push("/cart");
                  }}
                >
                  <RotateCcw size={17} /> {t("business.id.reorderTheseItems")}
                </button>
              ) : (
                <Link
                  href="/menu"
                  className={`${styles.primaryButton} ${styles.exploreAction}`}
                >
                  <ShoppingBag size={19} aria-hidden="true" />{" "}
                  {t("business.id.exploreMoreDishes")}{" "}
                  <span className={styles.actionArrow} aria-hidden="true">
                    <ArrowRight size={17} />
                  </span>
                </Link>
              )}
              {["PENDING_PAYMENT", "CONFIRMED"].includes(order.status) && (
                <button
                  type="button"
                  className={styles.cancelAction}
                  onClick={() => setCancelOpen(true)}
                >
                  <CircleX size={18} aria-hidden="true" />{" "}
                  {t("business.id.cancelThisOrder")}
                </button>
              )}
              <Link href="/orders" className={styles.textButton}>
                <History size={18} aria-hidden="true" />{" "}
                {t("business.id.backToOrderHistory")}
              </Link>
            </div>
          </div>
          <aside className={styles.detailAside}>
            <section
              className={`${styles.detailCard} ${styles.paymentCard}`}
              data-state={order.paymentStatus}
              aria-label={t("business.id.payForOrder")}
            >
              <div className={styles.paymentHeading}>
                <h2>
                  <Wallet size={19} /> {t("business.cart.checkout")}
                </h2>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              {!awaitingPayment && (
                <div className={styles.paymentReceipt}>
                  <span className={styles.paymentEmblem} aria-hidden="true">
                    <PaymentIcon size={30} strokeWidth={1.8} />
                  </span>
                  <span className={styles.paymentAmountLabel}>
                    {paymentCopy.label}
                  </span>
                  <strong className={styles.paymentAmount}>
                    {formatPrice(order.totalAmount)}
                  </strong>
                  <p className={styles.paymentMessage}>{paymentCopy.message}</p>
                </div>
              )}
              <div className={styles.paymentMethod}>
                <span className={styles.paymentMethodIcon} aria-hidden="true">
                  {order.paymentMethod === "COD" ? (
                    <Wallet size={23} />
                  ) : (
                    <CreditCard size={23} />
                  )}
                </span>
                <div>
                  <span className={styles.paymentMethodLabel}>
                    {t("business.checkout.paymentMethod")}
                  </span>
                  <strong>
                    {order.paymentMethod === "COD"
                      ? t("business.id.cashOnDelivery")
                      : t("business.id.bankTransfer")}
                  </strong>
                </div>
                <span className={styles.paymentNetwork}>
                  {order.paymentMethod === "COD" ? "COD" : "VietQR"}
                </span>
              </div>
              {awaitingPayment && (
                <PaymentWidget
                  key={order.id}
                  orderCode={order.orderCode}
                  amount={order.totalAmount}
                  status={order.paymentStatus}
                  bankInfo={MOCK_PAYMENT_BANK}
                  storeName={order.storeName}
                  embedded
                  demo
                />
              )}
              {order.refundStatus === "PENDING" && (
                <p className={styles.refundNotice}>
                  <CircleAlert size={16} />{" "}
                  {t("business.id.yourRefundRequestIsAwaitingReview")}
                </p>
              )}
            </section>
            <ShipmentCard
              receiverName={order.receiverName}
              receiverPhone={order.receiverPhone}
              address={order.deliveryAddress}
              storeName={order.storeName}
              orderType={order.type}
              status={order.shipmentStatus}
            />
          </aside>
        </div>
        <OrderDialog
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          titleId="cancel-order-title"
        >
          <div className={styles.cancelDialog}>
            <h2 id="cancel-order-title">{t("business.id.cancelOrder")}</h2>
            <p>
              {t(
                "business.id.youCanOnlyCancelBeforePreparationBeginsIfYouHavePaidBy",
              )}
            </p>
            <label htmlFor="cancel-reason">
              {t("business.id.cancellationReason")}
            </label>
            <textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder={t("business.id.tellCluckyYourReason")}
              maxLength={500}
            />
            <div>
              <button
                type="button"
                className={styles.outlineButton}
                onClick={() => setCancelOpen(false)}
              >
                {t("business.id.keepOrder")}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!cancelReason.trim()}
                onClick={handleCancel}
              >
                {t("business.id.confirmCancellation")}
              </button>
            </div>
          </div>
        </OrderDialog>
      </main>
    </>
  );
}
