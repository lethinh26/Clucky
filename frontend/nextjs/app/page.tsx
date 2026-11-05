import { getTranslations } from "next-intl/server";
import Link from "@/components/ui-loader/navigation-link";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product-card";
import { CategoryIcon } from "@/components/category-icon";
import { catalogApi } from "@/lib/catalog-and-stores.api";
import { Flame, Award, Truck } from "lucide-react";

export const dynamic = 'force-dynamic';

type DisplayCategory = { id: number; name: string };

export default async function Home() {
  const t = await getTranslations();
  let displayProducts: any[] = [];
  let liveCategories: { id: number; name: string }[] = [];

  try {
    const [prods, cats] = await Promise.all([
      catalogApi.getProducts({ activeOnly: true, page: 0, size: 9 }),
      catalogApi.getCategories(true),
    ]);
    displayProducts = prods;
    liveCategories = cats;
  } catch {
    displayProducts = [];
    liveCategories = [];
  }

  const displayCategories: DisplayCategory[] = [
    { id: 0, name: t("menu.categories.all") },
    ...liveCategories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
  ];

  const featuredProducts = displayProducts
    .filter((p) => p.isActive !== false)
    .slice(0, 9);

  return (
    <>
      <main>
        {/* Hero Section */}
        <Hero
          eyebrow={t("home.hero.eyebrow")}
          titleTop={t("home.hero.titleTop")}
          titleBottom={t("home.hero.titleBottom")}
          description={t("home.hero.description")}
          actions={[
            { href: "/menu", label: t("home.hero.order"), variant: "primary" },
            { href: "/menu", label: t("home.hero.menu"), variant: "secondary" },
          ]}
          imageSrc="/images/hero-img.avif"
          imageAlt={t("home.hero.imageAlt")}
        />

        {/* Floating Category Dock */}
        <section className="category-row-section" aria-label={t("menu.categories.label")}>
          <div className="category-dock">
            {displayCategories.map((cat) => (
              <Link
                key={cat.id}
                href={cat.id === 0 ? "/menu" : `/menu?cat=${cat.id}`}
                className={`category-pill ${cat.id === 0 ? "active" : ""}`}
              >
                <CategoryIcon id={cat.id} size={18} active={cat.id === 0} />
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Intro */}
        <section
          style={{
            width: "min(1240px, calc(100% - 64px))",
            margin: "0 auto 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <span
              style={{
                color: "#8F1216",
                fontFamily: "Baloo 2, sans-serif",
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {t("menu.title")}{" "}</span>
            <h2
              style={{
                fontFamily: "Baloo 2, sans-serif",
                fontWeight: 700,
                fontSize: "clamp(32px, 4vw, 46px)",
                color: "#16100D",
                margin: "6px 0 0",
                letterSpacing: "-0.03em",
              }}
            >
              {t("home.favourites")}{" "}</h2>
          </div>
          <Link
            href="/menu"
            style={{
              color: "#8F1216",
              fontFamily: "Quicksand, sans-serif",
              fontWeight: 700,
              fontSize: 15,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {t("home.fullMenu")}{" "}</Link>
        </section>

        {/* Featured Product Grid */}
        <section
          style={{
            width: "min(1240px, calc(100% - 64px))",
            margin: "0 auto 80px",
          }}
        >
          <div className="product-grid">
            {featuredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </section>

        {/* Brand Promise Section */}
        <section
          className="brand-promise"
          aria-label={t("home.promise.label")}
        >
          <div className="promise-card">
            <div className="promise-icon" style={{ color: "#8F1216" }}>
              <Flame size={28} />
            </div>
            <h3>{t("home.promise.crispyTitle")}</h3>
            <p>
              {t("home.promise.crispyDescription")}{" "}</p>
          </div>

          <div className="promise-card">
            <div className="promise-icon" style={{ color: "#C9A227" }}>
              <Award size={28} />
            </div>
            <h3>{t("home.promise.recipeTitle")}</h3>
            <p>
              {t("home.promise.recipeDescription")}{" "}</p>
          </div>

          <div className="promise-card">
            <div className="promise-icon" style={{ color: "#1E7A46" }}>
              <Truck size={28} />
            </div>
            <h3>{t("home.promise.deliveryTitle")}</h3>
            <p>
              {t("home.promise.deliveryDescription")}{" "}</p>
          </div>
        </section>
      </main>
    </>
  );
}
