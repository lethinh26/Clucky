import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuthState } from "../../context/AuthContext";
import { createLoadingStore, type LoadingStore } from "./loading-store";
import { LoadingSurface } from "./loading-surface";

const PageLoadingContext = createContext<LoadingStore | null>(null);

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const { pathname, search, hash, key } = useLocation();
  const { user } = useAuthState();
  useLayoutEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, key, hash]);
  useLayoutEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => { history.scrollRestoration = previous; };
  }, []);
  // Preserve shell state, but give every route/role/store its own request scope.
  const store = useMemo(createLoadingStore, [
    pathname,
    search,
    user?.role,
    user?.storeId,
  ]);
  return (
    <PageLoadingContext.Provider value={store}>
      {children}
    </PageLoadingContext.Provider>
  );
}

export function usePageLoading(pending: boolean) {
  const store = useContext(PageLoadingContext);
  useLayoutEffect(
    () => (pending ? store?.begin() : undefined),
    [pending, store],
  );
}

const idle = () => false;
const noSubscription = () => () => {};
export function usePagePending() {
  const store = useContext(PageLoadingContext);
  return useSyncExternalStore(
    store?.subscribe ?? noSubscription,
    store?.getSnapshot ?? idle,
    idle,
  );
}

export function PageLoadingContent({ children }: { children: ReactNode }) {
  const pending = usePagePending();
  return (
    <LoadingSurface pending={pending} className="page-loading-content">
      {children}
    </LoadingSurface>
  );
}
