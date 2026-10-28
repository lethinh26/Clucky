"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import styles from "./navigation-loader.module.css";

interface NavigationLoaderContextValue {
  isLoading: boolean;
  message: string | null;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
}

const NavigationLoaderContext = createContext<NavigationLoaderContextValue>({
  isLoading: false,
  message: null,
  startLoading: () => {},
  stopLoading: () => {},
});

export function useNavigationLoader() {
  return useContext(NavigationLoaderContext);
}

function NavigationWatcher({
  onRouteChanged,
}: {
  onRouteChanged: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = `${pathname}?${searchParams.toString()}`;
  const initialRef = useRef(currentPath);

  useEffect(() => {
    if (initialRef.current !== currentPath) {
      initialRef.current = currentPath;
      onRouteChanged();
    }
  }, [currentPath, onRouteChanged]);

  return null;
}

/**
 * Shared context-driven Content Loader component.
 * Placed inside the rendered content container, covering ONLY that content area
 * while leaving header and footer outside and fully accessible.
 */
export function ContentLoaderOverlay({
  className,
}: {
  className?: string;
}) {
  const { isLoading, message } = useNavigationLoader();
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => setShowOverlay(true), 180);
    } else {
      setShowOverlay(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (!isLoading || !showOverlay) return null;

  return (
    <div
      className={`${styles.contentLoaderOverlay} ${className || ""}`}
      role="status"
      aria-live="polite"
      aria-label={message || "Đang tải…"}
    >
      <div className={styles.loaderCard}>
        <div className={styles.spinnerWrapper}>
          <div className={styles.spinnerRing} />
          <UtensilsCrossed size={22} className={styles.spinnerIcon} />
        </div>
        <p className={styles.loaderMessage}>{message || "Đang tải…"}</p>
        <p className={styles.loaderHint}>Vui lòng chờ trong giây lát</p>
      </div>
    </div>
  );
}

export function NavigationLoaderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutGuardRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (timeoutGuardRef.current) clearTimeout(timeoutGuardRef.current);
    progressTimerRef.current = null;
    timeoutGuardRef.current = null;
  }, []);

  const stopLoading = useCallback(() => {
    clearTimers();
    setProgress(100);
    // Smooth transition out
    setTimeout(() => {
      setIsLoading(false);
      setMessage(null);
      setProgress(0);
    }, 250);
  }, [clearTimers]);

  const startLoading = useCallback(
    (customMessage?: string) => {
      clearTimers();
      setMessage(customMessage || "Đang tải…");
      setIsLoading(true);
      setProgress(25);

      // Smooth progress animation crawl
      progressTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) return prev;
          const diff = Math.random() * 10;
          return Math.min(prev + diff, 85);
        });
      }, 200);

      // Safety timeout guard (max 8 seconds)
      timeoutGuardRef.current = setTimeout(() => {
        stopLoading();
      }, 8000);
    },
    [clearTimers, stopLoading],
  );

  // Global click listener for internal navigation links
  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      // Ignore modified clicks
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Check if internal navigation
        if (targetUrl.origin === currentUrl.origin) {
          const currentPath = currentUrl.pathname + currentUrl.search;
          const targetPath = targetUrl.pathname + targetUrl.search;

          if (currentPath !== targetPath) {
            startLoading();
          }
        }
      } catch {
        // Ignore URL parsing errors
      }
    };

    const handlePopState = () => {
      startLoading("Đang chuyển trang…");
    };

    document.addEventListener("click", handleLinkClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);
      window.removeEventListener("popstate", handlePopState);
      clearTimers();
    };
  }, [clearTimers, startLoading]);

  return (
    <NavigationLoaderContext.Provider
      value={{
        isLoading,
        message,
        startLoading,
        stopLoading,
      }}
    >
      <Suspense fallback={null}>
        <NavigationWatcher onRouteChanged={stopLoading} />
      </Suspense>

      {/* Top Progress Bar: subtle 3px line at top of viewport, pointer-events none */}
      {isLoading && (
        <div className={styles.progressBarContainer} aria-hidden="true">
          <div
            className={styles.progressBar}
            style={{
              width: `${progress}%`,
              opacity: progress === 100 ? 0 : 1,
            }}
          />
        </div>
      )}

      {children}
    </NavigationLoaderContext.Provider>
  );
}
