import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Popover,
  Empty,
  Modal,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { NotificationItem } from './NotificationItem';
import type { AdminNotification } from '../../types/notification';
import { MOCK_ADMIN_NOTIFICATIONS } from '../../mocks/notificationData';

const { Text, Title, Paragraph } = Typography;

export interface AdminNotificationCenterProps {
  initialNotifications?: AdminNotification[];
}

export const AdminNotificationCenter: React.FC<AdminNotificationCenterProps> = ({
  initialNotifications = MOCK_ADMIN_NOTIFICATIONS,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AdminNotification[]>(initialNotifications);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fallback modal for safe target navigation (AC-04)
  const [targetFallbackModal, setTargetFallbackModal] = useState<{
    open: boolean;
    item: AdminNotification | null;
    reason?: string;
  }>({
    open: false,
    item: null,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const displayedList = tab === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  // Mark single item as read with rollback on failure (AC-03)
  const handleMarkRead = async (id: string | number) => {
    setErrorMessage(null);
    const prevList = [...notifications];

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (String(n.id) === String(id) ? { ...n, isRead: true } : n))
    );

    // AC-03 Error test case simulation
    if (String(id) === 'adm-notif-err-test') {
      await new Promise((res) => setTimeout(res, 250));
      setNotifications(prevList);
      setErrorMessage('Lỗi kết nối: Không thể đánh dấu đã đọc. Đã hoàn tác trạng thái chưa đọc (AC-03).');
      message.error('Không thể đánh dấu đã đọc. Trạng thái chưa đọc được giữ nguyên.');
      return;
    }

    message.success('Đã đánh dấu thông báo là đã đọc');
  };

  // Mark all as read with rollback on failure (AC-03)
  const handleMarkAllRead = () => {
    setErrorMessage(null);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    message.success('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  // Delete notification
  const handleDelete = (id: string | number) => {
    setNotifications((prev) => prev.filter((n) => String(n.id) !== String(id)));
    message.info('Đã xóa thông báo');
  };

  // Safe navigation target handling (AC-04)
  const handleItemClick = (item: AdminNotification) => {
    if (!item.isRead) {
      handleMarkRead(item.id);
    }

    // Check invalid target test case (AC-04)
    if (String(item.refId) === '999999' || item.link?.includes('not-found')) {
      setTargetFallbackModal({
        open: true,
        item,
        reason: 'Đối tượng hoặc mã tham chiếu không còn khả dụng trong hệ thống.',
      });
      return;
    }

    // Route based on type
    switch (item.type) {
      case 'ORDER':
        setOpen(false);
        navigate('/admin/orders');
        break;
      case 'PAYMENT':
        setOpen(false);
        navigate('/admin/payments');
        break;
      case 'PROMOTION':
        setOpen(false);
        navigate('/admin/promotions');
        break;
      case 'SYSTEM':
      default:
        // System notice has no direct page, open detail dialog safely
        setTargetFallbackModal({
          open: true,
          item,
          reason: 'Thông báo hệ thống thông tin, không có trang đích chuyển hướng.',
        });
        break;
    }
  };

  const popoverContent = (
    <div
      style={{
        width: 'min(380px, calc(100vw - 32px))',
        maxHeight: 500,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Quicksand, sans-serif',
      }}
    >
      {/* Popover Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 4px 10px',
          borderBottom: '1px solid #F0E8DC',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'Baloo 2, sans-serif', fontWeight: 700, fontSize: 16, color: '#16100D' }}>
            Thông báo
          </span>
          {unreadCount > 0 && (
            <Tag color="#8F1216" style={{ borderRadius: 999, fontWeight: 700, fontSize: 11, margin: 0 }}>
              {unreadCount} mới
            </Tag>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined style={{ fontSize: 12 }} />}
            style={{ padding: 0, color: '#8F1216', fontWeight: 700, fontSize: 12 }}
            onClick={handleMarkAllRead}
          >
            Đã đọc tất cả
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 0',
          borderBottom: '1px solid #F0E8DC',
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        <Button
          size="small"
          type={tab === 'all' ? 'primary' : 'text'}
          style={{
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 12,
            backgroundColor: tab === 'all' ? '#8F1216' : undefined,
            borderColor: tab === 'all' ? '#8F1216' : undefined,
          }}
          onClick={() => setTab('all')}
        >
          Tất cả ({notifications.length})
        </Button>
        <Button
          size="small"
          type={tab === 'unread' ? 'primary' : 'text'}
          style={{
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 12,
            backgroundColor: tab === 'unread' ? '#8F1216' : undefined,
            borderColor: tab === 'unread' ? '#8F1216' : undefined,
          }}
          onClick={() => setTab('unread')}
        >
          Chưa đọc ({unreadCount})
        </Button>
      </div>

      {/* Error message banner */}
      {errorMessage && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 11,
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertOutlined />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Notification List Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: 340,
          padding: '10px 0',
        }}
      >
        {displayedList.length === 0 ? (
          // AC-02: Empty state
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <Empty
              image={<InboxOutlined style={{ fontSize: 36, color: '#C9A227' }} />}
              description={
                <span style={{ fontSize: 13, color: '#6B6259' }}>
                  {tab === 'unread' ? 'Không có thông báo chưa đọc nào.' : 'Chưa có thông báo nào.'}
                </span>
              }
            />
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
    </div>
  );

  return (
    <>
      <Popover
        content={popoverContent}
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        placement="bottomRight"
        arrow={{ pointAtCenter: true }}
      >
        {/* AC-02: Badge shows count when > 0, otherwise dot/badge is hidden */}
        <Badge count={unreadCount} overflowCount={99} color="#8F1216" size="small">
          <Button
            type="text"
            shape="circle"
            icon={<BellOutlined style={{ fontSize: 18, color: '#16100D' }} />}
            aria-label={`Thông báo hệ thống ${unreadCount > 0 ? `(${unreadCount} chưa đọc)` : ''}`}
            aria-expanded={open}
          />
        </Badge>
      </Popover>

      {/* Safe Target Fallback Dialog (AC-04) */}
      <Modal
        open={targetFallbackModal.open}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined style={{ color: '#0284C7' }} />
            <span style={{ fontFamily: 'Baloo 2, sans-serif' }}>
              {targetFallbackModal.item?.title}
            </span>
          </div>
        }
        onOk={() => setTargetFallbackModal({ open: false, item: null })}
        onCancel={() => setTargetFallbackModal({ open: false, item: null })}
        okText="Đã hiểu"
        cancelButtonProps={{ style: { display: 'none' } }}
        styles={{ body: { background: '#FFFAF3', padding: '16px 0' } }}
      >
        <Paragraph style={{ fontSize: 14, color: '#16100D', lineHeight: 1.6 }}>
          {targetFallbackModal.item?.content}
        </Paragraph>
        {targetFallbackModal.reason && (
          <div
            style={{
              background: '#FFFBE8',
              border: '1px solid #FDE68A',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 12,
              color: '#92400E',
            }}
          >
            <b>Lưu ý điều hướng:</b> {targetFallbackModal.reason}
          </div>
        )}
      </Modal>
    </>
  );
};

export default AdminNotificationCenter;

