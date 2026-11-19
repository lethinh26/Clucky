import { useEffect, useRef, useState } from 'react';
import { Alert, App, Descriptions, Form, Input, InputNumber, Modal, Spin, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocaleTools } from '../../i18n/hooks';
import { adminCustomersApi, type AdminCustomer, type CustomerPoints } from '../../lib/admin-customers';
import { getErrorMessage } from '../../lib/api';

type Values = { newTotalPoints: number; reason: string };

export function LoyaltyPointsModal({ customer, onClose, onSaved }: {
  customer: AdminCustomer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { locale } = useLocaleTools();
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [data, setData] = useState<CustomerPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Retain the same request id while retrying an uncertain network response.
  const operation = useRef(crypto.randomUUID());

  useEffect(() => {
    const controller = new AbortController();
    adminCustomersApi.points(customer.id, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return;
        setData(result);
        form.setFieldsValue({ newTotalPoints: result.points.totalPoints });
      })
      .catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [customer.id, form]);

  const save = async (values: Values) => {
    if (saving || !data) return;
    setSaving(true);
    setError('');
    try {
      await adminCustomersApi.adjustPoints(customer.id, {
        expectedTotalPoints: data.points.totalPoints,
        newTotalPoints: values.newTotalPoints,
        reason: values.reason.trim(),
        operationId: operation.current,
      });
      void message.success(t('admin:customerDirectory.pointsSaved'));
      onSaved();
    } catch (failure) {
      const conflict = failure && typeof failure === 'object' && 'status' in failure && failure.status === 409;
      setError(conflict ? t('admin:customerDirectory.pointsConflict') : getErrorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  return <Modal open width={680} destroyOnHidden
    title={`${t('admin:customerDirectory.pointsTitle')} — ${customer.fullName}`}
    okText={t('admin:voucherUi.saveCampaign')}
    okButtonProps={{ disabled: loading || !data || Boolean(error) }}
    confirmLoading={saving}
    closable={!saving} maskClosable={!saving} keyboard={!saving} cancelButtonProps={{ disabled: saving }}
    onCancel={() => { if (!saving) onClose(); }} onOk={() => form.submit()}>
    {loading ? <Spin /> : data && <>
      <Descriptions column={2} bordered size="small" items={[
        { key: 'total', label: t('admin:customerDirectory.totalPoints'), children: data.points.totalPoints.toLocaleString(locale) },
        { key: 'reserved', label: t('admin:customerDirectory.reservedPoints'), children: data.points.reservedPoints.toLocaleString(locale) },
        { key: 'available', label: t('admin:customerDirectory.availablePoints'), children: data.points.availablePoints.toLocaleString(locale) },
        { key: 'lifetime', label: t('admin:customerDirectory.lifetimePoints'), children: data.points.lifetimePoints.toLocaleString(locale) },
      ]} />
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        {t('admin:customerDirectory.pointsKeepTier')}
      </Typography.Paragraph>
      <Form<Values> form={form} layout="vertical" onFinish={save} disabled={saving} onValuesChange={() => {
        operation.current = crypto.randomUUID();
        setError('');
      }}>
        <Form.Item name="newTotalPoints" label={t('admin:customerDirectory.pointsNewTotal')}
          rules={[{ required: true, type: 'number', min: data.points.reservedPoints, max: 2_000_000_000 }]}>
          <InputNumber style={{ width: '100%' }} precision={0} min={data.points.reservedPoints} max={2_000_000_000} />
        </Form.Item>
        <Form.Item name="reason" label={t('admin:customerDirectory.pointsReason')}
          extra={t('admin:customerDirectory.pointsReasonHint')}
          rules={[{ required: true, whitespace: true, min: 3, max: 255 }]}>
          <Input.TextArea rows={3} showCount maxLength={255} />
        </Form.Item>
      </Form>
      <Typography.Title level={5}>{t('admin:customerDirectory.pointsHistory')}</Typography.Title>
      <Table size="small" rowKey="id" pagination={{ pageSize: 5 }} dataSource={data.adjustments}
        locale={{ emptyText: t('admin:customerDirectory.pointsHistoryEmpty') }}
        columns={[
          { title: t('admin:customerDirectory.pointsDelta'), dataIndex: 'delta', render: (value: number) =>
            <Tag color={value > 0 ? 'success' : 'error'}>{value > 0 ? '+' : ''}{value.toLocaleString(locale)}</Tag> },
          { title: t('admin:customerDirectory.pointsReason'), dataIndex: 'reason' },
          { title: t('admin:customerDirectory.pointsChangedBy'), dataIndex: 'actorId', render: (value: number) => `#${value}` },
          { title: t('admin:ui.registrationDate'), dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString(locale) },
        ]} />
    </>}
    {error && <Alert type="error" showIcon message={error} style={{ marginTop: 12 }} />}
  </Modal>;
}
