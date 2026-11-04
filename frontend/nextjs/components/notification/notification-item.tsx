'use client';

import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";
import React from 'react';
import {
  ShoppingBag,
  CreditCard,
  Tag,
  Bell,
  Check,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { NotificationItemData, NotificationType } from '@/lib/types/notification';
import { formatRelativeTime } from '@/lib/notification';
import styles from './notification-shared.module.css';

export interface NotificationItemProps {
  notification?: Partial<NotificationItemData>;
  id?: string | number;
  title?: string;
  content?: string;
  type?: NotificationType;
  refId?: string | number | null;
  isRead?: boolean;
  createdAt?: string;
  link?: string | null;
  loading?: boolean;
  onClick?: (item: NotificationItemData) => void;
  onMarkRead?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  className?: string;
}

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  ORDER: <ShoppingBag size={18} aria-hidden="true" />,
  PAYMENT: <CreditCard size={18} aria-hidden="true" />,
  PROMOTION: <Tag size={18} aria-hidden="true" />,
  SYSTEM: <Bell size={18} aria-hidden="true" />,
};



const ICON_CLASS_MAP: Record<NotificationType, string> = {
  ORDER: styles.iconOrder,
  PAYMENT: styles.iconPayment,
  PROMOTION: styles.iconPromo,
  SYSTEM: styles.iconSystem,
};

const BADGE_CLASS_MAP: Record<NotificationType, string> = {
  ORDER: styles.badgeOrder,
  PAYMENT: styles.badgePayment,
  PROMOTION: styles.badgePromo,
  SYSTEM: styles.badgeSystem,
};

export function NotificationItem({
  notification,
  id: propId,
  title: propTitle = '',
  content: propContent = '',
  type: propType = 'SYSTEM',
  refId: propRefId,
  isRead: propIsRead = false,
  createdAt: propCreatedAt = new Date().toISOString(),
  link: propLink,
  loading = false,
  onClick,
  onMarkRead,
  onDelete,
  className = '',
}: NotificationItemProps) {
  const t = useTranslations();
  const { locale } = useLocaleTools();
  const TYPE_LABELS: Record<NotificationType, string> = {
    ORDER: t("business.promotionUi.order"),
    PAYMENT: t("business.promotionUi.payment"),
    PROMOTION: t("business.promotionUi.offers"),
    SYSTEM: t("business.promotionUi.system"),
  };

  // Skeleton loading state
  if (loading) {
    return (
      <div
        className={`${styles.notificationScope} ${styles.skeletonItem} ${className}`}
        aria-busy="true"
        aria-label={t("business.promotionUi.loadingNotifications")}
      >
        <div className={styles.skeletonIcon} />
        <div style={{ flex: 1 }}>
          <div className={styles.skeletonLine} style={{ width: '55%', height: 14, marginBottom: 8 }} />
          <div className={styles.skeletonLine} style={{ width: '85%', height: 12, marginBottom: 6 }} />
          <div className={styles.skeletonLine} style={{ width: '30%', height: 10 }} />
        </div>
      </div>
    );
  }

  // Normalize data
  const id = notification?.id ?? propId ?? 'notif-default';
  const title = notification?.title ?? propTitle;
  const content = notification?.content ?? propContent;
  const type = notification?.type ?? propType;
  const refId = notification?.refId ?? propRefId;
  const isRead = notification?.isRead ?? propIsRead;
  const createdAt = notification?.createdAt ?? propCreatedAt;
  const link = notification?.link ?? propLink;

  const currentItem: NotificationItemData = {
    id,
    title,
    content,
    type,
    refId,
    isRead,
    createdAt,
    link,
  };

  const timeText = formatRelativeTime(createdAt, new Date(), locale);
  const typeLabel = TYPE_LABELS[type] ?? t("business.promotionUi.notification");

  const handleClick = () => {
    onClick?.(currentItem);
    if (!isRead && onMarkRead) {
      onMarkRead(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleMarkReadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead?.(id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <div
      className={`${styles.notificationScope} ${styles.itemCard} ${
        !isRead ? styles.itemUnread : ''
      } ${className}`}
      role="article"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={t("business.promotionUi.notificationAccessible", { type: typeLabel, title: title, status: !isRead ? t("business.promotionUi.unread") : t("business.promotionUi.read"), time: timeText })}
    >
      {/* Icon Box */}
      <div className={`${styles.iconBox} ${ICON_CLASS_MAP[type]}`}>
        {TYPE_ICONS[type]}
      </div>

      {/* Main Content Area */}
      <div className={styles.contentArea}>
        <div className={styles.headerRow}>
          <h4 className={styles.title}>
            {!isRead && <span className={styles.unreadDot} aria-hidden="true" />}
            <span>{title}</span>
          </h4>
          <span className={styles.time}>{timeText}</span>
        </div>

        <p className={styles.message}>{content}</p>

        <div className={styles.metaRow}>
          <span className={`${styles.typeBadge} ${BADGE_CLASS_MAP[type]}`}>
            {typeLabel}
          </span>
          {refId && (
            <span style={{ color: '#9CA3AF' }}>
              #{String(refId)}
            </span>
          )}
          {link && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#D97706' }}>
              <ExternalLink size={10} aria-hidden="true" />
              <span>{t("business.promotionUi.details")}</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionBtns}>
        {!isRead && onMarkRead && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleMarkReadClick}
            title={t("business.promotionUi.markRead")}
            aria-label={t("business.promotionUi.markNotification", { title: title })}
          >
            <Check size={14} aria-hidden="true" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={handleDeleteClick}
            title={t("business.promotionUi.deleteNotification")}
            aria-label={t("business.promotionUi.deleteNamedNotification", { title: title })}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

