import i18n from "../i18n/index.ts";
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Space, Tag } from 'antd';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '../context/AuthContext';
import { message } from './feedback';
import { getErrorMessage, shipmentSimulationApi, type ShipmentSimulationTracking } from '../lib/api';
import styles from './shipment-simulation.module.css';

function reasons() {
  return [
  { value: 'CUSTOMER_UNREACHABLE', label: i18n.t("shipping:ui.unableToContactTheCustomer") },
  { value: 'CUSTOMER_ABSENT', label: i18n.t("shipping:ui.customerIsNotAtTheDeliveryAddress") },
  { value: 'WRONG_ADDRESS', label: i18n.t("shipping:ui.incorrectOrIncompleteAddress") },
  { value: 'ACCESS_BLOCKED', label: i18n.t("shipping:ui.deliveryAreaCannotBeAccessed") },
  { value: 'ACCESS_BLOCKED', label: i18n.t("shipping:ui.cannotEnterTheDeliveryArea") },
  { value: 'CUSTOMER_REFUSED', label: i18n.t("shipping:ui.customerRefusedTheDelivery") },
  { value: 'DAMAGED_ITEMS', label: i18n.t("shipping:ui.foodWasDamagedOrSpilled") },
  { value: 'RIDER_INCIDENT', label: i18n.t("shipping:ui.riderOrVehicleIncident") },
  { value: 'OTHER', label: i18n.t("shipping:ui.otherReason") },
  ];
}

type Action = 'fail' | 'return' | 'retry' | 'close';
type Point = [number, number];

function validRoute(data?: ShipmentSimulationTracking | null): Point[] {
  const geo = data?.routeGeometry;
  if (geo?.type !== 'LineString' || !Array.isArray(geo.coordinates)) return [];
  const points = geo.coordinates.filter((point): point is Point =>
    Array.isArray(point) && point.length >= 2 &&
    Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90,
  );
  return points.length >= 2 ? points : [];
}

function distance(a: Point, b: Point) {
  const lat1 = a[1] * Math.PI / 180;
  const lat2 = b[1] * Math.PI / 180;
  const dy = lat2 - lat1;
  const dx = (b[0] - a[0]) * Math.PI / 180;
  const h = Math.sin(dy / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dx / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function positionOnRoute(points: Point[], progress: number): Point {
  const lengths = points.slice(1).map((point, idx) => distance(points[idx], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (progress <= 0 || total <= 0) return points[0];
  if (progress >= 1) return points[points.length - 1];
  let remaining = progress * total;
  for (let idx = 0; idx < lengths.length; idx++) {
    if (remaining <= lengths[idx]) {
      const segmentProgress = lengths[idx] > 0 ? remaining / lengths[idx] : 0;
      return [
        points[idx][0] + (points[idx + 1][0] - points[idx][0]) * segmentProgress,
        points[idx][1] + (points[idx + 1][1] - points[idx][1]) * segmentProgress,
      ];
    }
    remaining -= lengths[idx];
  }
  return points[points.length - 1];
}

function effectiveNow(tracking: ShipmentSimulationTracking, serverOffset: number) {
  // Once an attempt is FAILED, retain the marker at the server-recorded failure time.
  if (tracking.status === 'FAILED' && tracking.failedAt) return Date.parse(tracking.failedAt);
  if (tracking.status === 'DELIVERED') return Date.parse(tracking.deliveryDueAt || tracking.completedAt || '');
  return Date.now() + serverOffset;
}

function deliveryProgress(tracking: ShipmentSimulationTracking, serverOffset: number) {
  const start = Date.parse(tracking.deliveryStartedAt || '');
  const due = Date.parse(tracking.deliveryDueAt || '');
  if (!Number.isFinite(start) || !Number.isFinite(due) || due <= start) return 0;
  return Math.max(0, Math.min(1, (effectiveNow(tracking, serverOffset) - start) / (due - start)));
}

function ShipmentRouteMap({ tracking, serverOffset }: { tracking: ShipmentSimulationTracking; serverOffset: number }) {
  const { i18n: currentLocale } = useTranslation();
  const holder = useRef<HTMLDivElement>(null);
  const clockOffsetRef = useRef(serverOffset);
  clockOffsetRef.current = serverOffset;
  const routeKey = JSON.stringify(tracking.routeGeometry || null);
  const points = useMemo(() => validRoute(tracking), [routeKey]);
  const [error, setError] = useState('');
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

  useEffect(() => {
    if (!holder.current || points.length < 2) return;
    if (!token.startsWith('pk.')) { setError(i18n.t("shipping:ui.mapboxIsNotConfiguredForTheStaffApp")); return; }
    if (!mapboxgl.supported()) { setError(i18n.t("shipping:ui.thisBrowserDoesNotSupportMapboxMaps")); return; }

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: holder.current,
        accessToken: token,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: points[0],
        zoom: 13,
        attributionControl: false,
      });
    } catch {
      setError(i18n.t("shipping:ui.unableToInitializeTheMapboxMap"));
      return;
    }

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    const bounds = points.reduce((acc, point) => acc.extend(point), new mapboxgl.LngLatBounds(points[0], points[0]));
    map.on('load', () => {
      map.addSource('delivery-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } },
      });
      map.addLayer({ id: 'delivery-route-line', type: 'line', source: 'delivery-route', paint: { 'line-color': '#8f1216', 'line-width': 5, 'line-opacity': 0.85 } });
      map.fitBounds(bounds, { padding: 45, maxZoom: 16, duration: 0 });
      setError('');
    });
    map.on('error', () => setError(i18n.t("shipping:ui.mapboxCouldNotLoadItsBaseMapShippingServiceStillStoresTheDeliveryRoute")));

    const markerElement = document.createElement('div');
    markerElement.className = styles.riderMarker;
    markerElement.textContent = '🛵';
    markerElement.title = i18n.t("shipping:ui.simulatedDeliveryRider");
    const marker = new mapboxgl.Marker({ element: markerElement }).setLngLat(points[0]).addTo(map);
    const startMarker = new mapboxgl.Marker({ color: '#1e7a46', scale: 0.65 }).setLngLat(points[0]).addTo(map);
    const endMarker = new mapboxgl.Marker({ color: '#8f1216', scale: 0.7 }).setLngLat(points[points.length - 1]).addTo(map);
    let frame = 0;
    const animate = () => {
      marker.setLngLat(positionOnRoute(points, deliveryProgress(tracking, clockOffsetRef.current)));
      frame = window.requestAnimationFrame(animate);
    };
    animate();
    return () => {
      window.cancelAnimationFrame(frame);
      marker.remove(); startMarker.remove(); endMarker.remove(); map.remove();
    };
  }, [points, token, currentLocale.language, tracking.attemptNumber, tracking.deliveryStartedAt, tracking.deliveryDueAt, tracking.status, tracking.failedAt, tracking.completedAt]);

  if (points.length < 2) return <Alert type="warning" showIcon message={i18n.t("shipping:ui.noValidMapboxRouteConnectsTheStoreToTheCustomerCheckTheCoordinatesAndDelivery")} />;
  return <div className={styles.mapWrap}>
    <div ref={holder} className={styles.map} aria-label={i18n.t("shipping:ui.simulatedDeliveryRouteMapFromTheStoreToTheCustomer")} role="region" />
    {error && <Alert type="warning" showIcon message={error} />}
  </div>;
}

