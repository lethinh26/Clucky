"use client";
import { useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";
import * as React from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useDeferredAction } from "@/components/ui-loader/use-deferred-action";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { authApi, type OtpChannel } from "@/lib/api";
import styles from "./forgot-password.module.css";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const { errorMessage } = useLocaleTools();
  const router = useRouter();
  const startDeferred = useDeferredAction();
  const [channel, setChannel] = React.useState<OtpChannel>("SMS");
  const [contact, setContact] = React.useState("");
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
    setSuccess(null);
    const identifier = channel === "SMS" ? contact.replace(/[\s()-]/g, "") : contact.trim();
    if (!(channel === "SMS" ? /^0\d{9}$/.test(identifier) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))) {
      setError(channel === "SMS" ? "auth.validation.phoneFormat" : "auth.validation.registeredEmail");
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.forgotPassword(channel === "SMS"
        ? { channel, phone: identifier }
        : { channel, email: identifier });
      if (!task.isCurrent()) return;
      setSuccess("auth.forgot.sent");
      const query = new URLSearchParams({ channel, [channel === "SMS" ? "phone" : "email"]: identifier });
      if (response.challengeId) query.set("challengeId", response.challengeId);
      task.schedule(
        () => router.push(`/reset-password?${query.toString()}`),
        1200,
      );
    } catch (err) {
      if (!task.isCurrent()) return;
      setError(err);
    } finally {
      if (task.isCurrent()) setLoading(false);
    }
  };

  const feedback = error
    ? typeof error === "string" && t.has(error) ? t(error) : errorMessage(error)
    : null;
  const isSms = channel === "SMS";

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.topBar} aria-label={t("auth.forgot.navigation")}>
          <Link href="/" className={styles.homeLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            {t("common.backHome")}
          </Link>
          <span className={styles.topSecurity}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("auth.forgot.secureLabel")}
          </span>
        </nav>

        <div className={styles.layout}>
          <aside className={styles.story} aria-label={t("auth.forgot.storyLabel")}>
            <div className={styles.brand}>
              <span className={styles.brandLogo}>
                <Image src="/logo_primary.png" alt="" width={48} height={48} priority />
              </span>
              <span className={styles.brandName}>CLUCKY <small>CRISPY & HAPPY</small></span>
            </div>

            <div className={styles.storyBody}>
              <span className={styles.storyEyebrow}>
                <Sparkles size={16} aria-hidden="true" />
                {t("auth.forgot.storyEyebrow")}
              </span>
              <h2>{t("auth.forgot.storyTitle")} <em>{t("auth.forgot.storyEmphasis")}</em></h2>
              <p>{t("auth.forgot.storyDescription")}</p>

              <div className={styles.illustration} aria-hidden="true">
                <div className={styles.orbit} />
                <div className={styles.orbitInner} />
                <div className={styles.keycard}>
                  <div className={styles.keycardTop}><span /><span /><span /></div>
                  <span className={styles.keyIcon}><LockKeyhole size={49} strokeWidth={1.8} /></span>
                  <span className={styles.keyDots}>● ● ● ● ● ●</span>
                </div>
                <div className={styles.codeBadge}><span>OTP</span><span className={styles.codeLines}>•••• ••</span></div>
                <div className={styles.successBadge}><ShieldCheck size={29} strokeWidth={2} /></div>
                <span className={styles.sparkleOne}>✦</span>
                <span className={styles.sparkleTwo}>✧</span>
              </div>
            </div>

            <div className={styles.storyFooter}>
              <span className={styles.footerIcon}><ShieldCheck size={20} aria-hidden="true" /></span>
              <span><strong>{t("auth.forgot.storyFooterTitle")}</strong><small>{t("auth.forgot.storyFooterText")}</small></span>
            </div>
          </aside>

          <section className={styles.panel} aria-labelledby="forgot-title">
            <div className={styles.panelInner}>
              <div className={styles.progressHeader}>
                <span className={styles.stepLabel}><span>01</span> / 02</span>
                <span className={styles.progressText}>{t("auth.forgot.stepLabel")}</span>
              </div>
              <div className={styles.progressTrack} aria-hidden="true"><span /></div>

              <div className={styles.intro}>
                <div className={styles.introIcon}><KeyRound size={26} aria-hidden="true" /></div>
                <span className={styles.eyebrow}>{t("auth.forgot.introEyebrow")}</span>
                <h1 id="forgot-title">{t("auth.forgot.title")}</h1>
                <p>{t("auth.forgot.description")}</p>
              </div>

              <form className={styles.form} onSubmit={onSubmit} noValidate>
                <fieldset className={styles.channelFieldset} disabled={loading}>
                  <legend className={styles.fieldLabel}>{t("auth.recovery.channel")}</legend>
                  <div className={styles.channelOptions}>
                    {(["SMS", "EMAIL"] as const).map(option => {
                      const OptionIcon = option === "SMS" ? Smartphone : Mail;
                      return (
                        <label key={option} className={styles.channelOption}>
                          <input
                            type="radio"
                            name="channel"
                            value={option}
                            className={styles.channelInput}
                            checked={channel === option}
                            onChange={() => {
                              setChannel(option);
                              setContact("");
                              setError(null);
                              setSuccess(null);
                            }}
                          />
                          <span className={styles.channelCard}>
                            <span className={styles.channelIcon}><OptionIcon size={22} aria-hidden="true" /></span>
                            <span className={styles.channelText}>
                              <strong>{t(option === "SMS" ? "auth.recovery.sms" : "auth.recovery.email")}</strong>
                              <small>{t(option === "SMS" ? "auth.forgot.smsHint" : "auth.forgot.emailHint")}</small>
                            </span>
                            <span className={styles.selectionMark}><Check size={14} aria-hidden="true" /></span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className={styles.contactField}>
                  <label htmlFor="recovery-contact" className={styles.fieldLabel}>
                    {t(isSms ? "auth.fields.phone" : "auth.fields.verifiedEmail")}
                  </label>
                  <div className={styles.inputBox}>
                    {isSms ? <Smartphone size={20} aria-hidden="true" /> : <Mail size={20} aria-hidden="true" />}
                    <input
                      key={channel}
                      id="recovery-contact"
                      type={isSms ? "tel" : "email"}
                      inputMode={isSms ? "tel" : "email"}
                      autoComplete={isSms ? "tel" : "email"}
                      maxLength={isSms ? 20 : 255}
                      placeholder={isSms ? t("auth.fields.phonePlaceholder") : "ban@example.com"}
                      value={contact}
                      onChange={e => { setContact(e.target.value); setError(null); setSuccess(null); }}
                      aria-describedby="recovery-contact-hint"
                      required
                      disabled={loading}
                    />
                  </div>
                  <p id="recovery-contact-hint" className={styles.inputHint}>
                    <ShieldCheck size={15} aria-hidden="true" />
                    {t(isSms ? "auth.forgot.phoneHelp" : "auth.forgot.emailHelp")}
                  </p>
                </div>

                {feedback && <div className={styles.error} role="alert">{feedback}</div>}
                {success && <div className={styles.success} role="status">{t(success)}</div>}

                <button type="submit" className={styles.submit} disabled={loading || Boolean(success)}>
                  <span>{loading ? t("auth.otp.sending") : t("auth.forgot.send")}</span>
                  <span className={styles.submitIcon}>
                    {loading ? <LoaderCircle size={19} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}
                  </span>
                </button>
              </form>

              <div className={styles.privacyNote}>
                <LockKeyhole size={16} aria-hidden="true" />
                <span>{t("auth.forgot.privacyNote")}</span>
              </div>

              <div className={styles.panelFooter}>
                <Link href="/login" className={styles.loginLink}>
                  <ArrowLeft size={17} aria-hidden="true" />
                  {t("auth.forgot.backToLogin")}
                </Link>
                <span>{t("auth.forgot.nextStep")}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
