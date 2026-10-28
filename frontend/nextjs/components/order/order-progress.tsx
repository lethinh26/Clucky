"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  Check,
  ShoppingBag,
  CreditCard,
  ClipboardCheck,
  ChefHat,
  PackageCheck,
  Flag,
  ChevronDown,
  Clock3,
} from "lucide-react";
import type { Order, OrderStatus, OrderType } from "@/lib/types/order";
import { displayOrderTime, orderStatusLabels } from "@/lib/order-demo";
import styles from "./order-experience.module.css";

const steps = [
  { label: "Chọn món", icon: ShoppingBag },
  { label: "Thanh toán", icon: CreditCard },
  { label: "Xác nhận", icon: ClipboardCheck },
  { label: "Chế biến", icon: ChefHat },
  { label: "Sẵn sàng", icon: PackageCheck },
  { label: "Hoàn tất", icon: Flag },
];

export function OrderProgress({
  stage,
  status = "CONFIRMED",
  type = "DELIVERY",
  compact = false,
  orderCode,
  updatedAt,
  history = [],
}: {
  stage?: "cart" | "checkout";
  status?: OrderStatus;
  type?: OrderType;
  compact?: boolean;
  orderCode?: string;
  updatedAt?: string;
  history?: Order["timeline"];
}) {
  const [expanded, setExpanded] = useState(false);
  const regionId = useId();
  const preferenceKey = `clucky-progress:${compact ? "card" : "detail"}:${orderCode ?? stage ?? "order"}`;
  useEffect(() => {
    try {
      setExpanded(localStorage.getItem(preferenceKey) === "expanded");
    } catch {
      setExpanded(false);
    }
  }, [preferenceKey]);
  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(preferenceKey, next ? "expanded" : "collapsed");
    } catch {
      /* Storage is optional for the disclosure. */
    }
  };
  const current = {
    PENDING_PAYMENT: 1,
    CONFIRMED: 2,
    PREPARING: 3,
    READY: 4,
    SHIPPING: 4,
    COMPLETED: 5,
    CANCELLED: -1,
  }[status];
  if (stage)
    return (
      <nav className={styles.checkoutSteps} aria-label="Các bước đặt hàng">
        <Link href="/cart" aria-current={stage === "cart" ? "step" : undefined}>
          <ShoppingBag size={16} />
          <span>Giỏ hàng</span>
        </Link>
        <span className={styles.flowConnector} />
        <span aria-current={stage === "checkout" ? "step" : undefined}>
          <CreditCard size={16} />
          Thanh toán
        </span>
        <span className={styles.flowConnector} />
        <span>
          <ClipboardCheck size={16} />
          Xác nhận
        </span>
      </nav>
    );
  return (
    <section
      className={`${styles.progressDisclosure} ${compact ? styles.progressCompact : ""}`}
      data-expanded={expanded}
    >
      <button
        type="button"
        className={styles.progressToggle}
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={toggle}
      >
        <span className={styles.progressMark}>
          <Clock3 size={17} />
        </span>
        <span className={styles.progressCopy}>
          <strong>{orderCode ?? "Tiến trình đơn hàng"}</strong>
          <small>{displayOrderTime(updatedAt ?? history.at(-1)?.time)}</small>
        </span>
        <span className={styles.progressState} data-status={status}>
          {orderStatusLabels[status]}
        </span>
        <ChevronDown size={17} className={styles.disclosureChevron} />
        <span className="sr-only">
          {expanded ? "Thu gọn tiến trình" : "Mở rộng tiến trình"}
        </span>
      </button>
      <div
        id={regionId}
        className={styles.disclosureBody}
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className={styles.disclosureInner}>
          {status === "CANCELLED" ? (
            <p className={styles.stopped}>Đơn đã hủy. Tiến trình đã dừng.</p>
          ) : (
            <ol
              className={styles.progressRail}
              data-complete={status === "COMPLETED"}
            >
              {steps.map((step, index) => {
                const Icon =
                  status === "COMPLETED" || index < current ? Check : step.icon;
                return (
                  <li
                    key={step.label}
                    data-state={
                      index < current
                        ? "done"
                        : index === current
                          ? "current"
                          : "next"
                    }
                    aria-current={index === current ? "step" : undefined}
                  >
                    <span className={styles.stepIcon}>
                      <Icon size={16} />
                    </span>
                    <span>
                      {index === 4
                        ? status === "SHIPPING"
                          ? "Đang giao"
                          : type === "PICKUP"
                            ? "Chờ nhận"
                            : "Sẵn sàng"
                        : step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {history.length > 0 && (
            <ol className={styles.eventHistory} aria-label="Lịch sử cập nhật">
              {history.map((event, index) => (
                <li key={`${index}-${event.time}`} data-current={event.current}>
                  <span className={styles.eventDot} />
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.description}</p>
                  </div>
                  <time>{displayOrderTime(event.time)}</time>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
