"use client";
import { notify } from "@/components/feedback";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LocateFixed, X } from "lucide-react";
import { coordinates, type Coordinates } from "@/lib/geo";
import styles from "./maps.module.css";
type LocationError = "locationInsecure" | "locationUnsupported" | "locationDenied" | "locationUnavailable" | "locationTimeout" | "locationError";
const LocationContext = createContext<{ point: Coordinates | null; locate: () => Promise<Coordinates | null>; locating: boolean; error: LocationError | null }>({ point: null, locate: async () => null, locating: false, error: null });
export function LocationProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("maps");
  const [point, setPoint] = useState<Coordinates | null>(null);
  const [prompt, setPrompt] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);
  useEffect(() => {
    if (!error) return;
    const notification = notify.warning({ content: t(error), key: "current-location-error", duration: 0 });
    return () => { notify.destroy(notification); };
  }, [error, t]);
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
    if (!window.isSecureContext) { setError("locationInsecure"); return Promise.resolve(null); }
    if (!navigator.geolocation) { setError("locationUnsupported"); return Promise.resolve(null); }
    setLocating(true);
    pending.current = new Promise<Coordinates | null>((resolve) => {
      const fail = (code?: number) => {
        setError(code === 1 ? "locationDenied" : code === 2 ? "locationUnavailable" : code === 3 ? "locationTimeout" : "locationError");
        resolve(null);
      };
      const attempt = (highAccuracy: boolean) => {
        try {
          navigator.geolocation.getCurrentPosition(position => {
            const next = coordinates(position.coords);
            if (!next) { fail(2); return; }
            setError(null); setPrompt(false); setPoint(next); resolve(next);
          }, failure => {
            if (!highAccuracy && (failure.code === 2 || failure.code === 3)) attempt(true);
            else fail(failure.code);
          }, { timeout: highAccuracy ? 20000 : 12000, maximumAge: highAccuracy ? 0 : 60000, enableHighAccuracy: highAccuracy });
        } catch (failure) { fail(failure instanceof DOMException && failure.name === "SecurityError" ? 1 : undefined); }
      };
      attempt(false);
    }).finally(() => { setLocating(false); pending.current = null; });
    return pending.current;
  }, []);
  useEffect(() => {
    let active = true;
    let permission: PermissionStatus | undefined;
    let previousState: PermissionState | undefined;
    const syncPermission = () => {
      if (!active || !permission) return;
      if (permission.state === previousState) return;
      previousState = permission.state;
      if (permission.state === "granted") {
        setPrompt(false);
        if (pending.current) {
          void pending.current.then(result => { if (active && permission?.state === "granted" && !result) void locate(); });
        } else void locate();
      }
      if (permission.state === "denied") setPrompt(false);
    };
    const onVisible = () => { if (document.visibilityState === "visible") syncPermission(); };
    if (window.isSecureContext && navigator.permissions) navigator.permissions.query({ name: "geolocation" }).then(status => {
      if (!active) return;
      permission = status;
      permission.addEventListener("change", syncPermission);
      syncPermission();
    }).catch(() => {});
    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      permission?.removeEventListener("change", syncPermission);
      window.removeEventListener("focus", syncPermission);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [locate]);
  return <LocationContext.Provider value={{ point, locate, locating, error }}>
    {children}
    {prompt && <aside className={styles.locationPrompt} aria-label={t("locationPrompt")}>
      <button className={styles.dismiss} onClick={dismiss} aria-label={t("later")}><X size={18} /></button>
      <LocateFixed size={26} /><strong>{t("locationPrompt")}</strong><p>{t("locationWhy")}</p>
      <small>{t("locationPrivacy")}</small>
      {error && <p role="alert">{t(error)}</p>}
      <div className={styles.actions}><button className="btn-primary" disabled={locating} onClick={async () => { if (await locate()) dismiss(); }}>{t(locating ? "locating" : "allow")}</button><button type="button" onClick={dismiss}>{t("later")}</button></div>
    </aside>}
  </LocationContext.Provider>;
}
export function useLocation() { return useContext(LocationContext); }
