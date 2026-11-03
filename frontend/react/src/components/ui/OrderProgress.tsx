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
              {[
                t("business:cart.checkout"),
                t("business:orderprogress.confirm"),
                t("business:orderprogress.preparing"),
                order.orderType === "PICKUP" ? t("business:orderprogress.awaitingCollection") : t("business:orderprogress.ready"),
                t("business:orderprogress.complete"),
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
