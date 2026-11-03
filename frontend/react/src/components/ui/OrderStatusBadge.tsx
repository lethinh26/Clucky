import { useTranslation } from "react-i18next";
import type { AdminOrderStatus } from "../../types/order";
import { orderStatusKeys } from "../../lib/order-demo";

export function OrderStatusBadge({ status }: { status: AdminOrderStatus }) {
  const { t } = useTranslation();
  return (
    <span className="m3-status-badge" data-status={status}>
      {t(orderStatusKeys[status])}
    </span>
  );
}
