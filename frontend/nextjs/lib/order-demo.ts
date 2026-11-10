import { getBrowserLocale, type Locale } from "./i18n/locale.ts";
import { getTranslator } from "./i18n/translator.ts";
import type { Order, OrderStatus, OrderType } from "./types/order";

export const DEMO_CONTROLS_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_M3_DEMO_ENABLED === "true";

export function ensureDemoShipment(order: Order): Order {
  return order.type === "DELIVERY" && !order.shipmentStatus
    ? { ...order, shipmentStatus: "CREATED" }
    : order;
}

export const orderStatusKeys = {
  PENDING_PAYMENT: "business.checkout.awaitingPayment",
  CONFIRMED: "business.orderstatuschip.confirmed",
  PREPARING: "business.orderprogress.preparing",
  READY: "business.orderdetaildrawer.mealReady",
  SHIPPING: "business.orderstatuschip.outForDelivery",
  COMPLETED: "business.orders.completed",
  CANCELLED: "business.orders.cancelled",
} as const satisfies Record<OrderStatus, string>;
export const orderStatusLabels = Object.fromEntries(Object.entries(orderStatusKeys).map(([status, key]) => [status, getTranslator("vi")(key)])) as Record<OrderStatus, string>;

export function orderStatusKey(status: OrderStatus, type?: OrderType) {
  if (status === "READY" && type) return type === "PICKUP"
    ? "business.orderprogress.awaitingCollection" : "business.orderstatuschip.readyForDelivery";
  if (status === "COMPLETED" && type) return type === "PICKUP"
    ? "business.orderprogress.collected" : "business.orderprogress.delivered";
  return orderStatusKeys[status];
}

export function orderHistoryDescription(event: Order["timeline"][number], type: OrderType, locale: Locale): string {
  const t = getTranslator(locale);
  const reason = event.description.trim();
  const reasonKeys = {
    "Order created with payment method: BANK_TRANSFER": "business.orderprogress.createdWithBankTransfer",
    "Order created with payment method: COD": type === "PICKUP"
      ? "business.orderprogress.createdWithPaymentAtStore" : "business.orderprogress.createdWithCod",
    SEPAY_PAYMENT_RECEIVED: "business.orderprogress.paymentReceived",
    PAYMENT_EXPIRED: "business.orderprogress.paymentExpired",
    "Payment failed / cancelled by saga compensation": "business.orderprogress.paymentFailed",
  } as const;
  if (Object.hasOwn(reasonKeys, reason)) return t(reasonKeys[reason as keyof typeof reasonKeys]);
  if (reason === event.status || reason === `Status updated to ${event.status}`) {
    return t("business.orderprogress.statusUpdated", { status: t(orderStatusKey(event.status, type)) });
  }
  return event.description;
}

export function nextDemoStatus(status: OrderStatus): OrderStatus | undefined {
  return (
    {
      CONFIRMED: "PREPARING",
      PREPARING: "READY",
      READY: "COMPLETED",
      SHIPPING: "COMPLETED",
    } as Partial<Record<OrderStatus, OrderStatus>>
  )[status];
}

export type DemoAction =
  "PAY_SUCCESS" | "PAY_FAILED" | "COLLECT_COD" | "ADVANCE";
export type DemoResult = { ok: boolean; order: Order; message: string };

// This reducer only changes the browser's demo snapshot. It never confirms a real payment.
export function applyDemoAction(
  order: Order,
  action: DemoAction,
  enabled: boolean,
  now = new Date().toISOString(),
): DemoResult {
  const t = getTranslator(getBrowserLocale());
  const reject = (message: string): DemoResult => ({
    ok: false,
    order,
    message,
  });
  if (!enabled) return reject(t("business.orderdemo.theSimulatorIsNotEnabled"));
  if (["COMPLETED", "CANCELLED"].includes(order.status))
    return reject(t("business.orderdemo.thisOrderHasEndedNoFurtherActionsAreAvailable"));
  let status = order.status;
  let paymentStatus = order.paymentStatus;
  let description = "";
  if (action === "PAY_SUCCESS" || action === "PAY_FAILED") {
    if (
      order.paymentMethod !== "BANK_TRANSFER" ||
      order.status !== "PENDING_PAYMENT" ||
      order.paymentStatus !== "PENDING"
    ) {
      return reject(
        t("business.orderdemo.thisOrderIsNoLongerAwaitingPaymentDuplicatePaymentIsNotAllowed"),
      );
    }
    paymentStatus = action === "PAY_SUCCESS" ? "PAID" : "FAILED";
    status = action === "PAY_SUCCESS" ? "CONFIRMED" : "CANCELLED";
    description =
      action === "PAY_SUCCESS"
        ? t("business.orderdemo.bankTransferPaymentConfirmedSuccessfully")
        : t("business.orderdemo.paymentFailedAndTheOrderWasCancelledYouCanReorderYourMeal");
  } else if (action === "COLLECT_COD") {
    if (order.paymentMethod !== "COD" || order.paymentStatus !== "PENDING")
      return reject(t("business.orderdemo.thisOrderHasNoCodPaymentToConfirm"));
    paymentStatus = "PAID";
    description = t("business.orderdemo.cashOnDeliveryPaymentCollected");
  } else {
    const next = nextDemoStatus(order.status);
    if (!next)
      return reject(t("business.orderdemo.cannotAdvanceYetCompletePaymentFirst"));
    if (next === "COMPLETED" && order.paymentStatus !== "PAID")
      return reject(t("business.orderdetaildrawer.confirmPaymentCollectionBeforeCompletingTheOrder"));
    status = next;
    description = t("business.orderdemo.store", { value1: t(orderStatusKeys[next]) });
  }
  return {
    ok: true,
    message: description,
    order: {
      ...order,
      status,
      paymentStatus,
      updatedAt: now,
      timeline: [
        ...order.timeline.map((step) => ({ ...step, current: false })),
        {
          status,
          title:
            action === "COLLECT_COD"
              ? t("business.paymentstatusbadge.codCollected")
              : t(orderStatusKeys[status]),
          description,
          time: now,
          done: true,
          current: true,
        },
      ],
    },
  };
}

export function displayOrderTime(value?: string, locale: Locale = "vi") {
  if (!value) return getTranslator(locale)("orders.noUpdates");
  // Preserve older browser snapshots whose dates were already formatted.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))
    value = value.replace(" ", "T") + ":00+07:00";
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
}

export function isFloatingCartRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/menu" ||
    /^\/menu\/[^/]+\/?$/.test(pathname)
  );
}
