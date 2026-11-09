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
import { authApi } from "@/lib/api";

const OTP_LENGTH = 6;

function VerifyOtpForm() {
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const router = useRouter();
  const startDeferred = useDeferredAction();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [digits, setDigits] = React.useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [error, setError] = React.useState<unknown>(null);
  useFeedback(error ? (typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)) : null);
  const [success, setSuccess] = React.useState<string | null>(null);
  useFeedback(success && t(success), "success");
  const [loading, setLoading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const setDigit = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = v;
      return next;
    });
    if (v && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0)
      inputsRef.current[i - 1]?.focus();
  };

  const otp = digits.join("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || resending) return;
    const task = startDeferred();
    setError(null);
    setSuccess(null);
    if (otp.length !== OTP_LENGTH) {
      setError("auth.validation.sixDigits");
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyOtp({ email, otp });
      if (!task.isCurrent()) return;
      setSuccess("auth.otp.verified");
      task.schedule(() => router.push("/account"), 800);
    } catch (err) {
      if (!task.isCurrent()) return;

      setError(err);
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  const resend = async () => {
    if (!email || cooldown > 0 || loading || resending) return;
    const task = startDeferred();
    setResending(true);
    setError(null);
    try {
      await authApi.register({ fullName: "", email, password: "" });
      if (!task.isCurrent()) return;
      setCooldown(60);
      setSuccess("auth.otp.resent");
    } catch (err) {
      if (!task.isCurrent()) return;
      setError(err);
    } finally {
      if (task.isCurrent()) setResending(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.otp.title")}
      subtitle={t("auth.otp.description", { count: OTP_LENGTH, email: email || t("auth.fields.yourEmail") })}
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
        <div className="otp-input" role="group" aria-label={t("auth.otp.label")}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={1}
              onPaste={(event) => {
                const code = event.clipboardData
                  .getData("text")
                  .replace(/\D/g, "")
                  .slice(0, OTP_LENGTH);
                if (!code) return;
                event.preventDefault();
                setDigits(
                  Array.from(
                    { length: OTP_LENGTH },
                    (_, index) => code[index] ?? "",
                  ),
                );
                inputsRef.current[
                  Math.min(code.length, OTP_LENGTH - 1)
                ]?.focus();
              }}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              aria-label={t("business.verifyotp.digit", { value1: i + 1 })}
            />
          ))}
        </div>
        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={loading}
        >
          {loading ? t("auth.otp.verifying") : t("common.confirm")}
        </button>
        <span className="auth-footer-link">
          {t("auth.otp.notReceived")}{" "}
          <button
            type="button"
            onClick={resend}
            disabled={resending || cooldown > 0}
            style={{
              background: "none",
              border: 0,
              padding: 0,
              color: "var(--wine)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {cooldown > 0
              ? t("auth.otp.resendCountdown", { seconds: cooldown })
              : resending
                ? t("auth.otp.sending")
                : t("auth.otp.resend")}
          </button>
        </span>
        <span className="auth-footer-link">
          <Link href="/login">{t("auth.backToLogin")}</Link>
        </span>
      </form>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  const t = useTranslations();
  return (
    <React.Suspense
      fallback={
        <AuthShell title={t("auth.otp.title")}>
          <div />
        </AuthShell>
      }
    >
      <VerifyOtpForm />
    </React.Suspense>
  );
}
