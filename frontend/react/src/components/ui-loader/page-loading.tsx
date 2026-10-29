import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { createLoadingStore, type LoadingStore } from "./loading-store";
import { LoadingSurface } from "./loading-surface";

const PageLoadingContext = createContext<LoadingStore | null>(null);

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  // Preserve shell state, but give every route/role/store its own request scope.
  const store = useMemo(createLoadingStore, [
    pathname,
    search,
    user.role,
    user.storeId,
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
