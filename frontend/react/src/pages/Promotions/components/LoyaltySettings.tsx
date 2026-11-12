import { message, useFeedback } from "../../../components/feedback";
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, InputNumber, Space, Tag, Typography } from "antd";
import { CrownOutlined, GiftOutlined, SaveOutlined, SwapOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../../../lib/api';
import { useLocaleTools } from '../../../i18n/hooks';

type Policy = { version: number; spendPerPoint: number; pointValue: number; silverThreshold: number; goldThreshold: number; silverDiscount: number; goldDiscount: number };
const fields = ['spendPerPoint', 'pointValue', 'silverThreshold', 'goldThreshold', 'silverDiscount', 'goldDiscount'] as const;

export function LoyaltySettings() {
  const { t } = useTranslation('loyalty');
  const { money, number } = useLocaleTools();
  const [form] = Form.useForm<Policy>();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useFeedback(error);
  const [reload, setReload] = useState(0);
  const draft: Policy | undefined = Form.useWatch([], form);
  const dirty = Boolean(policy && draft && fields.some(field => draft[field] !== policy[field]));
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
  const values = draft ?? policy;
  return <section className="loyalty-settings" aria-label={t('title')}>
    <div className="loyalty-banner">
      <div className="loyalty-banner-icon"><CrownOutlined /></div>
      <div>
        <span className="loyalty-eyebrow">{t('eyebrow')}</span>
        <Typography.Title level={3}>Clucky Club</Typography.Title>
        <p>{t('description')}</p>
      </div>
      {policy && <Tag className="loyalty-version">{t('version', { version: policy.version })}</Tag>}
    </div>
    {error && <Alert type="error" showIcon message={error} action={<Button disabled={saving || loading} onClick={() => setReload(value => value + 1)}>{t('reload')}</Button>} />}
    {loading && !policy ? <Card loading /> : policy && <Form form={form} layout="vertical" onFinish={save} disabled={loading || saving}>
      <div className="loyalty-rates">
        <Card title={<Space><GiftOutlined />{t('earningTitle')}</Space>}>
          <Typography.Paragraph type="secondary">{t('earningHelp')}</Typography.Paragraph>
          <Form.Item name="spendPerPoint" label={t('spendPerPoint')} rules={[{ required: true, message: t('required') }, { type: 'integer', min: 1, max: 1000000000, message: t('positiveAmount') }]}>
            <InputNumber min={1} max={1000000000} precision={0} suffix="₫" />
          </Form.Item>
          <div className="loyalty-equation"><strong>{values?.spendPerPoint ? money(values.spendPerPoint) : '—'}</strong><span>→</span><strong>{t('onePoint')}</strong></div>
        </Card>
        <Card title={<Space><SwapOutlined />{t('redemptionTitle')}</Space>}>
          <Typography.Paragraph type="secondary">{t('redemptionHelp')}</Typography.Paragraph>
          <Form.Item name="pointValue" label={t('pointValue')} rules={[{ required: true, message: t('required') }, { type: 'integer', min: 1, max: 1000000000, message: t('positiveAmount') }]}>
            <InputNumber min={1} max={1000000000} precision={0} suffix="₫" />
          </Form.Item>
          <div className="loyalty-equation"><strong>{t('onePoint')}</strong><span>→</span><strong>{values?.pointValue ? money(values.pointValue) : '—'}</strong></div>
        </Card>
      </div>
      <div className="loyalty-section-heading">
        <Typography.Title level={4}>{t('tiersTitle')}</Typography.Title>
        <Typography.Text type="secondary">{t('tiersHelp')}</Typography.Text>
      </div>
      <div className="loyalty-tiers">
        <Card className="loyalty-tier loyalty-tier-member" title={t('member')}>
          <div className="loyalty-tier-benefit">0<span>%</span></div>
          <Typography.Paragraph type="secondary">{t('memberHelp')}</Typography.Paragraph>
          <Tag>{t('defaultTier')}</Tag>
        </Card>
        {(['silver', 'gold'] as const).map(tier => <Card key={tier} className={`loyalty-tier loyalty-tier-${tier}`} title={<Space><CrownOutlined />{t(tier)}</Space>}>
          <div className="loyalty-tier-benefit">{values?.[`${tier}Discount`] == null ? '—' : number(values[`${tier}Discount`])}<span>%</span></div>
          <Typography.Paragraph type="secondary">{t('tierBenefit')}</Typography.Paragraph>
          <Form.Item name={`${tier}Threshold`} label={t(`${tier}Threshold`)} dependencies={tier === 'gold' ? ['silverThreshold'] : []}
            rules={[{ required: true, message: t('required') }, { type: 'integer', min: 1, max: 1000000000, message: t('positiveAmount') }, ({ getFieldValue }) => ({
              validator(_, value) {
                return tier !== 'gold' || value == null || value > getFieldValue('silverThreshold') ? Promise.resolve() : Promise.reject(new Error(t('thresholdOrder')));
              },
            })]}>
            <InputNumber min={1} max={1000000000} precision={0} suffix={t('pointsUnit')} />
          </Form.Item>
          <Form.Item name={`${tier}Discount`} label={t(`${tier}Discount`)} dependencies={tier === 'gold' ? ['silverDiscount'] : []}
            rules={[{ required: true, message: t('required') }, { type: 'integer', min: 0, max: 100, message: t('percentRange') }, ({ getFieldValue }) => ({
              validator(_, value) {
                return tier !== 'gold' || value == null || value >= getFieldValue('silverDiscount') ? Promise.resolve() : Promise.reject(new Error(t('discountOrder')));
              },
            })]}>
            <InputNumber min={0} max={100} precision={0} suffix="%" />
          </Form.Item>
        </Card>)}
      </div>
      <Alert className="loyalty-rules" type="info" showIcon message={t('rulesTitle')} description={t('rules')} />
      <div className="loyalty-savebar">
        <div role="status"><Typography.Text strong>{dirty ? t('unsaved') : t('upToDate')}</Typography.Text><br /><Typography.Text type="secondary">{t('saveHint')}</Typography.Text></div>
        <Space wrap>
          <Button disabled={!dirty || saving || loading} onClick={() => form.setFieldsValue(policy)}>{t('reset')}</Button>
          <Button htmlType="submit" type="primary" icon={<SaveOutlined />} loading={saving} disabled={!dirty || loading}>{t('save')}</Button>
        </Space>
      </div>
    </Form>}
  </section>;
}
