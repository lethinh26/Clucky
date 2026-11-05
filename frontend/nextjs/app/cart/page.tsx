"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import Link from "@/components/ui-loader/navigation-link";
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
  const t = useTranslations();

  const { money: formatPrice } = useLocaleTools();
  const {
    items,
    count,
    subtotal,
    updateQuantity,
    removeItem,
    updateNote,
    ready,
    cartPending,
  } = useOrder();
  useNavigationTask(!ready);

  return (
    <>
            <main className={`${styles.cartContainer} m3-page`}>
        <OrderProgress stage="cart" />
        <div className={styles.cartHeading}>
          <span className={styles.eyebrow}>{t("business.cart.aDeliciousMealStartsHere")}</span>
          <h1 className={styles.title}> {t("business.cart.yourCart")} <span className={styles.countPill}>{count} {t("business.cart.servings")}</span>
          </h1>
          <p className={styles.subtitle}>
            {items.length > 0
              ? t("business.cart.youHaveDeliciousItemsInYourCart", { value1: items.reduce((s, i) => s + i.quantity, 0) })
              : t("business.cart.yourCartIsEmpty")}
          </p>
        </div>

        {!ready ? (
          <div className="order-skeleton" aria-hidden="true" />
        ) : items.length === 0 ? (
          <div className={styles.emptyCart}>
            <div className={styles.emptyEmoji} aria-hidden="true">
              <ShoppingBag size={52} />
            </div>
            <h2 className={styles.emptyTitle}>{t("business.cart.noItemsInYourCartYet")}</h2>
            <p className={styles.emptyDesc}> {t("business.cart.chooseGoldenCrispyChickenAndSpecialValueCombosFromClucky")} </p>
            <Link href="/menu" className={styles.browseBtn}> {t("business.cart.exploreTheMenuNow")} </Link>
          </div>
        ) : (
          <div className={styles.cartGrid}>
            <section
              className={styles.itemsList}
              aria-label={t("business.cart.cartItems")}
            >
              <div className={styles.listHeading}>
                <span>
                  <ChefHat size={18} /> {t("business.cart.yourChosenDishes")} </span>
                <Link href="/menu">
                  <Plus size={16} /> {t("business.cart.addItems")} </Link>
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
                      {formatPrice(item.unitPrice)} {t("business.cart.serving")} </p>

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
                        placeholder={t("business.cart.notesForTheRestaurantEGLessIceMediumSpice")}
                        key={`${item.id}-${item.note ?? ""}-${cartPending}`}
                        defaultValue={item.note || ""}
                        onBlur={(event) => {
                          if (event.target.value !== (item.note ?? "")) updateNote(item.id, event.target.value);
                        }}
                        disabled={cartPending}
                        className={styles.noteInput}
                        aria-label={t("business.cart.notesFor", { value1: item.name })}
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
                      aria-label={t("business.cart.changeQuantity")}
                    >
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={cartPending}
                        className={styles.stepperBtn}
                        aria-label={t("business.cart.decrease", { value1: item.name })}
                      >
                        <Minus size={16} />
                      </button>
                      <span className={styles.stepperVal}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        disabled={cartPending}
                        className={styles.stepperBtn}
                        aria-label={t("business.cart.increase", { value1: item.name })}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={cartPending}
                      className={styles.removeBtn}
                    >
                      <Trash2 size={13} /> {t("business.cart.removeItem")} </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className={styles.summaryBox}>
              <div className={styles.receiptLabel}>{t("business.cart.yourMeal")}</div>
              <h2 className={styles.summaryTitle}>{t("business.cart.orderSummary")}</h2>

              <div className={styles.summaryRow}>
                <span>{t("business.cart.subtotal")}</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <div className={styles.summaryRow}>
                <span>{t("business.cart.itemQuantity")}</span>
                <strong>{count} {t("business.cart.servings")}</strong>
              </div>

              <hr className={styles.divider} />

              <div className={styles.summaryTotal}>
                <span>{t("business.cart.subtotalAmount")}</span>
                <strong className={styles.totalPrice}>
                  {formatPrice(subtotal)}
                </strong>
              </div>

              <Link href="/checkout" className={styles.checkoutBtn}> {t("business.cart.checkout")} <ArrowRight size={18} />
              </Link>

              <p className={styles.summaryHint}> {t("business.cart.deliveryFeesAndDiscountsWillBeCalculatedAtCheckout")} </p>
              <div className={styles.kitchenNote}>
                <ChefHat size={24} />
                <div>
                  <strong>{t("business.cart.fromOurKitchenWithCare")}</strong>
                  <p>{t("business.cart.yourMealIsPreparedAfterYourOrderIsConfirmed")}</p>
                </div>
              </div>
              <Link href="/menu" className={styles.continueShopping}> {t("business.cart.continueShopping")} </Link>
            </aside>
          </div>
        )}
      </main>
          </>
  );
}
