import React, { memo, useDeferredValue, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Search,
  Utensils,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  Loader2,
  Check,
  Flame,
  Lock,
  Clock,
} from "lucide-react";
import {
  POS_CATEGORIES,
  type PosProduct,
  type PosCartItem,
  type PosCartItemOption,
} from "../../../mocks/mockPosCatalog";
import type { DiningOption, PaymentMethod, StaffOrder } from "../../../mocks/mockStaffOrders";
import { useAuth } from "../../../context/AuthContext";
import { useOrders } from "../../../context/OrderContext";
import { message } from "../../../components/feedback";
import {
  catalogApi,
  getErrorMessage,
  ordersApi,
  paymentsApi,
  type CounterOrderItemPayload,
  type CreateCounterOrderPayload,
} from "../../../lib/api";
import styles from "./counter-order.module.css";
import { FoodImage } from "../../../components/ui/FoodImage";
import { posUnavailableReason } from "../../../lib/pos-availability";

interface CounterOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitOrder?: (order: Partial<StaffOrder>) => Promise<void> | void;
  onSuccess?: (created?: any) => Promise<void> | void;
  existingOrderCount?: number;
}

const currencyFormatter = new Intl.NumberFormat("vi-VN");
const formatVnd = (val: number) => {
  return currencyFormatter.format(val) + " đ";
};

const CounterProductCard = memo(function CounterProductCard({ product, storeReason, onSelect }: {
  product: PosProduct; storeReason?: string; onSelect: (product: PosProduct) => void;
}) {
  const { t } = useTranslation();
  const reason = storeReason || (product.unavailableReason ? t(`business:posAvailability.${product.unavailableReason}`) : undefined);
  const disabled = !product.inStock || !!storeReason;
  return <button type="button" disabled={disabled} className={`${styles.productCard} ${disabled ? styles.productCardSoldOut : ''}`}
    onClick={() => onSelect(product)} title={reason || product.name}>
    <div className={styles.imageContainer}>
      <FoodImage src={product.image} alt={product.name} className={styles.productImage} />
      {product.badge && !disabled && <span className={`${styles.productBadge} ${styles.badgeHot}`}>{product.badge}</span>}
    </div>
    <div className={styles.productCardBody}>
      <div className={styles.productName}>{product.name}</div><div className={styles.productPrice}>{formatVnd(product.price)}</div>
      {disabled ? <span className={styles.unavailableReason}><Lock size={12} />{reason || t('business:posAvailability.branchDisabled')}</span>
        : !!product.optionGroups?.length && <div className={styles.customizableHint}>{t('business:posUi.options')}</div>}
    </div>
  </button>;
});

