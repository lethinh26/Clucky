import React from 'react';
import type { AdminNotification, NotificationType } from '../../types/notification';

export interface AdminNotificationItemProps {
  notification: AdminNotification;
  onMarkRead?: (id: string | number) => void;
  onClick?: (notification: AdminNotification) => void;
}

const typeConfig: Record<
  NotificationType,
  { label: string; bg: string; color: string; border: string }
> = {
  ORDER: { label: 'Đơn hàng', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  PAYMENT: { label: 'Thanh toán', bg: '#DCFCE7', color: '#166534', border: '#BBF7D0' },
  PROMOTION: { label: 'Khuyến mãi', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
  SYSTEM: { label: 'Hệ thống', bg: '#E0F2FE', color: '#075985', border: '#BAE6FD' },
};

export const NotificationItem: React.FC<AdminNotificationItemProps> = ({
  notification,
  onMarkRead,
  onClick,
}) => {
  const { id, title, content, type, isRead, createdAt, refId } = notification;
  const config = typeConfig[type] || typeConfig.SYSTEM;

  return (
    <div
      onClick={() => onClick?.(notification)}
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        backgroundColor: isRead ? '#FFFFFF' : '#FFFDF7',
        border: `1px solid ${isRead ? '#F0EBE1' : '#FDE68A'}`,
        marginBottom: 8,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'Quicksand, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isRead && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#EA580C',
                display: 'inline-block',
              }}
            />
          )}
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: config.bg,
              color: config.color,
              border: `1px solid ${config.border}`,
            }}
          >
            {config.label}
          </span>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#16100D' }}>
            {title}
          </span>
          {refId && (
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>#{String(refId)}</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#6B7280' }}>
          {new Date(createdAt).toLocaleDateString('vi-VN')}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: '#4B5563', lineHeight: 1.4 }}>
        {content}
      </p>
      {!isRead && onMarkRead && (
        <div style={{ marginTop: 6, textAlign: 'right' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#D97706',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Đánh dấu đã đọc
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationItem;

