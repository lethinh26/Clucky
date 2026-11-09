"use client";
import { notify, useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";

import { useState, type ReactNode } from "react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import { authApi, type AuthTokens } from "@/lib/api";
import { getGoogleIdentity } from "@/lib/google-auth";
import { GoogleButton } from "./google-button";
import { GoogleCompletePassword } from "./google-complete-password";
import styles from "./auth-shared.module.css";

export function GoogleAuthFlow({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const router = useRouter();
  const startAction = useDeferredAction();
  const [pending, setPending] = useState<{
    token: string;
    email: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useFeedback(error ? (typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)) : null);

  function finish(tokens: AuthTokens) {
    if (!tokens.userId)
      throw new Error(t("business.googleauthflow.invalidSignInResponsePleaseTryAgain"));
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    const destination = redirect?.startsWith("/") && !redirect.startsWith("//") && !redirect.includes("\\")
      ? redirect : "/";
    router.replace(destination);
    notify.success(t("common.feedback.signedIn"));
  }

  async function login() {
    if (loading) return;
    const task = startAction();
    setLoading(true);
    setError("");
    try {
      const identity = await getGoogleIdentity();
      if (!task.isCurrent()) return;
      const result = await authApi.google(identity.idToken);
      if (!task.isCurrent()) return;
      if ("status" in result && result.status === "REQUIRES_PASSWORD") {
        if (!result.pendingToken)
          throw new Error(t("business.googleauthflow.missingGoogleRegistrationSessionPleaseTryAgain"));
        setPending({ token: result.pendingToken, email: identity.email });
      } else {
        finish(result as AuthTokens);
      }
    } catch (err) {
      if (!task.isCurrent()) return;
      setError(err);
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  }

  async function complete(password: string) {
    if (!pending || loading) return;
    const task = startAction();
    setLoading(true);
    setError("");
    try {
      const tokens = await authApi.completeGoogle(pending.token, password);
      if (task.isCurrent()) finish(tokens);
    } catch (err) {
      if (!task.isCurrent()) return;
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 410) {
        setPending(null);
        setError(
          "auth.google.sessionExpired",
        );
      } else if (status === 409 || status === undefined || status >= 500) {
        setPending(null);
        setError("auth.google.restartSignIn");
      } else {
        setError(err);
      }
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  }

  return (
    <div aria-busy={loading}>
      {Boolean(error) && (
        <p className="form-error" role="alert">
          {typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)}
        </p>
      )}
      {pending ? (
        <>
          <GoogleCompletePassword
            email={pending.email}
            onSubmit={complete}
            loading={loading}
          />
          <button
            type="button"
            className={styles.googleBtn}
            disabled={loading}
            onClick={() => {
              setPending(null);
              setError("");
            }}
          > {t("business.googleauthflow.backToSignIn")} </button>
        </>
      ) : (
        <>
          {children}
          <div className={styles.divider}>{t("business.googleauthflow.or")}</div>
          <GoogleButton onClick={login} loading={loading} />
        </>
      )}
    </div>
  );
}
