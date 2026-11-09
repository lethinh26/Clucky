import { useEffect, useRef, useState } from 'react';
import { useFeedback } from "./feedback";
import { AutoComplete, Button, InputNumber, Space, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { api } from '../lib/api';
export type StorePoint = { latitude: number | null; longitude: number | null };
type Place = { label: string; latitude: number; longitude: number; accuracy?: string; featureType?: string };

function StoreMap({ value, onChange }: { value?: StorePoint; onChange?: (point: StorePoint) => void }) {
  const { t } = useTranslation('maps');
  const container = useRef<HTMLDivElement>(null);
  const update = useRef(onChange);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [error, setError] = useState('');
  useFeedback(error && error !== 'noResults' ? t(error) : null, "warning");
  useEffect(() => { update.current = onChange; }, [onChange]);
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? '';
    if (!token.startsWith('pk.')) { setError('mapTokenMissing'); return; }
    if (!mapboxgl.supported()) { setError('mapUnsupported'); return; }
    if (!container.current) return;
    let instance: mapboxgl.Map;
    try { instance = new mapboxgl.Map({ container: container.current, accessToken: token,
      style: 'mapbox://styles/mapbox/streets-v12', center: [108.2068,16.0471], zoom: 5, cooperativeGestures: true, attributionControl: false }); }
    catch { setError('mapUnsupported'); return; }
    instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    instance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    instance.on('load', () => setError(''));
    instance.on('error', event => { const status = (event.error as Error & { status?: number }).status; setError(status === 401 || status === 403 ? 'mapTokenInvalid' : 'mapError'); });
    instance.on('click', event => { const point = event.lngLat.wrap(); update.current?.({ latitude: point.lat, longitude: point.lng }); });
    const observer = new ResizeObserver(() => instance.resize()); observer.observe(container.current);
    setMap(instance);
    return () => { observer.disconnect(); instance.remove(); };
  }, []);
  const latitude = value?.latitude;
  const longitude = value?.longitude;
  const editable = Boolean(onChange);
  useEffect(() => {
    if (!map || latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
    const element = document.createElement('div');
    Object.assign(element.style, { width: '54px', height: '54px', border: '3px solid #8f1216', borderRadius: '50% 50% 50% 8px', background: '#fffaf3', display: 'grid', placeItems: 'center' });
    const logo = document.createElement('img'); logo.src = '/logo_primary.png'; logo.alt = 'Clucky';
    Object.assign(logo.style, { width: '44px', height: '44px', objectFit: 'contain' }); element.append(logo);
    element.addEventListener('click', event => event.stopPropagation());
    const marker = new mapboxgl.Marker({ element, anchor: 'bottom', draggable: editable }).setLngLat([longitude, latitude]).addTo(map);
    marker.on('dragend', () => { const point = marker.getLngLat().wrap(); update.current?.({ latitude: point.lat, longitude: point.lng }); });
    map.stop(); map.flyTo({ center: [longitude, latitude], zoom: 16, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500 });
    return () => { marker.remove(); };
  }, [map, latitude, longitude, editable]);
  return <>
    <div ref={container} style={{ height: 320, borderRadius: 16, overflow: 'hidden' }} role="region" aria-label={t('mapLabel')} />
    {error && <Alert type="warning" title={t(error)} />}
  </>;
}

export function StoreLocationPicker({ value, onChange, address = '' }: { value?: StorePoint; onChange?: (point: StorePoint) => void; address?: string }) {
  const { t, i18n } = useTranslation('maps');
  const [query, setQuery] = useState(address);
  const [selected, setSelected] = useState(address);
  const [results, setResults] = useState<Place[]>([]);
  const [error, setError] = useState('');
  useFeedback(error && error !== 'noResults' ? t(error) : null, "warning");
  useEffect(() => {
    setResults([]); setError('');
    if (query.trim().length < 3 || query === selected) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      api.get<Place[]>('/api/locations/search', { params: { text: query.trim().slice(0, 200), lang: i18n.language === 'en' ? 'en' : 'vi' }, signal: abort.signal })
        .then(response => { if (!abort.signal.aborted) { setResults(response.data); setError(response.data.length ? '' : 'noResults'); } })
        .catch((failure: unknown) => {
          if (abort.signal.aborted) return;
          const code = isAxiosError<{ code: string }>(failure) ? failure.response?.data?.code : undefined;
          setError(({ MAPBOX_NOT_CONFIGURED: 'mapboxNotConfigured', MAPBOX_ACCESS_DENIED: 'mapboxAccessDenied', MAPBOX_RATE_LIMITED: 'mapboxRateLimited', MAPBOX_UPSTREAM_ERROR: 'mapboxUnavailable', MAPBOX_UNAVAILABLE: 'mapboxUnavailable' } as Record<string, string>)[code ?? ''] ?? 'searchError');
        });
    }, 650);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [query, selected, i18n.language]);
  return <div style={{ display: 'grid', gap: 12 }}>
    <AutoComplete aria-label={t('search')} value={query} maxLength={200} placeholder={t('searchHint')} onSearch={setQuery} onFocus={() => { if (query === address) setSelected(''); }} options={results.map((place, index) => ({ value: String(index), label: place.label + (place.featureType !== 'address' || place.accuracy === 'approximate' ? ' · ' + t('approximateResult') : '') }))} onSelect={id => { const place = results[Number(id)]; if (place) { setQuery(place.label); setSelected(place.label); onChange?.({ latitude: place.latitude, longitude: place.longitude }); } }} />
    {error && <Alert type="warning" title={t(error)} />}
    <StoreMap value={value} onChange={onChange} />
    <Space wrap><label>{t('latitude')} <InputNumber aria-label={t('latitude')} min={-90} max={90} value={value?.latitude} onChange={latitude => onChange?.({ latitude, longitude: value?.longitude ?? null })} /></label><label>{t('longitude')} <InputNumber aria-label={t('longitude')} min={-180} max={180} value={value?.longitude} onChange={longitude => onChange?.({ latitude: value?.latitude ?? null, longitude })} /></label><Button onClick={() => onChange?.({ latitude: null, longitude: null })}>{t('clearPin')}</Button></Space>
  </div>;
}
