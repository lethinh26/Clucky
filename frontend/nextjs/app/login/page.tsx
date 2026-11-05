"use client";
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

export default function LoginPage() {
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const router = useRouter();
  const startAction = useDeferredAction();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const task = startAction();
    setError(null);
    if (!email || !password) {
      setError("auth.validation.credentialsRequired");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("auth.validation.checkEmail");
      return;
    }
    setLoading(true);
    try {
      const tokens = await authApi.login({ email: email.trim(), password });
      if (!task.isCurrent()) return;
      if (typeof window !== "undefined") {
        localStorage.setItem("clucky_access_token", tokens.accessToken);
        // refresh token stored in HttpOnly cookie; role guides post-login routing
        if (tokens.role) localStorage.setItem("clucky_user_role", tokens.role);
      }
      router.push("/account");
    } catch (err) {
      if (!task.isCurrent()) return;

      setError(err);
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.login.title")}
      subtitle={t("auth.login.description")}
    >
      <GoogleAuthFlow>
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          {Boolean(error) && (
            <div className="form-error" role="alert">
              {typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)}
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
          />
          <Input
            label={t("auth.fields.password")}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="auth-links">
            <Link href="/forgot-password">{t("auth.login.forgotPassword")}</Link>
          </div>
          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading}
          >
            {loading ? t("auth.login.loading") : t("auth.login.action")}
          </button>
          <span className="auth-footer-link">
            {t("auth.login.noAccount")}{" "}<Link href="/register">{t("auth.login.signUp")}</Link>
          </span>
        </form>
      </GoogleAuthFlow>
    </AuthShell>
  );
}
