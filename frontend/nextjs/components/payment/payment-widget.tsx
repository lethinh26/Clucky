"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { formatPrice } from "@/lib/products";
import { buildVietQrUrl, transferReference, type BankInfo } from "@/lib/vietqr";
import styles from "./payment-shared.module.css";

export type { BankInfo } from "@/lib/vietqr";

export interface PaymentWidgetProps {
  orderCode: string;
  amount: number;
  /** ISO string hoặc timestamp ms khi QR hết hạn; bỏ trống nếu không hiển thị đếm ngược */
  expiresAt?: string | number | Date;
  /** Override image URL; otherwise build a VietQR image from bank and order data. */
  qrUrl?: string;
  bankInfo?: BankInfo;
  demo?: boolean;
  storeName?: string;
  embedded?: boolean;
  className?: string;
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function PaymentWidget({
  orderCode,
  amount,
  expiresAt,
  qrUrl,
  bankInfo,
  demo = false,
  storeName,
  embedded = false,
  className = "",
}: PaymentWidgetProps) {
  const expiresMs = useMemo(() => {
    if (expiresAt == null) return null;
    return expiresAt instanceof Date
      ? expiresAt.getTime()
      : new Date(expiresAt).getTime();
  }, [expiresAt]);

  const [now, setNow] = useState<number>(() => Date.now());
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  useEffect(() => {
    if (expiresMs == null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresMs]);

  const invalidExpiry = expiresMs != null && !Number.isFinite(expiresMs);
  const remaining =
    expiresMs != null && !invalidExpiry ? expiresMs - now : null;
  const expired = remaining != null && remaining <= 0;
  const imageUrl =
    qrUrl ??
    (bankInfo
      ? buildVietQrUrl({
          bank: bankInfo,
          amount,
          description: orderCode,
          storeName,
        })
      : null);
  const unavailable = invalidExpiry || !imageUrl || !bankInfo;

  return (
    <div
      className={`${styles.paymentWidget} ${styles.paymentScope} ${embedded ? styles.embedded : ""} ${className}`}
    >
      {!embedded && (
        <>
          <span className={styles.qrBadge}>Quét mã thanh toán</span>
          <h3 className={styles.qrTitle}>Chuyển khoản VietQR</h3>
        </>
      )}

      {remaining != null && (
        <p
          className={`${styles.qrTimer} ${expired ? styles.qrTimerExpired : ""}`}
        >
          <Clock size={15} aria-hidden="true" />
          {expired
            ? "Mã QR đã hết hạn"
            : `Hết hạn sau ${formatRemaining(remaining)}`}
        </p>
      )}

      {expired ? (
        <p role="status">
          Không chuyển khoản bằng mã đã hết hạn. Kiểm tra trạng thái đơn trước
          khi thanh toán lại.
        </p>
      ) : unavailable ? (
        <p role="status">Chưa có thông tin thanh toán. Vui lòng thử lại sau.</p>
      ) : failedSrc === imageUrl ? (
        <p role="alert">
          Không tải được mã QR.{" "}
          <button type="button" onClick={() => setFailedSrc(null)}>
            Thử lại
          </button>
        </p>
      ) : (
        <div
          className={styles.qrImageWrapper}
          aria-busy={loadedSrc !== imageUrl}
        >
          {loadedSrc !== imageUrl && <span role="status">Đang tải QR…</span>}
          <img
            src={imageUrl}
            alt={`VietQR thanh toán đơn ${orderCode}`}
            className={styles.qrImage}
            onLoad={() => setLoadedSrc(imageUrl)}
            onError={() => setFailedSrc(imageUrl)}
          />
        </div>
      )}

      <div className={styles.bankDetails}>
        {bankInfo && (
          <>
            <div className={styles.bankRow}>
              <span>Ngân hàng:</span>
              <strong>{bankInfo.bankName}</strong>
            </div>
            <div className={styles.bankRow}>
              <span>Số tài khoản:</span>
              <strong>{bankInfo.accountNo}</strong>
            </div>
            <div className={styles.bankRow}>
              <span>Chủ tài khoản:</span>
              <strong>{bankInfo.accountName}</strong>
            </div>
          </>
        )}
        <div className={styles.bankRow}>
          <span>Số tiền:</span>
          <strong className={styles.bankAmount}>{formatPrice(amount)}</strong>
        </div>
        <div className={styles.bankRow}>
          <span>Nội dung:</span>
          <strong className={styles.bankAmount}>{transferReference(orderCode)}</strong>
        </div>
      </div>

      <p className={styles.paymentNote}>
        {demo
          ? "QR dùng tài khoản mẫu để xem giao diện. Không chuyển tiền."
          : "Quét bằng app ngân hàng hỗ trợ VietQR. Hệ thống xác nhận sau khi nhận được tiền."}
      </p>
    </div>
  );
}
