"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";

import { useEffect, useId, useState } from "react";
import Link from "@/components/ui-loader/navigation-link";
import {
  Check,
  ShoppingBag,
  CreditCard,
  ClipboardCheck,
  ChefHat,
  PackageCheck,
  Truck,
  Flag,
  ChevronDown,
  Clock3,
} from "lucide-react";
import type { Order, OrderStatus, OrderType, PaymentStatus } from "@/lib/types/order";
import { displayOrderTime, orderHistoryDescription, orderStatusKey } from "@/lib/order-demo";
import styles from "./order-experience.module.css";



export function OrderProgress({
  stage,
  status = "CONFIRMED",
  type = "DELIVERY",
  paymentStatus,
  compact = false,
  orderCode,
  updatedAt,
  history = [],
}: {
  stage?: "cart" | "checkout";
  status?: OrderStatus;
  type?: OrderType;
  paymentStatus?: PaymentStatus;
  compact?: boolean;
  orderCode?: string;
  updatedAt?: string;
  history?: Order["timeline"];
}) {
  const t = useTranslations();

  const steps = [
    { status: "CART", label: t("business.orderprogress.chooseDishes"), icon: ShoppingBag },
    ...(type === "PICKUP"
      ? [
          { status: "CONFIRMED", label: t("business.orderprogress.confirm"), icon: ClipboardCheck },
          { status: "PENDING_PAYMENT", label: t("business.cart.checkout"), icon: CreditCard },
        ]
      : [
          { status: "PENDING_PAYMENT", label: t("business.cart.checkout"), icon: CreditCard },
          { status: "CONFIRMED", label: t("business.orderprogress.confirm"), icon: ClipboardCheck },
        ]),
    { status: "PREPARING", label: t("business.orderprogress.preparing"), icon: ChefHat },
    { status: "READY", label: t(orderStatusKey("READY", type)), icon: PackageCheck },
    ...(type === "DELIVERY" ? [{ status: "SHIPPING", label: t(orderStatusKey("SHIPPING", type)), icon: Truck }] : []),
    { status: "COMPLETED", label: t(orderStatusKey("COMPLETED", type)), icon: Flag },
  ];

  const { locale } = useLocaleTools();
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
  const current = type === "PICKUP" && ["PENDING_PAYMENT", "CONFIRMED"].includes(status)
    ? paymentStatus === "PAID" || paymentStatus === "COLLECTED" ? 3 : 2
    : steps.findIndex(step => step.status === status);
  if (stage)
    return (
      <nav className={styles.checkoutSteps} aria-label={t("business.orderprogress.orderingSteps")}>
        <Link href="/cart" aria-current={stage === "cart" ? "step" : undefined}>
          <ShoppingBag size={16} />
          <span>{t("business.orderprogress.cart")}</span>
        </Link>
        <span className={styles.flowConnector} />
        <span aria-current={stage === "checkout" ? "step" : undefined}>
          <CreditCard size={16} /> {t("business.cart.checkout")} </span>
        <span className={styles.flowConnector} />
        <span>
          <ClipboardCheck size={16} /> {t("business.orderprogress.confirm")} </span>
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
          <strong>{compact ? t("business.demoordercontrols.orderProgress") : orderCode ?? t("business.demoordercontrols.orderProgress")}</strong>
          <small>{displayOrderTime(updatedAt ?? history.at(-1)?.time, locale)}</small>
        </span>
        <span className={styles.progressState} data-status={status}>
          {t(orderStatusKey(status, type))}
        </span>
        <ChevronDown size={17} className={styles.disclosureChevron} />
        <span className="sr-only">
          {expanded ? t("business.orderprogress.collapseProgress") : t("business.orderprogress.expandProgress")}
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
            <p className={styles.stopped}>{t("business.orderprogress.orderCancelledProgressHasStopped")}</p>
          ) : (
            <ol
              className={styles.progressRail}
              data-complete={status === "COMPLETED"}
              aria-label={t(type === "PICKUP" ? "business.orderprogress.pickupProgress" : "business.orderprogress.deliveryProgress")}
            >
              {steps.map((step, index) => {
                const Icon =
                  status === "COMPLETED" || index < current ? Check : step.icon;
                return (
                  <li
                    key={step.status}
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
                    <span>{step.label}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {history.length > 0 && (
            <ol className={styles.eventHistory} aria-label={t("business.orderprogress.updateHistory")}>
              {history.map((event, index) => {
                const description = orderHistoryDescription(event, type, locale);
                return (
                <li key={`${index}-${event.time}`} data-current={event.current}>
                  <span className={styles.eventDot} />
                  <div>
                    <strong>{t(orderStatusKey(event.status, type))}</strong>
                    {description && <p>{description}</p>}
                  </div>
                  <time>{displayOrderTime(event.time, locale)}</time>
                </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
