import { useTranslation } from "react-i18next";
import { useLocaleTools } from "../../i18n/hooks";
import React from 'react';
import {
  FileTextOutlined,
  CreditCardOutlined,
  GiftOutlined,
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { AdminNotification, NotificationType } from '../../types/notification';

export interface AdminNotificationItemProps {
  notification: AdminNotification;
  onMarkRead?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  onClick?: (notification: AdminNotification) => void;
}

export const NotificationItem: React.FC<AdminNotificationItemProps> = ({
  notification,
  onMarkRead,
  onDelete,
  onClick,
}) => {
  const { t } = useTranslation();
  const { locale } = useLocaleTools();
  const [isFocused, setIsFocused] = React.useState(false);

  const typeConfig: Record<
    NotificationType,
    { label: string; bg: string; color: string; border: string; icon: React.ReactNode }
  > = {
    ORDER: {
      label: t("business:promotionUi.order", "Đơn hàng"),
      bg: '#FEF3C7',
      color: '#92400E',
      border: '#FDE68A',
      icon: <FileTextOutlined />,
    },
    PAYMENT: {
      label: t("business:promotionUi.payment", "Thanh toán"),
      bg: '#DCFCE7',
      color: '#166534',
      border: '#BBF7D0',
      icon: <CreditCardOutlined />,
    },
    PROMOTION: {
      label: t("business:promotionUi.promotion", "Ưu đãi"),
      bg: '#FEE2E2',
      color: '#991B1B',
      border: '#FECACA',
      icon: <GiftOutlined />,
    },
    SYSTEM: {
      label: t("business:promotionUi.system", "Hệ thống"),
      bg: '#E0F2FE',
      color: '#075985',
      border: '#BAE6FD',
      icon: <BellOutlined />,
    },
  };

  const { id, title, content, type, isRead, createdAt, refId } = notification;
  const config = typeConfig[type] || typeConfig.SYSTEM;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString(locale === 'en' ? 'en-US' : 'vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' • ' + d.toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`Thông báo ${config.label}: ${title}, ${isRead ? 'đã đọc' : 'chưa đọc'}`}
      onClick={() => onClick?.(notification)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(notification);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 12,
        backgroundColor: isRead ? '#FFFFFF' : '#FFFDF7',
        border: `1px solid ${isRead ? '#F0EBE1' : '#FDE68A'}`,
        boxShadow: isFocused ? '0 0 0 2px #8F1216' : undefined,
        outline: 'none',
        marginBottom: 8,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'Quicksand, sans-serif',
      }}
    >
      {/* Type Icon Badge */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: config.bg,
          color: config.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {config.icon}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 3,
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {!isRead && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: '#8F1216',
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
            )}
            <span
              style={{
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 10.5,
                fontWeight: 700,
                backgroundColor: config.bg,
                color: config.color,
                border: `1px solid ${config.border}`,
                flexShrink: 0,
              }}
            >
              {config.label}
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: '#16100D',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
            {formatDate(createdAt)}
          </span>
        </div>

        <p
          style={{
            margin: '0 0 6px 0',
            fontSize: 12,
            color: '#4B5563',
            lineHeight: 1.45,
            wordBreak: 'break-word',
          }}
        >
          {content}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {refId ? (
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>#{String(refId)}</span>
          ) : <span />}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isRead && onMarkRead && (
              <button
                type="button"
                aria-label={t("business:promotionUi.markRead", "Đã đọc")}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8F1216',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <CheckOutlined style={{ fontSize: 11 }} />
                <span>{t("business:promotionUi.markRead", "Đã đọc")}</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                aria-label="Xóa thông báo"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 4,
                }}
                title="Xóa thông báo"
              >
                <DeleteOutlined />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
