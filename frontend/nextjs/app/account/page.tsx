"use client";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import {
  UserRound,
  MapPin,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import styles from "./account.module.css";
type Profile = { fullName: string; email: string; phone: string };
type Address = {
  id: string;
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  isDefault: boolean;
};
const emptyAddress: Address = {
  id: "",
  receiverName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  detail: "",
  isDefault: false,
};
const initialProfile: Profile = {
  fullName: "Khách hàng Clucky",
  email: "khachhang@example.com",
  phone: "",
};
const storageKey = "clucky_profile_ui_v1";
export default function AccountPage() {
  const t = useTranslations();

  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(initialProfile);
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const value = JSON.parse(raw);
        if (
          value.profile &&
          ["fullName", "email", "phone"].every(
            (k) => typeof value.profile[k] === "string",
          ) &&
          Array.isArray(value.addresses) &&
          value.addresses.every(
            (a: Address) =>
              [
                "id",
                "receiverName",
                "phone",
                "province",
                "district",
                "ward",
                "detail",
              ].every((k) => typeof a[k as keyof Address] === "string") &&
              typeof a.isDefault === "boolean",
          )
        ) {
          setProfile(value.profile);
          setSavedProfile(value.profile);
          setAddresses(value.addresses);
        }
      }
    } catch {
      setError(
        "business.account.unableToReadSavedDemoDataYouCanEnterYourDetailsAgain",
      );
    }
    setReady(true);
  }, []);
  function save(
    nextProfile: Profile,
    nextAddresses: Address[],
    message: string,
  ) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ profile: nextProfile, addresses: nextAddresses }),
      );
      setSavedProfile(nextProfile);
      setAddresses(nextAddresses);
      setNotice(message);
      setError("");
      return true;
    } catch {
      setError("business.account.unableToSaveDataInThisBrowserPleaseTryAgain");
      return false;
    }
  }
  function changeTab(value: string) {
    setTab(value);
    setNotice("");
    setError("");
    setPassword({ current: "", next: "", confirm: "" });
  }
  function saveAddress(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const clean = {
      ...editing,
      ...Object.fromEntries(
        Object.entries(editing)
          .filter(([, v]) => typeof v === "string")
          .map(([k, v]) => [k, (v as string).trim()]),
      ),
    } as Address;
    if (
      ["receiverName", "province", "district", "ward", "detail"].some(
        (k) => !clean[k as keyof Address],
      )
    ) {
      setError("business.account.pleaseCompleteTheAddressAndRecipientDetails");
      return;
    }
    const item = {
      ...clean,
      id: clean.id || crypto.randomUUID(),
      isDefault: addresses.length === 0 || clean.isDefault,
    };
    let next = addresses.some((a) => a.id === item.id)
      ? addresses.map((a) => (a.id === item.id ? item : a))
      : [...addresses, item];
    if (item.isDefault)
      next = next.map((a) => ({ ...a, isDefault: a.id === item.id }));
    if (!next.some((a) => a.isDefault))
      next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
    if (save(savedProfile, next, "business.account.demoAddressSaved")) setEditing(null);
  }
  return (
    <>
      <main className={styles.page}>
        <div className={styles.intro}>
          <span>{t("business.account.yourCluckyAccount")}</span>
          <h1>{t("business.account.yourOwnLittleSpace")}</h1>
          <p>{t("business.account.yourFamiliarDetailsBringingEveryMealCloser")}</p>
        </div>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.avatar}>
              <UserRound size={30} />
            </div>
            <strong>{savedProfile.fullName}</strong>
            <p>{savedProfile.email}</p>
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
                  <Icon size={18} />
                  {label as string}
                </button>
              ))}
            </nav>
          </aside>
          <section className={styles.panel} aria-busy={!ready}>
            {notice && (
              <p role="status" className={styles.success}>
                {notice ? t(notice) : ""}
              </p>
            )}
            {error && !editing && (
              <p role="alert" className={styles.error}>
                {error ? t(error) : ""}
              </p>
            )}
            {tab === "profile" && (
              <>
                <h2>{t("business.account.personalDetails")}</h2>
                <p className={styles.muted}> {t("business.account.updateYourContactDetails")} </p>
                <form
                  className={styles.form}
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
                    if (save(clean, addresses, "business.account.demoProfileSaved"))
                      setProfile(clean);
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
                      disabled={!ready}
                      className={styles.primary}
                    > {t("business.account.saveChanges")} </button>
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
            {tab === "addresses" && (
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
                          {[a.detail, a.ward, a.district, a.province].join(
                            ", ",
                          )}
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
                              onClick={() =>
                                save(
                                  savedProfile,
                                  addresses.map((item) => ({
                                    ...item,
                                    isDefault: item.id === a.id,
                                  })), "business.account.defaultAddressUpdated",
                                )
                              }
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
                <h2>{t("business.account.changePassword")}</h2>
                <p className={styles.muted}> {t("business.account.useANewPasswordWithAtLeastCharacters")} </p>
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

      <Modal
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setError("");
          }
        }}
        title={editing?.id ? t("business.account.editAddress") : t("business.account.addAddress")}
      >
        {editing && (
          <form className={styles.form} onSubmit={saveAddress}>
            {error && (
              <p role="alert" className={styles.error}>
                {error ? t(error) : ""}
              </p>
            )}
            {(
              [
                ["receiverName", t("business.account.recipientName")],
                ["phone", t("business.account.recipientPhoneNumber")],
                ["province", t("business.account.provinceCity")],
                ["district", t("business.account.district")],
                ["ward", t("business.account.ward")],
                ["detail", t("business.account.houseNumberAndStreet")],
              ] as const
            ).map(([key, label]) => (
              <Input
                key={key}
                label={label}
                required
                maxLength={200}
                type={key === "phone" ? "tel" : "text"}
                pattern={key === "phone" ? "[0-9+ ()-]{9,15}" : undefined}
                value={editing[key]}
                onChange={(e) =>
                  setEditing({ ...editing, [key]: e.target.value })
                }
              />
            ))}
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={editing.isDefault || addresses.length === 0}
                disabled={addresses.length === 0}
                onChange={(e) =>
                  setEditing({ ...editing, isDefault: e.target.checked })
                }
              /> {t("business.account.setAsDefaultAddress")} </label>
            <div className={styles.actions}>
              <button className={styles.primary}>{t("business.account.saveAddress")}</button>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setError("");
                }}
              > {t("business.account.cancel")} </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("business.account.deleteAddress")}
        description={t("business.account.thisAddressWillBeRemovedFromTheDemoAddressBook")}
      >
        <p>{deleting?.detail}</p>
        <div className={styles.actions}>
          <button onClick={() => setDeleting(null)}>{t("business.account.keepAddress")}</button>
          <button
            className={styles.primary}
            onClick={() => {
              let next = addresses.filter((a) => a.id !== deleting?.id);
              if (next.length && !next.some((a) => a.isDefault))
                next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
              if (save(savedProfile, next, "business.account.addressDeleted"))
                setDeleting(null);
            }}
          > {t("business.account.confirmDeletion")} </button>
        </div>
      </Modal>
    </>
  );
}
