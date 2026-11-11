import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Empty, Pagination, Popover, Space, Spin, Typography } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';
import { getErrorMessage, ordersApi } from '../../lib/api';
import { adminNotificationsApi, type AdminNotification, type NotificationPage } from '../../lib/admin-notifications';

export function AdminNotificationCenter() {
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
      <Typography.Text strong>Thông báo Admin</Typography.Text>
      <Button size="small" disabled={!unread || loading} loading={saving} onClick={() => void markRead()}>Đọc tất cả</Button>
    </Space>
    {error ? <Alert type="error" showIcon title="Không tải hoặc cập nhật được thông báo" description={error} /> : loading ? <Spin aria-label="Đang tải thông báo" /> :
      result?.content.length ? <ul style={{ padding: 0, margin: 0, listStyle: 'none', maxHeight: 420, overflowY: 'auto' }}>
        {result.content.map(notification => <li key={notification.id} style={{ padding: '12px 0', borderBottom: '1px solid #eee' }}>
          <Typography.Text strong={!notification.isRead}>{notification.title}</Typography.Text>
          <Typography.Paragraph style={{ marginBottom: 4 }}>{notification.content}</Typography.Paragraph>
          <Space wrap>
            {['ORDER', 'INVENTORY'].includes(notification.type) && <Button size="small" type="link" disabled={saving}
              onClick={() => void viewNotification(notification)}>Xem chi tiết</Button>}
            <Typography.Text type="secondary">{date(notification.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</Typography.Text>
            {notification.isRead ? <Typography.Text type="secondary">Đã đọc</Typography.Text> :
              <Button size="small" icon={<CheckOutlined />} disabled={saving} aria-label={`Đánh dấu đã đọc: ${notification.title}`} onClick={() => void markRead(notification.id)}>Đánh dấu đã đọc</Button>}
          </Space>
        </li>)}
      </ul> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo." />}
    {!error && <Pagination size="small" current={page + 1} pageSize={10} total={result?.totalElements ?? 0} showSizeChanger={false}
      disabled={loading || saving} onChange={value => setPage(value - 1)} style={{ marginTop: 12 }} />}
  </div>;

  return <Popover trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} content={content}>
    <Badge count={unread ?? 0} dot={Boolean(error)}>
      <Button type="text" icon={<BellOutlined />} aria-expanded={open}
        aria-label={error ? 'Thông báo chưa tải được' : `Thông báo Admin${unread === null ? '' : `, ${unread} chưa đọc`}`} />
    </Badge>
  </Popover>;
}
