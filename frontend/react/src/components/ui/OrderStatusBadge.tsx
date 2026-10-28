import type { AdminOrderStatus } from "../../types/order";
import { orderStatusLabels } from "../../lib/order-demo";

export function OrderStatusBadge({ status }: { status: AdminOrderStatus }) {
  return (
    <span className="m3-status-badge" data-status={status}>
      {orderStatusLabels[status]}
    </span>
  );
}
