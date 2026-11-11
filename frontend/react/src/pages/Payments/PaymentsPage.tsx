import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, ConfigProvider, Form, Input, Modal, Select, Space, Switch, Table, Tabs, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage, storesApi, type Store } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { UnavailableFeature } from "../../components/UnavailableFeature";
import { notify } from "../../components/feedback";
import { usePageLoading } from "../../components/ui-loader/page-loading";
import { TransactionsPanel } from "./TransactionsPanel";
import { FinanceLookup } from "./FinanceDrawer";
import { RefundsPanel } from "../Orders/RefundsPanel";
import "./payments.css";

interface Account {
  id: number;
  bankName: string;
  bankCode: string | null;
  accountNo: string;
  accountName: string;
  active: boolean;
  version: number;
}
interface Assignment { storeId: number; bankAccountId: number | null; version: number }
interface Overview { accounts: Account[]; assignments: Assignment[]; sepayKeyConfigured: boolean; reconciliationAvailable: boolean }
interface Bank { name: string; shortName: string; code: string; bin: string }
type AccountFields = Omit<Account, "id" | "version">;

function bankSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
}

export function PaymentsPage() {
  const { user, isAdmin, isStoreManager, isStaff } = useAuth();
  const { t } = useTranslation("payments");
  const [branchNames, setBranchNames] = useState<Store[]>([]);
  const [branchError, setBranchError] = useState("");
  useEffect(() => {
    if (isAdmin || !(isStaff || isStoreManager) || !user.storeId) return;
    const controller = new AbortController();
    setBranchNames([]); setBranchError("");
    void storesApi.list(false, controller.signal).then(result => { if (!controller.signal.aborted) setBranchNames(result); })
      .catch(failure => { if (!controller.signal.aborted) setBranchError(getErrorMessage(failure)); });
    return () => controller.abort();
  }, [isAdmin, isStaff, isStoreManager, user.storeId]);
  if (!isAdmin && (!(isStoreManager || isStaff) || !user.storeId || user.storeId <= 0)) return <UnavailableFeature />;
  return <ConfigProvider theme={{ token: { colorTextDescription: "#6B6259", colorTextPlaceholder: "#6B6259" } }}>
    {isAdmin ? <BankAccounts key={`${user.id}-${user.role}`} /> : <Space direction="vertical" size="middle" className="payments-page" style={{ width: "100%" }}>
      <Typography.Title level={2}>{t("transactionsTab")}</Typography.Title>
      {branchError && <Alert type="warning" showIcon message={t("log.storeNamesError")} description={branchError} />}
      <TransactionsPanel key={`${user.id}-${user.role}-${user.storeId}`} stores={branchNames} revision={0} />
    </Space>}
  </ConfigProvider>;
}

