"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Clock3, CircleAlert } from "lucide-react";
import { useSession } from "@/components/auth/use-session";
import { getErrorMessage, request, type ApiError } from "@/lib/api";
import { PaymentWidget, type BankInfo } from "./payment-widget";
import styles from "./payment-shared.module.css";

interface Payment {
  orderId: number;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "COLLECTED";
  expiresAt: string | null;
  reference: string | null;
  bankInfo: BankInfo | null;
  amount: string;
  receivedAmount: string;
  missingAmount: string;
  excessAmount: string;
  confirmationPending: boolean;
  canTransfer: boolean;
  closedReason: string | null;
}

export function LiveOrderPayment({ orderId, pending, available, storeName }: {
  orderId: string; pending: boolean; available: boolean; storeName: string;
}) {
  const t = useTranslations("payments");
  const locale = useLocale();
  const session = useSession();
  const [result, setResult] = useState<{ payment: Payment; revision: number } | null>(null);
  const [error, setError] = useState("");
  const [simulationError, setSimulationError] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    setResult(null);
    setError("");
    if (!available || !session.user?.userId || !/^\d+$/.test(orderId)) return () => controller.abort();
    async function poll() {
      let delay = 5000;
      try {
        let payment: Payment;
        try {
          payment = await request<Payment>(`/api/payments/${orderId}`, { signal: controller.signal });
        } catch (failure) {
          if (!pending || (failure as ApiError)?.status !== 404) throw failure;
          payment = await request<Payment>(`/api/payments/${orderId}/bank-transfer`, { method: "POST", signal: controller.signal });
        }
        if (controller.signal.aborted) return;
        if (String(payment.orderId) !== orderId || ![payment.amount, payment.receivedAmount, payment.missingAmount, payment.excessAmount].every(value => /^\d+$/.test(value))) {
          throw { code: "UPSTREAM_ERROR" };
        }
        setResult({ payment, revision: session.revision });
        setError("");
        failures = 0;
        if (payment.status !== "PENDING") delay = 15000;
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError((failure as ApiError)?.status === 404 ? t("noSession") : getErrorMessage(failure));
        delay = Math.min(30000, 5000 * 2 ** ++failures);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, delay);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [orderId, pending, available, refresh, session.revision, session.user?.userId, t]);

  const payment = result?.revision === session.revision ? result.payment : null;
  const money = (value: string) => new Intl.NumberFormat(locale, { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(BigInt(value));
  const missing = payment ? Number(payment.missingAmount) : 0;
  const transferable = payment && !error && pending && available && payment.canTransfer && payment.bankInfo && payment.reference && payment.expiresAt && Number.isSafeInteger(missing) && missing > 0;
  const status = payment?.closedReason === "LEGACY_REVIEW" ? "LEGACY_REVIEW" : payment?.closedReason === "CANCELLED" ? "CANCELLED" : payment?.status;
  const hasExcess = payment && BigInt(payment.excessAmount) > BigInt(0);
  const hasReceived = payment && BigInt(payment.receivedAmount) > BigInt(0);
  const needsReview = hasExcess || hasReceived && (status === "EXPIRED" || status === "CANCELLED");
  const canSimulate = process.env.NEXT_PUBLIC_PAYMENT_SIMULATION_ENABLED === "true"
    && transferable && !hasReceived && !payment?.confirmationPending && !simulating;

  const simulate = async () => {
    setSimulating(true);
    setSimulationError("");
    try {
      const confirmed = await request<Payment>(`/api/payments/${orderId}/simulate-bank-transfer`, { method: "POST" });
      setResult({ payment: confirmed, revision: session.revision });
    } catch (failure) {
      setSimulationError(getErrorMessage(failure));
    } finally {
      setSimulating(false);
    }
  };

  return <section className={`${styles.paymentScope} ${styles.livePayment}`} aria-label={t("title")}>
    {error ? <div role="alert" className={styles.paymentError}><p>{error}</p><p>{t("noTransferOnError")}</p>
      <button type="button" className={styles.retryButton} onClick={() => setRefresh(value => value + 1)}>{t("retry")}</button></div>
      : !payment && <p role="status" className={styles.paymentHint}>{available ? t("loading") : t("waitingOrder")}</p>}
    {payment && <>
      {!error && !transferable && <div className={styles.paymentResult} data-state={status} role="status">
        <span className={styles.resultIcon} aria-hidden="true">
          {status === "PAID" || status === "COLLECTED" ? <CheckCircle2 size={28} /> : status === "PENDING" ? <Clock3 size={28} /> : <CircleAlert size={28} />}
        </span>
        <span>{t(status === "PAID" ? "paidAmount" : "total")}</span>
        <strong>{money(payment.amount)}</strong>
        <p>{payment.confirmationPending ? t("confirming") : t(`statuses.${status}`)}</p>
      </div>}
      {transferable && hasReceived && <p className={styles.paymentHint} role="status">{t("partialReceived", { received: money(payment.receivedAmount), total: money(payment.amount) })}</p>}
      {transferable && payment.reference && payment.expiresAt && payment.bankInfo && <PaymentWidget orderCode={payment.reference} amount={missing} expiresAt={payment.expiresAt}
        bankInfo={payment.bankInfo} status="PENDING" storeName={storeName} embedded />}
      {canSimulate && <div className={styles.paymentHint}>
        <p>{t("localSimulationNotice")}</p>
        <button type="button" className={styles.retryButton} onClick={() => void simulate()}>{t("simulateSuccess")}</button>
      </div>}
      {simulating && <p role="status" className={styles.paymentHint}>{t("simulating")}</p>}
      {simulationError && <p role="alert" className={styles.paymentError}>{simulationError}</p>}
      {needsReview && <div className={styles.paymentReview} role="status">
        {hasExcess && <strong>{t("excess")}: {money(payment.excessAmount)}</strong>}
        <p>{t("refundUnavailable")}</p>
      </div>}
      {(hasReceived || !transferable) && <details className={styles.paymentDisclosure}>
        <summary>{t("paymentDetails")}</summary>
        <dl className={styles.bankDetails}>
          {([ ["total", payment.amount], ["received", payment.receivedAmount], ["missing", payment.missingAmount], ["excess", payment.excessAmount] ] as const)
            .filter(([label, value]) => label === "total" || (label !== "missing" || status !== "COLLECTED") && BigInt(value) > BigInt(0))
            .map(([label, value]) => <div key={label} className={styles.bankRow}><dt>{t(label)}</dt><dd>{money(value)}</dd></div>)}
        </dl>
      </details>}
    </>}
  </section>;
}
