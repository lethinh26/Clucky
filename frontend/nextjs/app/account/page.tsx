"use client";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useState, type FormEvent } from "react";
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
import { profileApi, getErrorMessage, type AddressResponse, type AddressPayload } from "@/lib/api";
import styles from "./account.module.css";
type Profile = { fullName: string; email: string; phone: string };
type Address = AddressResponse;
const emptyAddress: AddressPayload & { id?: number } = {
  receiverName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  detail: "",
  isDefault: false,
};
const initialProfile: Profile = {
  fullName: "",
  email: "",
  phone: "",
};
export default function AccountPage() {
  const t = useTranslations();

  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(initialProfile);
  const [savedProfile, setSavedProfile] = useState(initialProfile);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<(AddressPayload & { id?: number }) | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const load = React.useCallback(async () => {
    try {
      const [me, list] = await Promise.all([profileApi.get(), profileApi.listAddresses()]);
      const nextProfile = { fullName: me.fullName ?? "", email: me.email ?? "", phone: me.phone ?? "" };
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      setAddresses(list);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setReady(true);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function changeTab(value: string) {
    setTab(value);
    setNotice("");
    setError("");
    setPassword({ current: "", next: "", confirm: "" });
  }

  async function saveAddress(e: FormEvent) {
    e.preventDefault();
    if (!editing || busy) return;
    const payload: AddressPayload = {
      receiverName: editing.receiverName.trim(),
      phone: editing.phone.trim(),
      province: editing.province.trim(),
      district: editing.district.trim(),
      ward: editing.ward.trim(),
      detail: editing.detail.trim(),
      isDefault: addresses.length === 0 ? true : editing.isDefault,
    };
    if (!payload.receiverName || !payload.phone || !payload.province || !payload.district || !payload.ward || !payload.detail) {
      setError("business.account.pleaseCompleteTheAddressAndRecipientDetails");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (editing.id != null) await profileApi.updateAddress(editing.id, payload);
      else await profileApi.createAddress(payload);
      await load();
      setNotice("business.account.demoAddressSaved");
      setEditing(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeAddress() {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await profileApi.deleteAddress(deleting.id);
      await load();
      setNotice("business.account.addressDeleted");
      setDeleting(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(address: Address) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await profileApi.updateAddress(address.id, {
        receiverName: address.receiverName,
        phone: address.phone,
        province: address.province,
        district: address.district,
        ward: address.ward,
        detail: address.detail,
        isDefault: true,
      });
      await load();
      setNotice("business.account.defaultAddressUpdated");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!profile.fullName.trim()) {
      setError("business.account.pleaseEnterYourFullName");
      return;
    }
    if (!profile.phone.trim()) {
      setError("business.account.enterAPhoneNumberWithCharacters");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await profileApi.update({ fullName: profile.fullName.trim(), phone: profile.phone.trim() });
      const nextProfile = { fullName: updated.fullName ?? "", email: updated.email ?? "", phone: updated.phone ?? "" };
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      setNotice("business.account.demoProfileSaved");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
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
                {t.has(notice) ? t(notice) : notice}
              </p>
            )}
            {error && !editing && (
              <p role="alert" className={styles.error}>
                {t.has(error) ? t(error) : error}
              </p>
            )}
            {tab === "profile" && (
              <>
                <h2>{t("business.account.personalDetails")}</h2>
                <p className={styles.muted}> {t("business.account.updateYourContactDetails")} </p>
                <form
                  className={styles.form}
                  onSubmit={saveProfile}
                >
                  <Input
                    label={t("business.account.fullName")}
                    required
                    maxLength={160}
                    disabled={busy}
                    value={profile.fullName}
                    onChange={(e) =>
                      setProfile({ ...profile, fullName: e.target.value })
                    }
                  />
                  <Input
                    label="Email"
                    type="email"
                    disabled
                    value={profile.email}
                    onChange={() => undefined}
                  />
                  <Input
                    label={t("business.account.phoneNumber")}
                    type="tel"
                    pattern="[0-9+ ()-]{6,30}"
                    title={t("business.account.enterAPhoneNumberWithCharacters")}
                    disabled={busy}
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
                              disabled={busy}
                              onClick={() => void makeDefault(a)}
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
                {t.has(error) ? t(error) : error}
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
                maxLength={key === "detail" ? 255 : 100}
                type={key === "phone" ? "tel" : "text"}
                pattern={key === "phone" ? "[0-9+ ()-]{6,30}" : undefined}
                disabled={busy}
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
              <button className={styles.primary} disabled={busy}>{t("business.account.saveAddress")}</button>
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
            disabled={busy}
            onClick={() => void removeAddress()}
          > {t("business.account.confirmDeletion")} </button>
        </div>
      </Modal>
    </>
  );
}
