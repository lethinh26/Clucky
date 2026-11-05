"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import * as React from "react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useSearchParams } from "next/navigation";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";

function ResetPasswordForm() {
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const router = useRouter();
  const startDeferred = useDeferredAction();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [otp, setOtp] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<unknown>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const task = startDeferred();
    setError(null);
    if (password !== confirm) {
      setError("auth.validation.confirmMismatch");
      return;
    }
    if (!/^\d{6}$/.test(otp) || password.length < 8) {
      setError("auth.validation.resetCredentials");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword: password });
      if (!task.isCurrent()) return;
      setSuccess("auth.reset.success");
      task.schedule(() => router.push("/login"), 1200);
    } catch (err) {
      if (!task.isCurrent()) return;
      setError(err);
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.reset.title")}
      subtitle={t("auth.reset.description", { email: email || t("auth.fields.yourEmail") })}
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
          label={t("auth.otp.label")}
          inputMode="numeric"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          required
          disabled={loading}
          placeholder={t("auth.otp.placeholder")}
        />
        <Input
          label={t("auth.fields.newPassword")}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
        <Input
          label={t("auth.fields.confirmPassword")}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          disabled={loading}
          error={
            password !== confirm && confirm
              ? t("auth.validation.confirmMismatch")
              : undefined
          }
        />
        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={loading}
        >
          {loading ? t("common.updating") : t("auth.reset.title")}
        </button>
        <span className="auth-footer-link">
          <Link href="/login">{t("auth.backToLogin")}</Link>
        </span>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations();
  return (
    <React.Suspense
      fallback={
        <AuthShell title={t("auth.reset.title")}>
          <div />
        </AuthShell>
      }
    >
      <ResetPasswordForm />
    </React.Suspense>
  );
}