function statusText(tracking: ShipmentSimulationTracking, now: number) {
  if (tracking.status === 'DELIVERED') return i18n.t("shipping:ui.deliveredSuccessfullySimulation");
  if (tracking.status === 'FAILED') return tracking.resolution === 'CLOSED_UNDELIVERABLE' ? i18n.t("shipping:ui.closedDeliveryUnsuccessful") : i18n.t("shipping:ui.deliveryFailedActionNeeded");
  if (tracking.phase === 'ARRIVED_PENDING_PROOF') return i18n.t("shipping:ui.arrivedConfirmingDelivery");
  if (tracking.status === 'SHIPPING' && tracking.deliveryDueAt && now >= Date.parse(tracking.deliveryDueAt)) {
    return i18n.t("shipping:ui.arrivedAwaitingConfirmationFromShippingService");
  }
  if (tracking.status === 'SHIPPING' || tracking.phase === 'SHIPPING') return i18n.t("shipping:ui.simulatedRiderIsDeliveringTheOrder");
  if (tracking.phase === 'WAITING_RIDER' || tracking.status === 'ASSIGNED') {
    const arrival = Date.parse(tracking.riderArrivalDueAt || '') || (Date.parse(tracking.assignedAt || '') + 5000);
    return i18n.t("shipping:ui.waitingForRiderSeconds", {
      seconds: Number.isFinite(arrival) ? Math.max(0, Math.ceil((arrival - now) / 1000)) : '—',
    });
  }
  if (tracking.status === 'CREATED') return i18n.t("shipping:ui.preparingShipmentDetails");
  return tracking.phase || tracking.status;
}

