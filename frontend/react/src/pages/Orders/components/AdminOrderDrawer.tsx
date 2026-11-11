import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Collapse, Descriptions, Drawer, Empty, Form, Input, Skeleton, Space, Steps, Tag, Timeline } from 'antd';
import { ClockCircleOutlined, ShopOutlined, ShoppingOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons';
import { api, getErrorMessage, ordersApi, type BackendOrder, type BackendRefund } from '../../../lib/api';
import { useLocaleTools } from '../../../i18n/hooks';
import { AdminModal } from '../../../components/ui/AdminModal';
import { message } from '../../../components/feedback';
import { CatalogImage } from '../../Catalog/ImageField';
import { actorLabel, catalogItemPath, historyReason, orderDate, orderLabels, paymentColor, paymentLabels, paymentMethodLabel, snapshotLabels } from '../presentation';

interface ActionFields { reason: string }
const requiredText = (max: number) => [{ required: true, whitespace: true, max, pattern: /^[^\x00]*$/, message: `Vui lòng nhập nội dung hợp lệ, tối đa ${max} ký tự.` }];

export function AdminOrderDrawer({ order, refund, loading, error, refundError, storeName, covered = false, onClose, onFinance, onChanged }: {
  order: BackendOrder | null; refund: BackendRefund | null; loading: boolean; error: string; refundError: string; storeName?: string;
  covered?: boolean;
  onClose: () => void; onFinance: () => void; onChanged: () => void;
}) {
  const { money, locale } = useLocaleTools();
  const [images, setImages] = useState<Record<string, string | undefined>>({});
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const lock = useRef(false);
  const [form] = Form.useForm<ActionFields>();
  const imagePaths = JSON.stringify([...new Set((order?.items ?? []).map(catalogItemPath).filter((path): path is string => !!path))]);
  useEffect(() => {
    const controller = new AbortController();
    const paths: string[] = JSON.parse(imagePaths);
    void Promise.all(paths.map(async path => {
      try {
        const response = await api.get<{ imageUrl?: string }>(path, { signal: controller.signal });
        return [path, response.data.imageUrl] as const;
      } catch { return [path, undefined] as const; }
    })).then(entries => { if (!controller.signal.aborted) setImages(Object.fromEntries(entries)); });
    return () => controller.abort();
  }, [imagePaths]);
  useEffect(() => {
    if (busy || cancelOpen || covered) return;
    const timer = window.setInterval(() => { if (!document.hidden) onChanged(); }, 15000);
    return () => window.clearInterval(timer);
  }, [busy, cancelOpen, covered, onChanged]);

  function beginCancellation() {
    form.resetFields(); setActionError(''); setCancelOpen(true);
  }

  async function submit(status?: string, values?: ActionFields) {
    if (!order || lock.current || loading || error) return;
    lock.current = true; setBusy(true); setActionError('');
    try {
      await ordersApi.updateStatus(order.id, status ?? 'CANCELLED', values?.reason.trim());
      message.success('Đã cập nhật đơn hàng.');
      setCancelOpen(false); onChanged();
    } catch (failure) { setActionError(getErrorMessage(failure)); }
    finally { lock.current = false; setBusy(false); }
  }

  const status = order?.status === 'DELIVERED' ? 'COMPLETED' : order?.status;
  const ended = status === 'CANCELLED' || status === 'COMPLETED';
  const next = status === 'CONFIRMED' ? 'PREPARING' : status === 'PREPARING' ? 'READY' : ['READY', 'SHIPPING'].includes(status ?? '') ? 'COMPLETED' : undefined;
  const paid = ['PAID', 'COLLECTED'].includes(order?.paymentStatus ?? '');
  const history = [...(order?.timeline ?? [])].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  const steps = ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY',
    ...(status === 'SHIPPING' || history.some(event => event.toStatus === 'SHIPPING') ? ['SHIPPING'] : []), 'COMPLETED'];
  const progressIndex = steps.indexOf(status ?? '');
  const progressItems = steps.map(step => ({ title: step === 'PENDING_PAYMENT' ? 'Đặt đơn' : step === 'READY' ? 'Sẵn sàng' : step === 'COMPLETED' ? 'Hoàn thành' : orderLabels[step] }));
  const disabled = busy || loading || !!error;

  return <>
    <Drawer open className="admin-order-drawer" size="min(760px, 100vw)" onClose={() => { if (!lock.current && !covered) onClose(); }}
      closable={!busy && !covered} maskClosable={!busy && !covered} keyboard={!busy && !covered} autoFocus={!covered}
      title={<div className="order-drawer-title"><div><small>CHI TIẾT ĐƠN HÀNG</small><strong>{order?.orderCode ?? 'Đang tải đơn hàng'}</strong></div>
        {status && <Tag color={status === 'CANCELLED' ? 'error' : status === 'COMPLETED' ? 'success' : 'processing'}>{orderLabels[status] ?? status}</Tag>}</div>}
      footer={order && <div className="order-footer"><Button icon={<WalletOutlined />} disabled={busy} onClick={onFinance}>Tài chính & hoàn tiền</Button><Space wrap>
        {['PENDING_PAYMENT', 'CONFIRMED'].includes(status ?? '') && <Button danger disabled={disabled} onClick={beginCancellation}>Hủy đơn</Button>}
        {next && <Button type="primary" loading={busy && !cancelOpen} disabled={disabled || next === 'COMPLETED' && !paid} onClick={() => void submit(next)}>
          {next === 'PREPARING' ? 'Bắt đầu chế biến' : next === 'READY' ? 'Món đã sẵn sàng' : 'Hoàn thành đơn'}</Button>}
      </Space></div>}>
      {error && <Alert type="error" showIcon message={error} />}
      {!order && !error && <Skeleton active paragraph={{ rows: 10 }} />}
      {!cancelOpen && actionError && <Alert type="error" showIcon message={actionError} />}
      {order && <>
        <div className="order-overview"><span><ClockCircleOutlined /> {orderDate(order.createdAt, locale)} <small>· Giờ Việt Nam</small></span><strong>{money(Number(order.totalAmount))}</strong></div>
        <section className="order-section order-progress">
          <div className="order-section-heading"><h3>Tiến trình đơn hàng</h3><small>Cập nhật {orderDate(order.updatedAt, locale)}</small></div>
          {status === 'CANCELLED' ? <Alert type="error" showIcon message="Đơn hàng đã hủy" description={historyReason([...history].reverse().find(event => event.toStatus === 'CANCELLED')?.reason, 'CANCELLED') || 'Tiến trình đã dừng. Không thể chuyển trạng thái đơn.'} />
            : progressIndex >= 0 && <Steps size="small" current={progressIndex} status={status === 'COMPLETED' ? 'finish' : 'process'} items={progressItems} />}
          <Collapse ghost items={[{ key: 'history', label: `Lịch sử xử lý · ${history.length} cập nhật`, children: history.length ? <Timeline items={history.map(event => ({
            color: event.toStatus === 'CANCELLED' ? 'red' : ['COMPLETED', 'DELIVERED'].includes(event.toStatus) ? 'green' : '#8F1216',
            children: <div className="order-history-event"><div><strong>{orderLabels[event.toStatus] ?? event.toStatus}</strong><time>{orderDate(event.createdAt, locale)}</time></div>
              {historyReason(event.reason, event.toStatus) && <p>{historyReason(event.reason, event.toStatus)}</p>}<small>{actorLabel(event.changedRole) || 'Chưa có thông tin người thực hiện'}</small></div>,
          }))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch sử xử lý" /> }]} />
        </section>
        {refundError && <Alert type="warning" showIcon message="Chưa tải được thông tin hoàn tiền" description={refundError} />}
        {refund && <Alert type="info" showIcon message="Đơn hàng có yêu cầu hoàn tiền" description="Xem trạng thái, ngân hàng nhận và xử lý tại mục Tài chính & hoàn tiền."
          action={<Button size="small" onClick={onFinance}>Xem yêu cầu</Button>} />}
        <section className="order-section">
          <div className="order-section-heading"><h3><UserOutlined /> Khách hàng & nhận món</h3><Tag icon={<ShopOutlined />}>{order.type === 'PICKUP' ? 'Nhận tại quầy' : 'Giao tận nơi'}</Tag></div>
          <Descriptions size="small" column={{ xs: 1, sm: 2 }} layout="vertical" colon={false} items={[
            { key: 'customer', label: 'Khách hàng', children: order.receiverName || `Khách hàng #${order.customerId}` },
            { key: 'phone', label: 'Điện thoại', children: order.receiverPhone ? <a href={`tel:${order.receiverPhone}`}>{order.receiverPhone}</a> : 'Chưa cung cấp' },
            { key: 'store', label: 'Chi nhánh', children: storeName || `Chi nhánh #${order.storeId}`, span: 2 },
            ...(order.type === 'DELIVERY' ? [{ key: 'address', label: 'Địa chỉ giao hàng', children: order.deliveryAddress || 'Chưa có địa chỉ', span: 2 }] : []),
          ]} />
        </section>
        <section className="order-section">
          <div className="order-section-heading"><h3><ShoppingOutlined /> Món đã đặt</h3><Tag>{(order.items ?? []).reduce((sum, item) => sum + item.quantity, 0)} phần</Tag></div>
          <div className="order-line-items">{(order.items ?? []).map(item => {
            const path = catalogItemPath(item);
            const options = [...snapshotLabels(item.optionsSnapshot), ...snapshotLabels(item.toppingsSnapshot)];
            return <article className="order-line-item" key={item.id}>
              <div className="order-item-image"><CatalogImage url={path ? images[path] : undefined} name={item.itemName} /></div>
              <div className="order-item-description"><strong>{item.itemName}</strong><span>{item.itemType === 'COMBO' ? 'Combo · ' : ''}{item.quantity} × {money(Number(item.unitPrice))}</span>
                {options.length > 0 && <small>{options.join(' · ')}</small>}{item.note && <p>Ghi chú: {item.note}</p>}</div>
              <strong className="order-amount">{money(Number(item.lineTotal))}</strong>
            </article>;
          })}</div>
          {!order.items?.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có chi tiết món trong dữ liệu đơn hàng" />}
          <small className="order-image-note">Ảnh từ thực đơn hiện tại. Tên món, tùy chọn và giá được giữ theo lúc đặt hàng.</small>
          {order.note && <Alert className="order-customer-note" type="info" showIcon message="Ghi chú của khách" description={order.note} />}
        </section>
        <section className="order-section">
          <div className="order-section-heading"><h3><WalletOutlined /> Thanh toán</h3><Tag color={paymentColor(order.paymentStatus)}>{paymentLabels[order.paymentStatus ?? 'UNKNOWN'] ?? 'Chưa xác minh'}</Tag></div>
          <dl className="order-receipt">
            <div><dt>Phương thức</dt><dd>{paymentMethodLabel(order.paymentMethod)}</dd></div>
            <div><dt>Tạm tính</dt><dd>{money(Number(order.subtotal))}</dd></div>
            {Number(order.discountAmount) > 0 && <div><dt>Giảm giá {order.voucherCode ? `(${order.voucherCode})` : ''}</dt><dd>−{money(Number(order.discountAmount))}</dd></div>}
            {Number(order.pointsAmount) > 0 && <div><dt>Điểm tích lũy đã dùng</dt><dd>−{money(Number(order.pointsAmount))}</dd></div>}
            <div><dt>Phí giao hàng</dt><dd>{money(Number(order.shippingFee || 0))}</dd></div>
            <div className="order-receipt-total"><dt>Tổng thanh toán</dt><dd>{money(Number(order.totalAmount))}</dd></div>
          </dl>
        </section>
        {ended && <p className="order-muted">Đơn đã kết thúc. Các nghiệp vụ tài chính vẫn được theo dõi riêng.</p>}
        {next === 'COMPLETED' && !paid && <Alert type="warning" showIcon message="Cần xác nhận đã thu tiền trước khi hoàn thành đơn." />}
      </>}
    </Drawer>
    <AdminModal className="admin-order-modal" centered width={540} open={cancelOpen} confirmLoading={busy} onCancel={() => { if (!lock.current) setCancelOpen(false); }}
      title="Hủy đơn hàng" subtitle={order?.orderCode}
      okText="Xác nhận hủy đơn" cancelText="Quay lại"
      okButtonProps={{ danger: true, disabled: disabled && !busy, htmlType: 'submit', form: `order-action-${order?.id}` }}>
      <Alert type="warning" showIcon message="Thao tác hủy đơn không thể hoàn tác."
        description="Đơn chuyển khoản đã nhận tiền sẽ được kiểm tra điều kiện hoàn tiền; hủy đơn không đồng nghĩa đã chuyển trả tiền." />
      {actionError && <Alert type="error" showIcon message={actionError} />}
      <Form id={`order-action-${order?.id}`} form={form} layout="vertical" disabled={busy} onFinish={values => void submit(undefined, values)}>
        <Form.Item name="reason" label="Lý do hủy đơn" rules={requiredText(500)}>
          <Input.TextArea rows={3} maxLength={500} showCount placeholder="Nhập lý do để lưu vào lịch sử xử lý" />
        </Form.Item>
      </Form>
    </AdminModal>
  </>;
}
