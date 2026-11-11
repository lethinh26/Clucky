"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type TouchEvent } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Link from "@/components/ui-loader/navigation-link";

export const AUTO_SLIDE_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD_PX = 48;

export interface BannerSlideItem {
  id: number | string;
  image: string;
  title: string;
  description?: string | null;
  redirectUrl?: string | null;
  alt?: string;
}

export function resolveSafeHref(raw?: string | null): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? null : trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

function SlideWrapper({
  href,
  ariaLabel,
  className,
  onClick,
  children,
}: {
  href: string | null;
  ariaLabel: string;
  className: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  children: ReactNode;
}) {
  if (!href) {
    return <div className={className}>{children}</div>;
  }
  if (href.startsWith("/")) {
    return (
      <Link href={href} aria-label={ariaLabel} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

export function BannerSlider({
  slides,
  intervalMs = AUTO_SLIDE_INTERVAL_MS,
  variant = "default",
}: {
  slides: BannerSlideItem[];
  intervalMs?: number;
  variant?: "default" | "hero";
}) {
  const t = useTranslations();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [interactionTick, setInteractionTick] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef(0);
  const didSwipeRef = useRef(false);

  const slideCount = slides.length;
  const safeIndex = slideCount > 0 ? activeIndex % slideCount : 0;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const handleVisibilityChange = () => {
      setIsTabHidden(document.hidden);
    };
    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (activeIndex >= slideCount && slideCount > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, slideCount]);

  const clearAutoTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearAutoTimer();
    if (slideCount <= 1 || isHovered || isTabHidden) {
      return clearAutoTimer;
    }
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, intervalMs);
    return clearAutoTimer;
  }, [slideCount, isHovered, isTabHidden, interactionTick, intervalMs, clearAutoTimer]);

  const selectSlide = useCallback(
    (nextIndex: number) => {
      if (slideCount <= 0) {
        return;
      }
      const normalized = ((nextIndex % slideCount) + slideCount) % slideCount;
      setActiveIndex(normalized);
      setInteractionTick((tick) => tick + 1);
    },
    [slideCount],
  );

  const goToPrev = useCallback(
    (event?: MouseEvent<HTMLButtonElement>) => {
      event?.stopPropagation();
      selectSlide(safeIndex - 1);
    },
    [safeIndex, selectSlide],
  );

  const goToNext = useCallback(
    (event?: MouseEvent<HTMLButtonElement>) => {
      event?.stopPropagation();
      selectSlide(safeIndex + 1);
    },
    [safeIndex, selectSlide],
  );

  const handleDotClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, index: number) => {
      event.stopPropagation();
      selectSlide(index);
    },
    [selectSlide],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (slideCount <= 1) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNext();
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (slideCount <= 1) {
      return;
    }
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
    touchDeltaXRef.current = 0;
    didSwipeRef.current = false;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) {
      return;
    }
    const currentX = event.touches[0]?.clientX ?? touchStartXRef.current;
    const delta = currentX - touchStartXRef.current;
    touchDeltaXRef.current = delta;
    if (Math.abs(delta) > 12) {
      didSwipeRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null) {
      return;
    }
    const delta = touchDeltaXRef.current;
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;

    if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
      if (delta < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    setTimeout(() => {
      didSwipeRef.current = false;
    }, 50);
  };

  const handleSlideClick = (event: MouseEvent<HTMLElement>) => {
    if (didSwipeRef.current) {
      event.preventDefault();
    }
  };

  if (slideCount === 0) {
    return null;
  }

  return (
    <div
      className={`banner-slider${variant === "hero" ? " banner-slider--hero" : ""}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("home.banners.carouselLabel")}
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="banner-slider-track"
        style={{ transform: `translate3d(-${safeIndex * 100}%, 0, 0)` }}
      >
        {slides.map((slide, index) => {
          const href = resolveSafeHref(slide.redirectUrl);
          const isCurrent = index === safeIndex;
          return (
            <SlideWrapper
              key={slide.id}
              href={href}
              ariaLabel={slide.alt || slide.title}
              className={`banner-slide${href ? " banner-slide--clickable" : ""}`}
              onClick={handleSlideClick}
            >
              <img
                src={slide.image}
                alt={slide.alt || slide.title}
                loading={index === 0 ? "eager" : "lazy"}
                draggable={false}
                className="banner-slide-img"
              />
              <div className="banner-slide-overlay" aria-hidden={!isCurrent}>
                <span className="banner-slide-eyebrow">
                  <Sparkles size={14} />
                  {t("home.banners.eyebrow")}
                </span>

                <h2 className="banner-slide-title">{slide.title}</h2>

                {slide.description && (
                  <p className="banner-slide-description">{slide.description}</p>
                )}

                {href && <span className="banner-slide-cta">{t("home.banners.cta")}</span>}
              </div>
            </SlideWrapper>
          );
        })}
      </div>

      {slideCount > 1 && (
        <>
          <button
            type="button"
            aria-label={t("home.banners.prev")}
            onClick={goToPrev}
            className="banner-slider-nav banner-slider-nav--prev"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            aria-label={t("home.banners.next")}
            onClick={goToNext}
            className="banner-slider-nav banner-slider-nav--next"
          >
            <ChevronRight size={20} />
          </button>

          <div className="banner-slider-dots" role="tablist" aria-label={t("home.banners.carouselLabel")}>
            {slides.map((slide, index) => {
              const active = index === safeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={t("home.banners.slideIndicator", { index: index + 1 })}
                  onClick={(event) => handleDotClick(event, index)}
                  className={`banner-slider-dot${active ? " active" : ""}`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

