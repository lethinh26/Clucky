"use client";
import { useFeedback } from "@/components/feedback";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, ChevronDown, Check, Plus, RefreshCw } from "lucide-react";
import { Select } from "@base-ui/react/select";
import { useSession } from "@/components/auth/use-session";
import { profileApi, formatAddress, type Address } from "@/lib/locations";
import { AddressDialog } from "./address-dialog";
import styles from "./checkout-address.module.css";
export function CheckoutAddress({ value, onSelect }: { value: Address; onSelect: (address: Address) => void }) {
  const t = useTranslations("maps");
  const { user } = useSession();
  const userId = user?.userId;
  const [loaded, setLoaded] = useState<{ userId: number; addresses: Address[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const addresses = loaded?.userId === userId ? loaded?.addresses ?? [] : [];
  const selected = addresses.find(address => formatAddress(address) === value.detail && address.receiverName === value.receiverName && address.phone === value.phone);
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);
  useFeedback(failed && t("loadError"));
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoaded(null); setFailed(false); setLoading(Boolean(userId));
    if (userId) profileApi.addresses().then(result => { if (active) setLoaded({ userId, addresses: result }); })
      .catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, reload]);
  return <div className={styles.addressBook}>
    {loading && <p role="status" className={styles.status}>{t("addressLoading")}</p>}
    {addresses.length > 0 && <div className={styles.field}><span className={styles.label}>{t("savedAddresses")}</span>
      <Select.Root value={selected ? String(selected.id) : null} items={addresses.map(address => ({ value: String(address.id), label: address.receiverName + " — " + formatAddress(address) }))} onValueChange={next => { const address = addresses.find(item => String(item.id) === next); if (address) onSelect(address); }}>
        <Select.Trigger className={styles.trigger} aria-label={t("savedAddresses")}><span className={styles.icon}><MapPin size={20} aria-hidden="true" /></span><span className={styles.content}>{selected ? <><strong>{selected.receiverName}<span className={styles.phone}>{selected.phone}</span></strong><span className={styles.detail}>{formatAddress(selected)}</span></> : <><strong>{t("savedAddresses")}</strong><span className={styles.detail}>{t("selectAddressHint")}</span></>}</span><Select.Icon><ChevronDown size={18} /></Select.Icon></Select.Trigger>
        <Select.Portal><Select.Positioner sideOffset={8} align="start" alignItemWithTrigger={false} className={styles.positioner}><Select.Popup className={styles.popup}><Select.List className={styles.list}>
          {addresses.map(address => <Select.Item key={address.id} value={String(address.id)} className={styles.option}><span className={styles.icon}><MapPin size={18} aria-hidden="true" /></span><span className={styles.content}><Select.ItemText className={styles.recipient}>{address.receiverName}<span className={styles.phone}>{address.phone}</span>{address.isDefault && <span className={styles.badge}>{t("defaultAddressBadge")}</span>}</Select.ItemText><span className={styles.detail}>{formatAddress(address)}</span></span><Select.ItemIndicator className={styles.check}><Check size={18} /></Select.ItemIndicator></Select.Item>)}
        </Select.List></Select.Popup></Select.Positioner></Select.Portal>
      </Select.Root>
    </div>}
    {failed && <div role="alert" className={styles.status}><p>{t("loadError")}</p><button className={styles.action} type="button" onClick={() => setReload(count => count + 1)}><RefreshCw size={16} />{t("retry")}</button></div>}
    <button className={styles.action} type="button" onClick={() => setEditing(true)}><Plus size={18} aria-hidden="true" />{t("newAddress")}</button>
    {editing && <AddressDialog checkout initial={value} onClose={() => setEditing(false)} onSave={async address => onSelect(address)} />}
  </div>;
}
