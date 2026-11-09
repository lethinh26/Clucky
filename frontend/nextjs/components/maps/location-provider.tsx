"use client";
import { useFeedback } from "@/components/feedback";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LocateFixed, X } from "lucide-react";
import type { Coordinates } from "@/lib/locations";
import styles from "./maps.module.css";
const LocationContext = createContext<{ point: Coordinates | null; locate: () => Promise<Coordinates | null>; locating: boolean; error: boolean }>({ point: null, locate: async () => null, locating: false, error: false });
export function LocationProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("maps");
  const [point, setPoint] = useState<Coordinates | null>(null);
  const [prompt, setPrompt] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(false);
  useFeedback(error && t("locationError"), "warning");
  const pending = useRef<Promise<Coordinates | null> | null>(null);
  useEffect(() => {
    try { setPrompt(sessionStorage.getItem("clucky_location_prompt") !== "seen"); } catch { setPrompt(true); }
  }, []);
  const dismiss = () => {
    setPrompt(false);
    try { sessionStorage.setItem("clucky_location_prompt", "seen"); } catch {}
  };
  const locate = useCallback((): Promise<Coordinates | null> => {
    if (pending.current) return pending.current;
    if (!navigator.geolocation || !window.isSecureContext) { setError(true); return Promise.resolve(null); }
    setLocating(true); setError(false);
    pending.current = new Promise<Coordinates | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(position => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setPoint(next); resolve(next);
      }, () => { setError(true); resolve(null); }, { timeout: 12000, maximumAge: 60000, enableHighAccuracy: false });
    }).finally(() => { setLocating(false); pending.current = null; });
    return pending.current;
  }, []);
  useEffect(() => {
    let active = true;
    if (navigator.permissions) navigator.permissions.query({ name: "geolocation" }).then(permission => {
      if (!active) return;
      if (permission.state === "granted") { setPrompt(false); void locate(); }
      if (permission.state === "denied") setPrompt(false);
    }).catch(() => {});
    return () => { active = false; };
  }, [locate]);
  return <LocationContext.Provider value={{ point, locate, locating, error }}>
    {children}
    {prompt && <aside className={styles.locationPrompt} aria-label={t("locationPrompt")}>
      <button className={styles.dismiss} onClick={dismiss} aria-label={t("later")}><X size={18} /></button>
      <LocateFixed size={26} /><strong>{t("locationPrompt")}</strong><p>{t("locationWhy")}</p>
      <small>{t("locationPrivacy")}</small>
      {error && <p role="alert">{t("locationError")}</p>}
      <div className={styles.actions}><button className="btn-primary" disabled={locating} onClick={async () => { if (await locate()) dismiss(); }}>{t(locating ? "locating" : "allow")}</button><button type="button" onClick={dismiss}>{t("later")}</button></div>
    </aside>}
  </LocationContext.Provider>;
}
export function useLocation() { return useContext(LocationContext); }
