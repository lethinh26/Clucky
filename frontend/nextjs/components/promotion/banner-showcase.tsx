"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, EyeOff, X } from "lucide-react";
import Link from "@/components/ui-loader/navigation-link";
import { subscribeSession } from "@/lib/session";
import type { PromoBanner } from "@/lib/types/promotion";
import { BannerSlider, resolveSafeHref, type BannerSlideItem } from "./banner-slider";

const DISMISSED_POPUPS_STORAGE_KEY = "clucky_dismissed_popup_banners_v1";

function readDismissedPopupIds(): number[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(DISMISSED_POPUPS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

function persistDismissedPopupId(id: number): number[] {
  const existing = readDismissedPopupIds();
  if (existing.includes(id)) {
    return existing;
  }
  const next = [...existing, id];
  try {
    window.localStorage.setItem(DISMISSED_POPUPS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota or private mode restrictions.
  }
  return next;
}

function BannerActionLink({
  href,
  label,
  className,
  style,
}: {
  href: string | null;
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (!href) {
    return null;
  }
  const content = (
    <>
      <span>{label}</span>
      <ArrowRight size={15} aria-hidden="true" />
    </>
  );
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} style={style}>
        {content}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
      {content}
    </a>
  );
}

export function BannerShowcase({
  banners,
  showHero = true,
}: {
  banners: PromoBanner[];
  showHero?: boolean;
}) {
  const t = useTranslations();
  const [storageReady, setStorageReady] = useState(false);
  const [hiddenPopupIds, setHiddenPopupIds] = useState<number[]>([]);
  const [dismissedPopupId, setDismissedPopupId] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const syncDismissed = () => {
      setHiddenPopupIds(readDismissedPopupIds());
    };
    syncDismissed();
    setStorageReady(true);

    const unsubscribe = subscribeSession(() => {
      syncDismissed();
      setDismissedPopupId(null);
    });
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DISMISSED_POPUPS_STORAGE_KEY || event.key === "clucky-customer-session-change") {
        syncDismissed();
        setDismissedPopupId(null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const heroSlides: BannerSlideItem[] = showHero
    ? banners
        .filter((item) => item.position === "HERO_HOME")
        .map((item) => ({
          id: item.id,
          image: item.imageUrl,
          title: item.title,
          redirectUrl: item.linkUrl,
          alt: item.title,
        }))
    : [];

  const popupBanner = banners.find((item) => item.position === "POPUP") ?? null;
  const popupVisible = Boolean(
    storageReady
      && popupBanner
      && dismissedPopupId !== popupBanner.id
      && !hiddenPopupIds.includes(popupBanner.id),
  );
  const popupHref = resolveSafeHref(popupBanner?.linkUrl);

  const dismissPopup = useCallback(
    (persist = false) => {
      if (!popupBanner || isClosing) {
        return;
      }
      if (persist) {
        setHiddenPopupIds(persistDismissedPopupId(popupBanner.id));
      }
      setIsClosing(true);
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
      }
      const targetId = popupBanner.id;
      closeTimerRef.current = setTimeout(() => {
        setDismissedPopupId(targetId);
        setIsClosing(false);
      }, 180);
    },
    [isClosing, popupBanner],
  );

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!popupVisible) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissPopup(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismissPopup, popupVisible]);

  if (banners.length === 0 || (heroSlides.length === 0 && !popupVisible)) {
    return null;
  }

  return (
    <>
      {heroSlides.length > 0 && (
        <section className="banner-showcase-section" aria-label={t("home.banners.eyebrow")}>
          <BannerSlider slides={heroSlides} />
        </section>
      )}

      {popupBanner && popupVisible && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={popupBanner.title}
          className={`banner-popup-backdrop${isClosing ? " banner-popup-backdrop--closing" : ""}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              dismissPopup(false);
            }
          }}
        >
          <div className={`banner-popup-card${isClosing ? " banner-popup-card--closing" : ""}`}>
            <button
              type="button"
              aria-label={t("home.banners.close")}
              className="banner-popup-close"
              onClick={() => dismissPopup(false)}
            >
              <X size={20} />
            </button>

            <div className="banner-popup-media">
              <button
                type="button"
                className="banner-popup-dont-show"
                onClick={() => dismissPopup(true)}
              >
                <EyeOff size={13} aria-hidden="true" />
                <span>{t("home.banners.dontShowAgain")}</span>
              </button>

              <img
                src={popupBanner.imageUrl}
                alt={popupBanner.title}
                className="banner-popup-img"
              />

              <div className="banner-popup-overlay">
                <h3 className="banner-popup-title">{popupBanner.title}</h3>
                <BannerActionLink
                  href={popupHref}
                  label={t("home.banners.cta")}
                  className="banner-popup-cta"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
