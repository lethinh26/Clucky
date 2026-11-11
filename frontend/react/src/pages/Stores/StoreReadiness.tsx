import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Space, Spin, Steps, Tag } from 'antd';
import { TeamOutlined, RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getErrorMessage, type Store } from '../../lib/api';
import { catalogAdministration, type StoreReadinessStatus } from '../../lib/catalog-administration';
import { readinessLabel } from './presentation';

export function StoreReadiness({ store, onUpdated, disabled = false }: { store: Store; onUpdated: () => Promise<void>; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StoreReadinessStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const lock = useRef(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setStatus(null);
    catalogAdministration.storeReadiness(store.id, controller.signal).then(result => {
      if (!controller.signal.aborted) setStatus(result);
    }).catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, store.id, attempt]);
  const retry = async () => {
    if (lock.current) return;
    lock.current = true; setRetrying(true); setError('');
    try { setStatus(await catalogAdministration.retryStoreAccounts(store.id)); await onUpdated(); }
    catch (failure) { setError(getErrorMessage(failure)); }
    finally { lock.current = false; setRetrying(false); }
  };
  return <>
    <button type="button" className={`stores-readiness ${store.accountReadiness === 'READY' ? 'is-ready' : ''}`} disabled={disabled} onClick={() => setOpen(true)} aria-label={`Xem tài khoản ${store.name}`}>
      <span><TeamOutlined />{readinessLabel(store.accountReadiness)}</span><small>Chi tiết tài khoản <RightOutlined /></small>
    </button>
    <Modal className="stores-modal" centered width={580} maskClosable={false} closable={!retrying} keyboard={!retrying} open={open}
      title={<div className="stores-modal-heading"><h3>Tài khoản chi nhánh</h3><p>{store.name}</p></div>} footer={null} onCancel={() => { if (!lock.current) setOpen(false); }}>
      <Spin spinning={loading || retrying}>
        <Space orientation="vertical" size={18} style={{ width: '100%' }}>
          {status && <Tag color={status.readiness === 'READY' ? 'green' : 'gold'}>{readinessLabel(status.readiness)}</Tag>}
          {status && ['PENDING', 'PROVISIONED', 'READY'].includes(status.readiness) && <Steps size="small" current={status.readiness === 'PENDING' ? 0 : status.readiness === 'PROVISIONED' ? 1 : 2} status={status.readiness === 'READY' ? 'finish' : 'process'} items={[{ title: 'Cấp tài khoản' }, { title: 'Kích hoạt' }, { title: 'Sẵn sàng' }]} />}
          <p className="stores-note">{status?.readiness === 'UNPROVISIONED' ? 'Chi nhánh chưa có tài khoản quản lý và tác nghiệp, chưa đủ điều kiện nhận đơn. Hệ thống không tự tạo tài khoản hoặc mật khẩu thay thế.' : 'Chi nhánh chỉ nhận đơn khi tài khoản sẵn sàng. Thử cấp lại không thay thế bước kích hoạt của người quản lý.'}</p>
          <Link className="stores-account-link" to="/admin/users">Quản lý kích hoạt, khôi phục và khóa tài khoản <RightOutlined /></Link>
          {status?.error && <Alert type="warning" showIcon title={status.error} />}
          {error && <Alert type="error" showIcon title={error} action={<Button disabled={loading || retrying} onClick={() => setAttempt(value => value + 1)}>Thử lại</Button>} />}
          {status && ['PENDING', 'PROVISIONED'].includes(status.readiness) && <Button type="primary" loading={retrying} disabled={loading} onClick={() => void retry()}>Thử cấp / đồng bộ tài khoản</Button>}
        </Space>
      </Spin>
    </Modal>
  </>;
}
