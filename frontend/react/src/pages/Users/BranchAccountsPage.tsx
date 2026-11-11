import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Descriptions, Dropdown, Empty, Form, Input, Select, Skeleton, Space, Steps, Table, Tabs, Tag, Typography } from "antd";
import type { TableColumnsType } from 'antd';
import { AuditOutlined, KeyOutlined, LockOutlined, MailOutlined, MoreOutlined, SafetyCertificateOutlined, ShopOutlined, TeamOutlined, UnlockOutlined } from '@ant-design/icons';
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { api, storesApi, getErrorMessage, type Store } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { usePageLoading } from "../../components/ui-loader/page-loading";
import { AdminModal } from '../../components/ui/AdminModal';
import { matchesStoreSearch } from '../Stores/presentation';
import { orderDate } from '../Orders/presentation';
import { useLocaleTools } from '../../i18n/hooks';
import { accountAuditAction, accountReadiness, accountRole, type Account } from './branch-account-presentation';
import './branch-accounts.css';

interface Pair { storeId: number; readiness: string; recoveryEmail: string | null; verified: boolean; accounts: Account[] }
interface Audit { id: number; actorId: number; actorRole?: string; targetId?: number; action: string; occurredAt: string; detail: { sessionId?: string; result?: string } }
interface Management { targetId: number; purpose: string; currentPassword: string; newEmail?: string }

export function BranchAccountsPage() {
  const { t } = useTranslation("accounts");
  const { user, isAdmin } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<number | undefined>(isAdmin ? undefined : user.storeId ?? undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [branchBusy, setBranchBusy] = useState(false);
  usePageLoading(loading);
  const load = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try { const result = await storesApi.list(false, signal); if (!signal?.aborted) setStores(result); }
    catch (failure) { if (!signal?.aborted) setError(getErrorMessage(failure)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const selectedStore = stores.find(store => store.id === storeId);
  if (isAdmin) return <div className="branch-accounts-page">
    <header className="branch-accounts-heading"><div><span className="branch-eyebrow">QUẢN TRỊ TOÀN HỆ THỐNG</span><Typography.Title level={2}>{t('title')}</Typography.Title>
      <Typography.Text type="secondary">Quản lý tài khoản, bảo mật và lịch sử truy cập theo từng chi nhánh.</Typography.Text></div>
      <Tag icon={<ShopOutlined />}>{stores.length} chi nhánh</Tag></header>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => void load()}>Thử lại</Button>} />}
    <section className="branch-selector">
      <div><label htmlFor="branch-account-store">Chi nhánh quản lý</label><Select id="branch-account-store" showSearch optionFilterProp="label" aria-label={t('store')}
        placeholder="Tìm theo tên, mã hoặc địa chỉ chi nhánh" value={storeId} loading={loading} disabled={branchBusy}
        filterOption={(input, option) => matchesStoreSearch([option?.label, option?.address], input)}
        onChange={setStoreId} options={stores.map(store => ({ value: store.id, label: `#${store.id} · ${store.name}`, address: store.address }))}
        notFoundContent={loading ? 'Đang tải chi nhánh…' : 'Không tìm thấy chi nhánh'} /></div>
      {selectedStore ? <div className="branch-selected-info"><ShopOutlined /><div><strong>{selectedStore.name}</strong><span>{selectedStore.address}</span></div>
        <Tag color={selectedStore.status === 'OPEN' ? 'success' : selectedStore.status === 'INACTIVE' ? 'default' : 'gold'}>
          {selectedStore.status === 'OPEN' ? 'Đang mở cửa' : selectedStore.status === 'INACTIVE' ? 'Ngừng hoạt động' : 'Tạm đóng cửa'}</Tag></div>
        : <p className="branch-hint">Mỗi chi nhánh có tài khoản quản lý và tài khoản tác nghiệp riêng. Chọn chi nhánh để xem đúng dữ liệu và quyền truy cập.</p>}
    </section>
    {storeId ? <BranchDetails key={`branch-accounts:${storeId}`} storeId={storeId} storeName={selectedStore?.name} onBusyChange={setBranchBusy} />
      : <section className="branch-empty"><Empty image={<TeamOutlined />} description={<><strong>Chọn chi nhánh để bắt đầu</strong><p>Xem tài khoản hiện hành, hỗ trợ khôi phục và kiểm tra nhật ký của chi nhánh.</p></>} />
        <div className="branch-role-guide"><span><SafetyCertificateOutlined /> Tài khoản quản lý chi nhánh</span><span><TeamOutlined /> Tài khoản tác nghiệp dùng chung</span></div></section>}
  </div>;
  return <Space direction="vertical" size="large" style={{ width: "100%" }}>
    <Typography.Title level={2}>{t("title")}</Typography.Title>
    {error && <Alert type="error" message={error} action={<Button onClick={() => void load()}>{t("reload")}</Button>} />}
    {isAdmin && <Select aria-label={t("store")} placeholder={t("store")} style={{ width: "min(100%, 480px)" }} value={storeId} onChange={setStoreId}
      options={stores.map(store => ({ value: store.id, label: `${store.id} — ${store.name}` }))} />}
    {storeId && <BranchDetails key={storeId} storeId={storeId} />}
  </Space>;
}

