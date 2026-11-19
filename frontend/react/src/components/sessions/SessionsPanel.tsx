import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, InputNumber, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { api, getErrorMessage } from '../../lib/api';
import { expireSession } from '../../lib/session';
import { useAuth } from '../../context/AuthContext';
import { useLocaleTools } from '../../i18n/hooks';

interface DeviceSession {
  sessionId: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

interface Overview {
  userId: number;
  activeCount: number;
  limit: number;
  sessions: DeviceSession[];
}

/** Shared view used for own sessions and explicitly authorized branch accounts. Never mounted for STAFF. */
export function SessionsPanel({ accountId, accountName }: { accountId?: number; accountName?: string }) {
  const { t } = useTranslation('accounts');
  const { locale } = useLocaleTools();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const base = accountId == null ? '/api/auth/sessions' : `/api/auth/branch/accounts/${accountId}/sessions`;

  const refresh = useCallback(async () => {
    const response = await api.get<Overview>(base);
    setOverview(response.data);
    setLimit(response.data.limit);
  }, [base]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void api.get<Overview>(base).then(({ data }) => {
      if (mounted) { setOverview(data); setLimit(data.limit); setError(''); }
    }).catch(failure => { if (mounted) setError(getErrorMessage(failure)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [base]);

  async function perform(action: () => Promise<unknown>, terminatesCurrent = false) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await action();
      if (terminatesCurrent) {
        expireSession();
        navigate('/login', { replace: true });
        return;
      }
      await refresh();
      setNotice(t('deviceSessions.updated'));
    } catch (failure) {
      if (isAxiosError(failure) && failure.response?.status === 409) {
        setError(t('deviceSessions.limitConflict'));
      } else {
        setError(getErrorMessage(failure));
      }
    } finally {
      setBusy(false);
    }
  }

  const date = (value: string) => new Date(value).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
  return <Card title={<Space><SafetyCertificateOutlined /> {accountName || t('deviceSessions.title')}</Space>}
    extra={<Button icon={<ReloadOutlined />} disabled={busy} loading={loading}
      onClick={() => void perform(refresh)}>{t('reload')}</Button>}>
    {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
    {notice && <Alert type="success" showIcon message={notice} style={{ marginBottom: 12 }} />}
    <Typography.Paragraph type="secondary">{t('deviceSessions.browserNote')}</Typography.Paragraph>
    {overview && <>
      <Space size="middle" wrap style={{ marginBottom: 18 }}>
        <Tag color={overview.activeCount >= overview.limit ? 'warning' : 'success'}>
          {t('deviceSessions.usage', { active: overview.activeCount, limit: overview.limit })}
        </Tag>
        <span>{t('deviceSessions.limit')}</span>
        <InputNumber aria-label={t('deviceSessions.limit')} min={1} max={10} precision={0} value={limit}
          disabled={busy} onChange={setLimit} />
        <Button disabled={busy || limit == null || limit === overview.limit || limit < 1 || limit > 10}
          onClick={() => void perform(() => api.patch(`${base}/limit`, { limit }))}>{t('deviceSessions.save')}</Button>
        {overview.sessions.length > 0 && (accountId == null ?
          <Popconfirm title={t('deviceSessions.confirmOthers')} onConfirm={() => void perform(() => api.post(`${base}/revoke-others`))}>
            <Button disabled={busy || overview.sessions.every(session => session.current)} danger>{t('deviceSessions.revokeOthers')}</Button>
          </Popconfirm> :
          <Popconfirm title={t('deviceSessions.confirmAll')} onConfirm={() => void perform(() => api.post(`${base}/revoke-all`), accountId === user.id)}>
            <Button danger disabled={busy}>{t('deviceSessions.revokeAll')}</Button>
          </Popconfirm>)}
      </Space>
      <Table<DeviceSession> rowKey="sessionId" loading={loading || busy} pagination={false}
        dataSource={overview.sessions} size="small" scroll={{ x: 720 }}
        locale={{ emptyText: <Empty description={t('deviceSessions.empty')} /> }} columns={[
          { title: t('deviceSessions.browser'), dataIndex: 'userAgent', render: (agent: string | null, session) => <Space direction="vertical" size={2}>
              <span style={{ overflowWrap: 'anywhere' }}>{agent || t('deviceSessions.unknown')}</span>
              {session.current && <Tag color="processing">{t('deviceSessions.current')}</Tag>}
            </Space> },
          { title: t('deviceSessions.signedIn'), dataIndex: 'createdAt', render: date },
          { title: t('deviceSessions.lastActive'), dataIndex: 'lastSeenAt', render: date },
          { title: t('deviceSessions.expires'), dataIndex: 'expiresAt', render: date },
          { title: t('action'), key: 'actions', render: (_, session) => <Popconfirm
              title={session.current ? t('deviceSessions.confirmCurrent') : t('deviceSessions.confirmOne')}
              onConfirm={() => void perform(() => api.delete(`${base}/${encodeURIComponent(session.sessionId)}`), session.current)}>
              <Button danger icon={<DeleteOutlined />} disabled={busy} aria-label={t('deviceSessions.revoke')}>
                {t('deviceSessions.revoke')}
              </Button>
            </Popconfirm> },
        ]} />
    </>}
  </Card>;
}

export function MySessionsPage() {
  const { t } = useTranslation('accounts');
  return <div style={{ display: 'grid', gap: 16 }}>
    <Typography.Title level={2}>{t('deviceSessions.myTitle')}</Typography.Title>
    <SessionsPanel />
  </div>;
}
