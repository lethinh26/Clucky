"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/ui-loader/navigation-link";
import { usePathname } from "next/navigation";
import { ShoppingBag, ArrowRight, Minus, Plus, Trash2, X } from "lucide-react";
import { isFloatingCartRoute } from "@/lib/order-demo";
import { useOrder } from "./order-provider";
import { OrderDialog } from "./order-dialog";
import { useNavigationPending } from "@/components/ui-loader";
import { FoodImage } from "./food-image";
import styles from "./order-experience.module.css";

function MiniCartContent({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations();

  const { money: formatPrice } = useLocaleTools();
  const { items, count, subtotal, updateQuantity, removeItem } = useOrder();
  return (
    <>
      <div className={styles.miniCartScroll}>
        {!items.length ? (
          <div className={styles.miniEmpty}>
            <ShoppingBag size={38} />
            <h3>{t("business.orderdock.yourCartIsWaitingForSomethingDelicious")}</h3>
            <p>{t("business.orderdock.chooseYourFavouritesCluckyWillKeepThemHereForYou")}</p>
            <Link href="/menu" onClick={onNavigate}> {t("business.checkout.exploreTheMenu")} <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          items.map((item) => (
            <article className={styles.miniCartItem} key={item.id}>
              <FoodImage
                src={item.image}
                alt={item.name}
                width={64}
                height={64}
              />
              <div className={styles.miniCartItemInfo}>
                <strong>{item.name}</strong>
                <p>
                  {[
                    ...(item.options ?? []).map((option) => option.name),
                    ...(item.toppings ?? []).map((top) => `+ ${top.name}`),
                  ].join(" · ")}
                </p>
                {item.note && <p className={styles.miniNote}>{item.note}</p>}
                <span className={styles.miniUnitPrice}>
                  {formatPrice(item.unitPrice)} {t("business.cart.serving")} </span>
                <div className={styles.miniCartItemBottom}>
                  <div
                    className={styles.quickQuantity}
                    aria-label={t("business.orderdock.quantityFor", { value1: item.name })}
                  >
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, -1)}
                      aria-label={t("business.cart.decrease", { value1: item.name })}
                    >
                      <Minus size={14} />
                    </button>
                    <output aria-live="polite">{item.quantity}</output>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, 1)}
                      aria-label={t("business.cart.increase", { value1: item.name })}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
                </div>
              </div>
              <button
                type="button"
                className={styles.iconAction}
                onClick={() => removeItem(item.id)}
                aria-label={t("business.orderdock.remove", { value1: item.name })}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))
        )}
      </div>
      {items.length > 0 && (
        <div className={styles.miniCartFooter}>
          <div>
            <span>{t("business.orderdock.subtotal")} {count} {t("business.cart.servings")}</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <p>{t("business.orderdock.deliveryFeesAndDiscountsAreCalculatedAtCheckout")}</p>
          <div className={styles.miniCartActions}>
            <Link
              href="/cart"
              onClick={onNavigate}
              className={styles.secondaryAction}
            > {t("business.orderdock.viewCart")} </Link>
            <Link
              href="/checkout"
              onClick={onNavigate}
              className={styles.primaryAction}
            > {t("business.cart.checkout")} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export function OrderDock() {
  const t = useTranslations();

  const navigating = useNavigationPending();
  const { count, ready } = useOrder();
  const pathname = usePathname();
  const [preview, setPreview] = useState(false);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const previousCount = useRef(count);
  const titleId = useId();
  const previewId = useId();
  const visible = isFloatingCartRoute(pathname);
  useEffect(() => {
    setPreview(false);
    setOpen(false);
  }, [pathname, navigating]);
  useEffect(() => {
    let animation: Animation | undefined;
    if (
      count > previousCount.current &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      animation = button.current?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.12)" },
          { transform: "scale(1)" },
        ],
        { duration: 340, easing: "ease-out" },
      );
    }
    previousCount.current = count;
    return () => animation?.cancel();
  }, [count, visible]);
  if (!visible || !ready || navigating) return null;
  const close = () => {
    setOpen(false);
    setPreview(false);
  };
  return (
    <>
      <aside
        className={styles.floatingCart}
        aria-label={t("business.orderdock.quickCart")}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse" && !open) setPreview(true);
        }}
        onPointerLeave={() => {
          if (!panel.current?.contains(document.activeElement))
            setPreview(false);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setPreview(false);
        }}
      >
        <div
          ref={panel}
          className={styles.cartPreview}
          data-open={preview && !open}
          id={previewId}
          aria-hidden={!preview || open}
          inert={!preview || open}
        >
          <header>
            <div>
              <small>{t("business.orderdock.aGreatMealAtYourFingertips")}</small>
              <h2>{t("business.cart.yourCart")}</h2>
            </div>
            <button
              className={styles.iconAction}
              type="button"
              aria-label={t("business.orderdock.closeCartPreview")}
              onClick={() => setPreview(false)}
            >
              <X size={18} />
            </button>
          </header>
          <MiniCartContent onNavigate={close} />
        </div>
        <button
          ref={button}
          type="button"
          className={styles.cartFab}
          aria-label={t("business.orderdock.openQuickCartServings", { value1: count })}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            setPreview(false);
            setOpen(true);
          }}
        >
          <ShoppingBag size={24} />
          <span className={styles.fabBadge} aria-live="polite">
            {count > 99 ? "99+" : count}
          </span>
        </button>
      </aside>
      <OrderDialog
        open={open}
        onClose={close}
        titleId={titleId}
        className="mini-cart-dialog"
      >
        <header className={styles.drawerHeader}>
          <div>
            <small>{t("business.orderdock.addALittleMoreJoy")}</small>
            <h2 id={titleId}> {t("business.cart.yourCart")} <span>{count} {t("business.cart.servings")}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("business.orderdock.closeQuickCart")}
            className={styles.iconAction}
          >
            <X size={22} />
          </button>
        </header>
        <MiniCartContent onNavigate={close} />
      </OrderDialog>
    </>
  );
}