function BranchDetails({ storeId, storeName, onBusyChange }: { storeId: number; storeName?: string; onBusyChange?: (busy: boolean) => void }) {
  const { t } = useTranslation("accounts");
  const { isAdmin } = useAuth();
  const { locale } = useLocaleTools();
  const [pair, setPair] = useState<Pair | null>(null);
  const [status, setStatus] = useState<{ readiness: string; error: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<{ id: string; purpose: string; targetId: number; newEmail?: string } | null>(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const [managementOpen, setManagementOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(true);
  const [dialogError, setDialogError] = useState('');
  const [accountToLock, setAccountToLock] = useState<Account | null>(null);
  const operationLock = useRef(false);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [management] = Form.useForm();
  const [verification] = Form.useForm();
  const accountRequest = useRef<AbortController | null>(null);
  useEffect(() => { onBusyChange?.(busy || managementOpen || !!accountToLock); return () => onBusyChange?.(false); }, [busy, managementOpen, accountToLock, onBusyChange]);
  const base = `/api/auth/branch/stores/${storeId}`;
  const load = useCallback(async () => {
    accountRequest.current?.abort();
    const controller = new AbortController();
    accountRequest.current = controller;
    try {
    const [state, accounts] = await Promise.all([
      api.get(`/api/stores/${storeId}/accounts-status`, { signal: controller.signal }),
      api.get<Pair>(base, { signal: controller.signal }).catch(failure => {
        if (isAxiosError(failure) && failure.response?.status === 404) return { data: null };
        throw failure;
      }),
    ]);
    if (!controller.signal.aborted) { setStatus(state.data); setPair(accounts.data); setError(''); }
    } catch (failure) { if (!controller.signal.aborted) throw failure; }
    finally { if (!controller.signal.aborted) setDetailLoading(false); }
  }, [base, storeId]);
  useEffect(() => {
    void load().catch(failure => setError(getErrorMessage(failure)));
    return () => accountRequest.current?.abort();
  }, [load]);
  useEffect(() => {
    if (!isAdmin || busy || managementOpen || accountToLock) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void load().catch(failure => setError(getErrorMessage(failure)));
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [isAdmin, busy, managementOpen, accountToLock, load]);
  async function run(action: () => Promise<void>, inDialog = false) {
    if (operationLock.current) return false;
    operationLock.current = true;
    accountRequest.current?.abort();
    setBusy(true); setError(""); setNotice(""); setDialogError('');
    try { await action(); return true; } catch (failure) { if (inDialog) setDialogError(getErrorMessage(failure)); else setError(getErrorMessage(failure)); return false; }
    finally { operationLock.current = false; setBusy(false); }
  }
  const accountColumns = [
    { title: "ID", dataIndex: "id" }, { title: t("account"), dataIndex: "login" },
    { title: t("role"), dataIndex: "role" }, { title: t("status"), dataIndex: "status" },
    { title: t("activated"), dataIndex: "activated", render: (value: boolean) => t(value ? "yes" : "no") },
    { title: t("current"), dataIndex: "current", render: (value: boolean) => t(value ? "yes" : "no") },
  ];
  async function startManagement(values: Management) {
    await run(async () => {
      const { targetId, ...body } = values;
      const response = await api.post(`/api/auth/branch/accounts/${targetId}/challenge`, body);
      setChallenge({ id: response.data.challengeId, purpose: values.purpose, targetId, newEmail: values.newEmail });
      management.resetFields(["currentPassword"]); verification.resetFields(); setNotice("manageSent");
    }, isAdmin);
  }
  async function finishManagement(values: { otp: string; newEmailOtp?: string; password?: string }) {
    await run(async () => {
      if (!challenge) return;
      await api.post("/api/auth/branch/management/finish", { ...values, challengeId: challenge.id });
      setChallenge(null); verification.resetFields(); management.resetFields(); setManagementOpen(false); setNotice("done");
      if (isAdmin) await load().catch(failure => setError(`Đã lưu thay đổi, nhưng chưa tải được trạng thái mới: ${getErrorMessage(failure)}`));
    }, isAdmin);
  }
  const loadAudit = useCallback(async (page: number, signal?: AbortSignal) => {
    setAuditLoading(true); setAuditError("");
    try {
      const response = await api.get<{ content: Audit[]; totalElements: number }>("/api/audit-logs", { params: { storeId, page, size: 20, ...(isAdmin ? { sourceService: 'identity-service' } : {}) }, signal });
      if (!signal?.aborted) { setAudit(response.data.content); setAuditTotal(response.data.totalElements); setAuditPage(page); }
    } catch (failure) { if (!signal?.aborted) setAuditError(getErrorMessage(failure)); }
    finally { if (!signal?.aborted) setAuditLoading(false); }
  }, [storeId, isAdmin]);
  useEffect(() => {
    if (!isAdmin || busy || activeTab !== 'audit') return;
    let controller = new AbortController();
    const refresh = () => {
      controller.abort(); controller = new AbortController();
      void loadAudit(auditPage, controller.signal);
    };
    refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [isAdmin, busy, auditPage, activeTab, loadAudit]);

  function beginManagement(account: Account, purpose: string) {
    setChallenge(null); setDialogError(''); management.resetFields(); verification.resetFields();
    management.setFieldsValue({ targetId: account.id, purpose }); setManagementOpen(true);
  }


  const managementForm = <Form id={`branch-management-${storeId}`} form={management} layout="vertical" onFinish={startManagement} disabled={busy} initialValues={{ purpose: 'RECOVERY' }}>
    <Form.Item name="targetId" label={t('target')} rules={[{ required: true }]}><Select options={pair?.accounts.map(account => ({ value: account.id, label: `${account.login} · ${isAdmin ? accountRole(account.role) : account.role}` }))} /></Form.Item>
    <Form.Item name="purpose" label={t('purpose')} rules={[{ required: true }]}><Select options={[
      { value: 'RECOVERY', label: t('changeRecovery') }, ...(isAdmin ? [{ value: 'RESET', label: t('reset') }] : []),
    ]} /></Form.Item>
    <Form.Item noStyle shouldUpdate={(previous, current) => previous.purpose !== current.purpose}>{({ getFieldValue }) => getFieldValue('purpose') === 'RECOVERY' &&
      <Form.Item name="newEmail" label={t('newEmail')} preserve={false} rules={[{ required: true, type: 'email', max: 255 }]}><Input autoComplete="email" maxLength={255} placeholder={isAdmin ? 'Nhập email nhận mã khôi phục của chi nhánh' : undefined} /></Form.Item>}
    </Form.Item>
    <Form.Item name="currentPassword" label={t('currentPassword')} rules={[{ required: true, max: 72 }]}><Input.Password autoComplete="current-password" maxLength={72} /></Form.Item>
    {!isAdmin && <Button htmlType="submit" loading={busy}>{t('request')}</Button>}
  </Form>;
  const verificationForm = challenge && <Form id={`branch-verification-${storeId}`} key={`verification:${challenge.id}`} form={verification} layout="vertical" onFinish={finishManagement} disabled={busy}>
    {!isAdmin && <><p>{t('target')}: {challenge.targetId} — {challenge.purpose}</p><p>{t('challenge')}: {challenge.id}</p></>}
    <Form.Item name="otp" label={isAdmin ? 'Mã OTP gửi đến email Admin' : t('otp')} rules={[{ required: true, pattern: /^\d{8}$/, message: 'Nhập đủ 8 chữ số OTP.' }]}><Input inputMode="numeric" maxLength={8} autoComplete="one-time-code" /></Form.Item>
    {challenge.purpose === 'RECOVERY' ? <Form.Item name="newEmailOtp" label={t('newOtp')} rules={[{ required: true, pattern: /^\d{8}$/ }]}><Input inputMode="numeric" maxLength={8} autoComplete="off" /></Form.Item>
      : <Form.Item name="password" label={t('password')} rules={[{ required: true, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/ }]}><Input.Password autoComplete="new-password" maxLength={72} /></Form.Item>}
    {!isAdmin && <Button htmlType="submit" type="primary" loading={busy}>{t('confirm')}</Button>}
  </Form>;
  const displayColumns: TableColumnsType<Account> = [
    { title: 'Tài khoản', width: 220, render: (_, account) => <div className="branch-account-cell"><strong>{account.login}</strong><small>#{account.id} · {account.current ? 'Tài khoản hiện hành' : 'Tài khoản cũ'}</small></div> },
    { title: 'Vai trò', width: 185, render: (_, account) => <Tag icon={account.role === 'STORE_MANAGER' ? <SafetyCertificateOutlined /> : <TeamOutlined />}>{accountRole(account.role)}</Tag> },
    { title: 'Trạng thái', width: 135, render: (_, account) => <Tag color={account.status === 'ACTIVE' ? 'success' : 'error'}>{account.status === 'ACTIVE' ? 'Đang hoạt động' : account.status === 'LOCKED' ? 'Đã khóa' : account.status}</Tag> },
    { title: 'Kích hoạt', width: 140, render: (_, account) => <Tag color={account.activated ? 'success' : 'gold'}>{account.activated ? 'Đã kích hoạt' : 'Chờ kích hoạt'}</Tag> },
  ];
  const readiness = pair?.readiness ?? status?.readiness;

  if (isAdmin) return <div className="branch-details">
    {error && <Alert showIcon type="error" message={error} />}
    {notice && <Alert showIcon type="success" message={t(notice)} />}
    {detailLoading && <Card><Skeleton active paragraph={{ rows: 5 }} /></Card>}
    {!detailLoading && <>
      <section className="branch-readiness"><div className="branch-readiness-icon"><SafetyCertificateOutlined /></div><div><strong>{accountReadiness(readiness)}</strong>
        <p>{readiness === 'READY' ? 'Tài khoản hiện hành đã sẵn sàng. Trạng thái mở cửa của chi nhánh được quản lý riêng.'
          : readiness === 'UNPROVISIONED' ? 'Chi nhánh chưa có tài khoản quản lý và tác nghiệp. Hệ thống không tự tạo tài khoản hoặc mật khẩu thay thế.'
          : readiness === 'PROVISIONED' ? 'Tài khoản đã được cấp. Hoàn tất kích hoạt qua email khôi phục để sẵn sàng sử dụng.' : 'Hệ thống đang đồng bộ trạng thái tài khoản chi nhánh.'}</p></div>
        {(status?.error || readiness === 'PENDING') && readiness !== 'UNPROVISIONED' && <Button loading={busy} onClick={() => void run(async () => { await api.post(`/api/stores/${storeId}/accounts-retry`); await load(); })}>Thử cấp lại tài khoản</Button>}
      </section>
      {status?.error && <Alert type="warning" showIcon message="Đồng bộ tài khoản chưa hoàn tất" description={status.error} />}
      <Tabs className="branch-tabs" activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'accounts', label: 'Tài khoản hiện hành', icon: <TeamOutlined />, children: pair ? <section className="branch-panel">
          <div className="branch-panel-heading"><div><h3>Tài khoản truy cập chi nhánh</h3><p>Tài khoản tác nghiệp được dùng chung, không đại diện cho một nhân viên cụ thể.</p></div><Tag>{pair.accounts.length} tài khoản</Tag></div>
          <Table<Account> rowKey="id" size="middle" dataSource={pair.accounts} pagination={false} scroll={{ x: 760 }} columns={[...displayColumns,
            { title: 'Thao tác', width: 100, fixed: 'right', render: (_, account) => <Dropdown trigger={['click']} menu={{ items: [
              { key: 'reset', label: 'Đặt lại mật khẩu', icon: <KeyOutlined />, disabled: !account.activated || !account.current },
              { key: 'recovery', label: 'Đổi email khôi phục', icon: <MailOutlined />, disabled: !account.current },
              { type: 'divider' }, { key: 'lock', label: account.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản', danger: account.status === 'ACTIVE',
                icon: account.status === 'ACTIVE' ? <LockOutlined /> : <UnlockOutlined />, disabled: !account.current },
            ], onClick: ({ key }) => { if (key === 'lock') { setDialogError(''); setAccountToLock(account); } else beginManagement(account, key === 'reset' ? 'RESET' : 'RECOVERY'); } }}>
              <Button disabled={busy} icon={<MoreOutlined />} aria-label={`Thao tác tài khoản ${account.login}`}>Quản lý</Button></Dropdown> },
          ]} />
          <div className="branch-recovery"><MailOutlined /><div><span>Email khôi phục của chi nhánh</span><strong>{pair.recoveryEmail || 'Chưa thiết lập'}</strong><small>Thông tin khôi phục được dùng chung cho cặp tài khoản hiện hành.</small></div>
            <Tag color={pair.verified ? 'success' : 'gold'}>{pair.verified ? 'Đã xác minh' : 'Chưa xác minh'}</Tag>
            {!pair.recoveryEmail && pair.accounts[0] && <Button disabled={busy} onClick={() => beginManagement(pair.accounts[0], 'RECOVERY')}>Thiết lập email khôi phục</Button>}</div>
          {!pair.recoveryEmail && <Alert type="warning" showIcon message="Chưa có email để tự khôi phục tài khoản."
            description="Đăng nhập và mật khẩu hiện tại vẫn giữ nguyên. Admin cần thiết lập email khôi phục thực tế và xác minh OTP; hệ thống không tự dùng email cũ làm email khôi phục chung." />}
          {pair.accounts.some(account => !account.activated) && <Alert type="info" showIcon message="Tài khoản chưa kích hoạt cần dùng mã được gửi tới email khôi phục." description="Chức năng đặt lại mật khẩu chỉ dùng cho tài khoản đã kích hoạt." />}
        </section> : <section className="branch-panel"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chi nhánh chưa có cặp tài khoản hiện hành">
          <p className="branch-hint">{readiness === 'UNPROVISIONED' ? 'Không tìm thấy tài khoản quản lý hoặc tác nghiệp được cấp cho chi nhánh này.' : 'Trạng thái cấp tài khoản sẽ tự cập nhật khi hệ thống đồng bộ xong.'}</p>
        </Empty></section> },
        { key: 'audit', label: 'Nhật ký tài khoản', icon: <AuditOutlined />, children: <section className="branch-panel">
          <div className="branch-panel-heading"><div><h3>Lịch sử tài khoản & truy cập</h3><p>Chỉ hiển thị sự kiện tài khoản của chi nhánh đang chọn. Tài khoản dùng chung không xác định danh tính nhân viên.</p></div>
            <Tag>{auditTotal} sự kiện</Tag></div>
          {auditError && <Alert type="error" showIcon message={auditError} />}
          <Table<Audit> rowKey="id" size="small" loading={auditLoading} dataSource={audit} scroll={{ x: 760 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có sự kiện tài khoản được ghi nhận" /> }}
            pagination={{ current: auditPage + 1, pageSize: 20, total: auditTotal, showSizeChanger: false, hideOnSinglePage: true, onChange: page => { setAudit([]); setAuditPage(page - 1); } }} columns={[
              { title: 'Thời gian · giờ Việt Nam', width: 175, render: (_, entry) => orderDate(entry.occurredAt, locale) },
              { title: 'Thao tác', width: 235, render: (_, entry) => accountAuditAction(entry.action) },
              { title: 'Người thực hiện', width: 175, render: (_, entry) => <div className="branch-account-cell"><span>#{entry.actorId}</span><small>{entry.actorRole ? accountRole(entry.actorRole) : 'Chưa rõ vai trò'}</small></div> },
              { title: 'Đối tượng', width: 100, render: (_, entry) => entry.targetId ? `#${entry.targetId}` : '—' },
              { title: 'Kết quả', render: (_, entry) => <Tag color={entry.detail?.result === 'SUCCESS' ? 'success' : entry.detail?.result === 'FAILED' ? 'error' : 'default'}>
                {entry.detail?.result === 'SUCCESS' ? 'Thành công' : entry.detail?.result === 'FAILED' ? 'Thất bại' : entry.detail?.result || 'Chưa có kết quả'}</Tag> },
            ]} />
        </section> },
      ]} />
    </>}
    <AdminModal className="branch-account-modal" centered width={560} open={managementOpen} title="Hỗ trợ tài khoản chi nhánh" subtitle={storeName || `Chi nhánh #${storeId}`}
      confirmLoading={busy} onCancel={() => { setManagementOpen(false); setChallenge(null); management.resetFields(); verification.resetFields(); setDialogError(''); }}
      okText={challenge ? 'Xác nhận thay đổi' : 'Gửi mã xác minh'} cancelText="Đóng" okButtonProps={{ htmlType: 'submit', form: challenge ? `branch-verification-${storeId}` : `branch-management-${storeId}` }}>
      <Steps size="small" current={challenge ? 1 : 0} items={[{ title: 'Thông tin thay đổi' }, { title: 'Xác minh OTP' }]} />
      <Alert type="info" showIcon message={challenge ? 'Mã xác minh đã được gửi đến email.' : 'Thay đổi được bảo vệ bằng mật khẩu Admin và OTP.'}
        description={challenge?.purpose === 'RECOVERY' ? 'Nhập mã từ email Admin và email khôi phục mới. Đổi email ảnh hưởng cả cặp tài khoản của chi nhánh.' : t('adminHelp')} />
      {dialogError && <Alert type="error" showIcon message={dialogError} />}
      {challenge ? <><Descriptions size="small" column={1} items={[
        { key: 'target', label: 'Tài khoản', children: pair?.accounts.find(account => account.id === challenge.targetId)?.login || `#${challenge.targetId}` },
        { key: 'purpose', label: 'Thay đổi', children: challenge.purpose === 'RECOVERY' ? 'Đổi email khôi phục' : 'Đặt lại mật khẩu' },
        ...(challenge.purpose === 'RECOVERY' ? [{ key: 'email', label: 'Email mới', children: challenge.newEmail }] : []),
      ]} />{verificationForm}</> : managementForm}
    </AdminModal>
    <AdminModal className="branch-account-modal" centered width={480} open={accountToLock !== null} title={accountToLock?.status === 'ACTIVE' ? 'Khóa tài khoản chi nhánh' : 'Mở khóa tài khoản chi nhánh'}
      subtitle={accountToLock?.login} confirmLoading={busy} onCancel={() => { setAccountToLock(null); setDialogError(''); }} okText={accountToLock?.status === 'ACTIVE' ? 'Xác nhận khóa' : 'Xác nhận mở khóa'} cancelText="Quay lại"
      okButtonProps={{ danger: accountToLock?.status === 'ACTIVE' }} onOk={async () => {
        if (!accountToLock) return;
        const success = await run(async () => {
          await api.put(`/api/auth/branch/accounts/${accountToLock.id}/lock`, null, { params: { locked: accountToLock.status === 'ACTIVE' } });
          setNotice('done');
          await load().catch(failure => setError(`Đã đổi trạng thái tài khoản, nhưng chưa tải được dữ liệu mới: ${getErrorMessage(failure)}`));
        }, true);
        if (success) setAccountToLock(null);
      }}>
      <Alert type="warning" showIcon message="Toàn bộ phiên đăng nhập của tài khoản sẽ bị thu hồi." description="Thay đổi chỉ áp dụng cho tài khoản đã chọn. Mở khóa không thay thế việc kích hoạt và không tự mở bán chi nhánh." />
      {dialogError && <Alert type="error" showIcon message={dialogError} />}
    </AdminModal>
  </div>;
  return <Space direction="vertical" size="large" style={{ width: "100%" }}>
    {error && <Alert showIcon type="error" message={error} />}
    {notice && <Alert showIcon type="success" message={t(notice)} />}
    <Space wrap>
      {!isAdmin && <Button loading={busy} onClick={() => run(load)}>{t("reload")}</Button>}
      {status && <Tag>{t("readiness")}: {status.readiness}</Tag>}
    </Space>
    {status?.error && <Alert type="warning" message={status.error} />}
    {!pair && status && <Alert type="info" message={status.readiness === "UNPROVISIONED" ? t("unprovisioned") : t("pending")} />}
    {pair && <Card title={t("title")}>
      <p>{t("recovery")}: {pair.recoveryEmail || t('recoveryMissing')} — {t(pair.verified ? "yes" : "no")}</p>
      <Table<Account> rowKey="id" dataSource={pair.accounts} pagination={false} scroll={{ x: 800 }} columns={accountColumns} />
      <Alert type="info" message={t(isAdmin ? "adminHelp" : "managerHelp")} style={{ marginBlock: 16 }} />
      {managementForm}
      {verificationForm}
    </Card>}
    <Card title={t("audit")}>
      <Alert type="info" message={t("auditNotice")} />
      {auditError && <Alert type="error" showIcon message={auditError} />}
      {!isAdmin && <Button style={{ marginBlock: 16 }} loading={auditLoading} onClick={() => void loadAudit(0)}>{t("reload")}</Button>}
      <Table<Audit> rowKey="id" loading={auditLoading} dataSource={audit} scroll={{ x: 800 }} pagination={{ current: auditPage + 1, pageSize: 20, total: auditTotal, showSizeChanger: false, onChange: page => { if (isAdmin) { setAudit([]); setAuditPage(page - 1); } else void loadAudit(page - 1); } }} columns={[
        { title: t("account"), dataIndex: "actorId" }, { title: t("action"), dataIndex: "action" }, { title: t("time"), dataIndex: "occurredAt" },
        { title: t("session"), render: (_: unknown, row: Audit) => row.detail?.sessionId ?? "—" },
        { title: t("result"), render: (_: unknown, row: Audit) => row.detail?.result ?? "—" },
      ]} />
    </Card>
  </Space>;
}
