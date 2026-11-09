import { useTranslation } from "react-i18next";
import { useFeedback } from "../../components/feedback";
import { useLocaleTools } from "../../i18n/hooks";
import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useScopedNavigate as useNavigate } from "../../components/ui-loader/use-scoped-navigate";
import { useDeferredAction } from "../../components/ui-loader/use-deferred-action";
import { Form, Input, Button, Alert } from "antd";
import { AuthLayout } from "./AuthLayout";
import { authApi } from "../../lib/api";

export const ResetPasswordPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { errorMessage } = useLocaleTools();
  const navigate = useNavigate();
  const startDeferred = useDeferredAction();
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const [error, setError] = React.useState<unknown>(null);
  useFeedback(error ? (typeof error === "string" && i18n.exists(error) ? t(error) : errorMessage(error)) : null);
  const [success, setSuccess] = React.useState<string | null>(null);
  useFeedback(success && t(success), "success");
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: {
    otp: string;
    password: string;
    confirm: string;
  }) => {
    if (loading) return;
    const task = startDeferred();
    setError(null);
    setSuccess(null);
    if (!/^\d{6}$/.test(values.otp)) {
      setError("auth:validation.otpLength");
      return;
    }
    if (values.password !== values.confirm) {
      setError("auth:validation.confirmMismatch");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({
        email,
        otp: values.otp,
        newPassword: values.password,
      });
      if (!task.isCurrent()) return;
      setSuccess("auth:reset.success");
      task.schedule(() => navigate("/login"), 1200);
    } catch (err) {
      if (!task.isCurrent()) return;
      setError(err);
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t("auth:reset.title")}
      subtitle={t("auth:reset.description", { email: email || t("auth:fields.yourEmail") })}
    >
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        {Boolean(error) && (
          <Alert
            type="error"
            message={typeof error === "string" && i18n.exists(error) ? t(error) : errorMessage(error)}
            showIcon
            style={{ marginBottom: 18, borderRadius: 12 }}
          />
        )}
        {success && (
          <Alert
            type="success"
            message={t(success)}
            showIcon
            style={{ marginBottom: 18, borderRadius: 12 }}
          />
        )}
        <Form.Item
          label={t("auth:otp.label")}
          name="otp"
          rules={[
            { required: true, message: t("auth:validation.otpRequired") },
            { pattern: /^\d{6}$/, message: t("auth:validation.otpLength") },
          ]}
        >
          <Input
            size="large"
            inputMode="numeric"
            placeholder={t("auth:otp.shortPlaceholder")}
            autoComplete="one-time-code"
          />
        </Form.Item>
        <Form.Item
          label={t("auth:fields.newPassword")}
          name="password"
          rules={[
            { required: true, message: t("auth:validation.newPasswordRequired") },
            { min: 8, message: t("auth:validation.minimumLength") },
          ]}
        >
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label={t("auth:fields.confirmPassword")}
          name="confirm"
          dependencies={["password"]}
          rules={[
            { required: true, message: t("auth:validation.confirmRequired") },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value)
                  return Promise.resolve();
                return Promise.reject(
                  new Error(t("auth:validation.confirmMismatch")),
                );
              },
            }),
          ]}
        >
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          block
          style={{ borderRadius: 999, height: 48, fontWeight: 700 }}
        >
          {t("auth:reset.title")}{" "}</Button>
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontFamily: "Quicksand, sans-serif",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <Link to="/login" style={{ color: "#8F1216" }}>
            {t("auth:backToLogin")}{" "}</Link>
        </div>
      </Form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
