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
import { authApi } from "@/lib/api";
import { ConsentField, useLegalConsent } from "@/components/legal/consent";
import { validateRegistration, registrationServerErrors, passwordChecks, type RegistrationErrors } from "@/lib/registration-validation";

export default function RegisterPage() {
  type RegistrationField = 'fullName' | 'phone' | 'password';
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const router = useRouter();
  const startAction = useDeferredAction();
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<RegistrationErrors>({});
  const [submitted, setSubmitted] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const focusField = React.useRef<RegistrationField | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  useFeedback(error ? (typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)) : null);
  const [loading, setLoading] = React.useState(false);
  const legal = useLegalConsent();
  const [consentError, setConsentError] = React.useState(false);
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

  const validateField = (field: RegistrationField, value: string) => {
    setError(null);
    if (field === "phone") setSent(null);
    if (!submitted && !fieldErrors[field]) return;
    const errors = validateRegistration({ fullName, phone, password, [field]: value });
    setFieldErrors((current) => ({ ...current, [field]: errors[field] }));
  };

  const fieldMessage = (field: RegistrationField) => fieldErrors[field]?.map((key) => t(key)).join(" ");

  const validateBlur = (field: RegistrationField) => {
    const errors = validateRegistration({ fullName, phone, password });
    setFieldErrors((current) => ({ ...current, [field]: current[field] ?? errors[field] }));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const task = startAction();
    setError(null);
    setSent(null);
    setSubmitted(true);
    const errors = validateRegistration({ fullName, phone, password });
    setFieldErrors(errors);
    const firstInvalid = Object.keys(errors)[0] as RegistrationField | undefined;
    if (firstInvalid) {
      focusField.current = firstInvalid;
      return;
    }
    if (!legal.consent && !legal.transitional) { setConsentError(true); return; }
    setConsentError(false);
    setLoading(true);
    try {
      const normalizedPhone = phone.replace(/\s/g, "");
      const result = await authApi.register({
        fullName: fullName.trim(),
        phone: normalizedPhone,
        password,
        ...(legal.consent ? { consent: legal.consent } : {}),
      });
      if (!result.challengeId) throw new Error(t("auth.validation.missingChallenge"));
      if (task.isCurrent()) router.push(`/verify-otp?phone=${encodeURIComponent(normalizedPhone)}&challengeId=${encodeURIComponent(result.challengeId)}`);
    } catch (err) {
      if (!task.isCurrent()) return;
      const duplicatePhone = err && typeof err === "object" && "code" in err && (
        err.code === "PHONE_EXISTS" || (
          err.code === "RESOURCE_CONFLICT" && "fieldErrors" in err
          && err.fieldErrors != null && typeof err.fieldErrors === "object"
          && "phone" in err.fieldErrors && err.fieldErrors.phone === "ALREADY_EXISTS"
        )
      );
      if (duplicatePhone) {
        setSent(phone.replace(/\s/g, ""));
        setFieldErrors({});
        return;
      }
      const consentConflict = err && typeof err === "object" && "fieldErrors" in err
        && err.fieldErrors != null && typeof err.fieldErrors === "object"
        && "consent" in err.fieldErrors;
      if (consentConflict) {
        setError("legal.outdated");
        void legal.refresh();
        return;
      }
      const errors = registrationServerErrors(err);
      const firstInvalid = Object.keys(errors)[0] as RegistrationField | undefined;
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
            <div className="rounded-2xl border border-[#E8D6BC] bg-[#FFF5E8] p-4 text-sm text-[#625247]" role="status">
              <p className="mb-3">{t("auth.register.phoneExists")}</p>
              <Link
                className="flex w-full items-center justify-center rounded-xl bg-[#8F1216] px-4 py-3 font-bold text-white hover:bg-[#6D0E11]"
                href={`/verify-otp?phone=${encodeURIComponent(sent)}`}
              >
                {t("auth.register.resendHint")}
              </Link>
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
            name="phone"
            label={t("auth.fields.phone")}
            type="tel"
            value={phone}
            onChange={(event) => { setPhone(event.target.value); validateField("phone", event.target.value); }}
            onBlur={() => validateBlur("phone")}
            error={fieldMessage("phone")}
            required
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
          <ConsentField state={legal} id="clucky-phone-consent" />
          {consentError && !legal.consent && !legal.transitional && <p className="form-error" role="alert">{t("legal.required")}</p>}
          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading || legal.loading || legal.error}
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
