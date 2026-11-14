"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { request } from "@/lib/api";
import styles from "./mock-delivery-tracking.module.css";

const MockDeliveryMap = dynamic(() => import("./mock-delivery-map"), { ssr: false });
type Coordinate = [number, number];

export interface TrackingResponse {
  orderId: number;
  status: "CREATED" | "ASSIGNED" | "PICKED_UP" | "SHIPPING" | "DELIVERED" | "FAILED";
  phase?: string | null;
  simulationMode?: string;
  serverNow: string;
  attemptNumber?: number;
  assignedAt?: string | null;
  deliveryStartedAt?: string | null;
  deliveryDueAt?: string | null;
  failedAt?: string | null;
  routeGeometry?: { type: "LineString"; coordinates: Coordinate[] } | null;
  proof?: { kind?: string; capturedAt?: string; imageDataUrl?: string } | null;
  failureCode?: string | null;
  resolution?: string | null;
  paymentMethod?: string;
  codAmount?: number | null;
  merchantPaymentStatus?: "AWAITING_RIDER_ADVANCE" | "PAID_SIMULATED" | "ADVANCE_RETURNED" | "PAID_REAL_PROCESSOR" | null;
}

export function MockDeliveryTracking({ orderId, active, onTrackingUpdate }: {
  orderId: string;
  active: boolean;
  onTrackingUpdate?: (tracking: TrackingResponse) => void;
}) {
  const t = useTranslations();
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const [serverOffset, setServerOffset] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let pollTimer: number | undefined;
    const load = async () => {
      try {
        const response = await request<TrackingResponse>(
          `/api/shipping/shipments/${encodeURIComponent(orderId)}/tracking`,
          { signal: controller.signal },
        );
        if (!active) return;
        setTracking(response);
        onTrackingUpdate?.(response);
        if (Number.isFinite(Date.parse(response.serverNow))) {
          setServerOffset(Date.parse(response.serverNow) - Date.now());
        }
        setError("");
      } catch (caught) {
        if (!active) return;
        const status = (caught as { status?: number }).status;
        if (status !== 404) setError(t("shipping.tracking.progressUnavailable"));
      } finally {
        // Start the next request only once this one settles; slow responses cannot rewind tracking.
        if (active) pollTimer = window.setTimeout(() => void load(), 1500);
      }
    };
    void load();
    return () => {
      active = false;
      controller.abort();
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
    };
  }, [orderId, t, onTrackingUpdate]);

  useEffect(() => {
    if (!active) return;
    const ticker = window.setInterval(() => setClock(Date.now()), 100);
    return () => window.clearInterval(ticker);
  }, [active]);

  const start = tracking?.deliveryStartedAt ? Date.parse(tracking.deliveryStartedAt) : NaN;
  const due = tracking?.deliveryDueAt ? Date.parse(tracking.deliveryDueAt) : NaN;
  const failed = tracking?.failedAt ? Date.parse(tracking.failedAt) : NaN;
  const now = clock + serverOffset;
  const duration = Number.isFinite(due - start) && due > start ? due - start : 20_000;
  const effectiveTime = tracking?.status === "FAILED" && Number.isFinite(failed) ? failed : now;
  const progress = tracking?.status === "DELIVERED" ? 1
    : Number.isFinite(start) ? Math.max(0, Math.min(1, (effectiveTime - start) / duration)) : 0;
  const coordinates = useMemo(() => tracking?.routeGeometry?.type === "LineString" && Array.isArray(tracking.routeGeometry.coordinates)
    ? tracking.routeGeometry.coordinates.filter((p): p is Coordinate => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
    : [], [tracking?.routeGeometry]);

  // Keep listening for payment/status updates after delivery, but only show the
  // map while the actual order is in its shipping step.
  if (!active) return null;

  return (
    <section className={styles.panel} aria-label={t("shipping.tracking.deliveryMap")}>
      <div className={styles.map}>
        {coordinates.length >= 2 ? (
          <MockDeliveryMap route={coordinates} progress={progress} />
        ) : (
          <p className={styles.mapPlaceholder}><MapPin size={19} aria-hidden /> {t("shipping.tracking.loadingRoute")}</p>
        )}
      </div>
      <div className={styles.footer} role="status">
        <span className={styles.trackingLabel}>
          <span className={styles.trackingDot} />
          {tracking?.status === "FAILED"
            ? t("shipping.tracking.deliveryFailed")
            : t("shipping.tracking.estimatedPosition")}
        </span>
      </div>
      {error && <p className={styles.failure} role="status">{error}</p>}
    </section>
  );
}
