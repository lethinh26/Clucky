import React from 'react';
import styles from './order-shared.module.css';

interface CartBadgeProps {
  count: number;
  children?: React.ReactNode;
}

export function CartBadge({ count, children }: CartBadgeProps) {
  return (
    <div className={styles.cartBadgeWrapper}>
      {children}
      {count > 0 && (
        <span className={styles.cartBadge} aria-label={`${count} món trong giỏ hàng`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}
