import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Space, Tag } from 'antd';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '../context/AuthContext';
import { message } from './feedback';
import { getErrorMessage, shipmentSimulationApi, type ShipmentSimulationTracking } from '../lib/api';
import styles from './shipment-simulation.module.css';

const reasons = [
  { value: 'CUSTOMER_UNREACHABLE', label: 'Không liên lạc được với khách' },
  { value: 'CUSTOMER_ABSENT', label: 'Khách không có mặt' },
  { value: 'WRONG_ADDRESS', label: 'Sai hoặc thiếu địa chỉ' },
  { value: 'ACCESS_BLOCKED', label: 'Không thể tiếp cận khu vực giao hàng' },
  { value: 'ACCESS_BLOCKED', label: 'Không vào được khu vực giao' },
  { value: 'CUSTOMER_REFUSED', label: 'Khách từ chối nhận' },
  { value: 'DAMAGED_ITEMS', label: 'Món ăn bị hỏng / đổ vỡ' },
  { value: 'RIDER_INCIDENT', label: 'Sự cố tài xế hoặc phương tiện' },
  { value: 'OTHER', label: 'Lý do khác' },
];

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
  const holder = useRef<HTMLDivElement>(null);
  const clockOffsetRef = useRef(serverOffset);
  clockOffsetRef.current = serverOffset;
  const routeKey = JSON.stringify(tracking.routeGeometry || null);
  const points = useMemo(() => validRoute(tracking), [routeKey]);
  const [error, setError] = useState('');
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

  useEffect(() => {
    if (!holder.current || points.length < 2) return;
    if (!token.startsWith('pk.')) { setError('Chưa cấu hình Mapbox trên giao diện nhân viên.'); return; }
    if (!mapboxgl.supported()) { setError('Trình duyệt không hỗ trợ bản đồ Mapbox.'); return; }

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
      setError('Không thể khởi tạo bản đồ Mapbox.');
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
    map.on('error', () => setError('Mapbox không tải được lớp nền. Tuyến giao vẫn do Shipping Service lưu.'));

    const markerElement = document.createElement('div');
    markerElement.className = styles.riderMarker;
    markerElement.textContent = '🛵';
    markerElement.title = 'Tài xế mô phỏng';
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
  }, [points, token, tracking.attemptNumber, tracking.deliveryStartedAt, tracking.deliveryDueAt, tracking.status, tracking.failedAt, tracking.completedAt]);

  if (points.length < 2) return <Alert type="warning" showIcon message="Chưa có tuyến Mapbox hợp lệ từ quán đến khách. Vui lòng kiểm tra tọa độ và cấu hình vận chuyển." />;
  return <div className={styles.mapWrap}>
    <div ref={holder} className={styles.map} aria-label="Bản đồ tuyến giao hàng mô phỏng từ chi nhánh tới khách" role="region" />
    {error && <Alert type="warning" showIcon message={error} />}
  </div>;
}

function statusText(tracking: ShipmentSimulationTracking, now: number) {
  if (tracking.status === 'DELIVERED') return 'Giao thành công (mô phỏng)';
  if (tracking.status === 'FAILED') return tracking.resolution === 'CLOSED_UNDELIVERABLE' ? 'Đã đóng — giao không thành công' : 'Giao thất bại — cần xử lý';
  if (tracking.phase === 'ARRIVED_PENDING_PROOF') return 'Đã đến nơi — đang xác nhận giao';
  if (tracking.status === 'SHIPPING' && tracking.deliveryDueAt && now >= Date.parse(tracking.deliveryDueAt)) {
    return 'Đã đến nơi — đang chờ xác nhận từ Shipping Service';
  }
  if (tracking.status === 'SHIPPING' || tracking.phase === 'SHIPPING') return 'Shipper mô phỏng đang giao hàng';
  if (tracking.phase === 'WAITING_RIDER' || tracking.status === 'ASSIGNED') {
    const arrival = Date.parse(tracking.riderArrivalDueAt || '') || (Date.parse(tracking.assignedAt || '') + 5000);
    return `Đang chờ shipper đến quán · còn ${Number.isFinite(arrival) ? Math.max(0, Math.ceil((arrival - now) / 1000)) : '—'} giây`;
  }
  if (tracking.status === 'CREATED') return 'Đang chuẩn bị hồ sơ vận chuyển';
  return tracking.phase || tracking.status;
}

