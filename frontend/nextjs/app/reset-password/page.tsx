"use client";
import { useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import * as React from "react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useSearchParams } from "next/navigation";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { authApi, type OtpChannel } from "@/lib/api";
import { passwordChecks } from "@/lib/registration-validation";

function ResetPasswordForm() {
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const router = useRouter();
  const startDeferred = useDeferredAction();
  const params = useSearchParams();
  const channel: OtpChannel = params.get("channel") === "EMAIL" ? "EMAIL" : "SMS";
  const identifier = (channel === "SMS" ? params.get("phone") : params.get("email")) ?? "";
  const challengeId = params.get("challengeId") ?? undefined;
  const [otp, setOtp] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<unknown>(null);
  useFeedback(error ? (typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)) : null);
  const [success, setSuccess] = React.useState<string | null>(null);
  useFeedback(success && t(success), "success");
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
    if (!(channel === "SMS" ? /^0\d{9,10}$/.test(identifier) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))) {
      setError("auth.validation.recoveryRequired");
      return;
    }
    const checks = passwordChecks(password);
    if (!/^\d{6}$/.test(otp) || !Object.values(checks).every(Boolean)) {
      setError("auth.validation.resetCredentials");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ ...(channel === "SMS" ? { channel, phone: identifier } : { channel, email: identifier }), otp, newPassword: password, ...(challengeId ? { challengeId } : {}) });
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
      subtitle={t("auth.reset.description", { contact: identifier || t("auth.fields.yourPhone") })}
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
        {!identifier && <p className="form-error" role="alert">{t("auth.validation.recoveryRequired")} <Link href="/forgot-password">{t("auth.forgot.title")}</Link></p>}
        <Input
          label={t("auth.otp.label")}
          inputMode="numeric"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          disabled={loading || !identifier}
          placeholder={t("auth.otp.placeholder")}
        />
        <Input
          label={t("auth.fields.newPassword")}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading || !identifier}
        />
        <p className="text-xs leading-relaxed text-[#75675E]">{t("auth.google.passwordPolicy")}</p>
        <Input
          label={t("auth.fields.confirmPassword")}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          disabled={loading || !identifier}
          error={
            password !== confirm && confirm
              ? t("auth.validation.confirmMismatch")
              : undefined
          }
        />
        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={loading || !identifier}
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
