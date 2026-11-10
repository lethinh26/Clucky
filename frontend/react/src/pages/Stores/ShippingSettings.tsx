import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, InputNumber, Space, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api, { getErrorMessage, storesApi, type Store } from '../../lib/api';
import { message } from '../../components/feedback';

type Policy = { fee: number | null; version: number };

export function ShippingSettings() {
  const { t } = useTranslation('shipping');
  const { isAdmin, user } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [fee, setFee] = useState<number | null>(null);
  const [policyError, setPolicyError] = useState('');
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    setPolicy(null); setPolicyError('');
    api.get<Policy>('/api/shipping/config', { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) { setPolicy(response.data); setFee(response.data.fee); }
    }).catch(error => { if (!controller.signal.aborted) setPolicyError(getErrorMessage(error)); });
    return () => controller.abort();
  }, [isAdmin, user.id, reload]);

  async function saveFee() {
    if (lock.current || !policy || fee === null || !Number.isSafeInteger(fee) || fee <= 0) return;
    lock.current = true; setSaving('fee'); setPolicyError('');
    try {
      const { data } = await api.put<Policy>('/api/shipping/config', { fee, version: policy.version });
      setPolicy(data); setFee(data.fee); message.success(t('saved'));
    } catch (error) { setPolicyError(getErrorMessage(error)); }
    finally { lock.current = false; setSaving(null); }
  }
  if (!isAdmin) return null;

  return <Card title={t('chainFee')} style={{ marginBottom: 24, background: '#FFFFFF' }}>
      <p>{t('chainHint')}</p>
      <Space wrap align="end">
        <div><label htmlFor="chain-shipping-fee">{t('feeLabel')}</label><br /><InputNumber id="chain-shipping-fee" min={1} max={999999999999} precision={0} value={fee} onChange={setFee} disabled={!policy || saving !== null} placeholder={t('notConfigured')} style={{ width: 200 }} /></div>
        <Button type="primary" loading={saving === 'fee'} disabled={!policy || fee === null || fee <= 0 || saving !== null} onClick={saveFee}>{t('saveFee')}</Button>
        <Button disabled={saving !== null} onClick={() => setReload(value => value + 1)}>{t('reload')}</Button>
      </Space>
      {policy?.fee === null && <p><Tag color="orange">{t('notConfigured')}</Tag></p>}
      {policyError && <Alert type="error" showIcon message={policyError} style={{ marginTop: 12 }} />}
    </Card>;
}

export function StoreDeliverySettings({ store, onSaved }: { store: Store; onSaved: (store: Store) => void }) {
  const { t } = useTranslation('shipping');
  const [radius, setRadius] = useState<number | null>(store.deliveryRadiusKm ?? null);
  const [saving, setSaving] = useState(false);
  const [radiusError, setRadiusError] = useState('');
  const lock = useRef(false);

  useEffect(() => { setRadius(store.deliveryRadiusKm ?? null); setRadiusError(''); }, [store]);

  async function saveRadius() {
    if (lock.current || store.version === undefined || radius !== null && (!Number.isFinite(radius) || radius <= 0)) return;
    lock.current = true; setSaving(true); setRadiusError('');
    try {
      onSaved(await storesApi.updateDeliverySettings(store.id, radius, store.version));
      message.success(t('saved'));
    } catch (error) { setRadiusError(getErrorMessage(error)); }
    finally { lock.current = false; setSaving(false); }
  }

  return <section aria-labelledby="delivery-settings-title" style={{ marginBottom: 24 }}>
      <h3 id="delivery-settings-title" style={{ margin: '0 0 8px', fontSize: 16 }}>{t('radiusTitle')}</h3>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap align="end">
          <div><label htmlFor="delivery-radius">{t('radiusLabel')}</label><br /><InputNumber id="delivery-radius" aria-describedby="delivery-radius-hint" min={0.01} max={99999.99} precision={2} value={radius} onChange={setRadius} disabled={saving} placeholder={t('notConfigured')} style={{ width: 180 }} /></div>
          <Button loading={saving} disabled={store.version === undefined || saving} onClick={saveRadius}>{t('saveRadius')}</Button>
          {radiusError && <Button disabled={saving} onClick={async () => {
            try { onSaved(await storesApi.get(store.id)); } catch (error) { setRadiusError(getErrorMessage(error)); }
          }}>{t('reload')}</Button>}
        </Space>
        <p id="delivery-radius-hint" style={{ margin: '4px 0', color: '#6B6259', fontSize: 13 }}>{t('radiusHint')}</p>
        <span style={{ color: '#6B6259', fontSize: 13 }}>{store.deliveryRadiusKm != null && store.latitude != null && store.longitude != null ? t('radiusConfigured', { km: store.deliveryRadiusKm }) : t('branchIncomplete')}</span>
        {radiusError && <Alert type="error" showIcon message={radiusError} />}
      </Space>
  </section>;
}
