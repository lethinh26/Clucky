"use client";
import { notify, useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { getErrorMessage } from "@/lib/api";
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
  ShieldCheck,
  MailCheck,
  Mail,
} from "lucide-react";
import { displayOrderTime, orderStatusKey } from "@/lib/order-demo";
import { useOrder, mapBackendOrderToOrder } from "@/components/order/order-provider";
import { useNavigationTask } from "@/components/ui-loader";
import { OrderProgress } from "@/components/order/order-progress";
import { OrderDialog } from "@/components/order/order-dialog";
import { DemoOrderControls } from "@/components/order/demo-order-controls";
import { PaymentStatusBadge } from "@/components/payment";
import { LiveOrderPayment } from "@/components/payment/live-order-payment";
import { ShipmentCard } from "@/components/shipping";
import { MockDeliveryTracking, type TrackingResponse } from "@/components/shipping/mock-delivery-tracking";
import { RefundBankFields } from "@/components/refund/refund-bank-fields";
import {
  OrderStatusChip,
  OrderItemCard,
  OrderSummaryCard,
} from "@/components/order";
import { orderApi, catalogApi, refundApi, type ProductItem, type StoreItem, type RefundResult } from "@/lib/api";
import { stores as FALLBACK_STORES } from "@/lib/products";
import { fillOrderImages } from "@/lib/order-images";
import { OrderItemReviews } from "@/components/reviews/order-item-reviews";
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
  const [shipmentTracking, setShipmentTracking] = useState<TrackingResponse | null>(null);
  const [imageCatalog, setImageCatalog] = useState<ProductItem[]>([]);
  const [storesList, setStoresList] = useState<Pick<StoreItem, "id" | "name" | "address">[]>(FALLBACK_STORES);
  useEffect(() => {
    let active = true;
    catalogApi.getProducts().then(products => { if (active) setImageCatalog(products); }).catch(() => {});
    catalogApi.getStores(false).then(stores => { if (active && Array.isArray(stores) && stores.length > 0) setStoresList(stores); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const [isPolling, setIsPolling] = useState(false);
  const [loadError, setLoadError] = useState("");
  useFeedback(loadError);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [refund, setRefund] = useState<RefundResult | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState({ bankBin: "", bankName: "", accountNumber: "", accountHolderName: "" });
  const [submittingBank, setSubmittingBank] = useState(false);
  const [createRefundOpen, setCreateRefundOpen] = useState(false);
  const [createRefundForm, setCreateRefundForm] = useState({ bankBin: "", bankName: "", accountNumber: "", accountHolderName: "", reason: "" });
  const [submittingCreateRefund, setSubmittingCreateRefund] = useState(false);

  // INT-68: 5-second polling interval for order status until terminal status
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isMounted = true;

    const fetchCurrentOrder = async () => {
      try {
        const isNumeric = /^\d+$/.test(id);
        const beOrder = isNumeric ? await orderApi.getById(id) : await orderApi.getByCode(id);
        if (!isMounted || !beOrder) return;
        const mapped = mapBackendOrderToOrder(beOrder);
        setServerOrder(mapped);
        setLoadError("");

        if (["COMPLETED", "CANCELLED", "DELIVERY_FAILED"].includes(mapped.status)) {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          setIsPolling(false);
        } else {
          setIsPolling(true);
        }
      } catch (error) {
        if (!isMounted) return;
        setLoadError(getErrorMessage(error));
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

  const sourceOrder = serverOrder || localOrder;
  const matchedStore = sourceOrder
    ? (storesList.find(s => Number(s.id) === Number(sourceOrder.storeId)) ??
       FALLBACK_STORES.find(s => Number(s.id) === Number(sourceOrder.storeId)))
    : undefined;
  const enrichedSourceOrder = sourceOrder
    ? {
        ...sourceOrder,
        storeName: matchedStore?.name || sourceOrder.storeName,
        storeAddress: matchedStore?.address || sourceOrder.storeAddress,
      }
    : undefined;
  const order = enrichedSourceOrder ? fillOrderImages([enrichedSourceOrder], imageCatalog)[0] : undefined;

  useEffect(() => {
    if (!order?.id) return;
    let active = true;
    const isNumeric = /^\d+$/.test(order.id);
    if (isNumeric) {
      refundApi.list({ orderId: Number(order.id) }).then((list) => {
        if (active && Array.isArray(list) && list.length > 0) {
          setRefund(list[0]);
          setBankForm({
            bankBin: list[0].bankBin || "",
            bankName: list[0].bankName || "",
            accountNumber: list[0].accountNumber || list[0].bankAccountNo || "",
            accountHolderName: list[0].accountHolderName || list[0].bankAccountName || "",
          });
        }
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [order?.id, order?.status]);

  useEffect(() => {
    if (refund?.id && refund.status === "REFUNDED") {
      let active = true;
      refundApi.getEvidence(refund.id).then((res) => {
        if (active && res?.signedUrl) {
          setEvidenceUrl(res.signedUrl);
        }
      }).catch(() => {});
      return () => { active = false; };
    } else {
      setEvidenceUrl(null);
    }
  }, [refund?.id, refund?.status]);

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
  const currentShipment = shipmentTracking?.orderId === Number(order.id) ? shipmentTracking : null;
  const codMockPaid = order.type === "DELIVERY" && order.paymentMethod === "COD"
    && currentShipment?.merchantPaymentStatus === "PAID_SIMULATED";
  const paymentCopy = {
    COLLECTED: {
      label: t("business.paymentstatusbadge.codCollected"),
      message: t("business.id.yourPaymentHasBeenReceivedThankYouForChoosingClucky"),
      icon: CheckCircle2,
    },
    REFUNDED: {
      label: t("business.paymentstatusbadge.refunded"),
      message: t("business.paymentstatusbadge.refunded"),
      icon: RotateCcw,
    },
    UNKNOWN: {
      label: t("business.id.orderValue"),
      message: t("business.paymentstatusbadge.unknownStatus"),
      icon: CircleAlert,
    },
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
  }[order.paymentStatus] ?? {
    label: t("business.id.orderValue"),
    message: t("business.id.payInCashWhenYouReceiveYourMeal"),
    icon: Wallet,
  };
  const displayPaymentCopy = codMockPaid ? {
    label: t("business.id.orderValue"),
    message: t("business.id.codSimulatedPaidMessage"),
    icon: ShieldCheck,
  } : paymentCopy;
  const PaymentIcon = displayPaymentCopy.icon;

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    try {
      await cancelOrder(order.id, cancelReason.trim());
      setCancelOpen(false);
      notify.success(t("business.id.yourOrderHasBeenCancelled"));
      try {
        const updated = await orderApi.getById(order.id);
        if (updated) setServerOrder(mapBackendOrderToOrder(updated));
      } catch {}
    } catch (err: unknown) {
      notify.error(getErrorMessage(err));
      try {
        const updated = await orderApi.getById(order.id);
        setServerOrder(mapBackendOrderToOrder(updated));
      } catch (reloadError) {
        setLoadError(getErrorMessage(reloadError));
      }
    }
  };

  const handleCreateRefund = async () => {
    if (!order?.id) return;
    setSubmittingCreateRefund(true);
    try {
      const res = await refundApi.create({
        orderId: Number(order.id),
        reason: createRefundForm.reason.trim(),
        bankBin: createRefundForm.bankBin,
        bankName: createRefundForm.bankName,
        bankAccountNo: createRefundForm.accountNumber.trim(),
        bankAccountName: createRefundForm.accountHolderName.trim(),
      });
      setRefund(res);
      setCreateRefundOpen(false);
      notify.success(t("business.id.refundRequestSent"));
    } catch (err: unknown) {
      notify.error(getErrorMessage(err));
    } finally {
      setSubmittingCreateRefund(false);
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
              {order.storeAddress ? ` — ${order.storeAddress}` : ""}
            </p>
          </div>
          <OrderStatusChip status={order.status} type={order.type} />
        </header>

        {/* P3.2: Order status notification: differentiates COD vs Bank Transfer and avoids false email claims */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "12px 18px",
            marginBottom: "16px",
            color: "#334155",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          <Mail size={20} style={{ flexShrink: 0, color: "#64748b" }} />
          <div>
            <strong>{order.orderCode}:</strong>{" "}
            {order.status === "DELIVERY_FAILED"
              ? (locale === "vi" ? "Đơn giao hàng không thành công. Vui lòng liên hệ cửa hàng để được hỗ trợ." : "Delivery was unsuccessful. Please contact the store for assistance.")
              : order.status === "CANCELLED"
              ? t("business.orderprogress.orderCancelledProgressHasStopped")
              : order.status === "COMPLETED"
                ? t("business.demoordercontrols.yourOrderIsCompleteThankYouForChoosingClucky")
                : order.status === "CONFIRMED"
                  ? (order.paymentMethod === "COD"
                      ? t("business.checkout.yourCashOnDeliveryOrderHasBeenConfirmed")
                      : t("business.checkout.orderConfirmed"))
                  : order.status === "PENDING_PAYMENT"
                    ? (order.paymentMethod === "BANK_TRANSFER"
                        ? t("business.checkout.pleaseCompletePaymentSoCluckyCanPrepareYourMeal")
                        : t("business.checkout.yourCashOnDeliveryOrderHasBeenConfirmed"))
                    : t(orderStatusKey(order.status, order.type))}
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
            {t("business.orderprogress.liveStatus", { status: t(orderStatusKey(order.status, order.type)), seconds: 5 })}
          </div>
        )}

        <OrderProgress
          orderCode={order.orderCode}
          status={order.status}
          type={order.type}
          paymentStatus={order.paymentStatus}
          paymentMethod={order.paymentMethod}
          updatedAt={order.updatedAt ?? order.createdAt}
          history={order.timeline}
          deliveryTracking={order.type === "DELIVERY" && order.status !== "CANCELLED" && /^\d+$/.test(order.id)
            ? <MockDeliveryTracking orderId={order.id} active={order.status === "SHIPPING"} onTrackingUpdate={setShipmentTracking} />
            : undefined}
        />
        {demoEnabled && order.type === "PICKUP" && (
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
            <OrderItemReviews order={order} />
            <div className={styles.detailActions}>
              {terminal ? (
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.exploreAction}`}
                  onClick={async () => {
                    await reorder(order);
                    router.push(`/checkout?storeId=${encodeURIComponent(order.storeId)}`);
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
              {!refund?.status && !order.refundStatus && ["CANCELLED", "DELIVERY_FAILED"].includes(order.status) && order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus === "PAID" && (
                <button
                  type="button"
                  className={styles.outlineButton}
                  onClick={() => {
                    setCreateRefundForm({ bankBin: "", bankName: "", accountNumber: "", accountHolderName: "", reason: "" });
                    setCreateRefundOpen(true);
                  }}
                >
                  <RotateCcw size={17} /> {t("business.id.requestRefund")}
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
              data-state={codMockPaid ? "PAID" : order.paymentStatus}
              aria-label={t("business.id.payForOrder")}
            >
              <div className={styles.paymentHeading}>
                <h2>
                  <Wallet size={19} /> {t("business.cart.checkout")}
                </h2>
                {order.paymentMethod === "BANK_TRANSFER" ? (
                  <span className={styles.paymentStatusCluster}>
                    <span className={styles.paymentNetwork}>VietQR</span>
                    {["PAID", "COLLECTED"].includes(order.paymentStatus) && <PaymentStatusBadge status={order.paymentStatus} />}
                  </span>
                ) : codMockPaid ? (
                  <span className={styles.deliveryPaymentBadge}>{t("business.id.codSimulatedPaid")}</span>
                ) : <PaymentStatusBadge status={order.paymentStatus} />}
              </div>
              {!awaitingPayment && order.paymentMethod !== "BANK_TRANSFER" && (
                <div className={styles.paymentReceipt}>
                  <span className={styles.paymentEmblem} aria-hidden="true">
                    <PaymentIcon size={30} strokeWidth={1.8} />
                  </span>
                  <span className={styles.paymentAmountLabel}>
                    {displayPaymentCopy.label}
                  </span>
                  <strong className={styles.paymentAmount}>
                    {formatPrice(order.totalAmount)}
                  </strong>
                  <p className={styles.paymentMessage}>{displayPaymentCopy.message}</p>
                </div>
              )}
              {order.paymentMethod !== "BANK_TRANSFER" && <div className={styles.paymentMethod}>
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
              </div>}
              {order.type === "DELIVERY" && order.paymentMethod === "COD"
                && !codMockPaid && !["PAID", "COLLECTED"].includes(order.paymentStatus) && (
                <p className={styles.codCollectionNote}>{t("business.id.codCollectionOutside")}</p>
              )}
              {order.paymentMethod === "BANK_TRANSFER" && (
                <LiveOrderPayment
                  key={order.id}
                  orderId={order.id}
                  pending={awaitingPayment}
                  available={!!serverOrder && serverOrder.id === order.id && !loadError}
                  storeName={order.storeName}
                />
              )}
              {(() => {
                const activeRefundStatus = refund?.status || order.refundStatus;
                if (activeRefundStatus === "PENDING") {
                  return (
                    <p className={styles.refundNotice}>
                      <CircleAlert size={16} />{" "}
                      {t("business.id.yourRefundRequestIsAwaitingReview")}
                    </p>
                  );
                }
                if (activeRefundStatus === "APPROVED") {
                  return (
                    <p className={styles.refundNotice} style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8" }}>
                      <CheckCircle2 size={16} />{" "}
                      {t("business.id.refundApprovedNotice")}
                    </p>
                  );
                }
                if (activeRefundStatus === "PROCESSING") {
                  return (
                    <p className={styles.refundNotice} style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#15803d" }}>
                      <Clock3 size={16} />{" "}
                      {t("business.id.refundProcessingNotice")}
                    </p>
                  );
                }
                if (activeRefundStatus === "WAITING_BANK_DETAILS") {
                  return (
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "12px 16px", marginTop: "12px" }}>
                      <p style={{ margin: "0 0 8px", color: "#b45309", fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                        <CircleAlert size={16} /> {t("business.id.refundWaitingBankNotice")}
                      </p>
                      <button
                        type="button"
                        style={{ fontSize: "13px", padding: "6px 12px", borderRadius: "8px", border: "1px solid #d97706", color: "#b45309", background: "#fff", cursor: "pointer", fontWeight: 600 }}
                        onClick={() => {
                          setBankForm({
                            bankBin: refund?.bankBin || "",
                            bankName: refund?.bankName || "",
                            accountNumber: refund?.accountNumber || refund?.bankAccountNo || "",
                            accountHolderName: refund?.accountHolderName || refund?.bankAccountName || "",
                          });
                          setBankModalOpen(true);
                        }}
                      >
                        {t("business.id.updateBankDetails")}
                      </button>
                    </div>
                  );
                }
                if (activeRefundStatus === "REFUNDED") {
                  return (
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "16px",
                        borderRadius: "14px",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        color: "#166534",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                        <CheckCircle2 size={18} color="#16a34a" />
                        <strong style={{ fontSize: "15px" }}>{t("business.id.refundSuccessNotice")}</strong>
                      </div>
                      <div style={{ fontSize: "13px", lineHeight: "1.7", color: "#1e3a2b" }}>
                        <div>
                          {t("business.id.refundedAmount")}{" "}
                          <strong style={{ color: "#15803d", fontSize: "14px" }}>
                            {formatPrice(refund?.amount ?? order.totalAmount)}
                          </strong>
                        </div>
                        {(refund?.bankName || order.refundData?.bankName) && (
                          <div>
                            {t("business.id.beneficiaryBank")}{" "}
                            <strong>{refund?.bankName || order.refundData?.bankName}</strong>
                            {(refund?.bankBin || order.refundData?.bankBin) && (
                              <span> ({refund?.bankBin || order.refundData?.bankBin})</span>
                            )}
                          </div>
                        )}
                        {(refund?.accountNumber || refund?.bankAccountNo || order.refundData?.accountNumber || order.refundData?.bankAccountNo) && (
                          <div>{t("business.id.bankAccountNumber")} <strong>{refund?.accountNumber || refund?.bankAccountNo || order.refundData?.accountNumber || order.refundData?.bankAccountNo}</strong></div>
                        )}
                        {(refund?.accountHolderName || refund?.bankAccountName || order.refundData?.accountHolderName || order.refundData?.bankAccountName) && (
                          <div>{t("business.id.bankAccountHolder")} <strong>{refund?.accountHolderName || refund?.bankAccountName || order.refundData?.accountHolderName || order.refundData?.bankAccountName}</strong></div>
                        )}
                      </div>
                      {evidenceUrl && (
                        <div style={{ marginTop: "12px", borderTop: "1px dashed #86efac", paddingTop: "10px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#166534", display: "block", marginBottom: "6px" }}>
                            {t("business.id.transferEvidence")}
                          </span>
                          <a href={evidenceUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={evidenceUrl}
                              alt={t("business.id.transferEvidenceAlt")}
                              style={{
                                width: "100%",
                                maxHeight: "160px",
                                objectFit: "contain",
                                borderRadius: "8px",
                                border: "1px solid #bbf7d0",
                                cursor: "pointer",
                                background: "#fff",
                              }}
                              title={t("business.id.clickToEnlargeImage")}
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                }
                if (activeRefundStatus === "REJECTED") {
                  return (
                    <p className={styles.refundNotice} style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c" }}>
                      <CircleAlert size={16} />{" "}
                      {t("business.id.refundRejectedNotice")}{refund?.reviewNote ? ` (${refund.reviewNote})` : ""}
                    </p>
                  );
                }
                if (!activeRefundStatus && ["CANCELLED", "DELIVERY_FAILED"].includes(order.status) && order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus === "PAID") {
                  return (
                    <div style={{ background: "#fffaf3", border: "1px solid #e8e2d9", borderRadius: "14px", padding: "14px 18px", marginTop: "14px" }}>
                      <p style={{ margin: "0 0 10px", color: "#8f1216", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                        <CircleAlert size={16} /> {t("business.id.eligibleRefundCancelledNotice")}
                      </p>
                      <button
                        type="button"
                        className={styles.outlineButton}
                        style={{ fontSize: "13px", padding: "8px 16px" }}
                        onClick={() => {
                          setCreateRefundForm((prev) => ({ ...prev, accountHolderName: "" }));
                          setCreateRefundOpen(true);
                        }}
                      >
                        {t("business.id.requestRefund")}
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
            </section>
            <ShipmentCard
              receiverName={order.receiverName}
              receiverPhone={order.receiverPhone}
              address={order.deliveryAddress}
              storeName={order.storeName}
              storeAddress={order.storeAddress}
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
            <div className={styles.dialogActions}>
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
        <OrderDialog
          open={bankModalOpen}
          onClose={() => setBankModalOpen(false)}
          titleId="update-bank-details-title"
        >
          <div className={styles.cancelDialog}>
            <h2 id="update-bank-details-title">{t("business.id.updateBankDetails")}</h2>
            <RefundBankFields
              active={bankModalOpen}
              bankBin={bankForm.bankBin}
              bankName={bankForm.bankName}
              accountNumber={bankForm.accountNumber}
              accountHolderName={bankForm.accountHolderName}
              onBankBinChange={(bankBin, bankName) => setBankForm((prev) => ({ ...prev, bankBin, bankName }))}
              onAccountNumberChange={(accountNumber) => setBankForm((prev) => ({ ...prev, accountNumber }))}
              onAccountHolderNameChange={(accountHolderName) => setBankForm((prev) => ({ ...prev, accountHolderName }))}
            />
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.outlineButton}
                onClick={() => setBankModalOpen(false)}
              >
                {t("business.id.keepOrder")}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={submittingBank || !bankForm.bankBin || !/^\d{1,80}$/.test(bankForm.accountNumber.trim()) || !bankForm.accountHolderName.trim()}
                onClick={async () => {
                  if (!refund?.id) return;
                  try {
                    setSubmittingBank(true);
                    const updated = await refundApi.updateBankDetails(refund.id, {
                      bankBin: bankForm.bankBin,
                      bankName: bankForm.bankName,
                      bankAccountNo: bankForm.accountNumber.trim(),
                      bankAccountName: bankForm.accountHolderName.trim(),
                      expectedBankDetailsVersion: refund.bankDetailsVersion,
                    });
                    setRefund(updated);
                    setBankModalOpen(false);
                    notify.success(t("business.id.bankDetailsUpdated"));
                  } catch (err) {
                    notify.error(getErrorMessage(err));
                  } finally {
                    setSubmittingBank(false);
                  }
                }}
              >
                {t("business.id.saveBankDetails")}
              </button>
            </div>
          </div>
        </OrderDialog>
        <OrderDialog
          open={createRefundOpen}
          onClose={() => setCreateRefundOpen(false)}
          titleId="create-refund-title"
        >
          <div className={styles.cancelDialog}>
            <h2 id="create-refund-title">{t("business.id.requestRefund")}</h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 14px" }}>
              {t("business.id.provideBankDetailsNotice", { amount: formatPrice(order.totalAmount) })}
            </p>
            <RefundBankFields
              active={createRefundOpen}
              bankBin={createRefundForm.bankBin}
              bankName={createRefundForm.bankName}
              accountNumber={createRefundForm.accountNumber}
              accountHolderName={createRefundForm.accountHolderName}
              onBankBinChange={(bankBin, bankName) => setCreateRefundForm((prev) => ({ ...prev, bankBin, bankName }))}
              onAccountNumberChange={(accountNumber) => setCreateRefundForm((prev) => ({ ...prev, accountNumber }))}
              onAccountHolderNameChange={(accountHolderName) => setCreateRefundForm((prev) => ({ ...prev, accountHolderName }))}
            />
            <label htmlFor="create-refund-reason" style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: 600 }}>
              {t("business.id.refundReason")} *
            </label>
            <textarea
              id="create-refund-reason"
              value={createRefundForm.reason}
              onChange={(e) => setCreateRefundForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder={t("business.id.enterRefundReason")}
              rows={3}
            />
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.outlineButton}
                onClick={() => setCreateRefundOpen(false)}
              >
                {t("business.id.cancel")}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={
                  submittingCreateRefund ||
                  !createRefundForm.bankBin ||
                  !/^\d{1,80}$/.test(createRefundForm.accountNumber.trim()) ||
                  !createRefundForm.accountHolderName.trim() ||
                  !createRefundForm.reason.trim()
                }
                onClick={handleCreateRefund}
              >
                {submittingCreateRefund ? t("business.id.sending") : t("business.id.submitRequest")}
              </button>
            </div>
          </div>
        </OrderDialog>
      </main>
    </>
  );
}
