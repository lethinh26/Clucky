import { useTranslation } from "react-i18next";
import { useLocaleTools } from "../../i18n/hooks";
import { useEffect, useId, useState } from "react";
import { Check, ChevronDown, Clock3 } from "lucide-react";
import type { AdminOrder } from "../../types/order";
import { displayOrderTime, orderStatusKeys } from "../../lib/order-demo";
export { orderStatusKeys } from "../../lib/order-demo";

export function OrderProgress({
  order,
  surface = "card",
}: {
  order: AdminOrder;
  surface?: "card" | "detail";
}) {
  const { t } = useTranslation();

  const { locale } = useLocaleTools();
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
  const isCounter = order.orderType === "PICKUP";
  const isOnlinePaid = !isCounter && ["PAID", "COLLECTED"].includes(order.paymentStatus);

  type StepItem = { key: string; label: string; state: "done" | "current" | "next" };

  const buildSteps = (): StepItem[] => {
    if (isCounter) {
      const isPaid = ["PAID", "COLLECTED"].includes(order.paymentStatus);
      const preparing = ["PREPARING", "READY", "COMPLETED"].includes(order.status);
      const ready = ["READY", "COMPLETED"].includes(order.status);
      return [
        { key: "CART", label: t("business:pickupFlow.choose"), state: "done" },
        {
          key: "CONFIRMED",
          label: t("business:orderprogress.confirm"),
          state: preparing ? "done" : "current",
        },
        {
          key: "PREPARING",
          label: t("business:orderprogress.preparing"),
          state: ready ? "done" : preparing ? "current" : "next",
        },
        {
          key: "READY",
          label: t("business:pickupFlow.ready"),
          state: order.status === "COMPLETED" || (ready && isPaid) ? "done" : order.status === "READY" ? "current" : "next",
        },
        {
          key: "PAID",
          label: t("business:cart.checkout"),
          state: isPaid ? "done" : "next",
        },
        {
          key: "COMPLETED",
          label: t("business:pickupFlow.completed"),
          state: order.status === "COMPLETED" ? "done" : ready && isPaid ? "current" : "next",
        },
      ];
    }

    if (isOnlinePaid) {
      // Đặt online đã thanh toán: Bỏ qua xác nhận -> Vào thẳng Chế biến -> Chờ nhận/Giao -> Hoàn tất
      return [
        {
          key: "PREPARING",
          label: t("business:orderprogress.preparing"),
          state: ["READY", "SHIPPING", "COMPLETED"].includes(order.status) ? "done" : "current",
        },
        {
          key: "READY",
          label: order.orderType === "DELIVERY" ? t("business:orderspage.delivery") : t("business:orderprogress.ready"),
          state: order.status === "COMPLETED" ? "done" : ["READY", "SHIPPING"].includes(order.status) ? "current" : "next",
        },
        {
          key: "COMPLETED",
          label: t("business:orderprogress.complete"),
          state: order.status === "COMPLETED" ? "done" : "next",
        },
      ];
    }

    // Đặt online tiền mặt (COD): Xác nhận -> Chế biến -> Chờ nhận/Giao -> Thanh toán COD -> Hoàn tất
    const isCollected = ["PAID", "COLLECTED"].includes(order.paymentStatus);
    return [
      {
        key: "CONFIRMED",
        label: t("business:orderprogress.confirm"),
        state: ["PREPARING", "READY", "SHIPPING", "COMPLETED"].includes(order.status) ? "done" : "current",
      },
      {
        key: "PREPARING",
        label: t("business:orderprogress.preparing"),
        state: ["READY", "SHIPPING", "COMPLETED"].includes(order.status) ? "done" : order.status === "PREPARING" ? "current" : "next",
      },
      {
        key: "READY",
        label: order.orderType === "DELIVERY" ? t("business:orderspage.delivery") : t("business:orderprogress.ready"),
        state: order.status === "COMPLETED" || isCollected ? "done" : ["READY", "SHIPPING"].includes(order.status) ? "current" : "next",
      },
      {
        key: "PAID",
        label: t("business:cart.checkout"),
        state: isCollected ? "done" : ["READY", "SHIPPING"].includes(order.status) ? "current" : "next",
      },
      {
        key: "COMPLETED",
        label: t("business:orderprogress.complete"),
        state: order.status === "COMPLETED" ? "done" : "next",
      },
    ];
  };

  const currentSteps = buildSteps();
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
          <strong>{t("business:demoordercontrols.orderProgress")}</strong>
          <small>{displayOrderTime(order.updatedAt ?? order.createdAt, locale)}</small>
        </span>
        <b>{t(orderStatusKeys[order.status])}</b>
        <ChevronDown size={16} />
        <span className="sr-only">
          {expanded ? t("business:orderprogress.collapse") : t("business:orderprogress.expand")} {t("business:orderprogress.progress")} {order.orderCode}
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
            <p className="order-stopped">{t("business:orderprogress.orderCancelledProgressHasStopped")}</p>
          ) : (
            <ol className="m3-admin-progress-rail">
              {currentSteps.map((step, index) => (
                <li
                  key={step.key}
                  data-state={step.state}
                  aria-current={step.state === "current" ? "step" : undefined}
                >
                  <span>
                    {step.state === "done" ? <Check size={13} /> : index + 1}
                  </span>
                  {step.label}
                </li>
              ))}
            </ol>
          )}
          <ol className="m3-admin-history" aria-label={t("business:orderprogress.updateHistory")}>
            {order.timeline?.map((event, index) => (
              <li key={`${index}-${event.time}`}>
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.description}</p>
                  {event.actor && (
                    <small> {t("business:orderprogress.role")}{" "}
                      {{
                        STAFF: t("business:orderprogress.staff"),
                        STORE_MANAGER: t("business:reviews.storeManager"),
                        ADMIN: t("business:orderprogress.administrator"),
                      }[event.actor] ?? event.actor}
                    </small>
                  )}
                </div>
                <time>{displayOrderTime(event.time, locale)}</time>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
