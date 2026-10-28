import type { AdminOrder, AdminOrderStatus } from "../types/order";

export const orderStatusLabels: Record<AdminOrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang chế biến",
  READY: "Món sẵn sàng",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};
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
  if (role !== "ADMIN" && order.storeId !== String(storeId))
    return { ok: false, order, message: "Đơn nằm ngoài chi nhánh của bạn." };
  let next = { ...order };
  let description = "";
  if (action.type === "STATUS") {
    const allowed: Partial<Record<AdminOrderStatus, AdminOrderStatus[]>> = {
      PENDING_PAYMENT: ["CANCELLED"],
      CONFIRMED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY"],
      READY: ["COMPLETED"],
      SHIPPING: ["COMPLETED"],
    };
    if (!allowed[order.status]?.includes(action.status))
      return {
        ok: false,
        order,
        message: "Bước chuyển trạng thái không hợp lệ.",
      };
    if (action.status === "COMPLETED" && order.paymentStatus !== "PAID")
      return {
        ok: false,
        order,
        message: "Cần xác nhận thu tiền trước khi hoàn thành.",
      };
    if (action.status === "CANCELLED" && !action.reason?.trim())
      return { ok: false, order, message: "Vui lòng nhập lý do hủy đơn." };
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
      `Chuyển sang ${orderStatusLabels[action.status].toLocaleLowerCase("vi-VN")}.`;
  } else if (action.type === "COD") {
    if (
      order.paymentMethod !== "COD" ||
      order.paymentStatus !== "PENDING" ||
      ["CANCELLED", "COMPLETED"].includes(order.status)
    )
      return {
        ok: false,
        order,
        message: "Không có khoản COD cần xác nhận cho đơn này.",
      };
    next.paymentStatus = "PAID";
    description = "Đã xác nhận thu tiền COD.";
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
          "Không thể duyệt yêu cầu này. Kiểm tra quyền và ghi chú quyết định.",
      };
    next = { ...next, hasRefundRequest: false, refundStatus: action.decision };
    description = `${action.decision === "APPROVED" ? "Đã duyệt" : "Đã từ chối"} yêu cầu hoàn tiền. ${action.note.trim()}`;
  }
  next.updatedAt = now;
  next.timeline = [
    ...(order.timeline ?? []),
    {
      status: next.status,
      title:
        action.type === "COD"
          ? "Đã thu COD"
          : action.type === "REFUND"
            ? "Xử lý yêu cầu hoàn tiền"
            : orderStatusLabels[next.status],
      description,
      time: now,
      actor: role,
    },
  ];
  return { ok: true, order: next, message: description };
}

export function displayOrderTime(value?: string) {
  if (!value) return "Chưa có cập nhật";
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))
    value = value.replace(" ", "T") + ":00+07:00";
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
}
