"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";

import { FoodImage } from "@/components/order/food-image";
import Link from "@/components/ui-loader/navigation-link";
import Image from "next/image";
import { categories, type Product } from "@/lib/products";
import { Plus, Flame, Star } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  const t = useTranslations();
  const { money: formatPrice } = useLocaleTools();
  const categoryName = product.categoryName || product.category || "";
  const categoryKey = categories.find(category => category.name === categoryName)?.messageKey;
  const isSoldOut = product.isSoldOut || !product.isAvailable;

  return (
    <article className="product-card">
      <Link
        href={`/menu/${product.slug}`}
        className="product-card-media"
        aria-label={t("menu.product.view", { name: product.name })}
      >
        <FoodImage
          src={product.imageUrl || product.image}
          alt={product.alt || product.name}
          loading="lazy"
        />

        {product.isBestSeller && !isSoldOut && (
          <span className="badge-best-seller">
            <Star size={12} fill="currentColor" /> Best Seller
          </span>
        )}

        {isSoldOut && <span className="badge-sold-out">{t("menu.product.soldOut")}</span>}
      </Link>

      <div className="product-card-body">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span className="card-tag">
            {categoryKey ? t(categoryKey) : categoryName}
          </span>
          {product.spicyLevel > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                fontSize: 11,
                fontWeight: 700,
                color: product.spicyLevel >= 2 ? "#B42318" : "#D97706",
              }}
            >
              <Flame size={13} />
              {t(product.spicyLevel >= 2 ? "menu.spice.hot" : "menu.spice.medium")}
            </span>
          )}
        </div>

        <h2>
          <Link href={`/menu/${product.slug}`}>{product.name}</Link>
        </h2>

        <p>{product.description}</p>

        <div className="product-meta">
          <span className="price">
            {formatPrice(product.basePrice || product.price)}
          </span>
          <Link
            className="add-button"
            href={`/menu/${product.slug}`}
            aria-label={t("menu.product.customise", { name: product.name })}
          >
            <Plus size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
