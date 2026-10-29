"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { UtensilsCrossed } from "lucide-react";
import styles from "./loading-surface.module.css";

export function useDelayedLoading(pending: boolean, delay = 180) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [pending, delay]);
  // Completion never waits for an animation or for the effect cleanup.
  return pending && visible;
}

type Geometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  x: number;
  y: number;
  compact: boolean;
};

/** Content owns the blocking region; the portal is anchored to the visual viewport. */
export function LoadingSurface({
  pending,
  children,
  className,
  message = "Đang tải…",
}: {
  pending: boolean;
  children: ReactNode;
  className?: string;
  message?: string;
}) {
  const region = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const visible = useDelayedLoading(pending);
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  useLayoutEffect(() => {
    const body = content.current;
    if (!body || !pending) return;
    const focused = document.activeElement;
    const ownedFocus = focused instanceof HTMLElement && body.contains(focused);
    const anchor = region.current;
    if (ownedFocus) anchor?.focus({ preventScroll: true });
    body.inert = true;
    return () => {
      body.inert = false;
      if (
        ownedFocus &&
        focused.isConnected &&
        (document.activeElement === anchor ||
          document.activeElement === document.body)
      ) {
        focused.focus({ preventScroll: true });
      }
    };
  }, [pending]);

  useLayoutEffect(() => {
    if (!visible) {
      setGeometry(null);
      return;
    }
    let frame = 0;
    function measure() {
      frame = 0;
      const box = region.current?.getBoundingClientRect();
      if (!box) return;
      const viewport = window.visualViewport;
      const vx = viewport?.offsetLeft ?? 0;
      const vy = viewport?.offsetTop ?? 0;
      const vw = viewport?.width ?? document.documentElement.clientWidth;
      const vh = viewport?.height ?? window.innerHeight;
      let left = Math.max(vx, box.left),
        top = Math.max(vy, box.top);
      let right = Math.min(vx + vw, box.right),
        bottom = Math.min(vy + vh, box.bottom);
      document
        .querySelectorAll<HTMLElement>("[data-loading-shell]")
        .forEach((element) => {
          const shell = element.getBoundingClientRect();
          if (
            !shell.width ||
            !shell.height ||
            shell.right <= left ||
            shell.left >= right ||
            shell.bottom <= top ||
            shell.top >= bottom
          )
            return;
          switch (element.dataset.loadingShell) {
            case "top":
              top = Math.max(top, shell.bottom);
              break;
            case "bottom":
              bottom = Math.min(bottom, shell.top);
              break;
            case "left":
              left = Math.max(left, shell.right);
              break;
            case "right":
              right = Math.min(right, shell.left);
              break;
          }
        });
      const width = Math.max(0, right - left),
        height = Math.max(0, bottom - top);
      const compact = height < 210 || width < 280;
      const cw = Math.min(
        card.current?.offsetWidth ?? 260,
        Math.max(0, width - 16),
      );
      const ch = Math.min(
        card.current?.offsetHeight ?? (compact ? 64 : 168),
        Math.max(0, height - 16),
      );
      const clamp = (value: number, start: number, end: number) =>
        end < start ? (start + end) / 2 : Math.max(start, Math.min(value, end));
      const next = {
        left,
        top,
        width,
        height,
        compact,
        x: clamp(vx + vw / 2, left + cw / 2 + 8, right - cw / 2 - 8) - left,
        y: clamp(vy + vh / 2, top + ch / 2 + 8, bottom - ch / 2 - 8) - top,
      };
      setGeometry((old) =>
        old &&
        Object.keys(next).every(
          (key) => old[key as keyof Geometry] === next[key as keyof Geometry],
        )
          ? old
          : next,
      );
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    if (region.current) observer.observe(region.current);
    if (card.current) observer.observe(card.current);
    document
      .querySelectorAll("[data-loading-shell]")
      .forEach((element) => observer.observe(element));
    measure();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [visible]);

  return (
    <div
      ref={region}
      className={className}
      data-loading-region=""
      aria-busy={pending}
      tabIndex={-1}
    >
      <div ref={content} className={styles.content}>
        {children}
      </div>
      {visible &&
        createPortal(
          <>
            <div className={styles.progress} aria-hidden="true">
              <span />
            </div>
            <div
              className={styles.overlay}
              data-page-loader=""
              style={
                geometry
                  ? {
                      left: geometry.left,
                      top: geometry.top,
                      width: geometry.width,
                      height: geometry.height,
                    }
                  : { visibility: "hidden" }
              }
            >
              <div
                ref={card}
                className={styles.card}
                data-compact={geometry?.compact || undefined}
                style={
                  geometry ? { left: geometry.x, top: geometry.y } : undefined
                }
                role="status"
                aria-live="polite"
                aria-label={message}
              >
                <div className={styles.spinner} aria-hidden="true">
                  <span />
                  <UtensilsCrossed size={22} />
                </div>
                <div>
                  <p className={styles.message}>{message}</p>
                  <p className={styles.hint}>Vui lòng chờ trong giây lát</p>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
