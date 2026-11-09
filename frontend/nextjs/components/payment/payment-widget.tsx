"use client";
import { notify, useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import { useEffect, useState } from "react";
import { CircleAlert, Clock, Copy, QrCode, RefreshCw } from "lucide-react";
import { buildVietQrUrl, transferReference, type BankInfo } from "@/lib/vietqr";
import { PaymentStatusBadge, type PaymentStatus } from "./payment-status-badge";
import styles from "./payment-shared.module.css";

export type { BankInfo } from "@/lib/vietqr";

export interface PaymentWidgetProps {
  orderCode: string;
  amount: number;
  /** ISO string or timestamp in milliseconds supplied by the payment service. */
  expiresAt?: string | number | Date;
  qrUrl?: string;
  bankInfo?: BankInfo;
  status?: PaymentStatus;
  demo?: boolean;
  storeName?: string;
  embedded?: boolean;
  className?: string;
}

function formatRemaining(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PaymentWidget({
  orderCode,
  amount,
  expiresAt,
  qrUrl,
  bankInfo,
  status = "PENDING",
  demo = false,
  storeName,
  embedded = false,
  className = "",
}: PaymentWidgetProps) {
  const t = useTranslations();

  const { money: formatPrice } = useLocaleTools();
  const expiresMs =
    expiresAt == null
      ? null
      : expiresAt instanceof Date
        ? expiresAt.getTime()
        : new Date(expiresAt).getTime();
  // Start with identical server/client markup; check expiry before exposing a QR.
  const [clock, setClock] = useState<{ expiresMs: number; now: number } | null>(
    null,
  );
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  useFeedback(failedSrc && t("business.paymentwidget.unableToLoadTheQrCode"));
  useEffect(() => {
    if (
      expiresMs == null ||
      !Number.isFinite(expiresMs) ||
      status !== "PENDING"
    )
      return;
    const update = () => {
      const now = Date.now();
      setClock({ expiresMs, now });
      if (now >= expiresMs) clearInterval(timer);
    };
    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [expiresMs, status]);

  const invalidExpiry = expiresMs != null && !Number.isFinite(expiresMs);
  const checkingExpiry =
    expiresMs != null && !invalidExpiry && clock?.expiresMs !== expiresMs;
  const remaining =
    expiresMs != null && !invalidExpiry && clock?.expiresMs === expiresMs
      ? expiresMs - clock.now
      : null;
  const expired =
    status === "EXPIRED" ||
    (status === "PENDING" && remaining != null && remaining <= 0);
  const validAmount = Number.isSafeInteger(amount) && amount > 0;
  // Validate the transfer details even when the caller supplies its own QR image.
  const generatedUrl = bankInfo
    ? buildVietQrUrl({
        bank: bankInfo,
        amount,
        description: orderCode,
        storeName,
      })
    : null;
  const imageUrl = generatedUrl ? qrUrl?.trim() || generatedUrl : null;
  const unavailable = invalidExpiry || !imageUrl;
  const canTransfer =
    status === "PENDING" && !expired && !unavailable && !checkingExpiry;
  const reference = transferReference(orderCode);
  const shownStatus = expired ? "EXPIRED" : status;

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify.success(t("business.paymentwidget.copied", { value1: label }));
    } catch {
      notify.error(
        t("business.paymentwidget.unableToCopyAutomaticallySelectAndCopyTheDetailsBelow"),
      );
    }
  }

  return (
    <div
      className={`${styles.paymentWidget} ${styles.paymentScope} ${embedded ? styles.embedded : ""} ${className}`}
    >
      {!embedded && (
        <div className={styles.widgetHeading}>
          <span className={styles.cardIcon}>
            <QrCode size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>{t("business.id.payForOrder")}</span>
            <h3 className={styles.qrTitle}>{t("business.paymentwidget.vietqrBankTransfer")}</h3>
          </div>
          <PaymentStatusBadge status={shownStatus} />
        </div>
      )}

      <div className={styles.amountSummary}>
        <span>
          {status === "PENDING" && !expired
            ? t("business.id.amountDue")
            : t("business.paymentwidget.transactionAmount")}
        </span>
        <strong>
          {validAmount ? formatPrice(amount) : t("business.paymentwidget.noValidAmountAvailable")}
        </strong>
        <span> {t("business.paymentwidget.order")} <b>{orderCode || t("business.paymentwidget.noOrderCodeAvailable")}</b>
        </span>
      </div>

      {demo && (
        <p className={styles.demoNotice}> {t("business.paymentwidget.thisQrUsesASampleAccountForUiPreviewDoNotSend")} </p>
      )}

      {expired ? (
        <div className={styles.qrNotice} role="status">
          <Clock size={28} aria-hidden="true" />
          <strong>{t("business.paymentwidget.qrCodeExpired")}</strong>
          <p> {t("business.paymentwidget.doNotTransferUsingAnExpiredCodeCheckTheOrderStatusBefore")} </p>
        </div>
      ) : status !== "PENDING" ? (
        <div className={styles.qrNotice}>
          <PaymentStatusBadge status={status} />
          <p> {t("business.paymentwidget.theQrCodeIsUnavailableInThisStateCheckTheOrderPayment")} </p>
        </div>
      ) : unavailable ? (
        <div className={styles.qrNotice} role="status">
          <CircleAlert size={28} aria-hidden="true" />
          <strong>{t("business.paymentwidget.noPaymentDetailsAvailable")}</strong>
          <p> {t("business.paymentwidget.theTransferDetailsAreIncompleteOrInvalidPleaseTryAgainLater")} </p>
        </div>
      ) : checkingExpiry ? (
        <div className={styles.qrNotice} role="status"> {t("business.paymentwidget.checkingPaymentExpiry")} </div>
      ) : failedSrc === imageUrl ? (
        <div className={styles.qrNotice} role="alert">
          <CircleAlert size={28} aria-hidden="true" />
          <strong>{t("business.paymentwidget.unableToLoadTheQrCode")}</strong>
          <p>{t("business.paymentwidget.checkYourConnectionAndReloadThePaymentCode")}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => {
              setLoadedSrc(null);
              setFailedSrc(null);
            }}
          >
            <RefreshCw size={16} aria-hidden="true" /> {t("business.paymentwidget.tryAgain")} </button>
        </div>
      ) : (
        imageUrl && (
          <div
            className={styles.qrImageWrapper}
            aria-busy={loadedSrc !== imageUrl}
          >
            {loadedSrc !== imageUrl && (
              <span className={styles.qrLoading} role="status"> {t("business.paymentwidget.loadingQr")} </span>
            )}
            <img
              key={imageUrl}
              src={imageUrl}
              alt={t("business.paymentwidget.vietqrPaymentForOrder", { value1: orderCode })}
              className={`${styles.qrImage} ${loadedSrc !== imageUrl ? styles.qrImageLoading : ""}`}
              width={240}
              height={240}
              onLoad={() => setLoadedSrc(imageUrl)}
              onError={() => setFailedSrc(imageUrl)}
            />
          </div>
        )
      )}

      {canTransfer && remaining != null && (
        <p className={styles.qrTimer}>
          <Clock size={15} aria-hidden="true" /> {t("business.paymentwidget.expiresIn")}{" "}
          {formatRemaining(remaining)}
        </p>
      )}

      {canTransfer && bankInfo && (
        <>
          <dl className={styles.bankDetails}>
            <div className={styles.bankRow}>
              <dt>{t("business.paymentwidget.bank")}</dt>
              <dd>{bankInfo.bankName || bankInfo.bankCode}</dd>
            </div>
            <div className={styles.bankRow}>
              <dt>{t("business.paymentwidget.accountNumber")}</dt>
              <dd>
                {bankInfo.accountNo.trim()}
                <button
                  type="button"
                  className={styles.copyButton}
                  aria-label={t("business.paymentwidget.copyAccountNumber")}
                  onClick={() =>
                    copyValue(bankInfo.accountNo.trim(), t("business.paymentwidget.accountNumberLabel"))
                  }
                >
                  <Copy size={15} aria-hidden="true" />
                </button>
              </dd>
            </div>
            <div className={styles.bankRow}>
              <dt>{t("business.paymentwidget.accountHolder")}</dt>
              <dd>{bankInfo.accountName}</dd>
            </div>
            <div className={styles.bankRow}>
              <dt>{t("business.paymentwidget.description")}</dt>
              <dd className={styles.bankAmount}>
                {reference}
                <button
                  type="button"
                  className={styles.copyButton}
                  aria-label={t("business.paymentwidget.copyTransferReference")}
                  onClick={() => copyValue(reference, t("business.paymentwidget.transferReference"))}
                >
                  <Copy size={15} aria-hidden="true" />
                </button>
              </dd>
            </div>
          </dl>
          <p className={styles.paymentNote}> {t("business.paymentwidget.scanWithAVietqrCompatibleBankingAppKeepTheAmountAndTransfer")} </p>
        </>
      )}
    </div>
  );
}
