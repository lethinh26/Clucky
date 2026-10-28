"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Clock, QrCode } from "lucide-react";
import { formatPrice } from "@/lib/products";
import styles from "./payment-shared.module.css";

export interface BankInfo {
  bankName: string;
  accountNo: string;
  accountName: string;
}

export interface PaymentWidgetProps {
  orderCode: string;
  amount: number;
  /** ISO string hoặc timestamp ms khi QR hết hạn; bỏ trống nếu không hiển thị đếm ngược */
  expiresAt?: string | number | Date;
  /** URL ảnh QR do Payment Service trả về qua Gateway. */
  qrUrl?: string;
  bankInfo?: BankInfo;
  demo?: boolean;
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
  const unavailable = invalidExpiry || !qrUrl || !bankInfo;

  return (
    <div
      className={`${styles.paymentWidget} ${styles.paymentScope} ${className}`}
    >
      <span className={styles.qrBadge}>Quét mã thanh toán</span>
      <h3 className={styles.qrTitle}>Chuyển khoản VietQR</h3>

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
      ) : demo ? (
        <div
          className={styles.qrImageWrapper}
          role="img"
          aria-label="Minh họa QR, không dùng thanh toán"
        >
          <QrCode size={160} aria-hidden="true" />
        </div>
      ) : unavailable ? (
        <p role="status">Chưa có thông tin thanh toán. Vui lòng thử lại sau.</p>
      ) : failedSrc === qrUrl ? (
        <p role="alert">
          Không tải được mã QR.{" "}
          <button type="button" onClick={() => setFailedSrc(null)}>
            Thử lại
          </button>
        </p>
      ) : (
        <div className={styles.qrImageWrapper} aria-busy={loadedSrc !== qrUrl}>
          {loadedSrc !== qrUrl && <span role="status">Đang tải QR…</span>}
          <img
            src={qrUrl}
            alt={`VietQR thanh toán đơn ${orderCode}`}
            className={styles.qrImage}
            onLoad={() => setLoadedSrc(qrUrl)}
            onError={() => setFailedSrc(qrUrl)}
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
          <strong className={styles.bankAmount}>{orderCode}</strong>
        </div>
      </div>

      <p className={styles.paymentNote}>
        {demo
          ? "Giao diện minh họa Sprint 1 — không chuyển tiền. QR thật sẽ được cấp bởi Payment Service."
          : "Quét bằng app ngân hàng hỗ trợ VietQR. Hệ thống xác nhận sau khi nhận được tiền."}
      </p>
    </div>
  );
}