export const CounterOrderModal: React.FC<CounterOrderModalProps> = ({
  open,
  onClose,
  onSubmitOrder,
  onSuccess,
  existingOrderCount = 0,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentStore, storeOpenState } = useOrders();
  // 1. Filter states
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const deferredSearch = useDeferredValue(searchQuery);

  // 2. Cart states
  const [diningOption, setDiningOption] = useState<DiningOption>("DINE_IN");
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [orderNote, setOrderNote] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCashCollected, setIsCashCollected] = useState<boolean>(true);
  const [cashTenderedInput, setCashTenderedInput] = useState<number>(0);

  // 3. Option Customization Modal state
  const [customizingProduct, setCustomizingProduct] = useState<PosProduct | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [customizingQty, setCustomizingQty] = useState<number>(1);

  // Search input ref to auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Danh mục sản phẩm POS lấy từ backend catalog-store-service
  const [posProducts, setPosProducts] = useState<PosProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogRevision, setCatalogRevision] = useState(0);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    setCatalogLoading(true); setCatalogError(''); setPosProducts([]);

    const loadBackendCatalog = async () => {
      try {
        const effectiveStoreId = user?.storeId ? Number(user.storeId) : currentStore?.id;
        if (!effectiveStoreId) throw new Error(t('business:posUi.noBranch'));
        const [productsData, combosData] = await Promise.all([
          catalogApi.listProducts({ storeId: effectiveStoreId, activeOnly: true }, controller.signal),
          catalogApi.listCombos(true, controller.signal),
        ]);

        if (!active) return;

        const convertedProducts: PosProduct[] = [];

        const rawProducts = Array.isArray(productsData)
          ? productsData
          : Array.isArray((productsData as any)?.content)
            ? (productsData as any).content
            : [];
        const rawCombos = Array.isArray(combosData)
          ? combosData
          : Array.isArray((combosData as any)?.content)
            ? (combosData as any).content
            : [];

        // Chuyển đổi sản phẩm đơn từ backend
        if (rawProducts.length > 0) {
          rawProducts.forEach((p: any) => {
            let category: PosProduct["category"] = "CHICKEN";
            const nameLower = (p.name || "").toLowerCase();
            const catNameLower = (p.categoryName || "").toLowerCase();

            if (
              p.categoryId === 2 ||
              catNameLower.includes("burger") ||
              catNameLower.includes("cơm") ||
              nameLower.includes("burger") ||
              nameLower.includes("cơm")
            ) {
              category = "BURGER_RICE";
            } else if (
              p.categoryId === 4 ||
              p.categoryId === 5 ||
              catNameLower.includes("nước") ||
              catNameLower.includes("tráng miệng") ||
              nameLower.includes("trà") ||
              nameLower.includes("nước") ||
              nameLower.includes("khoai tây")
            ) {
              category = "DESSERT_DRINK";
            } else if (p.categoryId === 1 || catNameLower.includes("gà")) {
              category = "CHICKEN";
            }

            convertedProducts.push({
              id: String(p.id),
              name: p.name,
              category,
              price: p.basePrice,
              image: p.imageUrl || '',
              inStock: !posUnavailableReason(p),
              unavailableReason: posUnavailableReason(p),
              badge: p.isBestSeller ? "Bán chạy" : undefined,
              description: p.description,
              optionGroups:
                p.options && p.options.length > 0
                  ? p.options.map((opt: any) => ({
                      id: opt.id,
                      name: opt.name,
                      required: opt.required,
                      choices: opt.choices.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        extraPrice: c.priceAdjustment || 0,
                      })),
                    }))
                  : undefined,
            });
          });
        }

        // Chuyển đổi Combo từ backend
        if (rawCombos.length > 0) {
          const availableProducts = new Set(convertedProducts.filter(product => product.inStock).map(product => product.id));
          rawCombos.forEach((c: any) => {
            const unavailableReason = posUnavailableReason(c) || (!c.items?.length || c.items.some((item: { productId: number }) => !availableProducts.has(String(item.productId))) ? 'comboUnavailable' : undefined);
            convertedProducts.push({
              id: `combo-${c.id}`,
              name: c.name,
              category: "COMBO",
              price: c.comboPrice,
              image: c.imageUrl || '',
              inStock: !unavailableReason,
              unavailableReason,
              badge: "Combo Tiết Kiệm",
              description:
                c.description ||
                c.items?.map((it: any) => `${it.quantity}x ${it.productName}`).join(" + "),
            });
          });
        }

        setPosProducts(convertedProducts);
      } catch (err) {
        if (active) { setPosProducts([]); setCatalogError(getErrorMessage(err)); }
      } finally {
        if (active) setCatalogLoading(false);
      }
    };

    loadBackendCatalog();
    return () => {
      active = false;
      controller.abort();
    };
  }, [open, user?.storeId, currentStore?.id, catalogRevision, t]);

  // Reset cart when modal reopens
  useEffect(() => {
    if (open) {
      setCartItems([]);
      setOrderNote("");
      setDiningOption("DINE_IN");
      setPaymentMethod("CASH");
      setIsCashCollected(true);
      setCashTenderedInput(0);
      setIsSubmitting(false);
      setCustomizingProduct(null);
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => window.clearTimeout(timer);
    }
  }, [open, user?.storeId, currentStore?.id]);

  const addItemToCart = useCallback((
    product: PosProduct,
    options: PosCartItemOption[],
    optionsSummary: string,
    quantity: number,
  ) => {
    const extraPriceTotal = options.reduce((sum, opt) => sum + opt.extraPrice, 0);
    const unitPrice = product.price + extraPriceTotal;
    const cartItemId = `${product.id}-${options.map((o) => o.choiceId).sort().join("-") || "standard"}`;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.id === cartItemId);
      if (existingIdx > -1) {
        const next = [...prev];
        const newQty = next[existingIdx].quantity + quantity;
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: newQty,
          lineTotal: newQty * unitPrice,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: cartItemId,
          productId: product.id,
          name: product.name,
          unitPrice,
          quantity,
          options,
          optionsSummary,
          lineTotal: unitPrice * quantity,
          image: product.image,
        },
      ];
    });
  }, []);

  // Handle open options modal for a product
  const handleOpenCustomizer = useCallback((product: PosProduct) => {
    if (!product.inStock || !storeOpenState.isOpen) return;

    if (!product.optionGroups || product.optionGroups.length === 0) {
      // Add directly to cart
      addItemToCart(product, [], "", 1);
      return;
    }

    // Initialize default choices
    const initialChoices: Record<string, string> = {};
    product.optionGroups.forEach((g) => {
      const defaultChoice = g.choices.find((c) => c.isDefault) || g.choices[0];
      if (defaultChoice) {
        initialChoices[g.id] = defaultChoice.id;
      }
    });

    setCustomizingProduct(product);
    setSelectedChoices(initialChoices);
    setCustomizingQty(1);
  }, [addItemToCart, storeOpenState.isOpen]);

  // Confirm custom options and add to cart
  const handleConfirmCustomOptions = () => {
    if (!customizingProduct) return;

    const chosenOptions: PosCartItemOption[] = [];
    let summaryParts: string[] = [];

    customizingProduct.optionGroups?.forEach((g) => {
      const chosenChoiceId = selectedChoices[g.id];
      const choice = g.choices.find((c) => c.id === chosenChoiceId);
      if (choice) {
        chosenOptions.push({
          groupId: g.id,
          groupName: g.name,
          choiceId: choice.id,
          choiceName: choice.name,
          extraPrice: choice.extraPrice,
        });
        summaryParts.push(
          choice.extraPrice > 0
            ? `${choice.name} (+${formatVnd(choice.extraPrice)})`
            : choice.name,
        );
      }
    });

    addItemToCart(
      customizingProduct,
      chosenOptions,
      summaryParts.join(" · "),
      customizingQty,
    );
    setCustomizingProduct(null);
  };


  // Quantity updates in cart
  const handleUpdateQty = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== cartItemId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return {
            ...item,
            quantity: nextQty,
            lineTotal: nextQty * item.unitPrice,
          };
        })
        .filter(Boolean) as PosCartItem[],
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  // Calculate totals
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + it.lineTotal, 0);
  }, [cartItems]);
  const discount = 0;
  const totalAmount = subtotal - discount;
  const effectiveCashTendered = cashTenderedInput >= totalAmount ? cashTenderedInput : totalAmount;
  const effectiveCashChange = Math.max(0, effectiveCashTendered - totalAmount);

  useEffect(() => {
    setCashTenderedInput((prev) => (prev < totalAmount ? totalAmount : prev));
  }, [totalAmount]);

  // Submit order handler
  const handleSubmit = async () => {
    if (cartItems.length === 0 || isSubmitting || !storeOpenState.isOpen) return;

    setIsSubmitting(true);
    try {
      const items: CounterOrderItemPayload[] = cartItems.map((ci) => {
        const isCombo = ci.productId.startsWith("combo-");
        const comboId = isCombo
          ? Number(ci.productId.replace("combo-", ""))
          : undefined;
        const productId = !isCombo
          ? Number.isNaN(Number(ci.productId))
            ? 1
            : Number(ci.productId)
          : undefined;

        const optionIds: number[] = [];
        if (Array.isArray(ci.options)) {
          for (const opt of ci.options) {
            const rawId = String(opt.choiceId ?? "").replace(/^opt-/i, "");
            const num = Number(rawId);
            if (!Number.isNaN(num) && num > 0) {
              optionIds.push(num);
            }
          }
        }

        return {
          productId: productId || undefined,
          comboId: comboId || undefined,
          quantity: ci.quantity,
          optionIds: optionIds.length > 0 ? optionIds : undefined,
          note: ci.note || undefined,
        };
      });

      const effectiveStoreId = user?.storeId ? Number(user.storeId) : currentStore?.id || 1;
      const payload: CreateCounterOrderPayload = {
        storeId: effectiveStoreId,
        diningOption,
        paymentMethod: paymentMethod,
        note: orderNote.trim() || undefined,
        items,
      };

      const created = await ordersApi.createCounterOrder(payload);

      let latestCreated: any = created;
      if (paymentMethod === "CASH" && isCashCollected && created.id && created.orderCode) {
        try {
          await paymentsApi.collectCounter({
            orderId: Number(created.id),
            orderCode: created.orderCode,
            queueNumber: created.queueNumber ?? existingOrderCount + 1,
            storeId: Number(created.storeId || effectiveStoreId),
            totalDue: Number(created.totalAmount ?? totalAmount),
            method: "CASH",
            cashAmount: Number(created.totalAmount ?? totalAmount),
            cashTendered: effectiveCashTendered,
            bankAmount: 0,
            manualAcceptance: false,
            staffNotes: t("business:counterPos.autoCollectStaffNote"),
          });
          latestCreated = { ...created };
        } catch (payErr) {
          console.warn("Auto counter collection warning:", payErr);
        }
      }

      const qNum = created.queueNumber ?? existingOrderCount + 1;
      const formattedQueue = `#${String(qNum).padStart(3, "0")}`;
      message.success(t("business:staffactions.counterCreated", { queue: formattedQueue }));

      setCartItems([]);
      setOrderNote("");
      onClose();

      if (onSuccess) {
        await onSuccess(latestCreated);
      } else if (onSubmitOrder) {
        await onSubmitOrder(latestCreated as any);
      }
    } catch (err: any) {
      console.error("counter order creation failed:", err);
      message.error(t("business:staffactions.counterCreateFailed", {
        detail: err?.response?.data?.message || err?.message || t("business:staffactions.unableToCreateOrder"),
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;

  // Hotkey listener: Esc to close, Enter to submit
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (customizingProduct) {
          setCustomizingProduct(null);
        } else {
          onClose();
        }
      } else if (e.key === "Enter") {
        // If Enter pressed while not focusing on textarea or inside options modal
        const target = e.target as HTMLElement;
        const isEditing = target.closest('input, textarea, select, button, [contenteditable="true"]');
        if (!e.repeat && !isEditing && !customizingProduct && cartItems.length > 0 && storeOpenState.isOpen) {
          e.preventDefault();
          void submitRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, customizingProduct, cartItems.length, onClose, storeOpenState.isOpen]);

  // Filter products by category and search
  const visibleProducts = useMemo(() => {
    return posProducts.filter((p) => {
      if (activeCategory !== "ALL" && p.category !== activeCategory) {
        return false;
      }
      if (deferredSearch.trim()) {
        const q = deferredSearch.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [posProducts, activeCategory, deferredSearch]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="POS Nhập Đơn Quầy">
      <div className={styles.modalWindow}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.posTitle}>
              <Sparkles size={20} />
              <span>Giao Diện Nhập Đơn Quầy Fast-Food (POS)</span>
            </div>
            <span className={styles.posSubtitle}>
              {currentStore?.name || user?.storeName || t("business:stafforderspage.branchFallback", { id: user?.storeId || 1 })}
              {currentStore?.address ? ` · ${currentStore.address}` : t("business:counterPos.subtitleFallback")}
            </span>
          </div>

          <div className={styles.headerShortcuts}>
            <div className={styles.shortcutHint}>
              <span className={styles.kbd}>Esc</span> Đóng
            </div>
            <div className={styles.shortcutHint}>
              <span className={styles.kbd}>Enter</span> Tạo đơn
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Đóng cửa sổ"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {!storeOpenState.isOpen && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "12px 24px",
              backgroundColor: "#FEF2F2",
              borderBottom: "1px solid #FECACA",
              color: "#991B1B",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Clock size={18} color="#B42318" />
              <div>
                <strong style={{ fontSize: 13, display: "block" }}>
                  {storeOpenState.bannerTitle}
                </strong>
                <span style={{ fontSize: 12, color: "#7F1D1D" }}>
                  {storeOpenState.bannerDescription}
                </span>
              </div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 999,
                backgroundColor: "#B42318",
                color: "#FFF",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              <Lock size={12} /> {t("business:storeStatus.lockedActionBadge")}
            </span>
          </div>
        )}

        {/* 2-Column Body */}
        <div className={styles.modalBody}>
          {/* Cột Trái: Catalog Grid */}
          <div className={styles.catalogColumn}>
            {/* Toolbar: Search + Category Tabs */}
            <div className={styles.catalogToolbar}>
              <div className={styles.searchBar}>
                <Search size={18} color="#6b6259" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Tìm nhanh món ăn theo tên (ví dụ: Gà rán, Khoai tây, Burger)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6b6259" }}
                    onClick={() => setSearchQuery("")}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className={styles.categoryTabs} role="tablist">
                {POS_CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`${styles.categoryTab} ${
                        isActive ? styles.categoryTabActive : ""
                      }`}
                      onClick={() => setActiveCategory(cat.key)}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Grid */}
            <div className={styles.productGridScroll}>
              {catalogLoading && <p role="status" className={styles.catalogState}><Loader2 size={18} />{t('business:posUi.loading')}</p>}
              {catalogError && <div role="alert" className={styles.catalogState}><span>{catalogError}</span><button type="button" onClick={() => setCatalogRevision(value => value + 1)}>{t('business:dashboard.retry')}</button></div>}
              {!catalogLoading && !catalogError && !visibleProducts.length && <p className={styles.catalogState}>{t('business:posUi.empty')}</p>}
              <div className={styles.productGrid}>
                {visibleProducts.map(product => <CounterProductCard key={product.id} product={product}
                  storeReason={!storeOpenState.isOpen ? storeOpenState.bannerTitle : undefined} onSelect={handleOpenCustomizer} />)}
              </div>
            </div>
          </div>

          {/* Cột Phải: Giỏ Hàng Quầy */}
          <div className={styles.cartColumn}>
            {/* Toggle ĂN TẠI QUÁN / MANG VỀ */}
            <div className={styles.diningToggleBar}>
              <button
                type="button"
                className={`${styles.diningBtn} ${
                  diningOption === "DINE_IN" ? styles.diningBtnActive : ""
                }`}
                onClick={() => setDiningOption("DINE_IN")}
              >
                <Utensils size={18} />
                <span>ĂN TẠI QUÁN</span>
              </button>

              <button
                type="button"
                className={`${styles.diningBtn} ${
                  diningOption === "TAKE_AWAY" ? styles.diningBtnActive : ""
                }`}
                onClick={() => setDiningOption("TAKE_AWAY")}
              >
                <ShoppingBag size={18} />
                <span>MANG VỀ</span>
              </button>
            </div>

            {/* Danh sách món trong giỏ */}
            <div className={styles.cartListContainer}>
              {cartItems.length === 0 ? (
                <div className={styles.cartEmptyState}>
                  <Utensils size={36} strokeWidth={1.5} />
                  <p style={{ marginTop: 12, fontWeight: 600 }}>Giỏ hàng quầy đang trống</p>
                  <span style={{ fontSize: 12, color: "#9c9186" }}>
                    Nhấp chọn món từ thực đơn bên trái để thêm vào đơn
                  </span>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className={styles.cartItemRow}>
                    <div className={styles.cartItemMain}>
                      <span className={styles.cartItemName}>{item.name}</span>
                      <span className={styles.cartItemTotal}>
                        {formatVnd(item.lineTotal)}
                      </span>
                    </div>

                    {item.optionsSummary && (
                      <div className={styles.cartItemOptions}>
                        {item.optionsSummary}
                      </div>
                    )}

                    <div className={styles.cartItemActions}>
                      <div className={styles.qtyControls}>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          onClick={() => handleUpdateQty(item.id, -1)}
                          title="Giảm 1"
                        >
                          <Minus size={14} />
                        </button>
                        <span className={styles.qtyCount}>{item.quantity}</span>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          onClick={() => handleUpdateQty(item.id, 1)}
                          title="Tăng 1"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className={styles.deleteItemBtn}
                        onClick={() => handleRemoveItem(item.id)}
                        title="Xóa món này khỏi giỏ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer giỏ hàng: Ghi chú, Phương thức, Tổng kết & Nút tạo đơn */}
            <div className={styles.cartFooter}>
              <input
                type="text"
                className={styles.noteInput}
                placeholder="Ghi chú đơn (ví dụ: Khách vội, xin thêm 2 tương ớt...)"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
              />

              {/* Chọn nhanh hình thức thanh toán dự kiến */}
              <div className={styles.paymentMethodRow}>
                <button
                  type="button"
                  className={`${styles.pmBtn} ${
                    paymentMethod === "CASH" ? styles.pmBtnActive : ""
                  }`}
                  onClick={() => setPaymentMethod("CASH")}
                >
                  TIỀN MẶT
                </button>
                <button
                  type="button"
                  className={`${styles.pmBtn} ${
                    paymentMethod === "BANK_TRANSFER" ? styles.pmBtnActive : ""
                  }`}
                  onClick={() => setPaymentMethod("BANK_TRANSFER")}
                >
                  CHUYỂN KHOẢN (VIETQR)
                </button>
                <button
                  type="button"
                  className={`${styles.pmBtn} ${
                    paymentMethod === "SPLIT" ? styles.pmBtnActive : ""
                  }`}
                  onClick={() => setPaymentMethod("SPLIT")}
                >
                  KẾT HỢP
                </button>
              </div>

              {/* Tùy chọn thu tiền mặt hoặc xem mã VietQR */}
              {paymentMethod === "CASH" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: 13,
                    color: "#16100D",
                    backgroundColor: "#FBF8F3",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #EDE8E1",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      id="cashCollectedCheck"
                      checked={isCashCollected}
                      onChange={(e) => setIsCashCollected(e.target.checked)}
                      style={{
                        cursor: "pointer",
                        width: 16,
                        height: 16,
                        accentColor: "#8F1216",
                      }}
                    />
                    <label
                      htmlFor="cashCollectedCheck"
                      style={{ cursor: "pointer", fontWeight: 700 }}
                    >
                      {t("business:counterPos.confirmCashAtCounter")}
                    </label>
                  </div>

                  {isCashCollected && totalAmount > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        paddingTop: 6,
                        borderTop: "1px dashed #E2D9CC",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#6B6259", fontWeight: 600 }}>
                          {t("business:counterPos.cashTenderedLabel")}
                        </span>
                        <input
                          type="number"
                          min={totalAmount}
                          step={1000}
                          value={cashTenderedInput || totalAmount}
                          onChange={(e) => setCashTenderedInput(Number(e.target.value) || 0)}
                          style={{
                            width: 135,
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #D6C9B9",
                            fontWeight: 700,
                            fontSize: 13,
                            textAlign: "right",
                            backgroundColor: "#FFF",
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {[totalAmount, 100000, 200000, 500000]
                          .filter((v, idx, arr) => v >= totalAmount && arr.indexOf(v) === idx)
                          .map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCashTenderedInput(preset)}
                              style={{
                                padding: "2px 8px",
                                borderRadius: 6,
                                border:
                                  effectiveCashTendered === preset
                                    ? "1px solid #8F1216"
                                    : "1px solid #E2D9CC",
                                backgroundColor:
                                  effectiveCashTendered === preset ? "#FBE9E9" : "#FFF",
                                color: effectiveCashTendered === preset ? "#8F1216" : "#4B443C",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {preset === totalAmount ? t("business:counterPos.exactCash") : formatVnd(preset)}
                            </button>
                          ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 12,
                          fontWeight: 700,
                          color: effectiveCashChange > 0 ? "#1E7A46" : "#6B6259",
                        }}
                      >
                        <span>{t("business:counterPos.cashChangeLabel")}</span>
                        <strong style={{ fontSize: 14 }}>
                          {formatVnd(effectiveCashChange)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(paymentMethod === "BANK_TRANSFER" || paymentMethod === "SPLIT") && (
                <p role="note" style={{ fontSize: 13, color: "#6B6259", margin: 0 }}>
                  {t("business:counterPos.qrAfterCreation")}
                </p>
              )}

              {/* Tổng kết tiền */}
              <div className={styles.summaryBox}>
                <div className={styles.summaryLine}>
                  <span>Tạm tính ({cartItems.reduce((a, b) => a + b.quantity, 0)} món):</span>
                  <span>{formatVnd(subtotal)}</span>
                </div>
                <div className={styles.summaryLine}>
                  <span>Giảm giá:</span>
                  <span>{formatVnd(discount)}</span>
                </div>
                <div className={styles.summaryTotal}>
                  <span>TỔNG THANH TOÁN:</span>
                  <span className={styles.totalNumber}>
                    {formatVnd(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Nút Tạo đơn quầy */}
              <button
                type="button"
                disabled={cartItems.length === 0 || isSubmitting || !storeOpenState.isOpen}
                className={styles.submitOrderBtn}
                onClick={handleSubmit}
              >
                {!storeOpenState.isOpen ? (
                  <>
                    <Lock size={16} />
                    <span>
                      {t("business:storeStatus.closedNowChip")} ({storeOpenState.openTime} - {storeOpenState.closeTime})
                    </span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Đang tạo đơn...</span>
                  </>
                ) : (
                  <>
                    <span>Tạo đơn quầy (Enter)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Option Customizer Modal Overlay (Nếu mở chọn món) */}
        {customizingProduct && (
          <div className={styles.optionModalOverlay}>
            <div className={styles.optionModalWindow}>
              <div className={styles.optionHeader}>
                <h3 className={styles.optionTitle}>
                  Tùy chọn: {customizingProduct.name}
                </h3>
                <button
                  type="button"
                  className={styles.closeButton}
                  onClick={() => setCustomizingProduct(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.optionBody}>
                {customizingProduct.optionGroups?.map((group) => {
                  const currentChoiceId = selectedChoices[group.id];
                  return (
                    <div key={group.id} className={styles.optionGroup}>
                      <span className={styles.optionGroupName}>
                        {group.id === "spice" && <Flame size={14} color="#8f1216" />}
                        {group.name}
                      </span>
                      <div className={styles.optionChips}>
                        {group.choices.map((choice) => {
                          const isSelected = currentChoiceId === choice.id;
                          return (
                            <button
                              key={choice.id}
                              type="button"
                              className={`${styles.optionChip} ${
                                isSelected ? styles.optionChipActive : ""
                              }`}
                              onClick={() =>
                                setSelectedChoices((prev) => ({
                                  ...prev,
                                  [group.id]: choice.id,
                                }))
                              }
                            >
                              {isSelected && <Check size={14} />}
                              <span>{choice.name}</span>
                              {choice.extraPrice > 0 && (
                                <span className={styles.optionExtraPrice}>
                                  +{formatVnd(choice.extraPrice)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Chọn số lượng */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#4b443c" }}>
                    Số lượng:
                  </span>
                  <div className={styles.qtyControls}>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      onClick={() => setCustomizingQty((q) => Math.max(1, q - 1))}
                    >
                      <Minus size={14} />
                    </button>
                    <span className={styles.qtyCount}>{customizingQty}</span>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      onClick={() => setCustomizingQty((q) => q + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.optionFooter}>
                <div className={styles.optionFooterTotal}>
                  <span className={styles.optionFooterLabel}>Thành tiền:</span>
                  <span className={styles.optionFooterAmount}>
                    {formatVnd(
                      (customizingProduct.price +
                        Object.entries(selectedChoices).reduce((acc, [groupId, choiceId]) => {
                          const group = customizingProduct.optionGroups?.find((g) => g.id === groupId);
                          const choice = group?.choices.find((c) => c.id === choiceId);
                          return acc + (choice?.extraPrice || 0);
                        }, 0)) *
                        customizingQty,
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.addOptionBtn}
                  onClick={handleConfirmCustomOptions}
                >
                  Thêm vào giỏ hàng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
