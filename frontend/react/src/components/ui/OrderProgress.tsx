import { useEffect, useId, useState } from "react";
import { Check, ChevronDown, Clock3 } from "lucide-react";
import type { AdminOrder } from "../../types/order";
import { displayOrderTime, orderStatusLabels } from "../../lib/order-demo";
export { orderStatusLabels } from "../../lib/order-demo";

export function OrderProgress({
  order,
  surface = "card",
}: {
  order: AdminOrder;
  surface?: "card" | "detail";
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const key = `clucky-admin-progress:${surface}:${order.id}`;
  useEffect(() => {
    try {
      setExpanded(localStorage.getItem(key) === "expanded");
    } catch {
      setExpanded(false);
    }
  }, [key]);
  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(key, next ? "expanded" : "collapsed");
    } catch {
      /* Keep the toggle usable without persistence. */
    }
  };
  const current = {
    PENDING_PAYMENT: 0,
    CONFIRMED: 1,
    PREPARING: 2,
    READY: 3,
    SHIPPING: 3,
    COMPLETED: 4,
    CANCELLED: -1,
  }[order.status];
  return (
    <section
      className="m3-admin-disclosure"
      data-expanded={expanded}
      data-status={order.status}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={toggle}
        className="m3-admin-progress-toggle"
      >
        <Clock3 size={15} />
        <span>
          <strong>Tiến trình đơn</strong>
          <small>{displayOrderTime(order.updatedAt ?? order.createdAt)}</small>
        </span>
        <b>{orderStatusLabels[order.status]}</b>
        <ChevronDown size={16} />
        <span className="sr-only">
          {expanded ? "Thu gọn" : "Mở rộng"} tiến trình {order.orderCode}
        </span>
      </button>
      <div
        className="m3-admin-progress-body"
        id={id}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div>
          {order.status === "CANCELLED" ? (
            <p className="order-stopped">Đơn đã hủy. Tiến trình đã dừng.</p>
          ) : (
            <ol className="m3-admin-progress-rail">
              {[
                "Thanh toán",
                "Xác nhận",
                "Chế biến",
                order.orderType === "PICKUP" ? "Chờ nhận" : "Sẵn sàng",
                "Hoàn tất",
              ].map((label, index) => (
                <li
                  key={label}
                  data-state={
                    index < current
                      ? "done"
                      : index === current
                        ? "current"
                        : "next"
                  }
                  aria-current={index === current ? "step" : undefined}
                >
                  <span>
                    {index < current ? <Check size={13} /> : index + 1}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          )}
          <ol className="m3-admin-history" aria-label="Lịch sử cập nhật">
            {order.timeline?.map((event, index) => (
              <li key={`${index}-${event.time}`}>
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.description}</p>
                  {event.actor && (
                    <small>
                      Vai trò:{" "}
                      {{
                        STAFF: "Nhân viên",
                        STORE_MANAGER: "Quản lý chi nhánh",
                        ADMIN: "Quản trị viên",
                      }[event.actor] ?? event.actor}
                    </small>
                  )}
                </div>
                <time>{displayOrderTime(event.time)}</time>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
