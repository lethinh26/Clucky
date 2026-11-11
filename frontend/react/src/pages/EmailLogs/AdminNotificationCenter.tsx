import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Empty, Pagination, Popover, Space, Spin, Typography } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';
import { getErrorMessage, ordersApi } from '../../lib/api';
import { adminNotificationsApi, type AdminNotification, type NotificationPage } from '../../lib/admin-notifications';

export function AdminNotificationCenter() {
  const { t } = useTranslation();
  const { isAdmin, user } = useAuth();
  const { date } = useLocaleTools();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<NotificationPage<AdminNotification> | null>(null);
  const [unread, setUnread] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError('');
    setResult(null);
    setUnread(null);
    Promise.all([adminNotificationsApi.unreadCount(controller.signal),
      open ? adminNotificationsApi.inbox(page, 10, controller.signal) : Promise.resolve(null)])
      .then(([count, data]) => { if (!controller.signal.aborted && sequence === requestSequence.current) { setUnread(count); setResult(data); } })
      .catch(failure => { if (!controller.signal.aborted && sequence === requestSequence.current) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted && sequence === requestSequence.current) setLoading(false); });
    return () => controller.abort();
  }, [isAdmin, user.id, open, page, reload]);

  useEffect(() => {
    if (!isAdmin || saving) return;
    const controller = new AbortController();
    let pending = false;
    const update = async () => {
      if (document.hidden || pending) return;
      pending = true;
      const sequence = ++requestSequence.current;
      try {
        const [count, data] = await Promise.all([adminNotificationsApi.unreadCount(controller.signal),
          open ? adminNotificationsApi.inbox(page, 10, controller.signal) : Promise.resolve(null)]);
        if (!controller.signal.aborted && sequence === requestSequence.current) { setUnread(count); if (data) setResult(data); setError(''); }
      } catch (failure) {
        if (!controller.signal.aborted && sequence === requestSequence.current) setError(getErrorMessage(failure));
      } finally { pending = false; if (!controller.signal.aborted && sequence === requestSequence.current) setLoading(false); }
    };
    const interval = window.setInterval(() => void update(), 60000);
    window.addEventListener('focus', update);
    return () => { controller.abort(); window.clearInterval(interval); window.removeEventListener('focus', update); };
  }, [isAdmin, user.id, open, page, reload, saving]);

  async function markRead(id?: number) {
    setSaving(true);
    setError('');
    try {
      if (id === undefined) await adminNotificationsApi.markAllRead();
      else await adminNotificationsApi.markRead(id);
      setReload(value => value + 1);
    } catch (failure) {
      setError(getErrorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  async function viewNotification(notification: AdminNotification) {
    setSaving(true); setError('');
    try {
      const order = notification.type === 'ORDER' ? await ordersApi.getById(notification.refId) : null;
      await adminNotificationsApi.markRead(notification.id);
      setReload(value => value + 1); setOpen(false);
      navigate(order ? `/admin/orders?orderCode=${encodeURIComponent(order.orderCode)}` : '/admin/inventory');
    } catch (failure) { setError(getErrorMessage(failure)); }
    finally { setSaving(false); }
  }

  if (!isAdmin) return null;

  const content = <div style={{ width: 'min(380px, calc(100vw - 48px))' }}>
    <Space style={{ marginBottom: 12 }}>
      <Typography.Text strong>{t("admin:ui.adminNotifications")}</Typography.Text>
      <Button size="small" disabled={!unread || loading} loading={saving} onClick={() => void markRead()}>{t("admin:ui.markAllAsRead")}</Button>
    </Space>
    {error ? <Alert type="error" showIcon title={t("admin:ui.unableToLoadOrUpdateNotifications")} description={error} /> : loading ? <Spin aria-label={t("admin:ui.loadingNotifications")} /> :
      result?.content.length ? <ul style={{ padding: 0, margin: 0, listStyle: 'none', maxHeight: 420, overflowY: 'auto' }}>
        {result.content.map(notification => <li key={notification.id} style={{ padding: '12px 0', borderBottom: '1px solid #eee' }}>
          <Typography.Text strong={!notification.isRead}>{notification.title}</Typography.Text>
          <Typography.Paragraph style={{ marginBottom: 4 }}>{notification.content}</Typography.Paragraph>
          <Space wrap>
            {['ORDER', 'INVENTORY'].includes(notification.type) && <Button size="small" type="link" disabled={saving}
              onClick={() => void viewNotification(notification)}>{t("business:orderspage.viewDetails")}</Button>}
            <Typography.Text type="secondary">{date(notification.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</Typography.Text>
            {notification.isRead ? <Typography.Text type="secondary">{t("admin:ui.read")}</Typography.Text> :
              <Button size="small" icon={<CheckOutlined />} disabled={saving} aria-label={t("admin:ui.markAsRead", { value1: notification.title })} onClick={() => void markRead(notification.id)}>{t("business:promotionUi.markRead")}</Button>}
          </Space>
        </li>)}
      </ul> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("admin:ui.noNotificationsYet")} />}
    {!error && <Pagination size="small" current={page + 1} pageSize={10} total={result?.totalElements ?? 0} showSizeChanger={false}
      disabled={loading || saving} onChange={value => setPage(value - 1)} style={{ marginTop: 12 }} />}
  </div>;

  return <Popover trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} content={content}>
    <Badge count={unread ?? 0} dot={Boolean(error)}>
      <Button type="text" icon={<BellOutlined />} aria-expanded={open}
        aria-label={error ? t("admin:ui.unableToLoadNotifications") : t("admin:ui.adminNotifications272", { value1: unread === null ? '' : t("admin:ui.unread", { value1: unread }) })} />
    </Badge>
  </Popover>;
}
