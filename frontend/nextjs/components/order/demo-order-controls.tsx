"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleX,
  FlaskConical,
  Wallet,
  ChefHat,
} from "lucide-react";
import type { Order } from "@/lib/types/order";
import {
  nextDemoStatus,
  orderStatusKeys,
  type DemoAction,
} from "@/lib/order-demo";
import { useOrder } from "./order-provider";
import styles from "./order-experience.module.css";

export function DemoOrderControls({ order }: { order: Order }) {
  const t = useTranslations();

  const { money: formatPrice } = useLocaleTools();
  const { demoEnabled, runDemoAction } = useOrder();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string }>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  if (!demoEnabled) return null;
  const act = (action: DemoAction) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFeedback(runDemoAction(order.id, action));
    queueMicrotask(() => {
      lock.current = false;
      setBusy(false);
    });
  };
  const pending =
    order.status === "PENDING_PAYMENT" && order.paymentStatus === "PENDING";
  const terminal = ["CANCELLED", "COMPLETED"].includes(order.status);
  const next = nextDemoStatus(order.status);
  return (
    <section
      className={styles.demoControls}
      aria-label={t("business.demoordercontrols.orderProgressControls")}
    >
      <div className={styles.demoHeading}>
        <FlaskConical size={18} />
        <div>
          <strong>
            {pending
              ? t("business.id.payForOrder")
              : terminal
                ? t("business.demoordercontrols.orderStatus")
                : t("business.demoordercontrols.orderProgress")}
          </strong>
          <p> {t("business.demoordercontrols.browserSimulationOnlyThisDoesNotConfirmRealPaymentsOrDeliveries")} </p>
        </div>
      </div>
      {order.paymentStatus === "PAID" && (
        <div className={styles.paymentSuccess} role="status">
          <CheckCircle2 size={22} />
          <div>
            <strong>{t("business.demoordercontrols.paid")}</strong>
            <span>
              {order.orderCode} · {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      )}
      {order.paymentStatus === "FAILED" && (
        <p role="status" className={styles.actionError}>
          <CircleX size={18} /> {t("business.demoordercontrols.paymentFailedTheOrderWasCancelledYouCanReorderTheItems")} </p>
      )}
      <div className={styles.demoButtons}>
        {pending && (
          <>
            <button
              type="button"
              className={styles.primaryAction}
              disabled={busy}
              onClick={() => act("PAY_SUCCESS")}
            >
              <CheckCircle2 size={17} /> {t("business.demoordercontrols.confirmSuccessfulPayment")} </button>
            <button
              type="button"
              className={styles.secondaryAction}
              disabled={busy}
              onClick={() => act("PAY_FAILED")}
            >
              <CircleX size={17} /> {t("business.demoordercontrols.reportFailedPayment")} </button>
          </>
        )}
        {!terminal &&
          order.paymentMethod === "COD" &&
          order.paymentStatus === "PENDING" && (
            <button
              type="button"
              className={styles.secondaryAction}
              disabled={busy}
              onClick={() => act("COLLECT_COD")}
            >
              <Wallet size={17} /> {t("business.demoordercontrols.confirmCodCollected")} </button>
          )}
        {!terminal && next && (
          <button
            type="button"
            className={styles.primaryAction}
            disabled={
              busy || (next === "COMPLETED" && order.paymentStatus !== "PAID")
            }
            onClick={() => act("ADVANCE")}
          >
            <ChefHat size={17} /> {t("business.demoordercontrols.nextStep")} {t(orderStatusKeys[next])}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
      {next === "COMPLETED" && order.paymentStatus !== "PAID" && (
        <small>{t("business.demoordercontrols.confirmCashCollectionBeforeCompletingTheOrder")}</small>
      )}
      {feedback && order.paymentStatus !== "FAILED" && (
        <p
          role="status"
          className={feedback.ok ? styles.actionSuccess : styles.actionError}
        >
          {feedback.message}
        </p>
      )}
      {order.status === "COMPLETED" && (
        <p className={styles.completionNote}>
          <CheckCircle2 size={20} /> {t("business.demoordercontrols.yourOrderIsCompleteThankYouForChoosingClucky")} </p>
      )}
    </section>
  );
}