function BankAccounts() {
  const { t } = useTranslation("payments");
  const [data, setData] = useState<Overview | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [formError, setFormError] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentStore, setAssignmentStore] = useState<Store | null>(null);
  const [storeSearch, setStoreSearch] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState<string>();
  const [assignmentBank, setAssignmentBank] = useState<number>();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState("");
  const [bankRevision, setBankRevision] = useState(0);
  const [accountForm] = Form.useForm<AccountFields>();
  const bankName = Form.useWatch("bankName", accountForm);
  const bankCode = Form.useWatch("bankCode", accountForm);
  const [assignmentForm] = Form.useForm<{ storeId: number; bankAccountId?: number | null }>();
  const pendingOperation = useRef<{ signature: string; key: string } | null>(null);
  const alive = useRef(true);
  usePageLoading(loading && !data);
  const accountOpen = editing !== null;

  useEffect(() => {
    if (busy || accountOpen || assignmentStore) return;
    const timer = window.setTimeout(() => setRevision(value => value + 1), 15000);
    return () => window.clearTimeout(timer);
  }, [busy, accountOpen, assignmentStore, revision]);

  useEffect(() => {
    if (!bankError || !accountOpen) return;
    const timer = window.setTimeout(() => setBankRevision(value => value + 1), 15000);
    return () => window.clearTimeout(timer);
  }, [bankError, accountOpen, bankRevision]);

  useEffect(() => {
    if (!accountOpen) return;
    const controller = new AbortController();
    setBankLoading(true);
    setBankError("");
    void api.get<Bank[]>("/api/payments/bank-config/banks", { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setBanks(response.data); })
      .catch(failure => { if (!controller.signal.aborted) setBankError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setBankLoading(false); });
    return () => controller.abort();
  }, [accountOpen, bankRevision]);

  const bankOptions = banks.map(bank => ({ ...bank, search: bankSearch(`${bank.shortName} ${bank.name} ${bank.code} ${bank.bin}`) }));
  const nameOptions = bankOptions.map(bank => ({ value: bank.code, label: `${bank.shortName} — ${bank.name}`, search: bank.search }));
  const codeOptions = bankOptions.map(bank => ({ value: bank.code, label: `${bank.code} / ${bank.bin} — ${bank.shortName}`, search: bank.search }));
  if (bankName && !banks.some(bank => bank.code === bankCode && bank.shortName === bankName)) {
    nameOptions.push({ value: "__saved__", label: t("savedBankValue", { value: bankName }), search: bankSearch(bankName) });
  }
  if (bankCode && !codeOptions.some(option => option.value === bankCode)) {
    codeOptions.push({ value: bankCode, label: t("savedBankValue", { value: bankCode }), search: bankSearch(bankCode) });
  }

  function selectBank(bank: Bank | undefined) {
    if (bank) accountForm.setFieldsValue({ bankName: bank.shortName, bankCode: bank.code });
  }

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void Promise.all([
      api.get<Overview>("/api/payments/bank-config", { signal: controller.signal }),
      storesApi.list(false, controller.signal),
    ]).then(([response, availableStores]) => {
      if (controller.signal.aborted) return;
      setData(response.data);
      setStores(availableStores);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(getErrorMessage(failure));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  function headers(path: string, payload: unknown) {
    const signature = JSON.stringify([path, payload]);
    if (pendingOperation.current?.signature !== signature) {
      pendingOperation.current = { signature, key: crypto.randomUUID() };
    }
    return { "Idempotency-Key": pendingOperation.current.key };
  }

  function edit(account: Account | "new") {
    setFormError("");
    setEditing(account);
    accountForm.resetFields();
    accountForm.setFieldsValue(account === "new" ? { active: true } : account);
  }

  async function saveAccount(values: AccountFields) {
    if (!editing || busy) return;
    const path = `/api/payments/bank-config${editing === "new" ? "" : `/${editing.id}`}`;
    const payload = { ...values, bankName: values.bankName.trim(), bankCode: values.bankCode?.trim().toUpperCase(),
      accountNo: values.accountNo.trim(), accountName: values.accountName.trim(), version: editing === "new" ? 0 : editing.version };
    setBusy(true);
    setFormError("");
    try {
      const config = { headers: headers(path, payload) };
      const response = editing === "new" ? await api.post<Account>(path, payload, config) : await api.put<Account>(path, payload, config);
      if (!alive.current) return;
      setData(current => current && ({ ...current,
        accounts: [...current.accounts.filter(account => account.id !== response.data.id), response.data].sort((first, second) => first.id - second.id) }));
      setEditing(null);
      pendingOperation.current = null;
      setRevision(value => value + 1);
      notify.success(t("saved"));
    } catch (failure) { if (alive.current) setFormError(getErrorMessage(failure)); }
    finally { if (alive.current) setBusy(false); }
  }

  async function assign(values: { storeId: number; bankAccountId?: number | null }) {
    if (!data || busy) return;
    const current = data.assignments.find(assignment => assignment.storeId === values.storeId);
    const payload = { bankAccountId: values.bankAccountId ?? null, version: current?.version ?? 0 };
    const path = `/api/payments/bank-config/stores/${values.storeId}`;
    setBusy(true);
    setAssignmentError("");
    try {
      const response = await api.put<Assignment>(path, payload, { headers: headers(path, payload) });
      if (!alive.current) return;
      setData(previous => previous && ({ ...previous,
        assignments: [...previous.assignments.filter(assignment => assignment.storeId !== response.data.storeId), response.data] }));
      setAssignmentStore(null);
      pendingOperation.current = null;
      setRevision(value => value + 1);
      notify.success(t("saved"));
    } catch (failure) { if (alive.current) setAssignmentError(getErrorMessage(failure)); }
    finally { if (alive.current) setBusy(false); }
  }

  return <Space direction="vertical" size="middle" className="payments-page" style={{ width: "100%" }}>
    <div className="payments-header">
      <div><Typography.Title level={2}>{t("title")}</Typography.Title><Typography.Paragraph type="secondary">{t("intro")}</Typography.Paragraph></div>
      <Space wrap>{data && !data.sepayKeyConfigured && <Tag color="warning">{t("keyMissing")}</Tag>}
      </Space>
    </div>
    {error && <Alert type="error" showIcon message={error} />}
    <>
      <Tabs defaultActiveKey="transactions" items={[
        { key: "transactions", label: t("transactionsTab"), children: <TransactionsPanel stores={stores} revision={revision} /> },
        { key: "finance", label: t("admin:ui.collectionReconciliationLegacy"), children: <FinanceLookup onChanged={() => setRevision(value => value + 1)} /> },
        { key: "refunds", label: t("business:orderspage.refund"), children: <RefundsPanel stores={stores} revision={revision} onChanged={() => setRevision(value => value + 1)} /> },
        { key: "accounts", label: t("accounts"), children: data && !error && <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Card title={t("accounts")} extra={<Button type="primary" disabled={busy || loading} onClick={() => edit("new")}>{t("add")}</Button>}>
        <div className="payments-table-scroll" role="region" aria-label={t("accounts")} tabIndex={0}>
        <Table<Account> rowKey="id" dataSource={data.accounts} loading={loading} style={{ minWidth: 950 }} pagination={{ pageSize: 10 }}
          locale={{ emptyText: t("noAccounts") }} columns={[
            { title: t("bankName"), dataIndex: "bankName" },
            { title: t("bankCode"), render: (_, account) => account.bankCode || <Tag color="warning">{t("missingCode")}</Tag> },
            { title: t("accountNo"), dataIndex: "accountNo" },
            { title: t("accountName"), dataIndex: "accountName" },
            { title: t("status"), render: (_, account) => <Tag color={account.active ? "green" : "default"}>{t(account.active ? "active" : "inactive")}</Tag> },
            { title: t("stores"), render: (_, account) => data.assignments.filter(assignment => assignment.bankAccountId === account.id)
              .map(assignment => stores.find(store => store.id === assignment.storeId)?.name ?? `#${assignment.storeId}`).join(", ") || t("none") },
            { title: t("actions"), render: (_, account) => <Button disabled={busy || loading} onClick={() => edit(account)}>{t("edit")}</Button> },
          ]} />
        </div>
      </Card>
      <Card title={t("assignment")}>
        <div className="payment-assignment-filters">
          <Input.Search aria-label={t("assignments.search")} placeholder={t("assignments.search")} allowClear value={storeSearch} onChange={event => setStoreSearch(event.target.value)} />
          <Select aria-label={t("assignments.filterStatus")} placeholder={t("assignments.filterStatus")} allowClear value={assignmentStatus} onChange={setAssignmentStatus}
            options={[{ value: "assigned", label: t("assignments.assigned") }, { value: "missing", label: t("assignments.missing") }]} />
          <Select aria-label={t("receivingAccount")} placeholder={t("assignments.allAccounts")} showSearch allowClear optionFilterProp="label" value={assignmentBank} onChange={setAssignmentBank}
            options={data.accounts.map(account => ({ value: account.id, label: `${account.bankName} · ${account.accountNo}` }))} />
        </div>
        <div className="payments-table-scroll" role="region" aria-label={t("assignment")} tabIndex={0}>
        <Table<Store> rowKey="id" size="middle" style={{ minWidth: 680 }} pagination={{ pageSize: 8, hideOnSinglePage: true }}
          dataSource={stores.filter(store => {
            const accountId = data.assignments.find(assignment => assignment.storeId === store.id)?.bankAccountId;
            return bankSearch(`${store.name} ${store.address ?? ""} ${store.id}`).includes(bankSearch(storeSearch))
              && (!assignmentStatus || (assignmentStatus === "assigned" ? !!accountId : !accountId)) && (!assignmentBank || accountId === assignmentBank);
          })} columns={[
            { title: t("store"), render: (_, store) => <><strong>{store.name}</strong><small className="payment-log-muted">{store.address}</small></> },
            { title: t("receivingAccount"), render: (_, store) => {
              const accountId = data.assignments.find(assignment => assignment.storeId === store.id)?.bankAccountId;
              const account = data.accounts.find(item => item.id === accountId);
              return account ? <><span>{account.bankName} · {account.accountNo}</span><small className="payment-log-muted">{account.accountName}</small>{!account.active && <Tag color="warning">{t("inactive")}</Tag>}</> : <Tag color="warning">{t("assignments.missing")}</Tag>;
            } },
            { title: t("actions"), width: 160, render: (_, store) => <Button disabled={busy || loading} onClick={() => {
              setAssignmentStore(store); setAssignmentError(""); assignmentForm.setFieldsValue({ storeId: store.id, bankAccountId: data.assignments.find(assignment => assignment.storeId === store.id)?.bankAccountId ?? null });
            }}>{t(data.assignments.some(assignment => assignment.storeId === store.id && assignment.bankAccountId) ? "assignments.change" : "assignments.assign")}</Button> },
          ]} />
        </div>
      </Card>
        </Space> },
      ]} />
    </>
    <Modal open={assignmentStore !== null} title={t("assignments.modalTitle")} onCancel={() => setAssignmentStore(null)}
      onOk={() => assignmentForm.submit()} confirmLoading={busy} okText={t("saveAssignment")} cancelText={t("cancel")}
      cancelButtonProps={{ disabled: busy }} closable={!busy} maskClosable={!busy} keyboard={!busy}>
      <Typography.Title level={5}>{assignmentStore?.name}</Typography.Title><Typography.Paragraph type="secondary">{assignmentStore?.address}</Typography.Paragraph>
      {assignmentError && <Alert type="error" showIcon message={assignmentError} style={{ marginBottom: 16 }} />}
      <Form form={assignmentForm} layout="vertical" disabled={busy} onFinish={assign}>
        <Form.Item name="storeId" hidden><Input /></Form.Item>
        <Form.Item name="bankAccountId" label={t("receivingAccount")} extra={t("assignments.onlyFuture")}>
          <Select showSearch allowClear optionFilterProp="label" placeholder={t("assignments.chooseAccount")} options={data?.accounts.map(account => ({ value: account.id,
            disabled: !account.active || !account.bankCode, label: `${account.bankName} · ${account.accountNo} · ${account.accountName}${account.active ? "" : ` (${t("inactive")})`}` }))} />
        </Form.Item>
      </Form>
    </Modal>
    <Modal open={editing !== null} title={t(editing === "new" ? "add" : "edit")} onCancel={() => setEditing(null)}
      onOk={() => accountForm.submit()} confirmLoading={busy} okText={t("save")} cancelText={t("cancel")}
      cancelButtonProps={{ disabled: busy }} closable={!busy} maskClosable={!busy} keyboard={!busy}>
      {formError && <Alert type="error" showIcon message={formError} style={{ marginBottom: 16 }} />}
      {bankError && <Alert type="warning" showIcon message={t("bankListUnavailable")} description={bankError} style={{ marginBottom: 16 }} />}
      <Form form={accountForm} layout="vertical" onFinish={saveAccount} disabled={busy}>
        <Form.Item name="bankName" label={t("bankName")} rules={[{ required: true, whitespace: true, max: 100, message: t("required") }]}
          getValueProps={value => ({ value: banks.find(bank => bank.code === bankCode && bank.shortName === value)?.code ?? (value ? "__saved__" : undefined) })}
          getValueFromEvent={value => banks.find(bank => bank.code === value)?.shortName ?? bankName}>
          <Select showSearch placeholder={t("chooseBank")} options={nameOptions} loading={bankLoading} disabled={busy || bankLoading || !!bankError}
            filterOption={(input, option) => (option?.search ?? "").includes(bankSearch(input))}
            onSelect={value => selectBank(banks.find(bank => bank.code === value))} />
        </Form.Item>
        <Form.Item name="bankCode" label={t("bankCode")} extra={t("bankCodeHelp")} rules={[{ required: true, pattern: /^[A-Za-z0-9]{2,20}$/, message: t("invalidCode") }]}>
          <Select showSearch placeholder={t("chooseBankCode")} options={codeOptions} loading={bankLoading} disabled={busy || bankLoading || !!bankError}
            filterOption={(input, option) => (option?.search ?? "").includes(bankSearch(input))}
            onSelect={value => selectBank(banks.find(bank => bank.code === value))} />
        </Form.Item>
        <Form.Item name="accountNo" label={t("accountNo")} rules={[{ required: true, pattern: /^[0-9]{1,80}$/, message: t("invalidAccount") }]}><Input inputMode="numeric" maxLength={80} autoComplete="off" /></Form.Item>
        <Form.Item name="accountName" label={t("accountName")} rules={[{ required: true, whitespace: true, max: 160, message: t("required") }]}><Input maxLength={160} autoComplete="off" /></Form.Item>
        <Form.Item name="active" label={t("active")} valuePropName="checked" extra={t("inactiveHelp")}><Switch /></Form.Item>
      </Form>
    </Modal>
  </Space>;
}
