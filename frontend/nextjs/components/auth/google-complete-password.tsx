"use client";
import { useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import React, { useState } from "react";
import { ConsentField, useLegalConsent } from "@/components/legal/consent";
import type { LegalConsentInput } from "@/lib/api";
import styles from "./auth-shared.module.css";

export interface GoogleCompletePasswordProps {
  /** Email Google đã xác thực — hiển thị cho user biết đang tạo mật khẩu cho tài khoản nào */
  email: string;
  /** Gọi khi submit hợp lệ; parent xử lý POST /api/auth/google/complete với pendingToken + password */
  onSubmit?: (password: string, consent?: LegalConsentInput) => void | Promise<void>;
  loading?: boolean;
  className?: string;
}

export function GoogleCompletePassword({
  email,
  onSubmit,
  loading = false,
  className = "",
}: GoogleCompletePasswordProps) {
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const legal = useLegalConsent();
  useFeedback(error && t(error));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) {
      setError("auth.validation.passwordLength");
      return;
    }
    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(password) ||
      new TextEncoder().encode(password).length > 72
    ) {
      setError("auth.google.passwordPolicy");
      return;
    }
    if (password !== confirm) {
      setError("auth.validation.passwordMismatch");
      return;
    }
    if (!legal.consent && !legal.transitional) {
      setError("legal.required");
      return;
    }
    setError("");
    await onSubmit?.(password, legal.consent ?? undefined);
  };

  return (
    <div className={`${styles.completeCard} ${styles.authScope} ${className}`}>
      <h2 className={styles.completeTitle}>{t("auth.google.passwordTitle")}</h2>
      <p className={styles.completeDesc}>
        {t("auth.google.account")}{" "}<strong>{email}</strong> {" "}{t("auth.google.passwordDescription")}{" "}</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="google-new-password">
            {t("auth.fields.newPassword")}{" "}</label>
          <input
            id="google-new-password"
            type="password"
            className={styles.fieldInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            autoFocus
            disabled={loading}
            aria-invalid={!!error}
            aria-describedby={error ? "google-password-error" : undefined}
            required
          />
        </div>

        <div className={styles.field}>
          <label
            className={styles.fieldLabel}
            htmlFor="google-confirm-password"
          >
            {t("auth.fields.repeatPassword")}{" "}</label>
          <input
            id="google-confirm-password"
            type="password"
            className={styles.fieldInput}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            maxLength={72}
            disabled={loading}
            aria-invalid={!!error}
            aria-describedby={error ? "google-password-error" : undefined}
            required
          />
        </div>

        {Boolean(error) && (
          <p
            id="google-password-error"
            className={styles.fieldError}
            role="alert"
          >
            {typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)}
          </p>
        )}

        <ConsentField state={legal} id="clucky-google-consent" />

        <button type="submit" className={styles.submitBtn} disabled={loading || legal.loading || legal.error}>
          {loading ? t("auth.register.loading") : t("auth.register.complete")}
        </button>
      </form>
    </div>
  );
}
