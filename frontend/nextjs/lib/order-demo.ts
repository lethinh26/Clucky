import type { Order, OrderStatus } from "./types/order";

export const DEMO_CONTROLS_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_M3_DEMO_ENABLED === "true";

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang chế biến",
  READY: "Món đã sẵn sàng",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

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
  const reject = (message: string): DemoResult => ({
    ok: false,
    order,
    message,
  });
  if (!enabled) return reject("Chức năng mô phỏng chưa được bật.");
  if (["COMPLETED", "CANCELLED"].includes(order.status))
    return reject("Đơn đã kết thúc, không thể thực hiện thao tác.");
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
        "Đơn này không còn chờ thanh toán. Không thể thanh toán lặp lại.",
      );
    }
    paymentStatus = action === "PAY_SUCCESS" ? "PAID" : "FAILED";
    status = action === "PAY_SUCCESS" ? "CONFIRMED" : "CANCELLED";
    description =
      action === "PAY_SUCCESS"
        ? "Đã xác nhận thanh toán thành công qua chuyển khoản."
        : "Thanh toán thất bại, đơn hàng đã hủy. Bạn có thể đặt lại món.";
  } else if (action === "COLLECT_COD") {
    if (order.paymentMethod !== "COD" || order.paymentStatus !== "PENDING")
      return reject("Đơn này không có khoản COD cần xác nhận.");
    paymentStatus = "PAID";
    description = "Đã thu tiền mặt (COD).";
  } else {
    const next = nextDemoStatus(order.status);
    if (!next)
      return reject("Chưa thể chuyển bước. Hoàn tất thanh toán trước.");
    if (next === "COMPLETED" && order.paymentStatus !== "PAID")
      return reject("Cần xác nhận đã thu tiền trước khi hoàn thành.");
    status = next;
    description = `Cửa hàng ${orderStatusLabels[next].toLocaleLowerCase("vi-VN")}.`;
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
              ? "Đã thu COD"
              : orderStatusLabels[status],
          description,
          time: now,
          done: true,
          current: true,
        },
      ],
    },
  };
}

export function displayOrderTime(value?: string) {
  if (!value) return "Chưa có cập nhật";
  // Preserve older browser snapshots whose dates were already formatted.
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

export function isFloatingCartRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/menu" ||
    /^\/menu\/[^/]+\/?$/.test(pathname)
  );
}
