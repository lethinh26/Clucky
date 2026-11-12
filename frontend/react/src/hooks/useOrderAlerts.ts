import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from '../components/feedback';
import { incomingOrders } from '../lib/order-alerts';

const preferenceKey = 'clucky_staff_sound_enabled';

function chime(context: AudioContext) {
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  oscillator.connect(volume); volume.connect(context.destination);
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(659.25, context.currentTime);
  oscillator.frequency.setValueAtTime(880, context.currentTime + .22);
  volume.gain.setValueAtTime(.0001, context.currentTime);
  volume.gain.exponentialRampToValueAtTime(.4, context.currentTime + .03);
  volume.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .9);
  oscillator.start(); oscillator.stop(context.currentTime + .9);
  oscillator.onended = () => { oscillator.disconnect(); volume.disconnect(); };
}

export function useOrderAlerts() {
  const { t } = useTranslation();
  const translate = useRef(t); translate.current = t;
  const [enabled, setEnabled] = useState(() => { try { return localStorage.getItem(preferenceKey) !== 'false'; } catch { return true; } });
  const wanted = useRef(enabled); wanted.current = enabled;
  const [ready, setReady] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const waiting = useRef(false);
  const snapshot = useRef<{ scope: string; ids: Set<string> } | null>(null);

  const unlock = useCallback(async (preview = false) => {
    try {
      if (!window.AudioContext) return false;
      context.current ??= new AudioContext();
      const audio = context.current;
      audio.onstatechange = () => { if (context.current === audio) setReady(audio.state === 'running'); };
      await audio.resume();
      if (context.current !== audio || audio.state !== 'running') return false;
      setReady(true);
      if (wanted.current && (preview || waiting.current)) { waiting.current = false; chime(audio); }
      return true;
    } catch { setReady(false); return false; }
  }, []);

  useEffect(() => {
    const interact = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-order-sound]')) return;
      if (wanted.current) void unlock();
    };
    window.addEventListener('pointerdown', interact);
    window.addEventListener('keydown', interact);
    return () => {
      window.removeEventListener('pointerdown', interact); window.removeEventListener('keydown', interact);
      const previous = context.current; context.current = null;
      if (previous) previous.onstatechange = null;
      void previous?.close().catch(() => {});
    };
  }, [unlock]);

  const toggleSound = useCallback(async () => {
    const next = !(wanted.current && context.current?.state === 'running');
    wanted.current = next; setEnabled(next);
    try { localStorage.setItem(preferenceKey, String(next)); } catch {}
    if (!next) { waiting.current = false; return; }
    if (!await unlock(true)) message.warning(translate.current('business:orderAlerts.blocked'));
  }, [unlock]);

  const observe = useCallback((orders: { id: string | number; status: string; orderCode: string }[], scope: string, notify = true) => {
    const previous = snapshot.current;
    if (!previous || previous.scope !== scope) { snapshot.current = { scope, ids: new Set(orders.map(order => String(order.id))) }; return; }
    const added = incomingOrders(orders, previous.ids);
    orders.forEach(order => previous.ids.add(String(order.id)));
    if (!notify || !added.length) return;
    if (wanted.current) {
      const audio = context.current;
      if (audio?.state === 'running') chime(audio);
      else { waiting.current = true; setReady(false); }
    }
    message.info(translate.current('business:orderAlerts.newOrders', { count: added.length, code: added[0].orderCode }));
  }, []);

  return { observe, toggleSound, soundOn: enabled && ready,
    soundLabel: t(enabled ? ready ? 'business:orderAlerts.on' : 'business:orderAlerts.allow' : 'business:orderAlerts.off') };
}
