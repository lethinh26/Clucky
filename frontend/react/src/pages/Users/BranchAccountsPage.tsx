import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Form, Input, Select, Space, Table, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { api, storesApi, getErrorMessage, type Store } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { usePageLoading } from "../../components/ui-loader/page-loading";

interface Account { id: number; storeId: number; login: string; role: string; status: string; activated: boolean; current: boolean }
interface Pair { storeId: number; readiness: string; recoveryEmail: string; verified: boolean; accounts: Account[] }
interface Inventory { inventoryVersion: string; migrationEnabled: boolean; accounts: Account[] }
interface Audit { id: number; actorId: number; action: string; occurredAt: string; detail: { sessionId?: string; result?: string } }
interface Management { targetId: number; purpose: string; currentPassword: string; newEmail?: string }
interface Mapping { managerId: number; staffId: number; recoveryEmail: string; backupReference: string; currentPassword: string }

export function BranchAccountsPage() {
  const { t } = useTranslation("accounts");
  const { user, isAdmin } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<number | undefined>(isAdmin ? undefined : user.storeId ?? undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  usePageLoading(loading);
  const load = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try { const result = await storesApi.list(false, signal); if (!signal?.aborted) setStores(result); }
    catch (failure) { if (!signal?.aborted) setError(getErrorMessage(failure)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  return <Space direction="vertical" size="large" style={{ width: "100%" }}>
    <Typography.Title level={2}>{t("title")}</Typography.Title>
    {error && <Alert type="error" message={error} action={<Button onClick={() => void load()}>{t("reload")}</Button>} />}
    {isAdmin && <Select aria-label={t("store")} placeholder={t("store")} style={{ width: "min(100%, 480px)" }} value={storeId} onChange={setStoreId}
      options={stores.map(store => ({ value: store.id, label: `${store.id} — ${store.name}` }))} />}
    {storeId && <BranchDetails key={storeId} storeId={storeId} />}
  </Space>;
}

function BranchDetails({ storeId }: { storeId: number }) {
  const { t } = useTranslation("accounts");
  const { isAdmin } = useAuth();
  const { modal } = App.useApp();
  const [pair, setPair] = useState<Pair | null>(null);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [status, setStatus] = useState<{ readiness: string; error: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<{ id: string; purpose: string; targetId: number } | null>(null);
  const [report, setReport] = useState<unknown>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const [management] = Form.useForm();
  const [verification] = Form.useForm();
  const [mappingForm] = Form.useForm();
  const base = `/api/auth/branch/stores/${storeId}`;
  const load = useCallback(async () => {
    const [state, accounts] = await Promise.all([
      api.get(`/api/stores/${storeId}/accounts-status`),
      api.get<Pair>(base).catch(failure => {
        if (isAxiosError(failure) && failure.response?.status === 404) return { data: null };
        throw failure;
      }),
    ]);
    setStatus(state.data); setPair(accounts.data);
  }, [base, storeId]);
  useEffect(() => { void load().catch(failure => setError(getErrorMessage(failure))); }, [load]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (failure) { setError(getErrorMessage(failure)); }
    finally { setBusy(false); }
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
      setChallenge({ id: response.data.challengeId, purpose: values.purpose, targetId });
      management.resetFields(["currentPassword"]); verification.resetFields(); setNotice("manageSent");
    });
  }
  async function finishManagement(values: { otp: string; newEmailOtp?: string; password?: string }) {
    await run(async () => {
      if (!challenge) return;
      await api.post("/api/auth/branch/management/finish", { ...values, challengeId: challenge.id });
      setChallenge(null); verification.resetFields(); setNotice("done");
      if (isAdmin) await load();
    });
  }
  async function loadAudit(page: number) {
    await run(async () => {
      const response = await api.get<{ content: Audit[]; totalElements: number }>("/api/audit-logs", { params: { storeId, page, size: 20 } });
      setAudit(response.data.content); setAuditTotal(response.data.totalElements); setAuditPage(page);
    });
  }
  function approveMigration(values: Mapping) {
    if (!inventory) return;
    const inventoryVersion = inventory.inventoryVersion;
    modal.confirm({ title: t("migrationConfirm"),
      content: <Space direction="vertical"><span>{t("manager")}: {values.managerId}</span><span>{t("staff")}: {values.staffId}</span><span>{t("recovery")}: {values.recoveryEmail}</span><span>{t("backup")}: {values.backupReference}</span></Space>,
      onOk: () => run(async () => {
        await api.post(`${base}/migration`, { ...values, inventoryVersion });
        setReport((await api.get(`${base}/migration-report`)).data);
        mappingForm.resetFields(); setInventory(null); setNotice("done"); await load();
      }),
    });
  }
  return <Space direction="vertical" size="large" style={{ width: "100%" }}>
    {error && <Alert showIcon type="error" message={error} />}
    {notice && <Alert showIcon type="success" message={t(notice)} />}
    <Space wrap>
      <Button loading={busy} onClick={() => run(load)}>{t("reload")}</Button>
      {isAdmin && <Button disabled={busy} onClick={() => run(async () => { await api.post(`/api/stores/${storeId}/accounts-retry`); await load(); })}>{t("retry")}</Button>}
      {status && <Tag>{t("readiness")}: {status.readiness}</Tag>}
    </Space>
    {status?.error && <Alert type="warning" message={status.error} />}
    {!pair && status && <Alert type="info" message={status.readiness === "LEGACY" ? t("legacy") : t("pending")} />}
    {pair && <Card title={t("title")}>
      <p>{t("recovery")}: {pair.recoveryEmail} — {t(pair.verified ? "yes" : "no")}</p>
      <Table<Account> rowKey="id" dataSource={pair.accounts} pagination={false} scroll={{ x: 800 }} columns={[...accountColumns, ...(isAdmin ? [{ title: t("action"), render: (_: unknown, account: Account) =>
        <Button danger={account.status === "ACTIVE"} disabled={busy} onClick={() => {
          const confirmation = modal.confirm({ title: t("lockConfirm"), content: `${account.id} — ${account.login}`,
            onOk: () => {
              confirmation.update({ cancelButtonProps: { disabled: true }, keyboard: false, maskClosable: false, closable: false });
              return run(async () => { await api.put(`/api/auth/branch/accounts/${account.id}/lock`, null, { params: { locked: account.status === "ACTIVE" } }); await load(); });
            },
          });
        }}>{t(account.status === "ACTIVE" ? "lock" : "unlock")}</Button>,
      }] : [])]} />
      <Alert type="info" message={t(isAdmin ? "adminHelp" : "managerHelp")} style={{ marginBlock: 16 }} />
      <Form form={management} layout="vertical" onFinish={startManagement} disabled={busy} initialValues={{ purpose: "RECOVERY" }}>
        <Form.Item name="targetId" label={t("target")} rules={[{ required: true }]}><Select options={pair.accounts.map(account => ({ value: account.id, label: `${account.id} — ${account.login} (${account.role})` }))} /></Form.Item>
        <Form.Item name="purpose" label={t("purpose")} rules={[{ required: true }]}><Select options={[
          { value: "RECOVERY", label: t("changeRecovery") }, ...(isAdmin ? [{ value: "RESET", label: t("reset") }] : []),
        ]} /></Form.Item>
        <Form.Item noStyle shouldUpdate={(previous, current) => previous.purpose !== current.purpose}>{({ getFieldValue }) => getFieldValue("purpose") === "RECOVERY" &&
          <Form.Item name="newEmail" label={t("newEmail")} preserve={false} rules={[{ required: true, type: "email", max: 255 }]}><Input autoComplete="email" /></Form.Item>}
        </Form.Item>
        <Form.Item name="currentPassword" label={t("currentPassword")} rules={[{ required: true, max: 72 }]}><Input.Password autoComplete="current-password" /></Form.Item>
        <Button htmlType="submit" loading={busy}>{t("request")}</Button>
      </Form>
      {challenge && <Form key={challenge.id} form={verification} layout="vertical" onFinish={finishManagement} disabled={busy}>
        <p>{t("target")}: {challenge.targetId} — {challenge.purpose}</p><p>{t("challenge")}: {challenge.id}</p>
        <Form.Item name="otp" label={t("otp")} rules={[{ required: true, pattern: /^\d{8}$/ }]}><Input inputMode="numeric" maxLength={8} autoComplete="one-time-code" /></Form.Item>
        {challenge.purpose === "RECOVERY" ? <Form.Item name="newEmailOtp" label={t("newOtp")} rules={[{ required: true, pattern: /^\d{8}$/ }]}><Input inputMode="numeric" maxLength={8} autoComplete="off" /></Form.Item>
          : <Form.Item name="password" label={t("password")} rules={[{ required: true, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/ }]}><Input.Password autoComplete="new-password" /></Form.Item>}
        <Button htmlType="submit" type="primary" loading={busy}>{t("confirm")}</Button>
      </Form>}
    </Card>}
    {isAdmin && <Card title={t("inventory")}>
      <Alert showIcon type="warning" message={t("migrationWarning")} />
      <Space style={{ marginBlock: 16 }}><Button disabled={busy} onClick={() => run(async () => { setInventory((await api.get<Inventory>(`${base}/inventory`)).data); mappingForm.resetFields(); })}>{t("inventory")}</Button>
        <Button disabled={busy} onClick={() => run(async () => setReport((await api.get(`${base}/migration-report`)).data))}>{t("report")}</Button></Space>
      {inventory && <>
        <Table<Account> rowKey="id" dataSource={inventory.accounts} columns={accountColumns} scroll={{ x: 800 }} />
        {!inventory.migrationEnabled && <Alert type="warning" message={t("migrationDisabled")} />}
        {!pair && <Form form={mappingForm} layout="vertical" onFinish={approveMigration} disabled={busy || !inventory.migrationEnabled}>
          <Form.Item name="managerId" label={t("manager")} rules={[{ required: true }]}><Select options={inventory.accounts.filter(account => account.role === "STORE_MANAGER").map(account => ({ value: account.id, label: `${account.id} — ${account.login} (${account.status})` }))} /></Form.Item>
          <Form.Item name="staffId" label={t("staff")} rules={[{ required: true }]}><Select options={inventory.accounts.filter(account => account.role === "STAFF").map(account => ({ value: account.id, label: `${account.id} — ${account.login} (${account.status})` }))} /></Form.Item>
          <Form.Item name="recoveryEmail" label={t("recovery")} rules={[{ required: true, type: "email", max: 255 }]}><Input /></Form.Item>
          <Form.Item name="backupReference" label={t("backup")} rules={[{ required: true, max: 160 }]}><Input /></Form.Item>
          <Form.Item name="currentPassword" label={t("currentPassword")} rules={[{ required: true, max: 72 }]}><Input.Password autoComplete="current-password" /></Form.Item>
          <Button danger htmlType="submit" loading={busy}>{t("migration")}</Button>
        </Form>}
      </>}
      {report !== null && <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(report, null, 2)}</pre>}
    </Card>}
    <Card title={t("audit")}>
      <Alert type="info" message={t("auditNotice")} />
      <Button style={{ marginBlock: 16 }} loading={busy} onClick={() => loadAudit(0)}>{t("reload")}</Button>
      <Table<Audit> rowKey="id" dataSource={audit} scroll={{ x: 800 }} pagination={{ current: auditPage + 1, pageSize: 20, total: auditTotal, showSizeChanger: false, onChange: page => loadAudit(page - 1) }} columns={[
        { title: t("account"), dataIndex: "actorId" }, { title: t("action"), dataIndex: "action" }, { title: t("time"), dataIndex: "occurredAt" },
        { title: t("session"), render: (_: unknown, row: Audit) => row.detail?.sessionId ?? "—" },
        { title: t("result"), render: (_: unknown, row: Audit) => row.detail?.result ?? "—" },
      ]} />
    </Card>
  </Space>;
}
