"use client";
import { useFeedback } from "@/components/feedback";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock, MapPin, Phone, Search, ArrowUpRight } from "lucide-react";
import Link from "@/components/ui-loader/navigation-link";
import { catalogApi, type StoreItem } from "@/lib/api";
import { getStoreStatusMeta } from "@/lib/types/store";
import { coordinates, distanceKm } from "@/lib/locations";
import { BranchMap } from "@/components/maps/branch-map";
import { useDistanceOrigin } from "@/components/maps/use-distance-origin";
import styles from "./stores.module.css";
export default function StoresPage() {
  const t = useTranslations("maps");
  const locale = useLocale();
  const { origin, fromHome } = useDistanceOrigin();
  const originLabel = t(fromHome ? "defaultAddressOrigin" : "currentLocationOrigin");
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useFeedback(error && t("storesError"));
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [selected, setSelected] = useState("");
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    catalogApi.getStores(false).then(result => { if (active) setStores(result); })
      .catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const ranked = useMemo(() => stores.filter(store => (!district || store.district === district)
    && [store.name, store.address, store.district, store.city, store.phone].some(value => value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))
    .map(store => { const point = coordinates(store); return { store, point, distance: point && origin ? distanceKm(origin, point) : null }; })
    .sort((first, second) => (first.distance ?? Infinity) - (second.distance ?? Infinity) || first.store.name.localeCompare(second.store.name, locale)), [stores, query, district, origin, locale]);
  const selectedId = ranked.some(item => String(item.store.id) === selected) ? selected : "";
  const missingLocation = selectedId && !coordinates(stores.find(store => String(store.id) === selectedId));
  function select(id: string, fromMap = false) {
    setSelected(id);
    setFocusRequest(value => value + 1);
    if (!fromMap && window.matchMedia("(max-width: 760px)").matches) {
      document.getElementById("store-map")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    }
    if (fromMap) {
      const card = document.getElementById("branch-" + id);
      card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      card?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    }
  }
  return <main className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>CLUCKY • STORE LOCATOR</span><h1>{t("title")}</h1><p>{t("subtitle")}</p></div></header>
    <div className={styles.layout}>
      <section className={styles.listPanel} aria-label={t("title")}>
        <div className={styles.filters}><div className={styles.search}><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} aria-label={t("storeSearch")} placeholder={t("storeSearch")} /></div>
          <select aria-label={t("district")} value={district} onChange={event => setDistrict(event.target.value)}><option value="">{t("district")}</option>{Array.from(new Set(stores.map(store => store.district).filter(Boolean))).map(value => <option key={value} value={value!}>{value}</option>)}</select>
          <div className={styles.count}><strong>{ranked.length} {t("branches")}</strong>{origin && <span title={t("approximate")}>{originLabel} · {t("nearest")}</span>}</div>
        </div>
        <div className={styles.cards} aria-busy={loading}>
          {loading && <p role="status">{t("mapLoading")}</p>}
          {error && <div role="alert"><p>{t("storesError")}</p><button className="btn-secondary" onClick={() => setReload(value => value + 1)}>{t("retry")}</button></div>}
          {!loading && !error && !ranked.length && <p>{t("noStores")}</p>}
          {ranked.map(({ store, point, distance }, index) => {
            const available = getStoreStatusMeta(store.status).canOrder;
            return <article id={"branch-" + store.id} key={store.id} className={styles.card + (selectedId === String(store.id) ? " " + styles.selected : "")}>
              <button type="button" className={styles.cardHeading} onClick={() => select(String(store.id))} aria-pressed={selectedId === String(store.id)} aria-label={store.name + " — " + t("selectStore")}>
                <div className={styles.logo}><img src="/logo_primary.png" alt="" width={100} height={100} /></div>
                <div><span className={available ? styles.open : styles.closed}>{t(available ? "open" : "closed")}</span><h2>{store.name}</h2><span className={styles.distance} title={distance !== null ? originLabel + " · " + t("approximate") : undefined}>{distance !== null ? t("distanceAway", { distance: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(distance) }) : t(!point ? "unknownDistance" : "distanceUnavailable")}</span>{index === 0 && distance !== null && <small className={styles.nearest}>{t("nearYou")}</small>}</div>
              </button>
              <div className={styles.details}><p><MapPin size={16} />{store.address}</p><p><Clock size={16} />{store.openTime} – {store.closeTime}<a href={"tel:" + store.phone}><Phone size={14} />{store.phone}</a></p></div>
              <div className={styles.actions}>{available ? <Link href={"/menu?storeId=" + store.id} className="btn-primary">{t("order")}<ArrowUpRight size={17} /></Link> : <span>{t("closed")}</span>}<a href={"https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(point ? point.latitude + "," + point.longitude : store.address)} target="_blank" rel="noreferrer">{t("directions")}<ArrowUpRight size={16} /></a></div>
            </article>;
          })}
        </div>
      </section>
      <section id="store-map" className={styles.mapPanel} aria-label={t("mapLabel")}><BranchMap points={ranked.flatMap(({ store, point }) => point ? [{ ...point, id: String(store.id), label: store.name }] : [])} selectedId={selectedId} focusRequest={focusRequest} onSelect={id => select(id, true)} origin={origin} originLabel={originLabel} />{missingLocation && <p role="status" className={styles.mapNotice}>{t("storeLocationUnavailable")}</p>}</section>
    </div>
  </main>;
}
