import { useEffect, useState } from 'react';
import { Button, Card, Input, InputNumber, Select, Space, Tag, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { partyOrdersApi, type BackendPartyOrder, getErrorMessage } from '../../lib/api';

const nextStatus: Record<string, string[]> = {
  NEW: ['CONTACTED', 'CANCELLED'],
  CONTACTED: ['QUOTED', 'CANCELLED'],
  QUOTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CLOSED', 'CANCELLED'],
};

export function PartyOrdersPage() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState<BackendPartyOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<number, { status: string; note: string; quoteAmount?: number; paymentMethod?: 'BANK_TRANSFER' | 'CASH' }>>({});
  const [storeId, setStoreId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = async (nextPage = 0) => {
    setBusy(true);
    setError('');
    try {
      const result = await partyOrdersApi.list({ storeId: isAdmin ? storeId : undefined, page: nextPage, size: 50 });
      setOrders(current => nextPage === 0 ? result.content : [...current, ...result.content]);
      setPage(nextPage);
      setTotalPages(result.totalPages);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { void load(); }, [storeId, user.id]);

  const change = (id: number, patch: Partial<(typeof drafts)[number]>) =>
    setDrafts(current => ({ ...current, [id]: { ...(current[id] ?? { status: '', note: '' }), ...patch } }));

  const save = async (order: BackendPartyOrder) => {
    const draft = drafts[order.id];
    if (!draft?.status) return;
    if (['CONTACTED', 'QUOTED', 'CANCELLED'].includes(draft.status) && !draft.note.trim()) {
      message.error(t('admin:party.noteRequired'));
      return;
    }
    if (draft.status === 'QUOTED' && (!draft.quoteAmount || !draft.paymentMethod)) {
      message.error(t('admin:party.quoteRequired'));
      return;
    }
    setBusy(true);
    try {
      await partyOrdersApi.updateStatus(order.id, draft.status, draft.note.trim(), draft.quoteAmount, draft.paymentMethod);
      setDrafts(current => { const next = { ...current }; delete next[order.id]; return next; });
      await load();
      message.success(t('admin:party.saved'));
    } catch (cause) {
      message.error(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return <div style={{ padding: 24, maxWidth: 1200, margin: 'auto' }}>
    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 20 }} wrap>
      <Typography.Title level={2} style={{ margin: 0, fontFamily: 'Fredoka, Quicksand, sans-serif' }}>{t('admin:party.title')}</Typography.Title>
      <Space>
        {isAdmin && <InputNumber min={1} placeholder={t('admin:party.storeId')} value={storeId} onChange={value => setStoreId(value || undefined)} />}
        <Button onClick={() => void load()} loading={busy}>{t('admin:party.refresh')}</Button>
      </Space>
    </Space>
    {error && <Typography.Text type="danger">{error}</Typography.Text>}
    {!busy && !orders.length && <Card>{t('admin:party.empty')}</Card>}
    <div style={{ display: 'grid', gap: 16 }}>
      {orders.map(order => <Card key={order.id} title={<Space wrap><span>#{order.id}</span><Tag>{order.status}</Tag><span>{order.contactName}</span></Space>}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Text>{t('admin:party.storeId')}: {order.storeId} · {order.expectedDate} {order.expectedTime} · {order.guestCount} {t('admin:party.guests')}</Typography.Text>
          <Typography.Text>{t('admin:party.package')}: {order.packageCode}</Typography.Text>
          <Typography.Text>{t('admin:party.request')}: {order.content}</Typography.Text>
          <Space wrap>
            <Button href={`tel:${order.phone}`}>{t('admin:party.call')} {order.phone}</Button>
            <Button href={`mailto:${order.contactEmail}`}>{t('admin:party.email')} {order.contactEmail}</Button>
          </Space>
          {order.quoteAmount && <Typography.Text strong>{t('admin:party.quote')}: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.quoteAmount)} · {order.paymentMethod === 'CASH' ? t('admin:party.cash') : t('admin:party.transfer')}</Typography.Text>}
          {order.consultationNote && <Typography.Text>{t('admin:party.lastNote')}: {order.consultationNote}</Typography.Text>}
          {!!nextStatus[order.status]?.length && <Space wrap style={{ marginTop: 8 }}>
            <Select style={{ width: 170 }} placeholder={t('admin:party.nextStatus')} value={drafts[order.id]?.status || undefined} onChange={value => change(order.id, { status: value })} options={nextStatus[order.status].map(value => ({ value, label: value }))} />
            <Input style={{ width: 280 }} maxLength={2000} placeholder={t('admin:party.note')} value={drafts[order.id]?.note || ''} onChange={event => change(order.id, { note: event.target.value })} />
            {drafts[order.id]?.status === 'QUOTED' && <>
              <InputNumber min={1} precision={0} style={{ width: 160 }} placeholder={t('admin:party.quote')} value={drafts[order.id]?.quoteAmount} onChange={value => change(order.id, { quoteAmount: value || undefined })} />
              <Select style={{ width: 180 }} placeholder={t('admin:party.payment')} value={drafts[order.id]?.paymentMethod} onChange={value => change(order.id, { paymentMethod: value })} options={[{ value: 'CASH', label: t('admin:party.cash') }, { value: 'BANK_TRANSFER', label: t('admin:party.transfer') }]} />
            </>}
            <Button type="primary" disabled={!drafts[order.id]?.status} loading={busy} onClick={() => void save(order)}>{t('admin:party.save')}</Button>
          </Space>}
        </Space>
      </Card>)}
    </div>
    {page + 1 < totalPages && <Button style={{ marginTop: 16 }} loading={busy} onClick={() => void load(page + 1)}>{t('admin:party.loadMore')}</Button>}
  </div>;
}
