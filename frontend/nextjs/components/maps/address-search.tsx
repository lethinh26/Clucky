"use client";
import { useFeedback } from "@/components/feedback";
import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { locationApi, locationErrorKey, type Place } from "@/lib/locations";
import styles from "./maps.module.css";
import { useLocation } from "./location-provider";
export function AddressSearch({ onSelect }: { onSelect: (place: Place) => void }) {
  const t = useTranslations("maps");
  const locale = useLocale();
  const { point } = useLocation();
  const latitude = point?.latitude;
  const longitude = point?.longitude;
  const id = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState("");
  useFeedback(status && status !== "searching" && status !== "noResults" ? t(status) : null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    setResults([]); setActive(-1);
    if (query.trim().length < 3 || query === selected) { setStatus(""); return; }
    const abort = new AbortController();
    setStatus("searching");
    const timer = setTimeout(async () => {
      try {
        const places = await locationApi.search(query.trim(), locale, abort.signal, latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null);
        if (abort.signal.aborted) return;
        setResults(places); setStatus(places.length ? "" : "noResults");
      } catch (failure) { if (!abort.signal.aborted) setStatus(locationErrorKey(failure)); }
    }, 650);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [query, selected, locale, latitude, longitude]);
  function choose(place: Place) { setQuery(place.label); setSelected(place.label); setOpen(false); setResults([]); onSelect(place); }
  return <div className={styles.search} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor={id}>{t("search")}</label>
    <div className={styles.searchInput}><Search size={19} /><input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open && results.length > 0} aria-controls={id + "-results"} aria-activedescendant={open && active >= 0 ? id + "-" + active : undefined} autoComplete="off" maxLength={200} value={query} placeholder={t("searchHint")} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} onKeyDown={event => {
      if (event.key === "Escape") { event.stopPropagation(); setOpen(false); }
      if (event.key === "ArrowDown" && results.length) { event.preventDefault(); setOpen(true); setActive(index => (index + 1) % results.length); }
      if (event.key === "ArrowUp" && results.length) { event.preventDefault(); setActive(index => (index - 1 + results.length) % results.length); }
      if (event.key === "Enter") { event.preventDefault(); if (open && active >= 0 && results[active]) choose(results[active]); }
    }} /></div>
    {open && results.length > 0 && <ul id={id + "-results"} role="listbox" className={styles.results}>{results.map((place, index) => <li key={index} id={id + "-" + index} role="option" aria-selected={active === index}><button type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => choose(place)}>{place.label}</button></li>)}</ul>}
    {status && <small role="status">{t(status)}</small>}
  </div>;
}
