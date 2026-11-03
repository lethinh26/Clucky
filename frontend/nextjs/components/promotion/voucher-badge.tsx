'use client';

import React, { useState } from 'react';
import { Tag, Copy, Check, Sparkles } from 'lucide-react';
import { Voucher, VoucherType, VoucherStatus, VoucherScope } from '@/lib/types/promotion';
import {
  getVoucherStatus,
  formatVoucherDiscount,
  formatVoucherCondition,
} from '@/lib/promotion';
import styles from './promotion-shared.module.css';

export interface VoucherBadgeProps {
  voucher?: Partial<Voucher>;
  code?: string;
  type?: VoucherType;
  value?: number;
  minOrderAmount?: number;
  maxDiscount?: number | null;
  startAt?: string;
  endAt?: string;
  scope?: VoucherScope;
  storeName?: string | null;
  status?: string;
  variant?: 'badge' | 'card' | 'compact';
  onApply?: (code: string) => void;
  onCopy?: (code: string) => void;
  showCondition?: boolean;
  className?: string;
}

const STATUS_LABEL: Record<VoucherStatus, string> = {
  ACTIVE: 'Khả dụng',
  EXPIRED: 'Hết hạn',
  UPCOMING: 'Sắp diễn ra',
  EXHAUSTED: 'Hết lượt',
  DISABLED: 'Tạm khóa',
};

const STATUS_CLASS_MAP: Record<VoucherStatus, string> = {
  ACTIVE: styles.statusActive,
  EXPIRED: styles.statusExpired,
  UPCOMING: styles.statusUpcoming,
  EXHAUSTED: styles.statusExhausted,
  DISABLED: styles.statusDisabled,
};

export function VoucherBadge({
  voucher,
  code: propCode,
  type: propType = 'PERCENT',
  value: propValue = 0,
  minOrderAmount: propMin = 0,
  maxDiscount: propMaxDiscount,
  startAt: propStartAt,
  endAt: propEndAt,
  scope: propScope = 'ALL',
  storeName: propStoreName,
  status: propStatus,
  variant = 'badge',
  onApply,
  onCopy,
  showCondition = true,
  className = '',
}: VoucherBadgeProps) {
  const [copied, setCopied] = useState(false);

  // Normalize data between voucher object and direct props
  const code = voucher?.code ?? propCode ?? 'VOUCHER';
  const type = voucher?.type ?? propType;
  const value = voucher?.value ?? propValue;
  const minOrderAmount = voucher?.minOrderAmount ?? propMin;
  const maxDiscount = voucher?.maxDiscount ?? propMaxDiscount;
  const startAt = voucher?.startAt ?? propStartAt;
  const endAt = voucher?.endAt ?? propEndAt;
  const scope = voucher?.scope ?? propScope;
  const storeName = voucher?.storeName ?? propStoreName;
  const rawStatus = voucher?.status ?? propStatus;

  const currentVoucher: Partial<Voucher> = {
    code,
    type,
    value,
    minOrderAmount,
    maxDiscount,
    startAt,
    endAt,
    scope,
    storeName,
    status: rawStatus,
  };

  const status = getVoucherStatus(currentVoucher);
  const discountText = formatVoucherDiscount(type, value, maxDiscount);
  const conditionText = formatVoucherCondition(minOrderAmount, maxDiscount, type);
  const isUsable = status === 'ACTIVE';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    onCopy?.(code);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Compact variant: simple inline chip
  if (variant === 'compact') {
    return (
      <span
        className={`${styles.promotionScope} ${styles.voucherBadge} ${STATUS_CLASS_MAP[status]} ${className}`}
        title={`${code}: ${discountText} (${conditionText})`}
        aria-label={`Voucher ${code}: ${discountText}, trạng thái ${STATUS_LABEL[status]}`}
      >
        <span className={styles.voucherDot} aria-hidden="true" />
        <span>{code}</span>
        <span>•</span>
        <span>{type === 'PERCENT' ? `-${value}%` : `-${Math.round(value / 1000)}k`}</span>
      </span>
    );
  }

  // 2. Card variant: complete coupon card for checkout / voucher list
  if (variant === 'card') {
    return (
      <div
        className={`${styles.promotionScope} ${styles.couponCard} ${
          !isUsable ? styles.couponCardDisabled : ''
        } ${className}`}
        role="region"
        aria-label={`Voucher ${code}`}
      >
        <div className={styles.couponHeader}>
          <div className={styles.couponValue}>
            <Sparkles
              size={14}
              style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }}
              aria-hidden="true"
            />
            {discountText}
          </div>
          <button
            type="button"
            className={styles.couponCodeBadge}
            onClick={handleCopy}
            title="Nhấn để sao chép mã"
            aria-label={`Sao chép mã voucher ${code}`}
          >
            <span>{code}</span>
            {copied ? (
              <Check size={12} color="#10B981" aria-hidden="true" />
            ) : (
              <Copy size={12} aria-hidden="true" />
            )}
          </button>
        </div>

        {showCondition && (
          <div className={styles.couponCondition}>
            {conditionText}
            {scope === 'STORE' && storeName && (
              <span> • Áp dụng tại {storeName}</span>
            )}
          </div>
        )}

        <div className={styles.couponFooter}>
          <span className={`${styles.voucherBadge} ${STATUS_CLASS_MAP[status]}`}>
            <span className={styles.voucherDot} aria-hidden="true" />
            {STATUS_LABEL[status]}
          </span>

          {onApply && isUsable && (
            <button
              type="button"
              className={styles.couponApplyBtn}
              onClick={() => onApply(code)}
              aria-label={`Áp dụng mã ${code}`}
            >
              Áp dụng
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Default badge variant
  return (
    <span
      className={`${styles.promotionScope} ${styles.voucherBadge} ${STATUS_CLASS_MAP[status]} ${className}`}
      aria-label={`Voucher ${code}: ${discountText}, ${STATUS_LABEL[status]}`}
    >
      <Tag size={12} aria-hidden="true" />
      <strong>{code}</strong>
      <span>{discountText}</span>
      <span className={styles.voucherDot} aria-hidden="true" />
      <span>{STATUS_LABEL[status]}</span>
    </span>
  );
}

