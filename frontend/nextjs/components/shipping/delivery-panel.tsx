"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, CircleAlert, LoaderCircle, MapPin, Truck } from "lucide-react";
import { useLocaleTools } from "@/lib/i18n/hooks";
import { coordinates, type Coordinates } from "@/lib/geo";
import type { ShippingQuote, StoreItem } from "@/lib/api";
import { BranchMap } from "@/components/maps/branch-map";
import styles from "./delivery-panel.module.css";

export function DeliveryPanel({ store, pin, quote, loading, error, onPickup, onRetry }: {
  store?: StoreItem; pin: Coordinates | null; quote?: ShippingQuote; loading: boolean; error: boolean;
  onPickup: () => void; onRetry: () => void;
}) {
  const t = useTranslations("shipping");
  const { money, number } = useLocaleTools();
  const origin = coordinates(store);
  const radius = quote?.radiusKm ?? store?.deliveryRadiusKm;
  const reason = !store ? "STORE_REQUIRED" : !pin ? "LOCATION_REQUIRED" : loading ? "CHECKING"
    : quote && quote.reason !== "PICKUP" ? quote.reason : error ? "UNAVAILABLE" : "CHECKING";
  const status = t.has(`statuses.${reason}`) ? reason : "UNAVAILABLE";
  const valid = status === "OK";
  const Icon = valid ? CheckCircle2 : status === "CHECKING" ? LoaderCircle : CircleAlert;
  const focus = (id: string) => { const element = document.getElementById(id); element?.scrollIntoView({ block: "center" }); element?.focus(); };
  return <section className={styles.panel} aria-label={t("title")}>
    <div className={styles.header}><span className={styles.mark}><Truck size={22} aria-hidden="true" /></span><div><span className={styles.eyebrow}>{t("coverage")}</span><h3>{store?.name ?? t("title")}</h3></div></div>
    <div className={styles.status} data-ready={valid} role="status" aria-busy={loading}><Icon size={19} aria-hidden="true" /><p>{t(`statuses.${status}`)}</p></div>
    <dl className={styles.metrics}>
      <div><dt>{t("distance")}</dt><dd>{quote?.distanceKm != null ? `${number(quote.distanceKm, { maximumFractionDigits: 2 })} km` : "—"}</dd></div>
      <div><dt>{t("radius")}</dt><dd>{radius != null ? `${number(radius, { maximumFractionDigits: 2 })} km` : "—"}</dd></div>
      <div><dt>{t("fixedFee")}</dt><dd>{valid && quote?.fee != null ? money(quote.fee) : "—"}</dd></div>
    </dl>
    {origin && <div className={styles.map}><BranchMap pin={pin} points={[{ ...origin, id: String(store!.id), label: store!.name }]}
      coverage={radius != null && radius > 0 ? { ...origin, radiusKm: radius } : undefined} /></div>}
    <p className={styles.hint}><MapPin size={14} aria-hidden="true" />{t("straightLine")}</p>
    {valid ? <p className={styles.hint}>{t("fixedHint")}</p> : <div className={styles.actions}>
      <button type="button" onClick={() => focus("deliveryAddress")}>{t("changeAddress")}</button>
      <button type="button" onClick={() => focus("fulfillmentStore")}>{t("changeStore")}</button>
      <button type="button" onClick={onPickup}>{t("pickup")}</button>
      {pin && store && <button type="button" disabled={loading} onClick={onRetry}>{t("retry")}</button>}
    </div>}
  </section>;
}
