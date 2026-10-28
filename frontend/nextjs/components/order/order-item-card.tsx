import React from 'react';
import { formatPrice } from '@/lib/products';
import { CartItemOption, CartItemTopping } from '@/lib/types/order';
import styles from './order-shared.module.css';

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
  return (
    <article className={styles.itemCard}>
      <img src={image} alt={name} className={styles.itemImage} />
      <div className={styles.itemInfo}>
        {category && <span className={styles.itemTag}>{category}</span>}
        <h3 className={styles.itemName}>{name}</h3>
        <p className={styles.itemMeta}>
          {formatPrice(unitPrice)} × {quantity} phần
        </p>

        {(options.length > 0 || toppings.length > 0) && (
          <div className={styles.itemAddons}>
            {options.map((opt, idx) => (
              <span key={`opt-${idx}`} className={styles.addonChip}>
                {opt.groupName}: {opt.name}
                {opt.extraPrice > 0 ? ` (+${formatPrice(opt.extraPrice)})` : ''}
              </span>
            ))}
            {toppings.map((top, idx) => (
              <span key={`top-${idx}`} className={styles.addonChip}>
                +{top.name} (+{formatPrice(top.extraPrice)})
              </span>
            ))}
          </div>
        )}

        {note && <p className={styles.itemNote}>Ghi chú: {note}</p>}
      </div>

      <div className={styles.itemPriceCol}>
        <strong className={styles.itemPrice}>{formatPrice(lineTotal)}</strong>
        {actions && <div className={styles.itemActions}>{actions}</div>}
      </div>
    </article>
  );
}
