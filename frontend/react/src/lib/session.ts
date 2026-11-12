export interface SessionUser {
  userId: number;
  role: "CUSTOMER" | "ADMIN" | "STORE_MANAGER" | "STAFF";
  storeId?: number;
  email: string;
  fullName: string;
}

type SessionState = { user: SessionUser | null; ready: boolean; error: unknown; revision: number };
const initialState: SessionState = { user: null, ready: false, error: null, revision: 0 };
let state = initialState;
const listeners = new Set<() => void>();
const client = "admin";
const changeKey = `clucky-${client}-session-change`;
let refreshFlight: Promise<SessionUser> | null = null;
let loadFlight: Promise<SessionUser | null> | null = null;

export const getSessionState = () => state;
export const getServerSessionState = () => initialState;
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(user: SessionUser | null, broadcast = false) {
  const changed = state.user?.userId !== user?.userId;
  if (changed && state.user && typeof window !== "undefined") {
    try { localStorage.removeItem(`clucky_profile_ui_v1:${state.user.userId}`); } catch {}
  }
  state = { user, ready: true, error: null, revision: state.revision + (changed ? 1 : 0) };
  listeners.forEach(listener => listener());
  if (broadcast && typeof window !== "undefined") {
    try { localStorage.setItem(changeKey, crypto.randomUUID()); } catch {}
  }
}

export function expireSession() {
  publish(null, Boolean(state.user));
}

export async function sessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return await navigator.locks.request(`clucky-${client}-session`, action);
  }
  return action();
}

function baseUrl() {
  return import.meta.env.VITE_API_URL ?? "";
}

async function send<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-Clucky-Client", client);
  headers.delete("Authorization");
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, { ...options, headers, credentials: "include", cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw { code: "NETWORK_ERROR" };
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw { status: response.status, code: data.code, message: data.message };
  return data as T;
}

export function isSessionExpired(error: unknown, sessionEndpoint = false): boolean {
  const failure = error as { status?: number; code?: string } | null;
  return failure?.status === 401 || failure?.code === "ACCOUNT_LOCKED"
    || (sessionEndpoint && failure?.status === 403);
}

export function refreshSession(): Promise<SessionUser> {
  if (!refreshFlight) {
    refreshFlight = sessionLock(async () => {
      try {
        let user: SessionUser;
        try {
          user = await send<SessionUser>("/api/auth/session");
        } catch (error) {
          if (!isSessionExpired(error, true)) throw error;
          user = await send<SessionUser>("/api/auth/refresh", { method: "POST" });
        }
        publish(user);
        return user;
      } catch (error) {
        if (isSessionExpired(error, true)) expireSession();
        throw error;
      }
    }).finally(() => { refreshFlight = null; });
  }
  return refreshFlight;
}

export async function sessionRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const revision = state.revision;
  try {
    const result = await send<T>(path, options);
    if (revision !== state.revision && path !== "/api/auth/session") throw new DOMException("Session changed", "AbortError");
    return result;
  } catch (error) {
    if (![401, 403].includes((error as { status?: number }).status ?? 0)
        || (path.startsWith("/api/auth/") && path !== "/api/auth/session")) throw error;
    await refreshSession();
    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (revision !== state.revision && revision !== 0) throw { status: 401, code: "UNAUTHENTICATED" };
    const retryRevision = state.revision;
    try {
      const result = await send<T>(path, options);
      if (retryRevision !== state.revision) throw new DOMException("Session changed", "AbortError");
      return result;
    } catch (retryError) {
      if (retryRevision === state.revision && isSessionExpired(retryError)) expireSession();
      throw retryError;
    }
  }
}

export function loadSession(force = false): Promise<SessionUser | null> {
  if (state.ready && !state.error && !force) return Promise.resolve(state.user);
  if (!loadFlight) {
    const revision = state.revision;
    loadFlight = sessionRequest<SessionUser>("/api/auth/session").then(user => {
      if (revision !== state.revision && state.ready) return state.user;
      publish(user);
      return user;
    }).catch(error => {
      if (revision !== state.revision && state.ready) return state.user;
      if (isSessionExpired(error, true)) { publish(null); return null; }
      state = { ...state, ready: true, error };
      listeners.forEach(listener => listener());
      throw error;
    }).finally(() => { loadFlight = null; });
  }
  return loadFlight;
}

export async function signIn<T extends SessionUser | { status: string; pendingToken: string }>(
  path: string, body: unknown,
): Promise<T> {
  return sessionLock(async () => {
    const result = await send<T>(path, { method: "POST", body: JSON.stringify(body) });
    if ("userId" in result) publish(result, true);
    return result;
  });
}

export async function endSession(path = "/api/auth/logout", body?: unknown) {
  return sessionLock(async () => {
    const result = await send<{ message?: string }>(path, { method: "POST", body: JSON.stringify(body) });
    publish(null, true);
    return result;
  });
}

if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("clucky_admin_access_token");
    localStorage.removeItem("clucky_admin_refresh_token");
  } catch {}
  window.addEventListener("storage", event => {
    if (event.key === changeKey) {
      state = { ...state, ready: false, user: null, revision: state.revision + 1 };
      listeners.forEach(listener => listener());
      void loadSession(true).catch(() => {});
    }
  });
  window.addEventListener("focus", () => { void loadSession(true).catch(() => {}); });
}
