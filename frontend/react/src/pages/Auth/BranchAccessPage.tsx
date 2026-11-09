import { useState } from "react";
import { Alert, Button, Form, Input, Select, Typography } from "antd";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, getErrorMessage } from "../../lib/api";
import { AuthLayout } from "./AuthLayout";

export function BranchAccessPage() {
  const { t } = useTranslation("accounts");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form] = Form.useForm();
  async function request(values: { login: string; purpose: string }) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await api.post<{ challengeId: string }>("/api/auth/branch/challenge", values);
      form.setFieldValue("challengeId", response.data.challengeId);
      setNotice("sent");
    } catch (failure) { setError(getErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function finish(values: { challengeId: string; otp: string; password: string }) {
    setBusy(true); setError(""); setNotice("");
    try {
      await api.post("/api/auth/branch/finish", values);
      form.resetFields(); setNotice("done");
    } catch (failure) { setError(getErrorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <AuthLayout title={t("access")} subtitle={t("sent")}>
    {error && <Alert type="error" message={error} showIcon />}
    {notice && <Alert type="success" message={t(notice)} showIcon />}
    <Form layout="vertical" onFinish={request} initialValues={{ purpose: "RESET" }} disabled={busy}>
      <Form.Item name="login" label={t("login")} rules={[{ required: true, max: 255 }]}><Input autoComplete="username" /></Form.Item>
      <Form.Item name="purpose" label={t("purpose")} rules={[{ required: true }]}><Select options={[
        { value: "ACTIVATE", label: t("activation") }, { value: "RESET", label: t("reset") },
      ]} /></Form.Item>
      <Button htmlType="submit" loading={busy}>{t("request")}</Button>
    </Form>
    <Typography.Title level={4}>{t("confirm")}</Typography.Title>
    <Form form={form} layout="vertical" onFinish={finish} disabled={busy}>
      <Form.Item name="challengeId" label={t("challenge")} rules={[{ required: true, pattern: /^[0-9a-f-]{36}$/i }]}><Input autoComplete="off" /></Form.Item>
      <Form.Item name="otp" label={t("otp")} rules={[{ required: true, pattern: /^\d{8}$/ }]}><Input inputMode="numeric" autoComplete="one-time-code" maxLength={8} /></Form.Item>
      <Form.Item name="password" label={t("password")} rules={[{ required: true, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/ }]}><Input.Password autoComplete="new-password" /></Form.Item>
      <Button htmlType="submit" type="primary" loading={busy}>{t("confirm")}</Button>
    </Form>
    <Link to="/login">{t("back")}</Link>
  </AuthLayout>;
}
