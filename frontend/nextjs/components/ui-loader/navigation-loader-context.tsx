"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  Suspense,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createLoadingStore, type LoadingStore } from "./loading-store";
import { LoadingSurface } from "./loading-surface";
import styles from "./navigation-loader.module.css";
import { navigationKey } from "./navigation-key";

const NavigationContext = createContext<LoadingStore | null>(null);
export function useNavigationPending() {
  const store = useContext(NavigationContext);
  return useSyncExternalStore(
    store?.subscribe ?? emptySubscribe,
    store?.getSnapshot ?? idle,
    idle,
  );
}
const idle = () => false;
const emptySubscribe = () => () => {};

/** A lease belongs only to this source: Link, transition, fallback or page data. */
export function useNavigationTask(pending: boolean) {
  const store = useContext(NavigationContext);
  useLayoutEffect(
    () => (pending ? store?.begin() : undefined),
    [pending, store],
  );
}

function HistoryNavigation({ store }: { store: LoadingStore }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const committed = `${pathname}${search ? `?${search}` : ""}`;
  const current = useRef(committed);
  const historyTask = useRef<{ target: string; finish: () => void } | null>(
    null,
  );
  useLayoutEffect(() => {
    current.current = committed;
    if (historyTask.current && committed === navigationKey(location)) {
      historyTask.current.finish();
      historyTask.current = null;
    }
  }, [committed]);
  useLayoutEffect(() => {
    const pop = () => {
      const target = navigationKey(location);
      historyTask.current?.finish();
      historyTask.current =
        target === current.current ? null : { target, finish: store.begin() };
    };
    // Another accepted navigation replaces pending browser history work.
    const replace = () => {
      historyTask.current?.finish();
      historyTask.current = null;
    };
    window.addEventListener("popstate", pop);
    window.addEventListener("clucky:navigation", replace);
    return () => {
      replace();
      window.removeEventListener("popstate", pop);
      window.removeEventListener("clucky:navigation", replace);
    };
  }, [store]);
  return null;
}

export function NavigationLoaderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [store] = useState(createLoadingStore);
  return (
    <NavigationContext.Provider value={store}>
      <Suspense fallback={null}>
        <HistoryNavigation store={store} />
      </Suspense>
      {children}
    </NavigationContext.Provider>
  );
}

export function NavigationContent({ children }: { children: ReactNode }) {
  const pending = useNavigationPending();
  return (
    <LoadingSurface pending={pending} className={styles.siteMainContent}>
      {children}
    </LoadingSurface>
  );
}

export function NavigationFallback() {
  useNavigationTask(true);
  const [hydrated, setHydrated] = useState(false);
  useLayoutEffect(() => setHydrated(true), []);
  return (
    <div className={styles.fallback} data-route-loading="">
      {!hydrated && (
        <p role="status" className={styles.serverFallback}>
          Đang chuẩn bị trang…
        </p>
      )}
    </div>
  );
}

/** Use at an error boundary: the rendered error ends pending history work. */
export function NavigationError({ children }: { children: ReactNode }) {
  const store = useContext(NavigationContext);
  useLayoutEffect(() => {
    window.dispatchEvent(new Event("clucky:navigation"));
    store?.reset();
  }, [store]);
  return <>{children}</>;
}
