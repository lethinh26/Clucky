"use client";
import { useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { AddressDialog } from "@/components/maps/address-dialog";
import { emptyAddress, formatAddress, profileApi, type Profile, type Address } from "@/lib/locations";
import { profileApi as securityProfileApi, type OtpChannel } from "@/lib/api";
import { passwordChecks } from "@/lib/registration-validation";
import { expireSession } from "@/lib/session";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import {
  UserRound,
  MapPin,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  ChevronRight,
  ShoppingBag,
  UtensilsCrossed,
  Phone,
  Mail,
  Check,
  MessageSquareQuote,
} from "lucide-react";
import Link from "@/components/ui-loader/navigation-link";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import styles from "./account.module.css";
import { MyReviewsPanel } from "@/components/reviews/my-reviews-panel";
import { useSession } from "@/components/auth/use-session";

const initialProfile: Profile = {
  fullName: "",
  email: null,
  phone: "",
};
function canonicalPhone(value: string) {
  const phone = value.replace(/[\s()-]/g, "");
  return /^0\d{9}$/.test(phone) ? "+84" + phone.slice(1) : phone;
}
function accountError(error: unknown, kind: "email" | "phone", fallback: string) {
  const failure = error as { code?: string; status?: number; fieldErrors?: Record<string, string> } | null;
  if (failure?.fieldErrors?.currentPassword === "INVALID") {
    return "auth.security.contactPasswordInvalid";
  }
  if (kind === "email" && failure?.fieldErrors?.email === "ALREADY_VERIFIED") {
    return "auth.security.emailAlreadyVerified";
  }
  if (kind === "phone" && failure?.fieldErrors?.phone === "ALREADY_VERIFIED") {
    return "auth.security.phoneAlreadyVerified";
  }
  if (kind === "email" && (failure?.code === "EMAIL_EXISTS"
    || failure?.fieldErrors?.email === "ALREADY_EXISTS" || failure?.status === 409)) {
    return "auth.security.emailInUse";
  }
  if (kind === "phone" && (failure?.code === "PHONE_EXISTS"
    || failure?.fieldErrors?.phone === "ALREADY_EXISTS" || failure?.status === 409)) {
    return "auth.security.phoneInUse";
  }
  if (failure?.status === 429 || failure?.code === "OTP_RATE_LIMITED") return "auth.security.otpRateLimited";
  return fallback;
}
export default function AccountPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useSession();
  const userId = user?.userId;
  const sessionFullName = user?.fullName;
  const storageKey = `clucky_profile_ui_v1:${user?.userId}`;

  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(initialProfile);
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [legacy, setLegacy] = useState<Address[]>([]);
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState("");
  useFeedback(notice && t(notice), "success");
  const [error, setError] = useState("");
  useFeedback(error && t(error));
  const [editing, setEditing] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [password, setPassword] = useState({
    next: "",
    confirm: "",
    otp: "",
  });
  const [emailDraft, setEmailDraft] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [emailChallenge, setEmailChallenge] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneCurrentPassword, setPhoneCurrentPassword] = useState("");
  const [phoneChallenge, setPhoneChallenge] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [passwordChannel, setPasswordChannel] = useState<OtpChannel>("SMS");
  const [passwordChallenge, setPasswordChallenge] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setReady(false); setError("");
    Promise.all([profileApi.get(), profileApi.addresses()]).then(([nextProfile, nextAddresses]) => {
      if (!active) return;
      setProfile(nextProfile); setSavedProfile(nextProfile); setAddresses(nextAddresses);
      setEmailDraft(nextProfile.email ?? ""); setEmailChallenge(null); setEmailOtp(""); setEmailCurrentPassword(""); setEmailError(""); setPasswordChallenge(null);
      setPhoneDraft(nextProfile.phone ?? ""); setPhoneChallenge(null); setPhoneOtp(""); setPhoneCurrentPassword(""); setPhoneError("");
      setPasswordChannel(nextProfile.phone && nextProfile.phoneVerified === true ? "SMS" : "EMAIL");
      setReady(true);
    }).catch(() => { if (active) setError("maps.loadError"); });
    try {
      const raw = localStorage.getItem(storageKey);
      const old = raw ? JSON.parse(raw) : null;
      if (Array.isArray(old?.addresses)) setLegacy(old.addresses.filter((address: Address) =>
        ["receiverName", "phone", "province", "district", "ward", "detail"].every(key => typeof address[key as keyof Address] === "string")));
    } catch { setLegacy([]); }
    return () => { active = false; };
  }, [storageKey, userId, reload]);
  async function saveProfile(nextProfile: Profile) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await profileApi.update(nextProfile);
      setProfile(saved); setSavedProfile(saved); setNotice("maps.saved");
    } catch { setError("maps.saveError"); }
    finally { setBusy(false); }
  }
  async function requestEmailOtp(event: FormEvent) {
    event.preventDefault();
    if (busy || emailBusy || phoneBusy) return;
    const email = emailDraft.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("auth.validation.checkEmail"); return;
    }
    if (savedProfile.emailVerified === true && savedProfile.email?.toLowerCase() === email.toLowerCase()) {
      setEmailError("auth.security.emailAlreadyVerified"); return;
    }
    setEmailBusy(true); setEmailError(""); setNotice(""); setEmailChallenge(null); setEmailOtp("");
    try {
      const result = await securityProfileApi.requestEmailOtp(email);
      if (!result.challengeId) { setEmailError("auth.validation.missingChallenge"); return; }
      setEmailChallenge(result.challengeId); setEmailOtp(""); setNotice("auth.security.emailSent");
    } catch (error) { setEmailError(accountError(error, "email", "auth.security.emailRequestFailed")); }
    finally { setEmailBusy(false); }
  }
  async function confirmEmail(event: FormEvent) {
    event.preventDefault();
    if (busy || emailBusy || phoneBusy || !emailChallenge) return;
    if (!/^\d{6}$/.test(emailOtp)) { setEmailError("auth.validation.sixDigits"); return; }
    if (!emailCurrentPassword) { setEmailError("auth.security.contactPasswordRequired"); return; }
    setEmailBusy(true); setEmailError(""); setNotice("");
    try {
      const response = await securityProfileApi.confirmEmail({ email: emailDraft.trim(), otp: emailOtp,
        challengeId: emailChallenge, currentPassword: emailCurrentPassword });
      const updated: Profile = { ...response, phone: response.phone ?? "" };
      setProfile(updated); setSavedProfile(updated);
      setEmailDraft(updated.email ?? ""); setEmailOtp(""); setEmailCurrentPassword(""); setEmailChallenge(null);
      if (updated.emailVerified === true) setNotice("auth.security.emailVerified");
      else setEmailError("auth.security.emailVerificationPending");
    } catch (error) { setEmailError(accountError(error, "email", "auth.security.emailConfirmFailed")); }
    finally { setEmailBusy(false); }
  }
  async function requestPhoneOtp(event: FormEvent) {
    event.preventDefault();
    if (busy || phoneBusy || emailBusy) return;
    const phone = canonicalPhone(phoneDraft);
    if (!/^(?:0\d{9}|\+[1-9]\d{7,14})$/.test(phone)) {
      setPhoneError("auth.validation.phoneFormat"); return;
    }
    if (savedProfile.phoneVerified === true && canonicalPhone(savedProfile.phone) === phone) {
      setPhoneError("auth.security.phoneAlreadyVerified"); return;
    }
    setPhoneBusy(true); setPhoneError(""); setNotice(""); setPhoneChallenge(null); setPhoneOtp("");
    try {
      const result = await securityProfileApi.requestPhoneOtp(phone);
      if (!result.challengeId) { setPhoneError("auth.validation.missingChallenge"); return; }
      setPhoneChallenge(result.challengeId); setPhoneOtp(""); setNotice("auth.security.phoneSent");
    } catch (error) { setPhoneError(accountError(error, "phone", "auth.security.phoneRequestFailed")); }
    finally { setPhoneBusy(false); }
  }
  async function confirmPhone(event: FormEvent) {
    event.preventDefault();
    if (busy || phoneBusy || emailBusy || !phoneChallenge) return;
    if (!/^\d{6}$/.test(phoneOtp)) { setPhoneError("auth.validation.sixDigits"); return; }
    if (!phoneCurrentPassword) { setPhoneError("auth.security.contactPasswordRequired"); return; }
    setPhoneBusy(true); setPhoneError(""); setNotice("");
    try {
      const response = await securityProfileApi.confirmPhone({ phone: canonicalPhone(phoneDraft), otp: phoneOtp,
        challengeId: phoneChallenge, currentPassword: phoneCurrentPassword });
      const updated: Profile = { ...response, phone: response.phone ?? "" };
      setProfile(updated); setSavedProfile(updated);
      setPhoneDraft(updated.phone ?? ""); setPhoneOtp(""); setPhoneCurrentPassword(""); setPhoneChallenge(null);
      if (updated.phoneVerified === true) { setNotice("auth.security.phoneVerified"); setPasswordChannel("SMS"); }
      else setPhoneError("auth.security.phoneVerificationPending");
    } catch (error) { setPhoneError(accountError(error, "phone", "auth.security.phoneConfirmFailed")); }
    finally { setPhoneBusy(false); }
  }
  async function requestChangePasswordOtp() {
    if (busy) return;
    if (passwordChannel === "SMS" && (!savedProfile.phone || savedProfile.phoneVerified !== true)) {
      setError("auth.security.verifiedPhoneRequired"); return;
    }
    if (passwordChannel === "EMAIL" && (!savedProfile.email || savedProfile.emailVerified !== true)) {
      setError("auth.security.verifiedEmailRequired"); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await securityProfileApi.requestPasswordOtp(passwordChannel);
      setPasswordChallenge(result.challengeId ?? "");
      setPassword(current => ({ ...current, otp: "" }));
      setNotice("auth.security.passwordOtpSent");
    } catch { setError("auth.security.passwordRequestFailed"); }
    finally { setBusy(false); }
  }
  async function confirmChangePassword(event: FormEvent) {
    event.preventDefault();
    if (busy || passwordChallenge === null) return;
    const checks = passwordChecks(password.next);
    if (!Object.values(checks).every(Boolean)) { setError("auth.validation.passwordPolicy"); return; }
    if (password.next !== password.confirm) { setError("auth.validation.confirmMismatch"); return; }
    if (!/^\d{6}$/.test(password.otp)) { setError("auth.validation.sixDigits"); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await securityProfileApi.confirmPassword({ channel: passwordChannel, otp: password.otp, newPassword: password.next,
        ...(passwordChallenge ? { challengeId: passwordChallenge } : {}) });
      setPassword({ next: "", confirm: "", otp: "" }); setPasswordChallenge(null);
      expireSession();
      router.replace("/login");
    } catch { setError("auth.security.passwordConfirmFailed"); }
    finally { setBusy(false); }
  }
  async function setDefault(address: Address) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const saved = await profileApi.saveAddress({ ...address, isDefault: true });
      setAddresses(current => current.map(item => item.id === saved.id ? saved : { ...item, isDefault: false }));
      setNotice("business.account.defaultAddressUpdated");
    } catch { setError("maps.saveError"); }
    finally { setBusy(false); }
  }
  async function importLegacy() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const existing = await profileApi.addresses();
      const signature = (address: Address) => JSON.stringify([address.receiverName, address.phone, address.province, address.district, address.ward, address.detail].map(value => value.trim()));
      const known = new Set(existing.map(signature));
      for (const address of legacy) {
        if (!known.has(signature(address))) {
          const saved = await profileApi.saveAddress({ ...emptyAddress, ...address, id: undefined, latitude: null, longitude: null, isDefault: existing.length === 0 });
          existing.push(saved); known.add(signature(address));
        }
      }
      const raw = localStorage.getItem(storageKey);
      if (raw) localStorage.setItem(storageKey, JSON.stringify({ ...JSON.parse(raw), addresses: [] }));
      setLegacy([]); setNotice("maps.legacyDone");
    } catch { setError("maps.legacyError"); }
    finally {
      try { setAddresses(await profileApi.addresses()); } catch { setError("maps.loadError"); }
      setBusy(false);
    }
  }
  function changeTab(value: string) {
    setTab(value);
    setNotice("");
    setError("");
    setPassword({ next: "", confirm: "", otp: "" });
    setPasswordChallenge(null);
  }

  const displayName = (ready ? savedProfile.fullName : sessionFullName)?.trim() || t("auth.security.customer");
  const initials = displayName.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toLocaleUpperCase();
  return (
    <>
      <main className={styles.page}>
        <header className={styles.intro}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{t("business.account.yourCluckyAccount")}</span>
            <h1>{t("business.account.welcomeBack")}<span>{displayName}.</span></h1>
            <p>{t("business.account.yourFamiliarDetailsBringingEveryMealCloser")}</p>
            <Link href="/menu" className={styles.heroLink}>
              {t("business.account.exploreMenu")}<ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.heroMark} aria-hidden="true">
            <UtensilsCrossed size={44} strokeWidth={1.4} />
            <strong>Clucky</strong><span>CRISPY & HAPPY</span>
          </div>
        </header>
        <div className={styles.shortcuts}>
          <Link href="/orders" className={styles.shortcut}>
            <span className={styles.shortcutIcon}><ShoppingBag size={22} aria-hidden="true" /></span>
            <span><strong>{t("business.account.myOrders")}</strong><small>{t("business.account.ordersHint")}</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <button type="button" className={styles.shortcut} onClick={() => changeTab("addresses")}>
            <span className={styles.shortcutIcon}><MapPin size={22} aria-hidden="true" /></span>
            <span><strong>{t("business.account.addressBook")}</strong><small>{addresses.length} {t("business.account.savedAddresses")}</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className={styles.shortcut} onClick={() => changeTab("password")}>
            <span className={styles.shortcutIcon}><ShieldCheck size={22} aria-hidden="true" /></span>
            <span><strong>{t("business.account.changePassword")}</strong><small>{t("business.account.securityHint")}</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.avatar}>
              <span aria-hidden="true">{initials}</span>
            </div>
            <strong>{displayName}</strong>
            <p>{ready ? (savedProfile.phone || t("auth.security.noPhone")) : (user?.phone || t("auth.security.noPhone"))}</p>
            <nav aria-label={t("business.account.manageAccount")}>
              {[
                ["profile", t("business.account.personalDetails"), UserRound],
                ["addresses", t("business.account.addressBook"), MapPin],
                ["password", t("business.account.changePassword"), ShieldCheck],
                ["reviews", t("business.account.myReviews"), MessageSquareQuote],
              ].map(([key, label, Icon]) => (
                <button
                  key={key as string}
                  aria-current={tab === key ? "page" : undefined}
                  onClick={() => changeTab(key as string)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label as string}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ))}
            </nav>

          </aside>
          <section className={styles.panel} aria-busy={!ready}>
            {error && !editing && (
              <p role="alert" className={styles.error}>
                {error ? t(error) : ""}
              </p>
            )}
            {!ready && <button type="button" onClick={() => setReload(value => value + 1)}>{t("maps.retry")}</button>}
            {ready && tab === "profile" && (
              <>
                <div className={styles.panelHeading}>
                  <span className={styles.panelIcon}><UserRound size={23} aria-hidden="true" /></span>
                  <div><h2>{t("business.account.personalDetails")}</h2>
                    <p className={styles.muted}>{t("business.account.updateYourContactDetails")}</p></div>
                </div>
                {!savedProfile.phoneVerified && (
                  <div className={styles.setupBanner}>
                    <span className={styles.setupBannerIcon}><Phone size={20} aria-hidden="true" /></span>
                    <div>
                      <strong>{t("auth.security.phoneSetupTitle")}</strong>
                      <p>{t("auth.security.phoneSetupDescription")}</p>
                    </div>
                    <a href="#account-phone-verify" className={styles.setupBannerAction}>
                      {t("auth.security.phoneSetupAction")}<ArrowRight size={15} aria-hidden="true" />
                    </a>
                  </div>
                )}
                <form
                  className={`${styles.form} ${styles.profileForm}`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!profile.fullName.trim()) {
                      setError("business.account.pleaseEnterYourFullName");
                      return;
                    }
                    const clean = {
                      ...profile,
                      fullName: profile.fullName.trim(),
                    };
                    void saveProfile(clean);
                  }}
                >
                  <Input
                    label={t("business.account.fullName")}
                    required
                    maxLength={100}
                    value={profile.fullName}
                    onChange={(e) =>
                      setProfile({ ...profile, fullName: e.target.value })
                    }
                  />
                  <div className={styles.actions}>
                    <button
                      type="submit"
                      disabled={!ready || busy}
                      className={styles.primary}
                    ><Check size={17} aria-hidden="true" /> {t("business.account.saveChanges")} </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfile(savedProfile);
                        setError("");
                        setNotice("");
                      }}
                    > {t("business.account.discardChanges")} </button>
                  </div>
                </form>
                <div className={styles.contactSectionHeading}>
                  <h3>{t("auth.security.contactHeading")}</h3>
                  <p>{t("auth.security.contactDescription")}</p>
                </div>
                <div className={styles.contactGrid}>
                  <section id="account-phone-verify" className={styles.contactCard} aria-label={t("auth.security.phoneHeading")}>
                    <div className={styles.securityHeading}>
                      <span className={styles.contactIcon}><Phone size={21} aria-hidden="true" /></span>
                      <div>
                        <h3>{t("auth.security.phoneHeading")}</h3>
                        <p>{t("auth.security.phoneDescription")}</p>
                      </div>
                    </div>
                    <div className={styles.contactCurrent}>
                      <span>{t("auth.security.currentPhone")}</span>
                      <strong>{savedProfile.phone || t("auth.security.noPhone")}</strong>
                      {savedProfile.phoneVerified === true
                        ? <span className={styles.verifiedBadge}><Check size={14} aria-hidden="true" />{t("auth.security.verified")}</span>
                        : <span className={styles.pendingBadge}>{t("auth.security.unverified")}</span>}
                    </div>
                    <form className={styles.form} onSubmit={requestPhoneOtp}>
                      <Input type="tel" inputMode="tel" label={t("auth.security.newPhone")}
                        autoComplete="tel" placeholder={t("auth.fields.phonePlaceholder")}
                        value={phoneDraft} onChange={e => { setPhoneDraft(e.target.value); setPhoneChallenge(null); setPhoneOtp(""); setPhoneCurrentPassword(""); setPhoneError(""); }}
                        disabled={busy || phoneBusy || emailBusy} required
                        error={phoneError && phoneError !== "auth.security.contactPasswordInvalid" ? t(phoneError) : undefined} />
                      <button className={styles.primary} type="submit"
                        disabled={busy || phoneBusy || emailBusy || !phoneDraft.trim() || (savedProfile.phoneVerified === true && canonicalPhone(savedProfile.phone) === canonicalPhone(phoneDraft))}>
                        {phoneBusy ? t("auth.otp.sending") : t("auth.security.sendPhoneCode")}
                      </button>
                    </form>
                    {phoneChallenge && (
                      <form className={styles.otpForm} onSubmit={confirmPhone}>
                        <p>{t("auth.security.phoneCodeHint", { phone: canonicalPhone(phoneDraft) })}</p>
                        <Input label={t("auth.otp.label")} inputMode="numeric" autoComplete="one-time-code"
                          value={phoneOtp} onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          maxLength={6} disabled={busy || phoneBusy || emailBusy} required />
                        <Input label={t("auth.security.currentCluckyPassword")} type="password" autoComplete="current-password"
                          value={phoneCurrentPassword} onChange={e => setPhoneCurrentPassword(e.target.value)}
                          helperText={t("auth.security.contactPasswordHint")}
                          error={phoneError === "auth.security.contactPasswordInvalid" ? t(phoneError) : undefined}
                          disabled={busy || phoneBusy || emailBusy} required />
                        <button className={styles.primary} disabled={busy || phoneBusy || emailBusy || phoneOtp.length !== 6 || !phoneCurrentPassword}>
                          {t("auth.security.confirmPhone")}
                        </button>
                      </form>
                    )}
                    {savedProfile.phoneVerified === true && canonicalPhone(savedProfile.phone) !== canonicalPhone(phoneDraft) && (
                      <p className={styles.contactHint}>{t("auth.security.currentStaysActive")}</p>
                    )}
                  </section>
                  <section className={styles.contactCard} aria-label={t("auth.security.emailHeading")}>
                    <div className={styles.securityHeading}>
                      <span className={styles.contactIcon}><Mail size={21} aria-hidden="true" /></span>
                      <div>
                        <h3>{t("auth.security.emailHeading")}</h3>
                        <p>{t("auth.security.emailDescription")}</p>
                      </div>
                    </div>
                    <div className={styles.contactCurrent}>
                      <span>{t("auth.security.currentEmail")}</span>
                      <strong>{savedProfile.email || t("auth.security.noEmail")}</strong>
                      {savedProfile.emailVerified === true
                        ? <span className={styles.verifiedBadge}><Check size={14} aria-hidden="true" />{t("auth.security.verified")}</span>
                        : <span className={styles.pendingBadge}>{t("auth.security.unverified")}</span>}
                    </div>
                    <form className={styles.form} onSubmit={requestEmailOtp}>
                      <Input type="email" label={t("auth.security.newEmail")} autoComplete="email"
                        placeholder="ban@clucky.vn" value={emailDraft}
                        onChange={e => { setEmailDraft(e.target.value); setEmailChallenge(null); setEmailOtp(""); setEmailCurrentPassword(""); setEmailError(""); }}
                        disabled={busy || emailBusy || phoneBusy} required
                        error={emailError && emailError !== "auth.security.contactPasswordInvalid" ? t(emailError) : undefined} />
                      <button className={styles.primary} type="submit"
                        disabled={busy || emailBusy || phoneBusy || !emailDraft.trim() || (savedProfile.emailVerified === true && savedProfile.email?.toLowerCase() === emailDraft.trim().toLowerCase())}>
                        {emailBusy ? t("auth.otp.sending") : t("auth.security.sendEmailCode")}
                      </button>
                    </form>
                    {emailChallenge && (
                      <form className={styles.otpForm} onSubmit={confirmEmail}>
                        <p>{t("auth.security.emailCodeHint")}</p>
                        <Input label={t("auth.otp.label")} inputMode="numeric" autoComplete="one-time-code"
                          value={emailOtp} onChange={e => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          maxLength={6} disabled={busy || emailBusy || phoneBusy} required />
                        <Input label={t("auth.security.currentCluckyPassword")} type="password" autoComplete="current-password"
                          value={emailCurrentPassword} onChange={e => setEmailCurrentPassword(e.target.value)}
                          helperText={t("auth.security.contactPasswordHint")}
                          error={emailError === "auth.security.contactPasswordInvalid" ? t(emailError) : undefined}
                          disabled={busy || emailBusy || phoneBusy} required />
                        <button className={styles.primary} disabled={busy || emailBusy || phoneBusy || emailOtp.length !== 6 || !emailCurrentPassword}>
                          {t("auth.security.confirmEmail")}
                        </button>
                      </form>
                    )}
                    {savedProfile.emailVerified === true && savedProfile.email?.toLowerCase() !== emailDraft.trim().toLowerCase() && (
                      <p className={styles.contactHint}>{t("auth.security.currentStaysActive")}</p>
                    )}
                    {savedProfile.emailVerified !== true && <p className={styles.contactHint}>{t("auth.security.noEmailNotices")}</p>}
                  </section>
                </div>
              </>
            )}
            {ready && tab === "addresses" && (
              <>
                <div className={styles.heading}>
                  <div>
                    <h2>{t("business.account.addressBook")}</h2>
                    <p className={styles.muted}>
                      {addresses.length} {t("business.account.savedAddresses")} </p>
                  </div>
                  <button
                    className={styles.primary}
                    disabled={!ready}
                    onClick={() => {
                      setError("");
                      setEditing({
                        ...emptyAddress,
                        receiverName: savedProfile.fullName,
                        phone: savedProfile.phone,
                      });
                    }}
                  >
                    <Plus size={16} /> {t("business.account.addAddress")} </button>
                </div>
                {legacy.length > 0 && <div className={styles.empty}>
                  <strong>{t("maps.legacyTitle")}</strong><p>{t("maps.legacyHint")}</p>
                  <button className={styles.primary} disabled={busy || !ready} onClick={() => void importLegacy()}>{t("maps.legacyImport")}</button>
                </div>}
                {addresses.length === 0 ? (
                  <div className={styles.empty}>
                    <MapPin size={38} />
                    <h3>{t("business.account.noAddressesYet")}</h3>
                    <p> {t("business.account.addYourFirstAddressToGetReadyForYourNextMeal")} </p>
                  </div>
                ) : (
                  <div className={styles.addressList}>
                    {addresses.map((a) => (
                      <article key={a.id} className={styles.address}>
                        <div className={styles.heading}>
                          <strong>{a.receiverName}</strong>
                          {a.isDefault && (
                            <span className={styles.badge}>{t("business.account.default")}</span>
                          )}
                        </div>
                        <p>{a.phone}</p>
                        <p>
                          {formatAddress(a)}
                        </p>
                        <div className={styles.actions}>
                          <button
                            onClick={() => {
                              setError("");
                              setEditing({ ...a });
                            }}
                          >
                            <Pencil size={14} /> {t("business.account.edit")} </button>
                          <button onClick={() => setDeleting(a)}>
                            <Trash2 size={14} /> {t("business.account.delete")} </button>
                          {!a.isDefault && (
                            <button
                              disabled={busy}
                              onClick={() => void setDefault(a)}
                            > {t("business.account.setAsDefault")} </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
            {tab === "password" && (
              <>
                <div className={styles.panelHeading}>
                  <span className={styles.panelIcon}><ShieldCheck size={23} aria-hidden="true" /></span>
                  <div><h2>{t("business.account.changePassword")}</h2>
                    <p className={styles.muted}>{t("business.account.useANewPasswordWithAtLeastCharacters")}</p></div>
                </div>
                <p className={styles.securityHint}>{t("auth.security.passwordDescription")}</p>
                <fieldset className={styles.channelOptions} disabled={busy}>
                  <legend>{t("auth.security.chooseChannel")}</legend>
                  {(["SMS", "EMAIL"] as const).map(channel => (
                    <label key={channel}>
                      <input type="radio" name="passwordChannel" checked={passwordChannel === channel}
                        disabled={(channel === "EMAIL" && (!savedProfile.email || savedProfile.emailVerified !== true))
                          || (channel === "SMS" && (!savedProfile.phone || savedProfile.phoneVerified !== true))}
                        onChange={() => { setPasswordChannel(channel); setPasswordChallenge(null); setPassword(current => ({ ...current, otp: "" })); }} />
                      {t(channel === "SMS" ? "auth.recovery.sms" : "auth.recovery.email")}
                    </label>
                  ))}
                </fieldset>
                <button type="button" className={styles.primary} onClick={() => void requestChangePasswordOtp()}
                  disabled={busy || (passwordChannel === "EMAIL" && savedProfile.emailVerified !== true)
                    || (passwordChannel === "SMS" && savedProfile.phoneVerified !== true)}>
                  {t(passwordChallenge !== null ? "auth.security.sendCodeAgain" : "auth.security.requestPasswordCode")}
                </button>
                {passwordChallenge !== null && <form className={styles.form} onSubmit={confirmChangePassword}>
                  <Input label={t("auth.otp.label")} inputMode="numeric" autoComplete="one-time-code"
                    value={password.otp} onChange={e => setPassword({ ...password, otp: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    maxLength={6} required disabled={busy} />
                  <Input
                    label={t("business.account.newPassword")}
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={busy}
                    value={password.next}
                    onChange={(e) =>
                      setPassword({ ...password, next: e.target.value })
                    }
                  />
                  <p className={styles.muted}>{t("auth.google.passwordPolicy")}</p>
                  <Input
                    label={t("business.account.confirmNewPassword")}
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={busy}
                    value={password.confirm}
                    onChange={(e) =>
                      setPassword({ ...password, confirm: e.target.value })
                    }
                  />
                  <button className={styles.primary} disabled={busy || password.otp.length !== 6}>
                    {t("auth.security.confirmPasswordChange")}
                  </button>
                </form>}
              </>
            )}
            {tab === "reviews" && <MyReviewsPanel />}
          </section>
        </div>
      </main>

      {editing && <AddressDialog initial={editing} onClose={() => setEditing(null)} onSave={async address => {
        const saved = await profileApi.saveAddress(address);
        setAddresses(current => [...current.filter(item => item.id !== saved.id).map(item => saved.isDefault ? { ...item, isDefault: false } : item), saved]);
        setNotice("maps.saved"); setError("");
      }} />}
      <Modal
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("business.account.deleteAddress")}
        description={t("business.account.thisAddressWillBeRemovedFromTheDemoAddressBook")}
      >
        <p>{deleting?.detail}</p>
        {error && <p role="alert" className={styles.error}>{t(error)}</p>}
        <div className={styles.actions}>
          <button onClick={() => setDeleting(null)}>{t("business.account.keepAddress")}</button>
          <button
            className={styles.primary}
            disabled={busy}
            onClick={async () => {
              if (!deleting?.id || busy) return;
              setBusy(true); setError("");
              try {
                await profileApi.deleteAddress(deleting.id);
                setDeleting(null); setAddresses(await profileApi.addresses()); setNotice("business.account.addressDeleted");
              } catch { setError("maps.saveError"); }
              finally { setBusy(false); }
            }}
          > {t("business.account.confirmDeletion")} </button>
        </div>
      </Modal>
    </>
  );
}
