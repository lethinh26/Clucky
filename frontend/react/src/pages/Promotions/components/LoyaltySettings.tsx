import { message, useFeedback } from "../../../components/feedback";
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, InputNumber, Space, Typography } from "antd";
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../../../lib/api';

type Policy = { version: number; spendPerPoint: number; pointValue: number; silverThreshold: number; goldThreshold: number; silverDiscount: number; goldDiscount: number };

export function LoyaltySettings() {
  const { t } = useTranslation('loyalty');
  const [form] = Form.useForm<Policy>();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useFeedback(error);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.get<Policy>('/api/loyalty/config').then(({ data }) => {
      if (active) { setPolicy(data); form.setFieldsValue(data); }
    }).catch(failure => { if (active) setError(getErrorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [form, reload]);
  async function save(values: Policy) {
    if (!policy || saving) return;
    setSaving(true); setError('');
    try {
      const { data } = await api.put<Policy>('/api/loyalty/config', { ...values, version: policy.version });
      setPolicy(data); form.setFieldsValue(data); message.success(t('saved'));
    } catch (failure) { setError(getErrorMessage(failure)); }
    finally { setSaving(false); }
  }
  return <Card title={t('title')}>
    <Typography.Paragraph>{t('description')}</Typography.Paragraph>
    {error && <Alert type="error" showIcon message={error} action={<Button disabled={saving || loading} onClick={() => setReload(value => value + 1)}>{t('reload')}</Button>} style={{ marginBottom: 20 }} />}
    <Form form={form} layout="vertical" onFinish={save} disabled={loading || saving} style={{ maxWidth: 600 }}>
      {(['spendPerPoint', 'pointValue', 'silverThreshold', 'goldThreshold', 'silverDiscount', 'goldDiscount'] as const).map(field => <Form.Item key={field} name={field} label={t(field)} rules={[{ required: true, message: t('required') }]}><InputNumber min={field.endsWith('Discount') ? 0 : 1} max={field.endsWith('Discount') ? 100 : 1000000000} precision={0} style={{ width: '100%' }} /></Form.Item>)}
      <Typography.Paragraph type="secondary">{t('rules')}</Typography.Paragraph>
      <Space wrap><Button htmlType="submit" type="primary" loading={saving} disabled={!policy || loading}>{t('save')}</Button><Typography.Text type="secondary">{policy && t('version', { version: policy.version })}</Typography.Text></Space>
    </Form>
  </Card>;
}
