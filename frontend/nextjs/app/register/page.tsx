"use client";
import { useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import * as React from "react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleAuthFlow } from "@/components/auth/google-auth-flow";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";

export default function RegisterPage() {
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const router = useRouter();
  const startAction = useDeferredAction();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<unknown>(null);
  useFeedback(error ? (typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)) : null);
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const task = startAction();
    setError(null);
    setSent(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError("auth.validation.registrationRequired");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("auth.validation.checkEmail");
      return;
    }
    if (password.length < 8) {
      setError("auth.validation.minimumPassword");
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone || undefined,
        password,
      });
      if (task.isCurrent()) router.push(`/verify-otp?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      if (!task.isCurrent()) return;
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "EMAIL_EXISTS") {
        setSent(email.trim());
      }
      setError(err);
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.register.title")}
      subtitle={t("auth.register.description")}
    >
      <GoogleAuthFlow>
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          {Boolean(error) && (
            <div className="form-error" role="alert">
              {typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)}
            </div>
          )}
          {sent && (
            <div className="form-success" role="status">
              {t("auth.register.emailExists")}
              <Link href={`/verify-otp?email=${encodeURIComponent(sent)}`}>{t("auth.register.resendHint")}</Link>
            </div>
          )}
          <Input
            label={t("auth.fields.fullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={loading}
            autoComplete="name"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
            placeholder="ban@clucky.vn"
          />
          <Input
            label={t("auth.fields.optionalPhone")}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            autoComplete="tel"
            placeholder="0901 234 567"
          />
          <Input
            label={t("auth.fields.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            placeholder={t("auth.fields.passwordHint")}
          />
          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading}
          >
            {loading ? t("auth.register.loading") : t("auth.register.action")}
          </button>
          <span className="auth-footer-link">
            {t("auth.register.haveAccount")}{" "}<Link href="/login">{t("auth.login.action")}</Link>
          </span>
        </form>
      </GoogleAuthFlow>
    </AuthShell>
  );
}
