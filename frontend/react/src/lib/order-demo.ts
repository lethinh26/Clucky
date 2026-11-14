import { getBrowserLocale, type Locale } from "../i18n/locale.ts";
import { getTranslator } from "../i18n/translator.ts";
import type { AdminOrder, AdminOrderStatus } from "../types/order";

export const orderStatusKeys = {
  PENDING_PAYMENT: "business:checkout.awaitingPayment",
  CONFIRMED: "business:orderstatuschip.confirmed",
  PREPARING: "business:orderprogress.preparing",
  READY: "business:orderdetaildrawer.mealReady",
  SHIPPING: "business:orderprogress.delivering",
  COMPLETED: "business:orders.completed",
  DELIVERY_FAILED: "business:orders.deliveryFailed",
  CANCELLED: "business:orders.cancelled",
} as const satisfies Record<AdminOrderStatus, string>;
export const orderStatusLabels = Object.fromEntries(Object.entries(orderStatusKeys).map(([status, key]) => [status, getTranslator("vi")(key)])) as Record<AdminOrderStatus, string>;
type Role = "ADMIN" | "STORE_MANAGER" | "STAFF";
export type AdminDemoAction =
  | { type: "STATUS"; status: AdminOrderStatus; reason?: string }
  | { type: "COD" }
  | { type: "REFUND"; decision: "APPROVED" | "REJECTED"; note: string };

export function applyAdminDemoAction(
  order: AdminOrder,
  action: AdminDemoAction,
  role: Role,
  storeId?: number,
  now = new Date().toISOString(),
) {
  const t = getTranslator(getBrowserLocale());
  if (role !== "ADMIN" && order.storeId !== String(storeId))
    return { ok: false, order, message: t("business:orderdemo.thisOrderBelongsToADifferentStore") };
  let next = { ...order };
  let description = "";
  if (action.type === "STATUS") {
    const allowed: Partial<Record<AdminOrderStatus, AdminOrderStatus[]>> = {
      PENDING_PAYMENT: ["CANCELLED"],
      CONFIRMED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY"],
      READY: order.orderType === 'PICKUP' ? ["COMPLETED"] : [],
    };
    if (!allowed[order.status]?.includes(action.status))
      return {
        ok: false,
        order,
        message: t("business:orderdemo.invalidStatusTransition"),
      };
    if (action.status === "COMPLETED" && !["PAID", "COLLECTED"].includes(order.paymentStatus))
      return {
        ok: false,
        order,
        message: t("business:orderdetaildrawer.confirmPaymentCollectionBeforeCompletingTheOrder"),
      };
    if (action.status === "CANCELLED" && !action.reason?.trim())
      return { ok: false, order, message: t("business:orderdemo.pleaseEnterACancellationReason") };
    next.status = action.status;
    if (action.status === "CANCELLED" && order.paymentStatus === "PAID") {
      next = {
        ...next,
        hasRefundRequest: true,
        refundStatus: "PENDING",
        refundReason: action.reason,
        refundAmount: order.total,
      };
    }
    description =
      action.reason?.trim() ||
      t("business:orderdemo.changedTo", { value1: t(orderStatusKeys[action.status]) });
  } else if (action.type === "COD") {
    if (
      order.paymentMethod !== "COD" ||
      order.paymentStatus !== "PENDING" ||
      ["CANCELLED", "COMPLETED"].includes(order.status)
    )
      return {
        ok: false,
        order,
        message: t("business:orderdemo.thereIsNoCodPaymentToConfirmForThisOrder"),
      };
    next.paymentStatus = "COLLECTED";
    description = t("business:orderdemo.codCollectionConfirmed");
  } else {
    if (
      role === "STAFF" ||
      !order.hasRefundRequest ||
      (action.decision === "REJECTED" && !action.note.trim())
    )
      return {
        ok: false,
        order,
        message:
          t("business:orderdemo.cannotReviewThisRequestCheckYourPermissionsAndDecisionNote"),
      };
    next = { ...next, hasRefundRequest: false, refundStatus: action.decision };
    description = t("business:orderdemo.refundRequest", { value1: action.decision === "APPROVED" ? t("business:orderdetaildrawer.approved") : t("business:orderdetaildrawer.rejected"), value2: action.note.trim() });
  }
  next.updatedAt = now;
  next.timeline = [
    ...(order.timeline ?? []),
    {
      status: next.status,
      title:
        action.type === "COD"
          ? t("business:paymentstatusbadge.codCollected")
          : action.type === "REFUND"
            ? t("business:orderdetaildrawer.reviewRefundRequest")
            : t(orderStatusKeys[next.status]),
      description,
      time: now,
      actor: role,
    },
  ];
  return { ok: true, order: next, message: description };
}

export function displayOrderTime(value?: string, locale: Locale = "vi") {
  if (!value) return getTranslator(locale)("orders:noUpdates");
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
