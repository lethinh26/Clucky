"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";

import React from "react";
import { CartItemOption, CartItemTopping } from "@/lib/types/order";
import { FoodImage } from "@/components/order/food-image";
import styles from "./order-shared.module.css";

interface OrderItemCardProps {
  image: string;
  name: string;
  category?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options?: CartItemOption[];
  toppings?: CartItemTopping[];
  note?: string;
  actions?: React.ReactNode;
}

export function OrderItemCard({
  image,
  name,
  category,
  unitPrice,
  quantity,
  lineTotal,
  options = [],
  toppings = [],
  note,
  actions,
}: OrderItemCardProps) {
  const t = useTranslations();

  const { money: formatPrice } = useLocaleTools();
  const safeOptions = Array.isArray(options) ? options : [];
  const safeToppings = Array.isArray(toppings) ? toppings : [];
  return (
    <article className={styles.itemCard}>
      <FoodImage src={image} alt={name} className={styles.itemImage} />
      <div className={styles.itemInfo}>
        {category && <span className={styles.itemTag}>{category}</span>}
        <h3 className={styles.itemName}>{name}</h3>
        <p className={styles.itemMeta}>
          {formatPrice(unitPrice)} × {quantity} {t("business.cart.servings")} </p>

        {(safeOptions.length > 0 || safeToppings.length > 0) && (
          <div className={styles.itemAddons}>
            {safeOptions.map((opt, idx) => (
              <span key={`opt-${idx}`} className={styles.addonChip}>
                {opt.groupName ? `${opt.groupName}: ${opt.name}` : opt.name}
                {opt.extraPrice > 0 ? ` (+${formatPrice(opt.extraPrice)})` : ""}
              </span>
            ))}
            {safeToppings.map((top, idx) => (
              <span key={`top-${idx}`} className={styles.addonChip}>
                +{top.name} (+{formatPrice(top.extraPrice)})
              </span>
            ))}
          </div>
        )}

        {note && <p className={styles.itemNote}>{t("business.orderitemcard.note")} {note}</p>}
      </div>

      <div className={styles.itemPriceCol}>
        <strong className={styles.itemPrice}>{formatPrice(lineTotal)}</strong>
        {actions && <div className={styles.itemActions}>{actions}</div>}
      </div>
    </article>
  );
}
