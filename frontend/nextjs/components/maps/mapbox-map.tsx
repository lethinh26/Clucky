"use client";
import { useFeedback } from "@/components/feedback";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import mapboxgl from "mapbox-gl";
import type { BranchMapProps, MapPoint } from "./branch-map";
import styles from "./maps.module.css";

export default function MapboxMap(props: BranchMapProps) {
  const t = useTranslations("maps");
  const container = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [error, setError] = useState("");
  useFeedback(error && t(error));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { current.current = props; }, [props]);
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
    if (!token.startsWith("pk.")) { setError("mapTokenMissing"); return; }
    if (!mapboxgl.supported()) { setError("mapUnsupported"); return; }
    if (!container.current) return;
    let instance: mapboxgl.Map;
    try {
      instance = new mapboxgl.Map({ container: container.current, accessToken: token,
        style: "mapbox://styles/mapbox/streets-v12", center: [108.2068, 16.0471], zoom: 5,
        attributionControl: false, cooperativeGestures: true });
    } catch { setError("mapUnsupported"); return; }
    instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    instance.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    instance.on("load", () => { setLoaded(true); setError(""); });
    instance.on("error", event => {
      const status = (event.error as Error & { status?: number }).status;
      setError(status === 401 || status === 403 ? "mapTokenInvalid" : "mapError");
    });
    instance.on("click", event => { const point = event.lngLat.wrap(); current.current.onPick?.({ latitude: point.lat, longitude: point.lng }); });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    setMap(instance);
    return () => { observer.disconnect(); instance.remove(); };
  }, []);
  const pointsKey = JSON.stringify(props.points ?? []);
  const pinLatitude = props.pin?.latitude;
  const pinLongitude = props.pin?.longitude;
  const originLatitude = props.origin?.latitude;
  const originLongitude = props.origin?.longitude;
  const editable = Boolean(props.onPick);
  const selectedId = props.selectedId;
  useEffect(() => {
    if (!map) return;
    const markers: mapboxgl.Marker[] = [];
    const popups: mapboxgl.Popup[] = [];
    const points: MapPoint[] = JSON.parse(pointsKey);
    for (const point of points) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "clucky-map-marker" + (point.id === selectedId ? " is-selected" : "");
      button.title = point.label;
      button.setAttribute("aria-label", point.label);
      button.setAttribute("aria-pressed", String(point.id === selectedId));
      const logo = document.createElement("img");
      logo.src = "/logo_primary.png"; logo.alt = "";
      button.append(logo);
      button.addEventListener("click", event => { event.stopPropagation(); current.current.onSelect?.(point.id); });
      markers.push(new mapboxgl.Marker({ element: button, anchor: "bottom" }).setLngLat([point.longitude, point.latitude]).addTo(map));
      if (point.id === selectedId) popups.push(new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: [0, -58], anchor: "bottom" })
        .setLngLat([point.longitude, point.latitude]).setText(point.label).addTo(map));
    }
    if (originLatitude !== undefined && originLongitude !== undefined) {
      const element = document.createElement("div"); element.className = "clucky-origin-marker";
      element.title = props.originLabel ?? t("locationReady");
      markers.push(new mapboxgl.Marker({ element }).setLngLat([originLongitude, originLatitude]).addTo(map));
    }
    if (pinLatitude !== undefined && pinLongitude !== undefined) {
      const marker = new mapboxgl.Marker({ color: "#8f1216", draggable: editable }).setLngLat([pinLongitude, pinLatitude]).addTo(map);
      const element = marker.getElement();
      element.setAttribute("aria-label", t("pinSelected"));
      element.addEventListener("click", event => event.stopPropagation());
      marker.on("dragend", () => { const point = marker.getLngLat().wrap(); current.current.onPick?.({ latitude: point.lat, longitude: point.lng }); });
      markers.push(marker);
    }
    return () => { markers.forEach(marker => marker.remove()); popups.forEach(popup => popup.remove()); };
  }, [map, pointsKey, selectedId, pinLatitude, pinLongitude, originLatitude, originLongitude, props.originLabel, editable, t]);
  useEffect(() => {
    if (!map) return;
    const points: MapPoint[] = JSON.parse(pointsKey);
    const selected = points.find(point => point.id === selectedId);
    const latitude = pinLatitude ?? selected?.latitude;
    const longitude = pinLongitude ?? selected?.longitude;
    map.stop();
    if (latitude !== undefined && longitude !== undefined) {
      map.flyTo({ center: [longitude, latitude], zoom: 16, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650 });
      return;
    }
    const bounds = new mapboxgl.LngLatBounds();
    points.forEach(point => bounds.extend([point.longitude, point.latitude]));
    if (originLatitude !== undefined && originLongitude !== undefined) bounds.extend([originLongitude, originLatitude]);
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 54, maxZoom: 14, duration: 0 });
  }, [map, pointsKey, selectedId, props.focusRequest, pinLatitude, pinLongitude, originLatitude, originLongitude]);
  return <>
    <div ref={container} style={{ height: "100%", width: "100%" }} aria-label={t("mapLabel")} />
    {!loaded && !error && <span className={styles.mapLoading} role="status">{t("mapLoading")}</span>}
    {error && <p role="status" className={styles.mapError}>{t(error)}</p>}
  </>;
}
