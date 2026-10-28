'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatPrice } from '@/lib/products';
import styles from './payment-shared.module.css';

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
  /** URL ảnh QR (VietQR); mặc định dùng img.vietqr.io theo bankInfo */
  qrUrl?: string;
  bankInfo?: BankInfo;
  className?: string;
}

const DEFAULT_BANK: BankInfo = {
  bankName: 'MB Bank',
  accountNo: '0909123456789',
  accountName: 'CLUCKY VIETNAM',
};

function buildVietQrUrl(bank: BankInfo, amount: number, orderCode: string): string {
  // vietqr.app embed: /img?acc=&bank=&amount=&des=&template=
  const bankCode = bank.bankName.toLowerCase().includes('mb') ? 'MB' : bank.bankName;
  const params = new URLSearchParams({
    acc: bank.accountNo,
    bank: bankCode,
    amount: String(Math.round(amount)),
    des: orderCode,
    template: 'qr_only',
    holder: bank.accountName,
  });
  return `https://vietqr.app/img?${params.toString()}`;
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function PaymentWidget({
  orderCode,
  amount,
  expiresAt,
  qrUrl,
  bankInfo = DEFAULT_BANK,
  className = '',
}: PaymentWidgetProps) {
  const expiresMs = useMemo(() => {
    if (expiresAt == null) return null;
    return expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  }, [expiresAt]);

  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (expiresMs == null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresMs]);

  const remaining = expiresMs != null ? expiresMs - now : null;
  const expired = remaining != null && remaining <= 0;
  const imgSrc = qrUrl ?? buildVietQrUrl(bankInfo, amount, orderCode);

  return (
    <div className={`${styles.paymentWidget} ${styles.paymentScope} ${className}`}>
      <span className={styles.qrBadge}>Quét mã thanh toán</span>
      <h3 className={styles.qrTitle}>Chuyển khoản VietQR</h3>

      {remaining != null && (
        <p className={`${styles.qrTimer} ${expired ? styles.qrTimerExpired : ''}`}>
          <Clock size={15} aria-hidden="true" />
          {expired ? 'Mã QR đã hết hạn' : `Hết hạn sau ${formatRemaining(remaining)}`}
        </p>
      )}

      <div className={styles.qrImageWrapper}>
        <img src={imgSrc} alt={`VietQR thanh toán đơn ${orderCode}`} className={styles.qrImage} />
      </div>

      <div className={styles.bankDetails}>
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
        Quét bằng app ngân hàng bất kỳ hỗ trợ VietQR. Hệ thống tự xác nhận sau khi nhận được tiền.
      </p>
    </div>
  );
}