export function ShipmentSimulationPanel({ orderId, onChanged }: { orderId: string | number; onChanged?: () => void }) {
  useTranslation();
  const { user } = useAuth();
  const manager = user.role === 'STORE_MANAGER' || user.role === 'ADMIN';
  const [tracking, setTracking] = useState<ShipmentSimulationTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [reasonCode, setReasonCode] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [clockTick, setClockTick] = useState(Date.now());
  const [serverOffset, setServerOffset] = useState(0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await shipmentSimulationApi.tracking(orderId, signal);
    if (signal?.aborted) return;
    setTracking(response);
    setServerOffset(response.serverNow && Number.isFinite(Date.parse(response.serverNow)) ? Date.parse(response.serverNow) - Date.now() : 0);
    setError('');
    return response;
  }, [orderId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setTracking(null); setError('');
    void refresh(controller.signal)
      .catch(e => { if (!controller.signal.aborted) setError(getErrorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const poll = window.setInterval(() => {
      if (controller.signal.aborted || document.hidden) return;
      void refresh(controller.signal).catch(() => { /* Keep last synchronized state on a transient failure. */ });
    }, 2000);
    const clock = window.setInterval(() => setClockTick(Date.now()), 200);
    return () => { controller.abort(); window.clearInterval(poll); window.clearInterval(clock); };
  }, [refresh]);

  const now = clockTick + serverOffset;
  const progress = tracking ? deliveryProgress(tracking, serverOffset) : 0;
  const due = Date.parse(tracking?.deliveryDueAt || '');
  const activeDelivery = tracking?.status === 'SHIPPING' && tracking.deliveryStartedAt && Number.isFinite(due) && now < due;
  const failed = tracking?.status === 'FAILED';
  const returned = Boolean(tracking?.returnedAt) || tracking?.phase === 'RETURNED' || tracking?.resolution === 'RETURNED';
  const closed = tracking?.resolution === 'CLOSED_UNDELIVERABLE' || tracking?.phase === 'CLOSED_UNDELIVERABLE';
  const cod = tracking?.paymentMethod === 'COD';

  const begin = (next: Action) => { setReasonCode(undefined); setNote(''); setAction(next); };
  const submit = async () => {
    if (!tracking || !action || busy || (action === 'fail' && (!reasonCode || (reasonCode === 'OTHER' && !note.trim()))) || (action === 'close' && !note.trim())) return;
    const attemptNumber = tracking.attemptNumber;
    const version = tracking.version;
    if (attemptNumber == null || version == null) {
      message.error(i18n.t("shipping:ui.shipmentVersionIsMissingReloadTheShipmentBeforeTakingAction"));
      await refresh().catch(() => {});
      return;
    }
    const mutation = { note: note.trim() || undefined, attemptNumber, version };
    setBusy(true);
    try {
      const updated = action === 'fail'
        ? await shipmentSimulationApi.fail(orderId, { reasonCode: reasonCode!, ...mutation })
        : action === 'return'
          ? await shipmentSimulationApi.returnToStore(orderId, mutation)
          : action === 'retry'
            ? await shipmentSimulationApi.retry(orderId, mutation)
            : await shipmentSimulationApi.close(orderId, { ...mutation, note: note.trim() });
      if (updated?.status) setTracking(updated);
      setAction(null);
      message.success(i18n.t("shipping:ui.shipmentSimulationUpdated"));
      await refresh();
      onChanged?.();
    } catch (e: unknown) {
      message.error(getErrorMessage(e));
      await refresh().catch(() => {});
    } finally { setBusy(false); }
  };

  return <section className={styles.panel} aria-label={i18n.t("shipping:ui.shipmentSimulation")}>
    <div className={styles.titleRow}><h3>{i18n.t("shipping:ui.trackDelivery")}</h3><Tag color="orange">{i18n.t("shipping:ui.simulationNoThirdPartyRider")}</Tag></div>
    {loading && !tracking && <p>{i18n.t("shipping:ui.loadingShipmentDetailsFromShippingService")}</p>}
    {error && <Alert type="warning" showIcon message={i18n.t("shipping:ui.unableToLoadShipment")} description={error} action={<Button size="small" onClick={() => void refresh().catch(e => setError(getErrorMessage(e)))}>{i18n.t("shipping:ui.retry")}</Button>} />}
    {tracking && <>
      <div className={styles.status} role="status"><strong>{statusText(tracking, now)}</strong><span>{i18n.t("shipping:ui.deliveryAttempt")}{tracking.attemptNumber || 1} · {tracking.phase || tracking.status}</span></div>
      {tracking.deliveryStartedAt && <div className={styles.progressRow}>
        <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        <span>{Math.round(progress * 100)}% · {tracking.status === 'SHIPPING' && Number.isFinite(due) ? i18n.t("shipping:ui.secondsRemaining", { seconds: Math.max(0, Math.ceil((due - now) / 1000)) }) : tracking.status === 'FAILED' ? i18n.t("shipping:ui.stopped") : i18n.t("shipping:ui.arrived")}</span>
      </div>}
      <ShipmentRouteMap tracking={tracking} serverOffset={serverOffset} />
      {validRoute(tracking).length < 2 && <Button size="small" onClick={() => void refresh().catch(e => setError(getErrorMessage(e)))}>{i18n.t("shipping:ui.reloadRouteData")}</Button>}
      <div className={styles.details}>
        <p><strong>{i18n.t("shipping:ui.recipient")}</strong> {tracking.customerName || i18n.t("shipping:ui.nameUnavailable")} {tracking.phone && <a href={`tel:${tracking.phone}`}>{tracking.phone}</a>}</p>
        <p><strong>{i18n.t("shipping:ui.address")}</strong> {tracking.address || i18n.t("shipping:ui.deliveryAddressMissing")}</p>
        <p><strong>{i18n.t("shipping:ui.payment")}</strong> {cod
          ? tracking.merchantPaymentStatus === 'PAID_SIMULATED'
            ? i18n.t("shipping:ui.theRiderHasPaidTheStoreSimulationTheCustomerPaysCodToTheRiderUponDelivery")
            : i18n.t("shipping:ui.codCustomerPaysTheRiderUponDeliveryOutsideThePlatform")
          : tracking.paymentMethod === 'BANK_TRANSFER'
            ? i18n.t("shipping:ui.customerPrepaidByQrCodeTheRiderOnlyDeliversTheOrder")
            : i18n.t("shipping:ui.paymentMethodNeedsVerification", { method: tracking.paymentMethod || i18n.t("shipping:ui.unknown") })}</p>
        {tracking.status === 'FAILED' && <p><strong>{i18n.t("shipping:ui.reason")}</strong> {reasons().find(item => item.value === tracking.failureCode)?.label || tracking.failureCode || i18n.t("shipping:ui.unknown2")} {tracking.failureNote && `· ${tracking.failureNote}`}</p>}
        {returned && <p>{i18n.t("shipping:ui.theItemsWereConfirmedReturnedToTheStoreSimulation")}</p>}
      </div>
      {tracking.proof?.imageDataUrl && <figure className={styles.proof}><img src={tracking.proof.imageDataUrl} alt={i18n.t("shipping:ui.systemGeneratedSimulatedProofOfDelivery")} /><figcaption>{i18n.t("shipping:ui.simulationProof")} {tracking.proof.capturedAt ? new Date(tracking.proof.capturedAt).toLocaleString('vi-VN') : ''}</figcaption></figure>}
      {activeDelivery && <Button danger block onClick={() => begin('fail')}>{i18n.t("shipping:ui.simulateDeliveryFailureInTransit")}</Button>}
      {failed && !closed && <Space wrap className={styles.actions}>
        {!returned && <Button onClick={() => begin('return')}>{i18n.t("shipping:ui.confirmItemsReturnedToStoreSimulation")}</Button>}
        {manager && returned && <Button type="primary" onClick={() => begin('retry')}>{i18n.t("shipping:ui.createAnotherDeliveryAttemptSimulation")}</Button>}
        {manager && returned && <Button danger onClick={() => begin('close')}>{i18n.t("shipping:ui.closeCaseDeliveryUnsuccessful")}</Button>}
        {!manager && returned && <Tag>{i18n.t("shipping:ui.awaitAManagerSDecisionToRetryOrCloseThisDelivery")}</Tag>}
      </Space>}
    </>}
    <Modal
      title={action === 'fail' ? i18n.t("shipping:ui.confirmFailedDelivery") : action === 'return' ? i18n.t("shipping:ui.confirmItemsReturnedToStore") : action === 'retry' ? i18n.t("shipping:ui.createAnotherDeliveryAttempt") : i18n.t("shipping:ui.closeUnsuccessfulDeliveryCase")}
      open={Boolean(action)}
      onCancel={() => { if (!busy) setAction(null); }}
      onOk={() => void submit()}
      confirmLoading={busy}
      okButtonProps={{ disabled: (action === 'fail' && (!reasonCode || (reasonCode === 'OTHER' && !note.trim()))) || (action === 'close' && !note.trim()), danger: action === 'fail' || action === 'close' }}
      okText={i18n.t("shipping:ui.confirmSimulation")}
      cancelText={i18n.t("shipping:ui.back")}
      destroyOnHidden
    >
      <p>{i18n.t("shipping:ui.thisActionWillBeSavedInShippingServiceForTheCurrentDeliveryAttempt")}</p>
      {action === 'fail' && <Select options={reasons()} value={reasonCode} onChange={setReasonCode} placeholder={i18n.t("shipping:ui.selectARequiredReason")} style={{ width: '100%', marginBottom: 12 }} />}
      <Input.TextArea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={3} placeholder={action === 'close' || reasonCode === 'OTHER' ? i18n.t("shipping:ui.noteRequired") : i18n.t("shipping:ui.noteOptional")} />
      {action === 'close' && tracking?.paymentMethod !== 'COD' && <Alert type="warning" showIcon message={i18n.t("shipping:ui.prepaidOrderClosingAFailedDeliveryDoesNotRefundThePaymentFollowTheFinanceRefund")} style={{ marginTop: 12 }} />}
    </Modal>
  </section>;
}
