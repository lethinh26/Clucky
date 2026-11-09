"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getSessionState, getServerSessionState, loadSession, subscribeSession } from "@/lib/session";

export function useSession() {
  const session = useSyncExternalStore(subscribeSession, getSessionState, getServerSessionState);
  useEffect(() => { void loadSession().catch(() => {}); }, []);
  return session;
}