export function ShipmentSimulationPanel({ orderId, onChanged }: { orderId: string | number; onChanged?: () => void }) {
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
      message.error('Thiếu phiên bản chuyến giao. Vui lòng tải lại dữ liệu trước khi thao tác.');
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
      message.success('Đã cập nhật mô phỏng vận chuyển.');
      await refresh();
      onChanged?.();
    } catch (e: unknown) {
      message.error(getErrorMessage(e));
      await refresh().catch(() => {});
    } finally { setBusy(false); }
  };

  return <section className={styles.panel} aria-label="Mô phỏng vận chuyển">
    <div className={styles.titleRow}><h3>Theo dõi giao hàng</h3><Tag color="orange">MÔ PHỎNG · không có shipper đối tác</Tag></div>
    {loading && !tracking && <p>Đang tải dữ liệu vận chuyển từ Shipping Service…</p>}
    {error && <Alert type="warning" showIcon message="Chưa tải được vận chuyển" description={error} action={<Button size="small" onClick={() => void refresh().catch(e => setError(getErrorMessage(e)))}>Thử lại</Button>} />}
    {tracking && <>
      <div className={styles.status} role="status"><strong>{statusText(tracking, now)}</strong><span>Lần giao #{tracking.attemptNumber || 1} · {tracking.phase || tracking.status}</span></div>
      {tracking.deliveryStartedAt && <div className={styles.progressRow}>
        <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        <span>{Math.round(progress * 100)}% · {tracking.status === 'SHIPPING' && Number.isFinite(due) ? `Còn ${Math.max(0, Math.ceil((due - now) / 1000))}s` : tracking.status === 'FAILED' ? 'Đã dừng' : 'Đã đến nơi'}</span>
      </div>}
      <ShipmentRouteMap tracking={tracking} serverOffset={serverOffset} />
      {validRoute(tracking).length < 2 && <Button size="small" onClick={() => void refresh().catch(e => setError(getErrorMessage(e)))}>Tải lại dữ liệu tuyến</Button>}
      <div className={styles.details}>
        <p><strong>Người nhận:</strong> {tracking.customerName || 'Chưa có tên'} {tracking.phone && <a href={`tel:${tracking.phone}`}>{tracking.phone}</a>}</p>
        <p><strong>Địa chỉ:</strong> {tracking.address || 'Thiếu địa chỉ giao hàng'}</p>
        <p><strong>Thanh toán:</strong> {cod
          ? tracking.merchantPaymentStatus === 'PAID_SIMULATED'
            ? 'Đã thanh toán khi shipper nhận đơn (mô phỏng). Khách trả COD cho shipper khi giao, ngoài hệ thống.'
            : 'COD · khách trả tiền cho shipper khi nhận món, ngoài hệ thống.'
          : tracking.paymentMethod === 'BANK_TRANSFER'
            ? 'Khách đã thanh toán QR trước; shipper chỉ giao hàng.'
            : `Phương thức ${tracking.paymentMethod || 'chưa xác định'} — cần kiểm tra trạng thái thanh toán`}</p>
        {tracking.status === 'FAILED' && <p><strong>Lý do:</strong> {reasons.find(item => item.value === tracking.failureCode)?.label || tracking.failureCode || 'Chưa rõ'} {tracking.failureNote && `· ${tracking.failureNote}`}</p>}
        {returned && <p>Hàng đã được xác nhận quay về quán (mô phỏng).</p>}
      </div>
      {tracking.proof?.imageDataUrl && <figure className={styles.proof}><img src={tracking.proof.imageDataUrl} alt="Minh chứng giao hàng mô phỏng do hệ thống tạo" /><figcaption>Minh chứng mô phỏng · {tracking.proof.capturedAt ? new Date(tracking.proof.capturedAt).toLocaleString('vi-VN') : ''}</figcaption></figure>}
      {activeDelivery && <Button danger block onClick={() => begin('fail')}>Giả lập giao thất bại trong khi vận chuyển</Button>}
      {failed && !closed && <Space wrap className={styles.actions}>
        {!returned && <Button onClick={() => begin('return')}>Xác nhận hàng đã hoàn về quán (mô phỏng)</Button>}
        {manager && returned && <Button type="primary" onClick={() => begin('retry')}>Tạo lần giao lại (mô phỏng)</Button>}
        {manager && returned && <Button danger onClick={() => begin('close')}>Đóng xử lý — giao không thành công</Button>}
        {!manager && returned && <Tag>Chờ quản lý quyết định giao lại hoặc đóng xử lý</Tag>}
      </Space>}
    </>}
    <Modal
      title={action === 'fail' ? 'Xác nhận giao hàng thất bại' : action === 'return' ? 'Xác nhận hàng đã quay về quán' : action === 'retry' ? 'Tạo chuyến giao lại' : 'Đóng xử lý giao không thành công'}
      open={Boolean(action)}
      onCancel={() => { if (!busy) setAction(null); }}
      onOk={() => void submit()}
      confirmLoading={busy}
      okButtonProps={{ disabled: (action === 'fail' && (!reasonCode || (reasonCode === 'OTHER' && !note.trim()))) || (action === 'close' && !note.trim()), danger: action === 'fail' || action === 'close' }}
      okText="Xác nhận mô phỏng"
      cancelText="Quay lại"
      destroyOnHidden
    >
      <p>Thao tác được lưu tại Shipping Service, áp dụng cho chuyến giao hiện tại.</p>
      {action === 'fail' && <Select options={reasons} value={reasonCode} onChange={setReasonCode} placeholder="Chọn lý do bắt buộc" style={{ width: '100%', marginBottom: 12 }} />}
      <Input.TextArea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={3} placeholder={action === 'close' || reasonCode === 'OTHER' ? 'Ghi chú bắt buộc' : 'Ghi chú (không bắt buộc)'} />
      {action === 'close' && tracking?.paymentMethod !== 'COD' && <Alert type="warning" showIcon message="Đơn đã trả trước: việc đóng thất bại không đồng nghĩa đã hoàn tiền. Xử lý hoàn tiền theo quy trình tài chính." style={{ marginTop: 12 }} />}
    </Modal>
  </section>;
}
