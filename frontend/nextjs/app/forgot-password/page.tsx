"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import * as React from "react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const router = useRouter();
  const startDeferred = useDeferredAction();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<unknown>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const task = startDeferred();
    setError(null);
    setSuccess(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("auth.validation.registeredEmail");
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      if (!task.isCurrent()) return;
      setSuccess("auth.forgot.sent");
      task.schedule(
        () => router.push(`/reset-password?email=${encodeURIComponent(email)}`),
        1200,
      );
    } catch (err) {
      if (!task.isCurrent()) return;
      setError(err);
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.description")}
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {Boolean(error) && (
          <div className="form-error" role="alert">
            {typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)}
          </div>
        )}
        {success && (
          <div className="form-success" role="status">
            {t(success)}
          </div>
        )}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@clucky.vn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={loading}
        >
          {loading ? t("auth.otp.sending") : t("auth.forgot.send")}
        </button>
        <span className="auth-footer-link">
          <Link href="/login">{t("auth.backToLogin")}</Link>
        </span>
      </form>
    </AuthShell>
  );
}
