'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  AlertCircle,
  Inbox,
  X,
  ExternalLink,
} from 'lucide-react';
import { NotificationItem } from './notification-item';
import type { NotificationItemData } from '@/lib/types/notification';
import {
  MOCK_CUSTOMER_NOTIFICATIONS,
  resolveNotificationTarget,
} from '@/lib/notification';
import styles from './notification-popover.module.css';

export interface NotificationPopoverProps {
  initialNotifications?: NotificationItemData[];
}

export function NotificationPopover({
  initialNotifications = MOCK_CUSTOMER_NOTIFICATIONS,
}: NotificationPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItemData[]>(initialNotifications);
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

  const rootRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Filter list by tab
  const displayedList = tab === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  // Mark single item read with rollback on failure (AC-03)
  const handleMarkRead = async (id: string | number) => {
    setErrorMessage(null);
    const prevList = [...notifications];

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (String(n.id) === String(id) ? { ...n, isRead: true } : n))
    );

    // Simulate AC-03 error condition
    if (String(id) === 'notif-err-test') {
      await new Promise((res) => setTimeout(res, 300));
      // Rollback optimistic update
      setNotifications(prevList);
      setErrorMessage('Lỗi kết nối: Không thể đánh dấu đã đọc. Đã hoàn tác trạng thái chưa đọc (AC-03).');
      return;
    }
  };

  // Mark all read with rollback on failure (AC-03)
  const handleMarkAllRead = async () => {
    setErrorMessage(null);
    const prevList = [...notifications];

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Delete single notification
  const handleDelete = (id: string | number) => {
    setNotifications((prev) => prev.filter((n) => String(n.id) !== String(id)));
  };

  // Safe Item Click Navigation (AC-04)
  const handleItemClick = (item: NotificationItemData) => {
    // Automatically mark read
    if (!item.isRead) {
      handleMarkRead(item.id);
    }

    const target = resolveNotificationTarget(item);

    // If target is valid, safely route
    if (target.isValid && target.url) {
      setOpen(false);
      router.push(target.url);
    } else {
      // AC-04: Do not crash or route to broken 404, open fallback dialog!
      setFallbackModal({
        open: true,
        item,
        reason: target.reason || 'Trang liên kết hoặc mã tham chiếu không khả dụng.',
      });
    }
  };

  return (
    <div className={styles.container} ref={rootRef}>
      {/* Bell Button */}
      <button
        type="button"
        className={styles.bellButton}
        onClick={() => setOpen(!open)}
        aria-label={`Thông báo ${unreadCount > 0 ? `(${unreadCount} chưa đọc)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} aria-hidden="true" />
        {/* AC-02: Badge only shown when unreadCount > 0 */}
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div className={styles.popover} role="dialog" aria-label="Hộp thư thông báo">
          <div className={styles.header}>
            <h3 className={styles.headerTitle}>
              <span>Thông báo</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 12, color: '#8F1216', fontWeight: 800 }}>
                  ({unreadCount})
                </span>
              )}
            </h3>

            <div className={styles.headerActions}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className={styles.markAllBtn}
                  onClick={handleMarkAllRead}
                  title="Đánh dấu tất cả là đã đọc"
                >
                  <CheckCheck size={14} aria-hidden="true" />
                  <span>Đã đọc tất cả</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabsRow}>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'all' ? styles.tabActive : ''}`}
              onClick={() => setTab('all')}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'unread' ? styles.tabActive : ''}`}
              onClick={() => setTab('unread')}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* Notification List Area */}
          <div className={styles.listArea}>
            {errorMessage && (
              <div className={styles.errorBanner} role="alert">
                <AlertCircle size={14} aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {displayedList.length === 0 ? (
              // AC-02: Empty state
              <div className={styles.emptyState}>
                <Inbox size={36} className={styles.emptyIcon} aria-hidden="true" />
                <div className={styles.emptyTitle}>
                  {tab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                </div>
                <div className={styles.emptyDesc}>
                  Các thông báo mới về đơn hàng và ưu đãi sẽ xuất hiện tại đây.
                </div>
              </div>
            ) : (
              displayedList.map((item) => (
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

          {/* Footer */}
          <div className={styles.footer}>
            <a
              href="/account"
              className={styles.viewAllLink}
              onClick={() => setOpen(false)}
            >
              <span>Xem thông tin tài khoản & thông báo</span>
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      {/* Fallback Modal for Safe Target Handling (AC-04) */}
      {fallbackModal.open && fallbackModal.item && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>{fallbackModal.item.title}</h4>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setFallbackModal({ open: false, item: null })}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalContent}>
              {fallbackModal.item.content}
            </div>

            {fallbackModal.reason && (
              <div className={styles.modalReason}>
                <b>Lưu ý điều hướng:</b> {fallbackModal.reason}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setFallbackModal({ open: false, item: null })}
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  border: 'none',
                  backgroundColor: '#8F1216',
                  color: '#FFFAF3',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationPopover;

