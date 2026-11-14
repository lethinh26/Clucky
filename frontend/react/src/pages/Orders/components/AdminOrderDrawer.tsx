import { useTranslation } from "react-i18next";
import i18n from "../../../i18n/index.ts";
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Collapse, Descriptions, Drawer, Empty, Form, Input, Skeleton, Space, Steps, Tag, Timeline } from 'antd';
import { ClockCircleOutlined, ShopOutlined, ShoppingOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons';
import { api, getErrorMessage, ordersApi, type BackendOrder, type BackendRefund } from '../../../lib/api';
import { useLocaleTools } from '../../../i18n/hooks';
import { AdminModal } from '../../../components/ui/AdminModal';
import { message } from '../../../components/feedback';
import { CatalogImage } from '../../Catalog/ImageField';
import { actorLabel, catalogItemPath, historyReason, orderDate, orderLabels, paymentColor, paymentLabels, paymentMethodLabel, snapshotLabels } from '../presentation';
import { formatQueueWithDate } from '../../../utils/orderExcelExport';
import { ShipmentSimulationPanel } from '../../../components/ShipmentSimulationPanel';
import { fulfillmentLabel } from '../../../lib/order-fulfillment';

interface ActionFields { reason: string }
const requiredText = (max: number) => [{ required: true, whitespace: true, max, pattern: /^[^\x00]*$/, get message() { return i18n.t("admin:ui.enterValidContentUpToCharacters", { value1: max }); } }];

export function AdminOrderDrawer({ order, refund, loading, error, refundError, storeName, covered = false, onClose, onFinance, onChanged }: {
  order: BackendOrder | null; refund: BackendRefund | null; loading: boolean; error: string; refundError: string; storeName?: string;
  covered?: boolean;
  onClose: () => void; onFinance: () => void; onChanged: () => void;
}) {
  const { t } = useTranslation();
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
      message.success(t("admin:ui.orderUpdated"));
      setCancelOpen(false); onChanged();
    } catch (failure) { setActionError(getErrorMessage(failure)); }
    finally { lock.current = false; setBusy(false); }
  }

  const status = order?.status === 'DELIVERED' ? 'COMPLETED' : order?.status;
  const ended = status === 'CANCELLED' || status === 'COMPLETED' || status === 'DELIVERY_FAILED';
  const next = status === 'CONFIRMED' ? 'PREPARING' : status === 'PREPARING' ? 'READY' : status === 'READY' && order?.type === 'PICKUP' ? 'COMPLETED' : undefined;
  const paid = ['PAID', 'COLLECTED'].includes(order?.paymentStatus ?? '');
  const history = [...(order?.timeline ?? [])].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  const pickup = order?.type === 'PICKUP';
  const steps = pickup ? ['CART', 'CONFIRMED', 'PREPARING', 'READY', 'PAYMENT', 'COMPLETED'] : ['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY',
    ...(status === 'SHIPPING' || history.some(event => event.toStatus === 'SHIPPING') ? ['SHIPPING'] : []), 'COMPLETED'];
  const progressIndex = pickup && status === 'READY' && paid ? 5 : pickup && status === 'PENDING_PAYMENT' ? 1 : steps.indexOf(status ?? '');
  const progressItems = steps.map(step => ({ title: step === 'CART' ? t("business:pickupFlow.choose") : step === 'PAYMENT' ? t("business:cart.checkout") : step === 'PENDING_PAYMENT' ? t("admin:ui.orderPlaced") : step === 'READY' ? t(pickup ? "business:pickupFlow.ready" : "business:orderprogress.ready") : step === 'COMPLETED' ? t(pickup ? "business:pickupFlow.completed" : "admin:ui.completed") : orderLabels[step] }));
  const disabled = busy || loading || !!error;

  return <>
    <Drawer open className="admin-order-drawer" size="min(760px, 100vw)" onClose={() => { if (!lock.current && !covered) onClose(); }}
      closable={!busy && !covered} maskClosable={!busy && !covered} keyboard={!busy && !covered} autoFocus={!covered}
      title={<div className="order-drawer-title"><div><small>{t("admin:ui.orderDetails")}{order?.queueNumber ? ` · ${formatQueueWithDate(order.queueNumber, order.createdAt).combinedLabel}` : ""}</small><strong>{order?.orderCode ?? t("admin:ui.loadingOrder")}</strong></div>
        {status && <Tag color={status === 'CANCELLED' ? 'error' : status === 'COMPLETED' ? 'success' : 'processing'}>{orderLabels[status] ?? status}</Tag>}</div>}
      footer={order && <div className="order-footer"><Button icon={<WalletOutlined />} disabled={busy} onClick={onFinance}>{t("admin:ui.financeRefunds")}</Button><Space wrap>
        {['PENDING_PAYMENT', 'CONFIRMED'].includes(status ?? '') && <Button danger disabled={disabled} onClick={beginCancellation}>{t("admin:ui.cancelOrder")}</Button>}
        {next && <Button type="primary" loading={busy && !cancelOpen} disabled={disabled || next === 'COMPLETED' && !paid} onClick={() => void submit(next)}>
          {next === 'PREPARING' ? t("business:orderdetaildrawer.startPreparation") : next === 'READY' ? t("admin:ui.foodIsReady") : t(pickup ? "business:pickupFlow.handover" : "admin:ui.completeOrder")}</Button>}
      </Space></div>}>
      {error && <Alert type="error" showIcon message={error} />}
      {!order && !error && <Skeleton active paragraph={{ rows: 10 }} />}
      {!cancelOpen && actionError && <Alert type="error" showIcon message={actionError} />}
      {order && <>
        <div className="order-overview"><span><ClockCircleOutlined /> {orderDate(order.createdAt, locale)} <small>{t("admin:ui.vietnamTime")}</small></span><strong>{money(Number(order.totalAmount))}</strong></div>
        <section className="order-section order-progress">
          <div className="order-section-heading"><h3>{t("business:demoordercontrols.orderProgress")}</h3><small>{t("admin:ui.update")} {orderDate(order.updatedAt, locale)}</small></div>
          {status === 'CANCELLED' || status === 'DELIVERY_FAILED' ? <Alert type="error" showIcon message={status === 'DELIVERY_FAILED' ? 'Giao không thành công' : t("admin:ui.orderCancelled")} description={status === 'DELIVERY_FAILED' ? 'Đơn đã được đóng xử lý sau khi giao thất bại.' : historyReason([...history].reverse().find(event => event.toStatus === 'CANCELLED')?.reason, 'CANCELLED') || t("admin:ui.progressHasStoppedTheOrderStatusCannotBe")} />
            : progressIndex >= 0 && <Steps size="small" current={progressIndex} status={status === 'COMPLETED' ? 'finish' : 'process'} items={progressItems} />}
          <Collapse ghost items={[{ key: 'history', label: t("admin:ui.processingHistoryUpdates", { value1: history.length }), children: history.length ? <Timeline items={history.map(event => ({
            color: event.toStatus === 'CANCELLED' ? 'red' : ['COMPLETED', 'DELIVERED'].includes(event.toStatus) ? 'green' : '#8F1216',
            children: <div className="order-history-event"><div><strong>{orderLabels[event.toStatus] ?? event.toStatus}</strong><time>{orderDate(event.createdAt, locale)}</time></div>
              {historyReason(event.reason, event.toStatus) && <p>{historyReason(event.reason, event.toStatus)}</p>}<small>{actorLabel(event.changedRole) || t("admin:ui.noActorInformationAvailable")}</small></div>,
          }))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("admin:ui.noProcessingHistoryYet")} /> }]} />
        </section>
        {refundError && <Alert type="warning" showIcon message={t("admin:ui.unableToLoadRefundInformation")} description={refundError} />}
        {refund && <Alert type="info" showIcon message={t("admin:ui.thisOrderHasARefundRequest")} description={t("admin:ui.viewTheStatusRecipientBankDetailsAndAvailable")}
          action={<Button size="small" onClick={onFinance}>{t("admin:ui.viewRequest")}</Button>} />}
        <section className="order-section">
          <div className="order-section-heading"><h3><UserOutlined /> {t("business:orderdetaildrawer.customerFulfilment")}</h3><Tag icon={<ShopOutlined />}>{fulfillmentLabel(order)}</Tag></div>
          <Descriptions size="small" column={{ xs: 1, sm: 2 }} layout="vertical" colon={false} items={[
            { key: 'customer', label: t("admin:nav.customers"), children: order.receiverName || t("business:reviews.customerLabel", { value1: order.customerId }) },
            { key: 'phone', label: t("business:orderdetaildrawer.phone"), children: order.receiverPhone ? <a href={`tel:${order.receiverPhone}`}>{order.receiverPhone}</a> : t("admin:ui.notProvided") },
            { key: 'store', label: t("business:stores.store"), children: storeName || t("business:reviews.storeNumber", { value1: order.storeId }), span: 2 },
            ...(order.type === 'DELIVERY' ? [{ key: 'address', label: t("admin:ui.deliveryAddress"), children: order.deliveryAddress || t("admin:ui.noAddressProvided"), span: 2 }] : []),
          ]} />
        </section>
        {order.type === 'PICKUP' && order.diningOption === 'DINE_IN' && order.status === 'READY' && <Alert type="info" showIcon message="Khách tự đến quầy nhận món. Không có bàn hay phục vụ tại bàn." />}
        {order.type === 'DELIVERY' && ['READY', 'SHIPPING', 'COMPLETED', 'DELIVERY_FAILED'].includes(order.status) && <ShipmentSimulationPanel orderId={order.id} onChanged={onChanged} />}
        <section className="order-section">
          <div className="order-section-heading"><h3><ShoppingOutlined /> {t("business:id.orderedItems")}</h3><Tag>{(order.items ?? []).reduce((sum, item) => sum + item.quantity, 0)} {t("admin:ui.portions")}</Tag></div>
          <div className="order-line-items">{(order.items ?? []).map(item => {
            const path = catalogItemPath(item);
            const options = [...snapshotLabels(item.optionsSnapshot), ...snapshotLabels(item.toppingsSnapshot)];
            return <article className="order-line-item" key={item.id}>
              <div className="order-item-image"><CatalogImage url={path ? images[path] : undefined} name={item.itemName} /></div>
              <div className="order-item-description"><strong>{item.itemName}</strong><span>{item.itemType === 'COMBO' ? 'Combo · ' : ''}{item.quantity} × {money(Number(item.unitPrice))}</span>
                {options.length > 0 && <small>{options.join(' · ')}</small>}{item.note && <p>{t("business:orderitemcard.note")} {item.note}</p>}</div>
              <strong className="order-amount">{money(Number(item.lineTotal))}</strong>
            </article>;
          })}</div>
          {!order.items?.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("admin:ui.noItemDetailsInTheOrderData")} />}
          <small className="order-image-note">{t("admin:ui.imagesAreFromTheCurrentMenuItemNames")}</small>
          {order.note && <Alert className="order-customer-note" type="info" showIcon message={t("business:orderdetaildrawer.customerNotes")} description={order.note} />}
        </section>
        <section className="order-section">
          <div className="order-section-heading"><h3><WalletOutlined /> {t("business:cart.checkout")}</h3><Tag color={paymentColor(order.paymentStatus)}>{paymentLabels[order.paymentStatus ?? 'UNKNOWN'] ?? t("admin:ui.unverified")}</Tag></div>
          <dl className="order-receipt">
            <div><dt>{t("business:orderdetaildrawer.method")}</dt><dd>{paymentMethodLabel(order.paymentMethod)}</dd></div>
            <div><dt>{t("business:cart.subtotal")}</dt><dd>{money(Number(order.subtotal))}</dd></div>
            {Number(order.discountAmount) > 0 && <div><dt>{t("business:ordersummarycard.discount")} {order.voucherCode ? `(${order.voucherCode})` : ''}</dt><dd>−{money(Number(order.discountAmount))}</dd></div>}
            {Number(order.pointsAmount) > 0 && <div><dt>{t("admin:ui.loyaltyPointsUsed")}</dt><dd>−{money(Number(order.pointsAmount))}</dd></div>}
            <div><dt>{t("business:ordersummarycard.deliveryFee")}</dt><dd>{money(Number(order.shippingFee || 0))}</dd></div>
            <div className="order-receipt-total"><dt>{t("business:checkout.totalDue")}</dt><dd>{money(Number(order.totalAmount))}</dd></div>
          </dl>
        </section>
        {ended && <p className="order-muted">{t("admin:ui.thisOrderHasEndedFinancialOperationsAreTracked")}</p>}
        {next === 'COMPLETED' && !paid && <Alert type="warning" showIcon message={t("admin:ui.confirmPaymentCollectionBeforeCompletingTheOrder")} />}
      </>}
    </Drawer>
    <AdminModal className="admin-order-modal" centered width={540} open={cancelOpen} confirmLoading={busy} onCancel={() => { if (!lock.current) setCancelOpen(false); }}
      title={t("admin:ui.cancelThisOrder")} subtitle={order?.orderCode}
      okText={t("admin:ui.confirmOrderCancellation")} cancelText={t("admin:ui.goBack")}
      okButtonProps={{ danger: true, disabled: disabled && !busy, htmlType: 'submit', form: `order-action-${order?.id}` }}>
      <Alert type="warning" showIcon message={t("admin:ui.orderCancellationCannotBeUndone")}
        description={t("admin:ui.paidBankTransferOrdersWillBeCheckedFor")} />
      {actionError && <Alert type="error" showIcon message={actionError} />}
      <Form id={`order-action-${order?.id}`} form={form} layout="vertical" disabled={busy} onFinish={values => void submit(undefined, values)}>
        <Form.Item name="reason" label={t("admin:ui.cancellationReason")} rules={requiredText(500)}>
          <Input.TextArea rows={3} maxLength={500} showCount placeholder={t("admin:ui.enterAReasonForTheProcessingHistory")} />
        </Form.Item>
      </Form>
    </AdminModal>
  </>;
}
