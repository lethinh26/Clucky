"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import Link from "@/components/ui-loader/navigation-link";
import type { PromoBanner } from "@/lib/types/promotion";
import { BannerSlider, resolveSafeHref, type BannerSlideItem } from "./banner-slider";

function BannerActionLink({
  href,
  label,
  style,
}: {
  href: string | null;
  label: string;
  style?: CSSProperties;
}) {
  if (!href) {
    return null;
  }
  if (href.startsWith("/")) {
    return (
      <Link href={href} style={style}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
      {label}
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
  const [popupDismissed, setPopupDismissed] = useState(false);

  if (banners.length === 0) {
    return null;
  }

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

  const stripBanners = banners.filter((item) => item.position === "PROMO_STRIP");
  const popupBanner = banners.find((item) => item.position === "POPUP") ?? null;
  const popupHref = resolveSafeHref(popupBanner?.linkUrl);

  return (
    <>
      {(heroSlides.length > 0 || stripBanners.length > 0) && (
        <section className="banner-showcase-section" aria-label={t("home.banners.eyebrow")}>
          {heroSlides.length > 0 && <BannerSlider slides={heroSlides} />}

          {stripBanners.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {stripBanners.map((banner) => {
                const stripHref = resolveSafeHref(banner.linkUrl);
                return (
                  <div
                    key={banner.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: 12,
                      borderRadius: 18,
                      background: "#FFFAF3",
                      border: "1px solid rgba(143, 18, 22, 0.14)",
                      boxShadow: "0 8px 20px rgba(22, 16, 13, 0.05)",
                    }}
                  >
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      loading="lazy"
                      style={{
                        width: 96,
                        height: 68,
                        borderRadius: 12,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: "0 0 6px",
                          color: "#16100D",
                          fontFamily: "Baloo 2, sans-serif",
                          fontWeight: 700,
                          fontSize: 16,
                          lineHeight: 1.25,
                        }}
                      >
                        {banner.title}
                      </p>
                      <BannerActionLink
                        href={stripHref}
                        label={t("home.banners.cta")}
                        style={{
                          color: "#8F1216",
                          fontFamily: "Quicksand, sans-serif",
                          fontWeight: 700,
                          fontSize: 13,
                          textDecoration: "none",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {popupBanner && !popupDismissed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={popupBanner.title}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(22, 16, 13, 0.65)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "min(520px, 100%)",
              borderRadius: 24,
              overflow: "hidden",
              background: "#FFFAF3",
              border: "2px solid rgba(201, 162, 39, 0.55)",
              boxShadow: "0 24px 60px rgba(22, 16, 13, 0.35)",
            }}
          >
            <button
              type="button"
              aria-label={t("home.banners.close")}
              onClick={() => setPopupDismissed(true)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "none",
                background: "rgba(22, 16, 13, 0.72)",
                color: "#FFFAF3",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>

            <img
              src={popupBanner.imageUrl}
              alt={popupBanner.title}
              style={{
                width: "100%",
                maxHeight: 300,
                objectFit: "cover",
                display: "block",
              }}
            />

            <div
              style={{
                padding: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#16100D",
                  fontFamily: "Baloo 2, sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                }}
              >
                {popupBanner.title}
              </h3>

              <BannerActionLink
                href={popupHref}
                label={t("home.banners.cta")}
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "#8F1216",
                  color: "#FFFAF3",
                  fontFamily: "Quicksand, sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
