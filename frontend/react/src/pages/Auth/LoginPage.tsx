import { useTranslation } from "react-i18next";
import { useFeedback } from "../../components/feedback";
import { useLocaleTools } from "../../i18n/hooks";
import React from "react";
import { useDeferredAction } from "../../components/ui-loader/use-deferred-action";
import { Link, useLocation } from "react-router-dom";
import { useScopedNavigate as useNavigate } from "../../components/ui-loader/use-scoped-navigate";
import { Form, Input, Button, Alert } from "antd";
import { AuthLayout } from "./AuthLayout";
import { authApi } from "../../lib/api";
import { roleHome } from "../../lib/role-home";

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [passwordUpdated] = React.useState(() => {
    try {
      return Boolean((location.state as { branchPasswordUpdated?: boolean } | null)?.branchPasswordUpdated)
        || sessionStorage.getItem('clucky_admin_password_updated') === '1';
    } catch {
      return Boolean((location.state as { branchPasswordUpdated?: boolean } | null)?.branchPasswordUpdated);
    }
  });
  const [recoveryUpdated] = React.useState(() => {
    try {
      return Boolean((location.state as { recoveryUpdated?: boolean } | null)?.recoveryUpdated)
        || sessionStorage.getItem('clucky_admin_recovery_updated') === '1';
    } catch {
      return Boolean((location.state as { recoveryUpdated?: boolean } | null)?.recoveryUpdated);
    }
  });
  React.useEffect(() => {
    try {
      sessionStorage.removeItem('clucky_admin_password_updated');
      sessionStorage.removeItem('clucky_admin_recovery_updated');
    } catch {}
  }, []);
  const { errorMessage } = useLocaleTools();
  const navigate = useNavigate();
  const startAction = useDeferredAction();
  const [error, setError] = React.useState<unknown>(null);
  useFeedback(error ? (typeof error === "string" && i18n.exists(error) ? t(error) : errorMessage(error)) : null);
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    if (loading) return;
    const task = startAction();
    setError(null);
    setLoading(true);
    try {
      const session = await authApi.login(values);
      if (!task.isCurrent()) return;
      navigate(roleHome(session.role));
    } catch (err) {
      if (!task.isCurrent()) return;
      const failure = err as { status?: number; fieldErrors?: { sessionLimit?: string } } | null;
      setError(failure?.status === 409 && failure.fieldErrors?.sessionLimit === 'REACHED'
        ? 'accounts:deviceSessions.loginLimit' : err);
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("admin:auth.loginTitle")}
      subtitle={t("admin:auth.loginDescription")}
    >
      <Form
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        style={{ display: "grid", gap: 0 }}
      >
        {passwordUpdated && (
          <Alert type="success" showIcon message={t("accounts:loginAfterPassword")} style={{ marginBottom: 18, borderRadius: 12 }} />
        )}
        {recoveryUpdated && (
          <Alert type="success" showIcon message={t("accounts:loginAfterRecovery")} style={{ marginBottom: 18, borderRadius: 12 }} />
        )}
        {Boolean(error) && (
          <Alert
            type="error"
            message={typeof error === "string" && i18n.exists(error) ? t(error) : errorMessage(error)}
            showIcon
            style={{ marginBottom: 18, borderRadius: 12 }}
          />
        )}
        <Form.Item
          label={t("accounts:login")}
          name="email"
          rules={[
            { required: true, message: t("auth:validation.emailRequired") },
          ]}
        >
          <Input
            size="large"
            placeholder="manager.1 / staff.1 / admin@example.com"
            autoComplete="username"
          />
        </Form.Item>
        <Form.Item
          label={t("auth:fields.password")}
          name="password"
          rules={[{ required: true, message: t("auth:validation.passwordRequired") }]}
        >
          <Input.Password
            size="large"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Form.Item>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 18,
            fontFamily: "Quicksand, sans-serif",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <Link to="/forgot-password" style={{ color: "#8F1216" }}>
            {t("accounts:access")}{" "}</Link>
        </div>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          block
          style={{ borderRadius: 999, height: 48, fontWeight: 700 }}
        >
          {t("auth:login.action")}{" "}</Button>
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            color: "#6B6259",
            fontSize: 13,
            fontFamily: "Quicksand, sans-serif",
            fontWeight: 600,
          }}
        >
          {t("admin:auth.assignedAccount")}{" "}</div>
      </Form>
    </AuthLayout>
  );
};

export default LoginPage;
