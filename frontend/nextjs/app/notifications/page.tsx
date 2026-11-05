'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocaleTools } from '@/lib/i18n/hooks';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  AlertCircle,
  Inbox,
  Filter,
} from 'lucide-react';
import { NotificationItem } from '@/components/notification/notification-item';
import type { NotificationItemData, NotificationType } from '@/lib/types/notification';
import {
  MOCK_CUSTOMER_NOTIFICATIONS,
  resolveNotificationTarget,
} from '@/lib/notification';
import styles from '@/components/notification/notification-popover.module.css';

export default function NotificationsPage() {
  const router = useRouter();
  const t = useTranslations();
  const { locale } = useLocaleTools();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [notifications, setNotifications] = useState<NotificationItemData[]>(MOCK_CUSTOMER_NOTIFICATIONS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fallback Modal for Safe Target Handling (AC-04)
  const [fallbackModal, setFallbackModal] = useState<{
    open: boolean;
    item: NotificationItemData | null;
    reason?: string;
  }>({
    open: false,
    item: null,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Filter list
  const filteredList = notifications.filter((item) => {
    if (tab === 'unread' && item.isRead) return false;
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
    return true;
  });

  const handleMarkRead = async (id: string | number) => {
    setErrorMessage(null);
    const prevList = [...notifications];

    setNotifications((prev) =>
      prev.map((n) => (String(n.id) === String(id) ? { ...n, isRead: true } : n))
    );

    // AC-03 Error test case
    if (String(id) === 'notif-err-test') {
      await new Promise((res) => setTimeout(res, 250));
      setNotifications(prevList);
      setErrorMessage(t("business.promotionUi.markReadError"));
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleDelete = (id: string | number) => {
    setNotifications((prev) => prev.filter((n) => String(n.id) !== String(id)));
  };

  const handleItemClick = (item: NotificationItemData) => {
    if (!item.isRead) {
      handleMarkRead(item.id);
    }

    const target = resolveNotificationTarget(item, locale);
    if (target.isValid && target.url) {
      router.push(target.url);
    } else {
      setFallbackModal({
        open: true,
        item,
        reason: target.reason || t("business.promotionUi.targetUnavailable"),
      });
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px', fontFamily: 'Quicksand, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 28, fontWeight: 700, margin: 0, color: '#16100D' }}>
            {t("business.promotionUi.yourNotifications")}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6B6259', fontSize: 14 }}>
            {t("business.promotionUi.yourNotificationsSub")}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid #E8E2D9',
              background: '#FFFAF3',
              color: '#8F1216',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <CheckCheck size={16} />
            <span>{t("business.promotionUi.markAllAsRead")}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setTab('all')}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: tab === 'all' ? '1px solid #8F1216' : '1px solid #E8E2D9',
            background: tab === 'all' ? '#8F1216' : '#FFFAF3',
            color: tab === 'all' ? '#FFFAF3' : '#6B6259',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {t("business.promotionUi.allWithCount", { count: notifications.length })}
        </button>
        <button
          type="button"
          onClick={() => setTab('unread')}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: tab === 'unread' ? '1px solid #8F1216' : '1px solid #E8E2D9',
            background: tab === 'unread' ? '#8F1216' : '#FFFAF3',
            color: tab === 'unread' ? '#FFFAF3' : '#6B6259',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {t("business.promotionUi.unreadWithCount", { count: unreadCount })}
        </button>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 999,
            border: '1px solid #E8E2D9',
            background: '#FFFAF3',
            color: '#16100D',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          <option value="ALL">{t("business.promotionUi.allCategories")}</option>
          <option value="ORDER">🛍️ {t("business.promotionUi.order")}</option>
          <option value="PAYMENT">💳 {t("business.promotionUi.payment")}</option>
          <option value="PROMOTION">🏷️ {t("business.promotionUi.offers")}</option>
          <option value="SYSTEM">🔔 {t("business.promotionUi.system")}</option>
        </select>
      </div>

      {errorMessage && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFAF3', borderRadius: 16, border: '1px solid #E8E2D9' }}>
            <Inbox size={48} style={{ color: '#C9A227', marginBottom: 12 }} />
            <div style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 18, fontWeight: 700, color: '#16100D' }}>
              {t("business.promotionUi.noNotificationsYet")}
            </div>
            <div style={{ color: '#6B6259', fontSize: 14, marginTop: 4 }}>
              {t("business.promotionUi.viewedAll")}
            </div>
          </div>
        ) : (
          filteredList.map((item) => (
            <NotificationItem
              key={item.id}
              notification={item}
              onClick={handleItemClick}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Safe Target Fallback Dialog (AC-04) */}
      {fallbackModal.open && fallbackModal.item && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(22, 16, 13, 0.45)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFAF3', border: '1px solid #E8E2D9', borderRadius: 20, width: 'min(460px, 100%)', padding: 24, boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}>
            <h3 style={{ fontFamily: 'Baloo 2, sans-serif', fontSize: 20, fontWeight: 700, color: '#16100D', margin: '0 0 12px 0' }}>
              {fallbackModal.item.title}
            </h3>
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              {fallbackModal.item.content}
            </p>
            {fallbackModal.reason && (
              <div style={{ background: '#FFFBE8', border: '1px solid #FDE68A', padding: '10px 14px', borderRadius: 10, fontSize: 13, color: '#92400E', marginBottom: 20 }}>
                <b>{t("business.promotionUi.navigationNotice")}</b> {fallbackModal.reason}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setFallbackModal({ open: false, item: null })}
                style={{ padding: '8px 20px', borderRadius: 999, border: 'none', background: '#8F1216', color: '#FFFAF3', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {t("business.promotionUi.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

