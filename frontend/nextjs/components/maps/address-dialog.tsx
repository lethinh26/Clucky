"use client";
import { useFeedback } from "@/components/feedback";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LocateFixed } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { coordinates, locationApi, locationErrorKey, type Address, type Coordinates, type Place } from "@/lib/locations";
import { BranchMap } from "./branch-map";
import { AddressSearch } from "./address-search";
import { useLocation } from "./location-provider";
import styles from "./maps.module.css";
export function AddressDialog({ initial, onClose, onSave, checkout = false }: { initial: Address; onClose: () => void; onSave: (address: Address) => Promise<void>; checkout?: boolean }) {
  const t = useTranslations("maps");
  const locale = useLocale();
  const formId = useId();
  const location = useLocation();
  const [address, setAddress] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  useFeedback(error && t(error));
  const [mapNotice, setMapNotice] = useState("");
  useFeedback(mapNotice && t(mapNotice), "warning");
  const reverse = useRef<AbortController | null>(null);
  const followLocation = useRef(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const submitLock = useRef(false);
  useEffect(() => () => reverse.current?.abort(), []);
  function choose(place: Place) {
    followLocation.current = false;
    reverse.current?.abort(); setResolving(false);
    setAddress(current => ({ ...current, detail: place.detail, province: place.province, district: place.district, ward: place.ward, latitude: place.latitude, longitude: place.longitude }));
    setMapNotice("");
  }
  const pick = useCallback(async (point: Coordinates) => {
    reverse.current?.abort();
    const abort = new AbortController(); reverse.current = abort;
    setAddress(current => ({ ...current, ...point })); setResolving(true); setMapNotice("");
    try {
      const results = await locationApi.reverse(point, locale, abort.signal);
      if (abort.signal.aborted) return;
      if (results[0]) {
        const place = results[0];
        setAddress(current => ({ ...current, detail: place.detail, province: place.province, district: place.district, ward: place.ward, ...point }));
      } else setMapNotice("noResults");
    } catch (failure) { if (!abort.signal.aborted) setMapNotice(locationErrorKey(failure)); }
    finally { if (!abort.signal.aborted) setResolving(false); }
  }, [locale]);
  useEffect(() => {
    if (!followLocation.current || !location.point || location.locating || location.error) return;
    followLocation.current = false;
    setFocusRequest(current => current + 1);
    void pick(location.point);
  }, [location.point, location.locating, location.error, pick]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (submitLock.current || resolving) return;
    submitLock.current = true; setSaving(true); setError("");
    try { await onSave(address); onClose(); }
    catch { setError("saveError"); }
    finally { submitLock.current = false; setSaving(false); }
  }
  return <Modal open onOpenChange={open => { if (!open && !saving) onClose(); }} dismissible={!saving}
    title={t(initial.id ? "editAddress" : "addressTitle")} className={styles.addressDialog}
    footer={<div className={styles.dialogFooter}><button type="button" onClick={onClose} disabled={saving}>{t("cancel")}</button><button className="btn-primary" type="submit" form={formId} disabled={saving || resolving}>{t(saving ? "saving" : checkout ? "useAddress" : "save")}</button></div>}>
    <form id={formId} onSubmit={submit} className={styles.addressBody}>
      <fieldset disabled={saving} className={styles.addressFields}>
        <AddressSearch onSelect={choose} />
        <div className={styles.fieldGrid}>
          {(["receiverName", "phone", "province", "ward", "district", "detail"] as const).map(key => <label key={key} className={key === "detail" ? styles.fullField : undefined}>
            {t(key === "receiverName" ? "recipient" : key)}
            <input disabled={resolving && key !== "receiverName" && key !== "phone"} value={address[key]} required={key === "receiverName" || key === "phone" || key === "detail"} type={key === "phone" ? "tel" : "text"} autoComplete={key === "receiverName" ? "name" : key === "phone" ? "tel" : "off"} maxLength={key === "detail" ? 255 : key === "receiverName" ? 160 : key === "phone" ? 30 : 100} pattern={key === "phone" ? "[+0-9 ]{9,30}" : undefined} onChange={event => { followLocation.current = false; setAddress(current => ({ ...current, [key]: event.target.value })); }} />
          </label>)}
        </div>
        {!checkout && <label className={styles.checkbox}><input type="checkbox" checked={address.isDefault} onChange={event => setAddress(current => ({ ...current, isDefault: event.target.checked }))} />{t("default")}</label>}
        {checkout && <small>{t("checkoutHint")}</small>}
        {error && <p role="alert" className={styles.error}>{t(error)}</p>}
      </fieldset>
      <section className={styles.addressMap} aria-label={t("mapLabel")}>
        <button type="button" className={styles.locate} disabled={location.locating || saving} aria-describedby={location.error ? `${formId}-location-error` : undefined} onClick={() => { followLocation.current = true; void location.locate(); }}><LocateFixed size={17} />{t(location.locating ? "locating" : "locate")}</button>
        {location.error && <p id={`${formId}-location-error`} role="alert" className={styles.error}>{t(location.error)}</p>}
        <BranchMap pin={coordinates(address)} origin={location.point} focusRequest={focusRequest} onPick={saving ? undefined : point => { followLocation.current = false; void pick(point); }} />
        {(mapNotice || resolving) && <p role="status" className={styles.error}>{t(resolving ? "searching" : mapNotice)}</p>}
      </section>
    </form>
  </Modal>;
}
