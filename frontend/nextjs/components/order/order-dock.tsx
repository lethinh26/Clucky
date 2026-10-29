"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/ui-loader/navigation-link";
import { usePathname } from "next/navigation";
import { ShoppingBag, ArrowRight, Minus, Plus, Trash2, X } from "lucide-react";
import { formatPrice } from "@/lib/products";
import { isFloatingCartRoute } from "@/lib/order-demo";
import { useOrder } from "./order-provider";
import { OrderDialog } from "./order-dialog";
import { useNavigationPending } from "@/components/ui-loader";
import { FoodImage } from "./food-image";
import styles from "./order-experience.module.css";

function MiniCartContent({ onNavigate }: { onNavigate: () => void }) {
  const { items, count, subtotal, updateQuantity, removeItem } = useOrder();
  return (
    <>
      <div className={styles.miniCartScroll}>
        {!items.length ? (
          <div className={styles.miniEmpty}>
            <ShoppingBag size={38} />
            <h3>Giỏ hàng đang chờ món ngon</h3>
            <p>Chọn món yêu thích, Clucky sẽ giữ giúp bạn ở đây.</p>
            <Link href="/menu" onClick={onNavigate}>
              Khám phá thực đơn <ArrowRight size={16} />
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
                  {formatPrice(item.unitPrice)} / phần
                </span>
                <div className={styles.miniCartItemBottom}>
                  <div
                    className={styles.quickQuantity}
                    aria-label={`Số lượng ${item.name}`}
                  >
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, -1)}
                      aria-label={`Giảm ${item.name}`}
                    >
                      <Minus size={14} />
                    </button>
                    <output aria-live="polite">{item.quantity}</output>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, 1)}
                      aria-label={`Tăng ${item.name}`}
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
                aria-label={`Xóa ${item.name}`}
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
            <span>Tạm tính · {count} phần ăn</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <p>Phí giao hàng và ưu đãi được tính tại checkout.</p>
          <div className={styles.miniCartActions}>
            <Link
              href="/cart"
              onClick={onNavigate}
              className={styles.secondaryAction}
            >
              Xem giỏ hàng
            </Link>
            <Link
              href="/checkout"
              onClick={onNavigate}
              className={styles.primaryAction}
            >
              Thanh toán <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export function OrderDock() {
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
        aria-label="Giỏ hàng nhanh"
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
              <small>BỮA NGON TRONG TẦM TAY</small>
              <h2>Giỏ hàng của bạn</h2>
            </div>
            <button
              className={styles.iconAction}
              type="button"
              aria-label="Đóng xem nhanh giỏ hàng"
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
          aria-label={`Mở giỏ hàng nhanh, ${count} phần ăn`}
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
            <small>CHỌN THÊM MỘT CHÚT VUI</small>
            <h2 id={titleId}>
              Giỏ hàng của bạn <span>{count} phần</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng giỏ hàng nhanh"
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
