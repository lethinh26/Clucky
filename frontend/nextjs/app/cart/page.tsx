"use client";

import Link from "@/components/ui-loader/navigation-link";
import { formatPrice } from "@/lib/products";
import { useOrder } from "@/components/order/order-provider";
import { useNavigationTask } from "@/components/ui-loader";
import { OrderProgress } from "@/components/order/order-progress";
import {
  ShoppingBag,
  ArrowRight,
  ChefHat,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import { FoodImage } from "@/components/order/food-image";
import styles from "./cart.module.css";

export default function CartPage() {
  const {
    items,
    count,
    subtotal,
    updateQuantity,
    removeItem,
    updateNote,
    ready,
  } = useOrder();
  useNavigationTask(!ready);

  return (
    <>
            <main className={`${styles.cartContainer} m3-page`}>
        <OrderProgress stage="cart" />
        <div className={styles.cartHeading}>
          <span className={styles.eyebrow}>Bữa ngon bắt đầu từ đây</span>
          <h1 className={styles.title}>
            Giỏ hàng của bạn
            <span className={styles.countPill}>{count} phần ăn</span>
          </h1>
          <p className={styles.subtitle}>
            {items.length > 0
              ? `Bạn đang có ${items.reduce((s, i) => s + i.quantity, 0)} món thơm ngon trong giỏ.`
              : "Giỏ hàng đang trống."}
          </p>
        </div>

        {!ready ? (
          <div className="order-skeleton" aria-hidden="true" />
        ) : items.length === 0 ? (
          <div className={styles.emptyCart}>
            <div className={styles.emptyEmoji} aria-hidden="true">
              <ShoppingBag size={52} />
            </div>
            <h2 className={styles.emptyTitle}>Chưa có món nào trong giỏ</h2>
            <p className={styles.emptyDesc}>
              Hãy chọn những phần gà rán vàng giòn và combo ưu đãi đặc biệt từ
              Clucky ngay nhé!
            </p>
            <Link href="/menu" className={styles.browseBtn}>
              Khám phá thực đơn ngay →
            </Link>
          </div>
        ) : (
          <div className={styles.cartGrid}>
            <section
              className={styles.itemsList}
              aria-label="Danh sách món trong giỏ hàng"
            >
              <div className={styles.listHeading}>
                <span>
                  <ChefHat size={18} /> Món ngon đã chọn
                </span>
                <Link href="/menu">
                  <Plus size={16} /> Thêm món
                </Link>
              </div>
              {items.map((item) => (
                <article className={styles.cartCard} key={item.id}>
                  <FoodImage
                    src={item.image}
                    alt={item.name}
                    className={styles.itemImage}
                  />

                  <div className={styles.itemDetails}>
                    <span className={styles.itemCategory}>{item.category}</span>
                    <h2 className={styles.itemName}>{item.name}</h2>
                    <p className={styles.itemUnitPrice}>
                      {formatPrice(item.unitPrice)} / phần
                    </p>

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
                        value={item.note || ""}
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

                    <div
                      className={styles.stepper}
                      role="group"
                      aria-label="Thay đổi số lượng"
                    >
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className={styles.stepperBtn}
                        aria-label={`Giảm ${item.name}`}
                      >
                        <Minus size={16} />
                      </button>
                      <span className={styles.stepperVal}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className={styles.stepperBtn}
                        aria-label={`Tăng ${item.name}`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className={styles.removeBtn}
                    >
                      <Trash2 size={13} /> Xóa món
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className={styles.summaryBox}>
              <div className={styles.receiptLabel}>BỮA NGON CỦA BẠN</div>
              <h2 className={styles.summaryTitle}>Tóm tắt đơn hàng</h2>

              <div className={styles.summaryRow}>
                <span>Tạm tính</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <div className={styles.summaryRow}>
                <span>Số lượng món</span>
                <strong>{count} phần</strong>
              </div>

              <hr className={styles.divider} />

              <div className={styles.summaryTotal}>
                <span>Tổng tạm tính</span>
                <strong className={styles.totalPrice}>
                  {formatPrice(subtotal)}
                </strong>
              </div>

              <Link href="/checkout" className={styles.checkoutBtn}>
                Thanh toán <ArrowRight size={18} />
              </Link>

              <p className={styles.summaryHint}>
                Phí giao hàng và ưu đãi sẽ được tính ở bước thanh toán.
              </p>
              <div className={styles.kitchenNote}>
                <ChefHat size={24} />
                <div>
                  <strong>Từ bếp, với cả sự chăm chút.</strong>
                  <p>Món được chuẩn bị sau khi đơn hàng được xác nhận.</p>
                </div>
              </div>
              <Link href="/menu" className={styles.continueShopping}>
                ← Tiếp tục chọn thêm món
              </Link>
            </aside>
          </div>
        )}
      </main>
          </>
  );
}
