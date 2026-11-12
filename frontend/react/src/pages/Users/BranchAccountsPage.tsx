import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Descriptions, Dropdown, Empty, Form, Input, Select, Skeleton, Steps, Table, Tabs, Tag, Typography } from "antd";
import { AuditOutlined, KeyOutlined, LockOutlined, MailOutlined, MoreOutlined, ReloadOutlined, RightOutlined, SearchOutlined, SafetyCertificateOutlined, ShopOutlined, TeamOutlined, UnlockOutlined } from '@ant-design/icons';
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
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState<number | undefined>(isAdmin ? undefined : user.storeId ?? undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [branchBusy, setBranchBusy] = useState(false);
  usePageLoading(loading && !stores.length);
  const load = useCallback(async (signal?: AbortSignal) => {
    setError(""); setLoading(true);
    try { const result = await storesApi.list(false, signal); if (!signal?.aborted) setStores(result); }
    catch (failure) { if (!signal?.aborted) { setStores([]); setError(getErrorMessage(failure)); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const selectedStore = stores.find(store => store.id === storeId);
  const filteredStores = stores.filter(store => matchesStoreSearch([store.name, String(store.id), store.address], search));
  if (isAdmin) return <div className="branch-accounts-page">
    <header className="branch-accounts-heading">
      <div><span className="branch-eyebrow">{t('directory.eyebrow')}</span><Typography.Title level={2}>{t('title')}</Typography.Title>
        <p>{t('directory.subtitle')}</p></div>
      <Button icon={<ReloadOutlined />} loading={loading} disabled={branchBusy} onClick={() => void load()}>{t('directory.refresh')}</Button>
    </header>
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => void load()}>{t("business:dashboard.retry")}</Button>} />}
    <div className="branch-workspace">
      <aside className="branch-directory">
        <div className="branch-directory-title"><h2>{t('directory.branches')}</h2><span>{stores.length}</span></div>
        <Input prefix={<SearchOutlined />} allowClear value={search} onChange={event => setSearch(event.target.value)}
          placeholder={t('directory.search')} aria-label={t('directory.search')} disabled={branchBusy} />
        <nav className="branch-directory-list" aria-label={t('store')} aria-busy={loading}>
          {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : filteredStores.length ? filteredStores.map(store => <button key={store.id}
            type="button" aria-pressed={storeId === store.id} disabled={branchBusy} onClick={() => setStoreId(store.id)}>
            <span className="branch-list-icon"><ShopOutlined /></span><span><strong>{store.name}</strong><small>#{store.id} · {store.address}</small></span><RightOutlined />
          </button>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('directory.empty')} />}
        </nav>
        <p className="branch-directory-hint"><SafetyCertificateOutlined /> {t('directory.scope')}</p>
      </aside>
      <div className="branch-workspace-main">
        {storeId ? <>
          <section className="branch-selected-heading"><div><span>{t('directory.current')}</span><h2>{selectedStore?.name || `#${storeId}`}</h2><p>{selectedStore?.address}</p></div>
            {selectedStore && <Tag color={selectedStore.status === 'OPEN' ? 'success' : selectedStore.status === 'INACTIVE' ? 'default' : 'gold'}>
              {selectedStore.status === 'OPEN' ? t("business:stores.open") : selectedStore.status === 'INACTIVE' ? t("business:stores.inactive") : t("admin:ui.temporarilyClosed")}</Tag>}
          </section>
          <BranchDetails key={`branch-accounts:${storeId}`} storeId={storeId} storeName={selectedStore?.name} onBusyChange={setBranchBusy} />
        </> : <section className="branch-empty">
          <span className="branch-empty-symbol"><SafetyCertificateOutlined /></span><h2>{t('directory.select')}</h2><p>{t('directory.selectHint')}</p>
          <div className="branch-role-guide"><span><SafetyCertificateOutlined /> {t("admin:ui.branchManagerAccount")}</span><span><TeamOutlined /> {t("admin:ui.sharedOperationsAccount")}</span></div>
        </section>}
      </div>
    </div>
  </div>;
  return <div className="branch-accounts-page branch-manager-page">
    <header className="branch-accounts-heading"><div><span className="branch-eyebrow">{t('directory.eyebrow')}</span>
      <Typography.Title level={2}>{t("title")}</Typography.Title><p>{t('managerUi.subtitle')}</p></div><Tag icon={<ShopOutlined />}>{selectedStore?.name || user.storeName || `#${storeId ?? '—'}`}</Tag></header>
    {error && <Alert type="error" message={error} action={<Button onClick={() => void load()}>{t("reload")}</Button>} />}
    {storeId ? <BranchDetails key={storeId} storeId={storeId} storeName={selectedStore?.name} /> : <Alert type="warning" showIcon message={t('managerUi.noBranch')} />}
  </div>;
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
    if (busy || managementOpen || accountToLock) return;
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
  async function startManagement(values: Management) {
    await run(async () => {
      const { targetId, ...body } = values;
      const response = await api.post(`/api/auth/branch/accounts/${targetId}/challenge`, body);
      setChallenge({ id: response.data.challengeId, purpose: values.purpose, targetId, newEmail: values.newEmail });
      management.resetFields(["currentPassword"]); verification.resetFields(); setNotice("manageSent");
    }, true);
  }
  async function finishManagement(values: { otp: string; newEmailOtp?: string; password?: string }) {
    await run(async () => {
      if (!challenge) return;
      await api.post("/api/auth/branch/management/finish", { ...values, challengeId: challenge.id });
      setChallenge(null); verification.resetFields(); management.resetFields(); setManagementOpen(false); setNotice("done");
      await load().catch(failure => setError(t("admin:ui.changesSavedButTheUpdatedStatusCouldNot", { value1: getErrorMessage(failure) })));
    }, true);
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
    if (busy || managementOpen || activeTab !== 'audit') return;
    let controller = new AbortController();
    const refresh = () => {
      controller.abort(); controller = new AbortController();
      void loadAudit(auditPage, controller.signal);
    };
    refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [busy, managementOpen, auditPage, activeTab, loadAudit]);

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
      <Form.Item name="newEmail" label={t('newEmail')} preserve={false} rules={[{ required: true, type: 'email', max: 255 }]}><Input autoComplete="email" maxLength={255} placeholder={isAdmin ? t("admin:ui.enterTheEmailThatReceivesBranchRecoveryCodes") : undefined} /></Form.Item>}
    </Form.Item>
    <Form.Item name="currentPassword" label={t('currentPassword')} rules={[{ required: true, max: 72 }]}><Input.Password autoComplete="current-password" maxLength={72} /></Form.Item>
  </Form>;
  const verificationForm = challenge && <Form id={`branch-verification-${storeId}`} key={`verification:${challenge.id}`} form={verification} layout="vertical" onFinish={finishManagement} disabled={busy}>
    <Form.Item name="otp" label={isAdmin ? t("admin:ui.otpSentToTheAdminEmail") : t('otp')} rules={[{ required: true, pattern: /^\d{8}$/, message: t("admin:ui.enterAll8OtpDigits") }]}><Input inputMode="numeric" maxLength={8} autoComplete="one-time-code" /></Form.Item>
    {challenge.purpose === 'RECOVERY' ? <Form.Item name="newEmailOtp" label={t('newOtp')} rules={[{ required: true, pattern: /^\d{8}$/ }]}><Input inputMode="numeric" maxLength={8} autoComplete="off" /></Form.Item>
      : <Form.Item name="password" label={t('password')} rules={[{ required: true, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/ }]}><Input.Password autoComplete="new-password" maxLength={72} /></Form.Item>}
  </Form>;
  const readiness = pair?.readiness ?? status?.readiness;

  return <div className="branch-details">
    {error && <Alert showIcon type="error" message={error} action={<Button disabled={busy} onClick={() => void load().catch(failure => setError(getErrorMessage(failure)))}>{t('reload')}</Button>} />}
    {notice && <Alert showIcon type="success" message={t(notice)} />}
    {detailLoading && <Card><Skeleton active paragraph={{ rows: 5 }} /></Card>}
    {!detailLoading && <>
      <section className="branch-readiness"><div className="branch-readiness-icon"><SafetyCertificateOutlined /></div><div><strong>{accountReadiness(readiness)}</strong>
        <p>{readiness === 'READY' ? t("admin:ui.currentAccountsAreReadyTheBranchSOpening")
          : readiness === 'UNPROVISIONED' ? t("admin:ui.thisBranchHasNoManagerOrStaffAccounts739")
          : readiness === 'PROVISIONED' ? t("admin:ui.accountsHaveBeenProvisionedCompleteActivationUsingThe") : t("admin:ui.theSystemIsSynchronizingBranchAccountStatus")}</p></div>
        {isAdmin && (status?.error || readiness === 'PENDING') && readiness !== 'UNPROVISIONED' && <Button loading={busy} onClick={() => void run(async () => { await api.post(`/api/stores/${storeId}/accounts-retry`); await load(); })}>{t("admin:ui.retryAccountProvisioning")}</Button>}
      </section>
      {status?.error && <Alert type="warning" showIcon message={t("admin:ui.accountSynchronizationIsIncomplete")} description={status.error} />}
      <Tabs className="branch-tabs" activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'accounts', label: t("accounts:current"), icon: <TeamOutlined />, children: pair ? <section className="branch-panel">
          <div className="branch-panel-heading"><div><h3>{t("admin:ui.branchAccessAccounts")}</h3><p>{t("admin:ui.theOperationsAccountIsSharedAndDoesNot")}</p></div><Tag>{pair.accounts.length} {t("business:users.accountNoun")}</Tag></div>
          <div className="branch-account-cards">
            {pair.accounts.map(account => <article key={account.id} className="branch-access-card">
              <div className="branch-access-role"><span className="branch-access-icon">{account.role === 'STORE_MANAGER' ? <SafetyCertificateOutlined /> : <TeamOutlined />}</span>
                <div><strong>{accountRole(account.role)}</strong><small>#{account.id}</small></div>
                <Tag color={account.status === 'ACTIVE' ? 'success' : 'error'}>{account.status === 'ACTIVE' ? t("admin:ui.active") : t("business:users.locked")}</Tag>
              </div>
              <div className="branch-access-login"><span>{t('account')}</span><strong>{account.login}</strong></div>
              <div className="branch-access-meta"><div><span>{t('activation')}</span><Tag color={account.activated ? 'success' : 'gold'}>{account.activated ? t('activated') : t("admin:ui.awaitingActivation")}</Tag></div>
                <div><span>{t('current')}</span><strong>{t(account.current ? 'yes' : 'no')}</strong></div></div>
              <div className="branch-access-actions">
                {isAdmin ? <Button icon={<KeyOutlined />} disabled={busy || !!error || !account.activated || !account.current} onClick={() => beginManagement(account, 'RESET')}>{t('reset')}</Button>
                  : <Button icon={<MailOutlined />} disabled={busy || !!error || !account.current || !pair.recoveryEmail} onClick={() => beginManagement(account, 'RECOVERY')}>{t('changeRecovery')}</Button>}
                <Dropdown trigger={['click']} menu={{ items: [
                  { key: 'recovery', label: t('changeRecovery'), icon: <MailOutlined />, disabled: !account.current || (!isAdmin && !pair.recoveryEmail) },
                  { type: 'divider' }, { key: 'lock', label: account.status === 'ACTIVE' ? t("business:users.lockAccount") : t("business:users.unlockAccount"), danger: account.status === 'ACTIVE',
                    icon: account.status === 'ACTIVE' ? <LockOutlined /> : <UnlockOutlined />, disabled: !account.current || (!isAdmin && account.role !== 'STAFF') },
                ], onClick: ({ key }) => { if (key === 'lock') { setDialogError(''); setAccountToLock(account); } else beginManagement(account, 'RECOVERY'); } }}>
                  <Button disabled={busy || !!error} icon={<MoreOutlined />} aria-label={t("admin:ui.actionsForAccount", { value1: account.login })}>{t('action')}</Button>
                </Dropdown>
              </div>
            </article>)}
          </div>
          <div className="branch-recovery"><MailOutlined /><div><span>{t("admin:ui.branchRecoveryEmail")}</span><strong>{pair.recoveryEmail || t("admin:ui.notConfigured")}</strong><small>{t("admin:ui.recoveryInformationIsSharedByTheCurrentAccount")}</small></div>
            <Tag color={pair.verified ? 'success' : 'gold'}>{pair.verified ? t("admin:ui.verified") : t("admin:ui.unverified")}</Tag>
            {isAdmin && !pair.recoveryEmail && pair.accounts[0] && <Button disabled={busy} onClick={() => beginManagement(pair.accounts[0], 'RECOVERY')}>{t("admin:ui.setUpRecoveryEmail")}</Button>}</div>
          {!pair.recoveryEmail && <Alert type="warning" showIcon message={t("admin:ui.noEmailIsConfiguredForAccountSelfRecovery")}
            description={t("admin:ui.existingLoginsAndPasswordsAreUnchangedAdminMust")} />}
          {pair.accounts.some(account => !account.activated) && <Alert type="info" showIcon message={t("admin:ui.unactivatedAccountsMustUseTheCodeSentTo")} description={t("admin:ui.passwordResetIsOnlyAvailableForActivatedAccounts")} />}
        </section> : <section className="branch-panel"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("admin:ui.thisBranchHasNoCurrentAccountPair")}>
          <p className="branch-hint">{readiness === 'UNPROVISIONED' ? t("admin:ui.noManagerOrStaffAccountProvisionedForThis") : t("admin:ui.provisioningStatusUpdatesAutomaticallyWhenSynchronizationFinishes")}</p>
        </Empty></section> },
        { key: 'audit', label: t("admin:ui.accountLog"), icon: <AuditOutlined />, children: <section className="branch-panel">
          <div className="branch-panel-heading"><div><h3>{t("admin:ui.accountAccessHistory")}</h3><p>{t(isAdmin ? "admin:ui.onlyAccountEventsForTheSelectedBranchAre" : 'auditNotice')}</p></div>
            <Tag>{auditTotal} {t("admin:ui.events")}</Tag></div>
          {auditError && <Alert type="error" showIcon message={auditError} />}
          <Table<Audit> rowKey="id" size="small" loading={auditLoading} dataSource={audit} scroll={{ x: 760 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("admin:ui.noAccountEventsRecordedYet")} /> }}
            pagination={{ current: auditPage + 1, pageSize: 20, total: auditTotal, showSizeChanger: false, hideOnSinglePage: true, onChange: page => { setAudit([]); setAuditPage(page - 1); } }} columns={[
              { title: t("admin:ui.timeVietnamTime"), width: 175, render: (_, entry) => orderDate(entry.occurredAt, locale) },
              { title: t("accounts:action"), width: 235, render: (_, entry) => accountAuditAction(entry.action) },
              { title: t("admin:ui.performedBy"), width: 175, render: (_, entry) => <div className="branch-account-cell"><span>#{entry.actorId}</span><small>{entry.actorRole ? accountRole(entry.actorRole) : t("admin:ui.unknownRole")}</small></div> },
              { title: t("admin:ui.target"), width: 100, render: (_, entry) => entry.targetId ? `#${entry.targetId}` : '—' },
              { title: t("accounts:result"), render: (_, entry) => <Tag color={entry.detail?.result === 'SUCCESS' ? 'success' : entry.detail?.result === 'FAILED' ? 'error' : 'default'}>
                {entry.detail?.result === 'SUCCESS' ? t("common:toast.success") : entry.detail?.result === 'FAILED' ? t("business:orderdetaildrawer.failed") : entry.detail?.result || t("admin:ui.noResultsYet")}</Tag> },
            ]} />
        </section> },
      ]} />
    </>}
    <AdminModal className="branch-account-modal" centered width={560} open={managementOpen} title={t("admin:ui.branchAccountSupport")} subtitle={storeName || t("business:reviews.storeNumber", { value1: storeId })}
      confirmLoading={busy} onCancel={() => { setManagementOpen(false); setChallenge(null); management.resetFields(); verification.resetFields(); setDialogError(''); }}
      okText={challenge ? t("admin:ui.confirmChange") : t("admin:ui.sendVerificationCode")} cancelText={t("business:orderdetaildrawer.close")} okButtonProps={{ htmlType: 'submit', form: challenge ? `branch-verification-${storeId}` : `branch-management-${storeId}` }}>
      <Steps size="small" current={challenge ? 1 : 0} items={[{ title: t("admin:ui.changeDetails") }, { title: t("admin:ui.verifyOtp") }]} />
      <Alert type="info" showIcon message={challenge ? t("admin:ui.aVerificationCodeHasBeenSentByEmail") : t(isAdmin ? "admin:ui.changesAreProtectedByTheAdminPasswordAnd" : 'managerUi.protected')}
        description={!isAdmin ? t('managerHelp') : challenge?.purpose === 'RECOVERY' ? t("admin:ui.enterTheCodesFromTheAdminEmailAnd") : t('adminHelp')} />
      {dialogError && <Alert type="error" showIcon message={dialogError} />}
      {challenge ? <><Descriptions size="small" column={1} items={[
        { key: 'target', label: t("accounts:account"), children: pair?.accounts.find(account => account.id === challenge.targetId)?.login || `#${challenge.targetId}` },
        { key: 'purpose', label: t("admin:ui.change"), children: challenge.purpose === 'RECOVERY' ? t("accounts:changeRecovery") : t("accounts:reset") },
        ...(challenge.purpose === 'RECOVERY' ? [{ key: 'email', label: t("admin:ui.newEmail"), children: challenge.newEmail }] : []),
      ]} />{verificationForm}</> : managementForm}
    </AdminModal>
    <AdminModal className="branch-account-modal" centered width={480} open={accountToLock !== null} title={accountToLock?.status === 'ACTIVE' ? t("admin:ui.lockBranchAccount") : t("admin:ui.unlockBranchAccount")}
      subtitle={accountToLock?.login} confirmLoading={busy} onCancel={() => { setAccountToLock(null); setDialogError(''); }} okText={accountToLock?.status === 'ACTIVE' ? t("admin:ui.confirmLocking") : t("admin:ui.confirmUnlocking")} cancelText={t("admin:ui.goBack")}
      okButtonProps={{ danger: accountToLock?.status === 'ACTIVE' }} onOk={async () => {
        if (!accountToLock) return;
        const success = await run(async () => {
          await api.put(`/api/auth/branch/accounts/${accountToLock.id}/lock`, null, { params: { locked: accountToLock.status === 'ACTIVE' } });
          setNotice('done');
          await load().catch(failure => setError(t("admin:ui.accountStatusChangedButTheUpdatedDataCould", { value1: getErrorMessage(failure) })));
        }, true);
        if (success) setAccountToLock(null);
      }}>
      <Alert type="warning" showIcon message={t("admin:ui.allLoginSessionsForThisAccountWillBe")} description={t("admin:ui.thisChangeOnlyAffectsTheSelectedAccountUnlocking")} />
      {dialogError && <Alert type="error" showIcon message={dialogError} />}
    </AdminModal>
  </div>;
}
