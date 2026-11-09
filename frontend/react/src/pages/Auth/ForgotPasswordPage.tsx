import { useTranslation } from "react-i18next";
import { useFeedback } from "../../components/feedback";
import { useLocaleTools } from "../../i18n/hooks";
import React from 'react';
import { Link } from 'react-router-dom';
import { useScopedNavigate as useNavigate } from '../../components/ui-loader/use-scoped-navigate';
import { useDeferredAction } from '../../components/ui-loader/use-deferred-action';
import { Form, Input, Button, Alert } from 'antd';
import { AuthLayout } from './AuthLayout';
import { authApi } from '../../lib/api';

export const ForgotPasswordPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { errorMessage } = useLocaleTools();
  const navigate = useNavigate();
  const startDeferred = useDeferredAction();
  const [error, setError] = React.useState<unknown>(null);
  useFeedback(error ? (typeof error === "string" && i18n.exists(error) ? t(error) : errorMessage(error)) : null);
  const [success, setSuccess] = React.useState<string | null>(null);
  useFeedback(success && t(success), "success");
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { email: string }) => {
    if (loading) return;
    const task = startDeferred();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(values);
      if (!task.isCurrent()) return;
      setSuccess("auth:forgot.sent");
      task.schedule(() => navigate(`/reset-password?email=${encodeURIComponent(values.email)}`), 1200);
    } catch (err) {
      if (!task.isCurrent()) return;
      setError(err);
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthLayout title={t("auth:forgot.title")} subtitle={t("auth:forgot.description")}>
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        {Boolean(error) && <Alert type="error" message={typeof error === "string" && i18n.exists(error) ? t(error) : errorMessage(error)} showIcon style={{ marginBottom: 18, borderRadius: 12 }} />}
        {success && <Alert type="success" message={t(success)} showIcon style={{ marginBottom: 18, borderRadius: 12 }} />}
        <Form.Item label="Email" name="email" rules={[{ required: true, message: t("auth:validation.emailRequired") }, { type: 'email', message: t("auth:validation.emailInvalid") }]}>
          <Input size="large" autoComplete="email" placeholder="ban@clucky.local" />
        </Form.Item>
        <Button type="primary" htmlType="submit" size="large" loading={loading} block style={{ borderRadius: 999, height: 48, fontWeight: 700 }}>
          {t("auth:forgot.send")}{" "}</Button>
        <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'Quicksand, sans-serif', fontWeight: 600, fontSize: 13 }}>
          <Link to="/login" style={{ color: '#8F1216' }}>{t("auth:backToLogin")}</Link>
        </div>
      </Form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
