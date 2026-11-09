"use client";
import { useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AddressDialog } from "@/components/maps/address-dialog";
import { emptyAddress, formatAddress, profileApi, type Profile, type Address } from "@/lib/locations";
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

  Mail,
  Check,
} from "lucide-react";
import Link from "@/components/ui-loader/navigation-link";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import styles from "./account.module.css";
import { useSession } from "@/components/auth/use-session";

const initialProfile: Profile = {
  fullName: "Khách hàng Clucky",
  email: "khachhang@example.com",
  phone: "",
};
export default function AccountPage() {
  const t = useTranslations();
  const { user } = useSession();
  const userId = user?.userId;
  const sessionFullName = user?.fullName;
  const sessionEmail = user?.email;
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
    current: "",
    next: "",
    confirm: "",
  });
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setReady(false); setError("");
    Promise.all([profileApi.get(), profileApi.addresses()]).then(([nextProfile, nextAddresses]) => {
      if (!active) return;
      setProfile(nextProfile); setSavedProfile(nextProfile); setAddresses(nextAddresses); setReady(true);
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
    setPassword({ current: "", next: "", confirm: "" });
  }

  const displayName = ready ? savedProfile.fullName : sessionFullName ?? initialProfile.fullName;
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
            <p>{sessionEmail}</p>
            <nav aria-label={t("business.account.manageAccount")}>
              {[
                ["profile", t("business.account.personalDetails"), UserRound],
                ["addresses", t("business.account.addressBook"), MapPin],
                ["password", t("business.account.changePassword"), ShieldCheck],
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
                <div className={styles.identityStrip}>
                  <Mail size={18} aria-hidden="true" />
                  <span><small>{t("business.account.signInEmail")}</small><strong>{sessionEmail}</strong></span>
                </div>
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
                      email: profile.email.trim(),
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
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={profile.email}
                    readOnly
                    title={t("maps.emailReadonly")}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                  />
                  <Input
                    label={t("business.account.phoneNumber")}
                    type="tel"
                    pattern="[0-9+ ()-]{9,15}"
                    title={t("business.account.enterAPhoneNumberWithCharacters")}
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
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
                <p className={styles.demo}> {t("business.account.uiDemoThisOnlyValidatesTheFormYourPasswordIsNotSaved")} </p>
                <form
                  className={styles.form}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNotice("");
                    if (password.next === password.current) {
                      setError("business.account.theNewPasswordMustDifferFromYourCurrentPassword");
                      return;
                    }
                    if (password.next !== password.confirm) {
                      setError("business.account.thePasswordsDoNotMatch");
                      return;
                    }
                    setError("");
                    setNotice(
                      "business.account.validFormThisIsADemoYourPasswordHasNotBeenChanged",
                    );
                    setPassword({ current: "", next: "", confirm: "" });
                  }}
                >
                  <Input
                    label={t("business.account.currentPassword")}
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password.current}
                    onChange={(e) =>
                      setPassword({ ...password, current: e.target.value })
                    }
                  />
                  <Input
                    label={t("business.account.newPassword")}
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password.next}
                    onChange={(e) =>
                      setPassword({ ...password, next: e.target.value })
                    }
                  />
                  <Input
                    label={t("business.account.confirmNewPassword")}
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password.confirm}
                    onChange={(e) =>
                      setPassword({ ...password, confirm: e.target.value })
                    }
                  />
                  <button className={styles.primary}> {t("business.account.changePasswordDemo")} </button>
                </form>
              </>
            )}
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
