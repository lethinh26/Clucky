'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CustomerFooter } from '@/components/customer-footer';
import { CustomerHeader } from '@/components/customer-header';
import { formatPrice } from '@/lib/products';
import { INITIAL_CART_ITEMS } from '@/lib/mock/order-mock-data';
import { CartItem } from '@/lib/types/order';
import styles from './cart.module.css';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>(INITIAL_CART_ITEMS);

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateNote = (id: string, note: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note } : item))
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const estimatedShipping = items.length > 0 ? 20000 : 0;
  const total = subtotal + estimatedShipping;

  return (
    <>
      <CustomerHeader />
      <main className={styles.cartContainer}>
        <div className={styles.cartHeading}>
          <span className={styles.eyebrow}>Đơn hàng của bạn</span>
          <h1 className={styles.title}>Giỏ hàng</h1>
          <p className={styles.subtitle}>
            {items.length > 0
              ? `Bạn đang có ${items.reduce((s, i) => s + i.quantity, 0)} món thơm ngon trong giỏ.`
              : 'Giỏ hàng đang trống.'}
          </p>
        </div>

        {items.length === 0 ? (
          <div className={styles.emptyCart}>
            <div className={styles.emptyEmoji} aria-hidden="true">
              🍗
            </div>
            <h2 className={styles.emptyTitle}>Chưa có món nào trong giỏ</h2>
            <p className={styles.emptyDesc}>
              Hãy chọn những phần gà rán vàng giòn và combo ưu đãi đặc biệt từ Clucky ngay nhé!
            </p>
            <Link href="/menu" className={styles.browseBtn}>
              Khám phá thực đơn ngay →
            </Link>
          </div>
        ) : (
          <div className={styles.cartGrid}>
            <section className={styles.itemsList} aria-label="Danh sách món trong giỏ hàng">
              {items.map((item) => (
                <article className={styles.cartCard} key={item.id}>
                  <img src={item.image} alt={item.name} className={styles.itemImage} />

                  <div className={styles.itemDetails}>
                    <span className={styles.itemCategory}>{item.category}</span>
                    <h2 className={styles.itemName}>{item.name}</h2>
                    <p className={styles.itemUnitPrice}>{formatPrice(item.unitPrice)} / phần</p>

                    {(item.options || item.toppings) && (
                      <div className={styles.addonsList}>
                        {item.options?.map((opt, i) => (
                          <span key={`opt-${i}`} className={styles.addonTag}>
                            {opt.groupName}: {opt.name}
                          </span>
                        ))}
                        {item.toppings?.map((top, i) => (
                          <span key={`top-${i}`} className={styles.addonTag}>
                            +{top.name} (+{formatPrice(top.extraPrice)})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className={styles.noteInputWrapper}>
                      <input
                        type="text"
                        placeholder="Ghi chú thêm cho quán (VD: ít đá, cay vừa)..."
                        value={item.note || ''}
                        onChange={(e) => updateNote(item.id, e.target.value)}
                        className={styles.noteInput}
                        aria-label={`Ghi chú cho món ${item.name}`}
                      />
                    </div>
                  </div>

                  <div className={styles.itemRight}>
                    <strong className={styles.lineTotal}>
                      {formatPrice(item.unitPrice * item.quantity)}
                    </strong>

                    <div className={styles.stepper} role="group" aria-label="Thay đổi số lượng">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className={styles.stepperBtn}
                        aria-label="Giảm 1"
                      >
                        −
                      </button>
                      <span className={styles.stepperVal}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className={styles.stepperBtn}
                        aria-label="Tăng 1"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className={styles.removeBtn}
                    >
                      Xóa món
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className={styles.summaryBox}>
              <h2 className={styles.summaryTitle}>Tóm tắt đơn hàng</h2>

              <div className={styles.summaryRow}>
                <span>Tạm tính</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <div className={styles.summaryRow}>
                <span>Phí giao hàng ước tính</span>
                <strong>{formatPrice(estimatedShipping)}</strong>
              </div>

              <hr className={styles.divider} />

              <div className={styles.summaryTotal}>
                <span>Tổng thanh toán</span>
                <strong className={styles.totalPrice}>{formatPrice(total)}</strong>
              </div>

              <Link href="/checkout" className={styles.checkoutBtn}>
                Tiến hành đặt hàng →
              </Link>

              <Link href="/menu" className={styles.continueShopping}>
                ← Tiếp tục chọn thêm món
              </Link>
            </aside>
          </div>
        )}
      </main>
      <CustomerFooter />
    </>
  );
}
