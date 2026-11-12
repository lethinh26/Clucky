import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Descriptions, Popconfirm, Space, Spin, Table, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocaleTools } from '../../i18n/hooks';
import { getErrorMessage } from '../../lib/api';
import { adminNotificationsApi, type EmailLogDetail } from '../../lib/admin-notifications';

export function EmailDetails({ id, onRetried }: { id: number; onRetried: () => void }) {
  const { t } = useTranslation();
  const { date } = useLocaleTools();
  const [detail, setDetail] = useState<EmailLogDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reload, setReload] = useState(0);
  const retryRequest = useRef<{ generation: number; id: string } | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setDetail(null);
    adminNotificationsApi.emailDetail(id, controller.signal)
      .then(data => { if (!controller.signal.aborted) setDetail(data); })
      .catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reload]);

  async function retry() {
    if (!detail?.delivery.canRetry || busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError('');
    try {
      const generation = detail.delivery.generation;
      if (retryRequest.current?.generation !== generation) retryRequest.current = { generation, id: crypto.randomUUID() };
      await adminNotificationsApi.retryEmail(id, generation, retryRequest.current.id);
      onRetried();
    } catch (failure) {
      setError(`${t('admin:emailOps.retryUncertain')} ${getErrorMessage(failure)}`);
      setReload(value => value + 1);
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }

  const time = (value: string | null) => value ? date(value, { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const outcome = (value: string) => t(`admin:emailOps.codes.${value}`, { defaultValue: t('admin:emailOps.codes.DELIVERY_FAILED') });
  const delivery = detail?.delivery;
  return <Space orientation="vertical" style={{ width: '100%' }}>
    {error && <Alert type="error" showIcon title={error} action={<Button onClick={() => { setError(''); setReload(value => value + 1); }}>{t('admin:emailOps.refresh')}</Button>} />}
    {loading ? <Spin tip={t('admin:emailOps.loading')}><div style={{ minHeight: 80 }} /></Spin> : detail && delivery && <>
      <Descriptions column={{ xs: 1, md: 2 }} size="small" items={[
        { key: 'message', label: 'Message ID', children: delivery.messageId },
        { key: 'event', label: 'Event ID', children: delivery.eventId },
        { key: 'trace', label: 'Correlation ID', children: delivery.correlationId },
        { key: 'expiry', label: t('admin:emailOps.expiry'), children: time(delivery.expiresAt) },
        { key: 'next', label: t('admin:ui.nextAttempt'), children: time(delivery.nextAttemptAt) },
        { key: 'failure', label: t('admin:ui.diagnostics'), children: delivery.failureCode ? outcome(delivery.failureCode) : '—' },
        { key: 'outbox', label: t('admin:emailOps.failureStream'), children: t(`admin:emailOps.publication.${delivery.failureDeliveryStatus}`) },
      ]} />
      <Space wrap>
        {delivery.canRetry ? <Popconfirm title={t('admin:emailOps.confirmRetry')} description={t('admin:emailOps.retryDescription')}
          onConfirm={retry} okText={t('admin:emailOps.retry')} cancelText={t('admin:emailOps.cancel')} okButtonProps={{ loading: submitting }}>
          <Button loading={submitting}>{t('admin:emailOps.retry')}</Button>
        </Popconfirm> : <Typography.Text type="secondary">{t(`admin:emailOps.blocked.${delivery.retryBlockedReason}`, { defaultValue: t('admin:emailOps.blocked.UNSAFE_FAILURE') })}</Typography.Text>}
        <Button disabled={submitting} onClick={() => { setError(''); setReload(value => value + 1); }}>{t('admin:emailOps.refresh')}</Button>
      </Space>
      <Typography.Text strong>{t('admin:emailOps.attempts')}</Typography.Text>
      <Table size="small" rowKey="attemptNumber" dataSource={detail.attempts} pagination={false} scroll={{ x: 650 }} columns={[
        { title: t('admin:emailOps.attempt'), dataIndex: 'attemptNumber' },
        { title: t('admin:emailOps.generation'), dataIndex: 'generation' },
        { title: t('admin:emailOps.started'), dataIndex: 'startedAt', render: time },
        { title: t('admin:emailOps.finished'), dataIndex: 'finishedAt', render: time },
        { title: t('admin:emailOps.outcome'), dataIndex: 'outcome', render: outcome },
      ]} />
      <Typography.Text strong>{t('admin:emailOps.failureStream')}</Typography.Text>
      <Table size="small" rowKey="id" dataSource={detail.failures} pagination={false} scroll={{ x: 800 }} columns={[
        { title: 'Failure ID', dataIndex: 'id' },
        { title: t('admin:emailOps.outcome'), dataIndex: 'failureCode', render: outcome },
        { title: t('admin:emailOps.publishAttempts'), dataIndex: 'publishAttempts' },
        { title: t('admin:emailOps.published'), dataIndex: 'publishedAt', render: time },
        { title: t('admin:ui.nextAttempt'), dataIndex: 'nextAttemptAt', render: time },
      ]} />
      {detail.retries.length > 0 && <><Typography.Text strong>{t('admin:emailOps.manualHistory')}</Typography.Text>
        <Table size="small" rowKey="requestId" dataSource={detail.retries} pagination={false} columns={[
          { title: t('admin:emailOps.actor'), dataIndex: 'actorId' },
          { title: t('admin:emailOps.generation'), dataIndex: 'expectedGeneration', render: (value: number) => value + 1 },
          { title: t('admin:emailOps.started'), dataIndex: 'createdAt', render: time },
        ]} /></>}
    </>}
  </Space>;
}
