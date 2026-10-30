"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Clock, Copy, QrCode, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/products";
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
  const [copyFeedback, setCopyFeedback] = useState("");
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
      setCopyFeedback(`Đã sao chép ${label}.`);
    } catch {
      setCopyFeedback(
        "Không thể sao chép tự động. Bạn có thể chọn và sao chép thông tin bên dưới.",
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
            <span className={styles.eyebrow}>Thanh toán đơn hàng</span>
            <h3 className={styles.qrTitle}>Chuyển khoản VietQR</h3>
          </div>
          <PaymentStatusBadge status={shownStatus} />
        </div>
      )}

      <div className={styles.amountSummary}>
        <span>
          {status === "PENDING" && !expired
            ? "Số tiền cần thanh toán"
            : "Giá trị giao dịch"}
        </span>
        <strong>
          {validAmount ? formatPrice(amount) : "Chưa có số tiền hợp lệ"}
        </strong>
        <span>
          Đơn hàng <b>{orderCode || "Chưa có mã đơn"}</b>
        </span>
      </div>

      {demo && (
        <p className={styles.demoNotice}>
          QR dùng tài khoản mẫu để xem giao diện. Không chuyển tiền.
        </p>
      )}

      {expired ? (
        <div className={styles.qrNotice} role="status">
          <Clock size={28} aria-hidden="true" />
          <strong>Mã QR đã hết hạn</strong>
          <p>
            Không chuyển khoản bằng mã đã hết hạn. Kiểm tra trạng thái đơn trước
            khi thanh toán lại.
          </p>
        </div>
      ) : status !== "PENDING" ? (
        <div className={styles.qrNotice}>
          <PaymentStatusBadge status={status} />
          <p>
            Mã QR không khả dụng ở trạng thái này. Kiểm tra thông tin thanh toán
            của đơn hàng trước khi chuyển tiền.
          </p>
        </div>
      ) : unavailable ? (
        <div className={styles.qrNotice} role="status">
          <CircleAlert size={28} aria-hidden="true" />
          <strong>Chưa có thông tin thanh toán.</strong>
          <p>
            Thông tin chuyển khoản chưa đầy đủ hoặc không hợp lệ. Vui lòng thử
            lại sau.
          </p>
        </div>
      ) : checkingExpiry ? (
        <div className={styles.qrNotice} role="status">
          Đang kiểm tra thời hạn thanh toán…
        </div>
      ) : failedSrc === imageUrl ? (
        <div className={styles.qrNotice} role="alert">
          <CircleAlert size={28} aria-hidden="true" />
          <strong>Không tải được mã QR.</strong>
          <p>Kiểm tra kết nối và tải lại mã thanh toán.</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => {
              setLoadedSrc(null);
              setFailedSrc(null);
            }}
          >
            <RefreshCw size={16} aria-hidden="true" /> Thử lại
          </button>
        </div>
      ) : (
        imageUrl && (
          <div
            className={styles.qrImageWrapper}
            aria-busy={loadedSrc !== imageUrl}
          >
            {loadedSrc !== imageUrl && (
              <span className={styles.qrLoading} role="status">
                Đang tải QR…
              </span>
            )}
            <img
              key={imageUrl}
              src={imageUrl}
              alt={`VietQR thanh toán đơn ${orderCode}`}
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
          <Clock size={15} aria-hidden="true" /> Hết hạn sau{" "}
          {formatRemaining(remaining)}
        </p>
      )}

      {canTransfer && bankInfo && (
        <>
          <dl className={styles.bankDetails}>
            <div className={styles.bankRow}>
              <dt>Ngân hàng</dt>
              <dd>{bankInfo.bankName || bankInfo.bankCode}</dd>
            </div>
            <div className={styles.bankRow}>
              <dt>Số tài khoản</dt>
              <dd>
                {bankInfo.accountNo.trim()}
                <button
                  type="button"
                  className={styles.copyButton}
                  aria-label="Sao chép số tài khoản"
                  onClick={() =>
                    copyValue(bankInfo.accountNo.trim(), "số tài khoản")
                  }
                >
                  <Copy size={15} aria-hidden="true" />
                </button>
              </dd>
            </div>
            <div className={styles.bankRow}>
              <dt>Chủ tài khoản</dt>
              <dd>{bankInfo.accountName}</dd>
            </div>
            <div className={styles.bankRow}>
              <dt>Nội dung</dt>
              <dd className={styles.bankAmount}>
                {reference}
                <button
                  type="button"
                  className={styles.copyButton}
                  aria-label="Sao chép nội dung chuyển khoản"
                  onClick={() => copyValue(reference, "nội dung chuyển khoản")}
                >
                  <Copy size={15} aria-hidden="true" />
                </button>
              </dd>
            </div>
          </dl>
          <p className={styles.copyFeedback} role="status">
            {copyFeedback}
          </p>
          <p className={styles.paymentNote}>
            Quét bằng ứng dụng ngân hàng hỗ trợ VietQR. Giữ đúng số tiền và nội
            dung chuyển khoản để hệ thống đối chiếu thanh toán.
          </p>
        </>
      )}
    </div>
  );
}
