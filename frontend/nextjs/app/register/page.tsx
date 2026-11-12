"use client";
import { useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import * as React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleAuthFlow } from "@/components/auth/google-auth-flow";
import { Input } from "@/components/ui/input";
import { authApi, type RegisterPayload } from "@/lib/api";
import { validateRegistration, registrationServerErrors, passwordChecks, type RegistrationErrors } from "@/lib/registration-validation";

export default function RegisterPage() {
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const router = useRouter();
  const startAction = useDeferredAction();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<RegistrationErrors>({});
  const [submitted, setSubmitted] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const focusField = React.useRef<keyof RegisterPayload | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  useFeedback(error ? (typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)) : null);
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState<string | null>(null);
  const checks = passwordChecks(password);
  const requirements = [
    { key: "length", met: checks.minLength && checks.maxLength },
    { key: "uppercase", met: checks.uppercase },
    { key: "lowercase", met: checks.lowercase },
    { key: "number", met: checks.number },
  ];

  React.useEffect(() => {
    if (loading || !focusField.current) return;
    formRef.current?.querySelector<HTMLInputElement>(`[name="${focusField.current}"]`)?.focus();
    focusField.current = null;
  }, [fieldErrors, loading]);

  const validateField = (field: keyof RegisterPayload, value: string) => {
    setError(null);
    if (field === "email") setSent(null);
    if (!submitted && !fieldErrors[field]) return;
    const errors = validateRegistration({ fullName, email, phone, password, [field]: value });
    setFieldErrors((current) => ({ ...current, [field]: errors[field] }));
  };

  const fieldMessage = (field: keyof RegisterPayload) => fieldErrors[field]?.map((key) => t(key)).join(" ");

  const validateBlur = (field: keyof RegisterPayload) => {
    const errors = validateRegistration({ fullName, email, phone, password });
    setFieldErrors((current) => ({ ...current, [field]: current[field] ?? errors[field] }));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const task = startAction();
    setError(null);
    setSent(null);
    setSubmitted(true);
    const errors = validateRegistration({ fullName, email, phone, password });
    setFieldErrors(errors);
    const firstInvalid = Object.keys(errors)[0] as keyof RegisterPayload | undefined;
    if (firstInvalid) {
      focusField.current = firstInvalid;
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.replace(/\s/g, "") || undefined,
        password,
      });
      if (task.isCurrent()) router.push(`/verify-otp?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      if (!task.isCurrent()) return;
      if (err && typeof err === "object" && "code" in err && err.code === "EMAIL_EXISTS") {
        setSent(email.trim());
      }
      const errors = registrationServerErrors(err);
      const firstInvalid = Object.keys(errors)[0] as keyof RegisterPayload | undefined;
      if (firstInvalid) {
        focusField.current = firstInvalid;
        setFieldErrors(errors);
        return;
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
        <form ref={formRef} className="auth-form" onSubmit={onSubmit} noValidate>
          {Boolean(error) && (
            <div className="form-error" role="alert">
              {typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)}
            </div>
          )}
          {sent && (
            <div className="rounded-2xl bg-[#F5EDE0] p-4 text-sm text-[#625247]" role="status">
              {t("auth.register.emailExists")}
              <Link href={`/verify-otp?email=${encodeURIComponent(sent)}`}>{t("auth.register.resendHint")}</Link>
            </div>
          )}
          <Input
            name="fullName"
            label={t("auth.fields.fullName")}
            value={fullName}
            onChange={(event) => { setFullName(event.target.value); validateField("fullName", event.target.value); }}
            onBlur={() => validateBlur("fullName")}
            error={fieldMessage("fullName")}
            required
            disabled={loading}
            autoComplete="name"
          />
          <Input
            name="email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); validateField("email", event.target.value); }}
            onBlur={() => validateBlur("email")}
            error={fieldMessage("email")}
            required
            disabled={loading}
            autoComplete="email"
            placeholder="ban@clucky.vn"
          />
          <Input
            name="phone"
            label={t("auth.fields.optionalPhone")}
            type="tel"
            value={phone}
            onChange={(event) => { setPhone(event.target.value); validateField("phone", event.target.value); }}
            onBlur={() => validateBlur("phone")}
            error={fieldMessage("phone")}
            disabled={loading}
            autoComplete="tel"
            placeholder="0901 234 567"
          />
          <Input
            name="password"
            id="registration-password"
            label={t("auth.fields.password")}
            type="password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); validateField("password", event.target.value); }}
            onBlur={() => validateBlur("password")}
            error={fieldMessage("password")}
            aria-describedby={fieldErrors.password ? "registration-password-helper registration-password-policy" : "registration-password-policy"}
            required
            disabled={loading}
            autoComplete="new-password"
            placeholder={t("auth.fields.passwordHint")}
          />
          <ul id="registration-password-policy" aria-label={t("auth.passwordChecklist.title")} aria-live="polite"
            className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {requirements.map((requirement) => (
              <li key={requirement.key} className={`flex items-start gap-2 ${requirement.met ? "text-[#166534]" : "text-[#75675E]"}`}>
                {requirement.met ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  : <Circle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
                <span>{t(`auth.passwordChecklist.${requirement.key}`)}
                  <span className="sr-only"> — {t(requirement.met ? "auth.passwordChecklist.met" : "auth.passwordChecklist.unmet")}</span>
                </span>
              </li>
            ))}
          </ul>
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
