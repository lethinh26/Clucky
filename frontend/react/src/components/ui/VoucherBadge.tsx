import React from 'react';
import { Tag } from 'antd';
import type { VoucherType, VoucherStatus } from '../../types/promotion';

export interface VoucherBadgeProps {
  code: string;
  type?: VoucherType;
  value?: number;
  status?: VoucherStatus | string;
  size?: 'small' | 'medium';
}

const statusColorConfig: Record<
  string,
  { color: string; bg: string; border: string; dotColor: string }
> = {
  ACTIVE: {
    color: '#92400E',
    bg: '#FEF3C7',
    border: '#FDE68A',
    dotColor: '#D97706',
  },
  EXPIRED: {
    color: '#6B7280',
    bg: '#F3F4F6',
    border: '#E5E7EB',
    dotColor: '#9CA3AF',
  },
  UPCOMING: {
    color: '#0369A1',
    bg: '#E0F2FE',
    border: '#BAE6FD',
    dotColor: '#0284C7',
  },
  EXHAUSTED: {
    color: '#991B1B',
    bg: '#FEE2E2',
    border: '#FECACA',
    dotColor: '#DC2626',
  },
  DISABLED: {
    color: '#78716C',
    bg: '#F5EDE0',
    border: '#E7E5E4',
    dotColor: '#A8A29E',
  },
};

export const VoucherBadge: React.FC<VoucherBadgeProps> = ({
  code,
  type,
  value,
  status = 'ACTIVE',
  size = 'medium',
}) => {
  const config = statusColorConfig[status] || statusColorConfig.ACTIVE;
  const discountLabel =
    value !== undefined && type !== undefined
      ? type === 'PERCENT'
        ? `-${value}%`
        : `-${Math.round(value / 1000)}k`
      : null;

  return (
    <Tag
      bordered={false}
      aria-label={`Voucher ${code}${discountLabel ? ` (${discountLabel})` : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: '100%',
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 999,
        padding: size === 'small' ? '2px 8px' : '3px 12px',
        fontSize: size === 'small' ? '12px' : '13px',
        fontWeight: 700,
        fontFamily: 'Quicksand, sans-serif',
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: config.dotColor,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          maxWidth: 150,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'inline-block',
          verticalAlign: 'bottom',
        }}
        title={code}
      >
        {code}
      </span>
      {discountLabel && (
        <span style={{ opacity: 0.85, fontWeight: 800, flexShrink: 0 }}>({discountLabel})</span>
      )}
    </Tag>
  );
};

export default VoucherBadge;

