"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/auth/use-session";
import { getErrorMessage, request } from "@/lib/api";
import { getSessionState } from "@/lib/session";
import type { NotificationItemData } from "@/lib/types/notification";

interface Inbox {
  content: NotificationItemData[];
  totalElements: number;
  totalPages: number;
  unreadCount: number;
}

const changed = "clucky-notifications-changed";

export function useNotifications() {
  const { user, ready, error: sessionError } = useSession();
  const userId = user?.userId;
  const [filter, setFilter] = useState({ unread: false, type: "ALL", page: 0 });
  const [loaded, setLoaded] = useState<{ userId: number; data: Inbox } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const mutation = useRef<AbortController | null>(null);

  useEffect(() => {
    setFilter({ unread: false, type: "ALL", page: 0 });
    setLoaded(null); setError(""); setBusy(false);
    return () => { mutation.current?.abort(); mutation.current = null; };
  }, [userId]);

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener(changed, refresh);
    const timer = window.setInterval(() => { if (!document.hidden) refresh(); }, 30000);
    return () => { window.removeEventListener(changed, refresh); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!ready || userId === undefined) { setLoading(!ready); return; }
    const controller = new AbortController();
    setLoading(true); setError(""); setLoaded(null);
    const params = new URLSearchParams({ page: String(filter.page), size: "20", unread: String(filter.unread) });
    if (filter.type !== "ALL") params.set("type", filter.type);
    request<Inbox>(`/api/notifications/my?${params}`, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.content) || !Number.isSafeInteger(data.unreadCount) || data.unreadCount < 0
        || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0 || !Number.isSafeInteger(data.totalPages)
        || data.content.some(item => Number(item.userId) !== userId)) throw new Error("Invalid notification response");
      if (filter.page >= Math.max(1, data.totalPages)) setFilter(current => ({ ...current, page: Math.max(0, data.totalPages - 1) }));
      else setLoaded({ userId, data });
    }).catch(failure => { if (!controller.signal.aborted) setError(getErrorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ready, userId, filter, revision]);

  async function markRead(id?: string | number) {
    if (userId === undefined || mutation.current) return false;
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(true); setError("");
    try {
      await request(id === undefined ? "/api/notifications/read-all" : `/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "PUT", signal: controller.signal,
      });
      if (controller.signal.aborted || getSessionState().user?.userId !== userId) return false;
      window.dispatchEvent(new Event(changed));
      return true;
    } catch (failure) {
      if (!controller.signal.aborted) setError(getErrorMessage(failure));
      return false;
    } finally {
      if (mutation.current === controller) { mutation.current = null; setBusy(false); }
    }
  }

  return {
    data: loaded?.userId === userId ? loaded?.data : null, filter, setFilter, loading, busy,
    error: sessionError ? getErrorMessage(sessionError) : error,
    signedIn: Boolean(user), ready, markRead, refresh: () => setRevision(value => value + 1),
  };
}
