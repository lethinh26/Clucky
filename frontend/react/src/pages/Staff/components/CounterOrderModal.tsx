import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import {
  MOCK_POS_PRODUCTS,
  POS_CATEGORIES,
  type PosProduct,
  type PosCartItem,
  type PosCartItemOption,
} from "../../../mocks/mockPosCatalog";
import type { DiningOption, PaymentMethod, StaffOrder } from "../../../mocks/mockStaffOrders";
import { catalogApi } from "../../../lib/api";
import styles from "./counter-order.module.css";

interface CounterOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitOrder: (order: Partial<StaffOrder>) => Promise<void> | void;
  existingOrderCount: number;
}

const formatVnd = (val: number) => {
  return `${new Intl.NumberFormat("vi-VN").format(val)} đ`;
};

export const CounterOrderModal: React.FC<CounterOrderModalProps> = ({
  open,
  onClose,
  onSubmitOrder,
  existingOrderCount,
}) => {
  // 1. Filter states
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 2. Cart states
  const [diningOption, setDiningOption] = useState<DiningOption>("DINE_IN");
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [orderNote, setOrderNote] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 3. Option Customization Modal state
  const [customizingProduct, setCustomizingProduct] = useState<PosProduct | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [customizingQty, setCustomizingQty] = useState<number>(1);

  // Search input ref to auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Danh mục sản phẩm POS lấy từ backend catalog-store-service
  const [posProducts, setPosProducts] = useState<PosProduct[]>(MOCK_POS_PRODUCTS);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const loadBackendCatalog = async () => {
      try {
        const [productsData, combosData] = await Promise.all([
          catalogApi.listProducts({ activeOnly: true }),
          catalogApi.listCombos(true),
        ]);

        if (!active) return;

        const convertedProducts: PosProduct[] = [];

        // Chuyển đổi sản phẩm đơn từ backend
        if (Array.isArray(productsData) && productsData.length > 0) {
          productsData.forEach((p) => {
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
              image:
                p.imageUrl ||
                "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=80",
              inStock: p.isAvailable !== false && p.isSoldOut !== true,
              badge: p.isBestSeller ? "Bán chạy" : undefined,
              description: p.description,
              optionGroups:
                p.options && p.options.length > 0
                  ? p.options.map((opt) => ({
                      id: opt.id,
                      name: opt.name,
                      required: opt.required,
                      choices: opt.choices.map((c) => ({
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
        if (Array.isArray(combosData) && combosData.length > 0) {
          combosData.forEach((c) => {
            convertedProducts.push({
              id: `combo-${c.id}`,
              name: c.name,
              category: "COMBO",
              price: c.comboPrice,
              image:
                c.imageUrl ||
                "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=500&auto=format&fit=crop&q=80",
              inStock: true,
              badge: "Combo Tiết Kiệm",
              description:
                c.description ||
                c.items?.map((it) => `${it.quantity}x ${it.productName}`).join(" + "),
            });
          });
        }

        if (convertedProducts.length > 0) {
          setPosProducts(convertedProducts);
        }
      } catch (err) {
        console.warn("Chưa tải được catalog từ backend, giữ danh mục mặc định:", err);
      }
    };

    loadBackendCatalog();
    return () => {
      active = false;
    };
  }, [open]);

  // Reset cart when modal reopens
  useEffect(() => {
    if (open) {
      setCartItems([]);
      setOrderNote("");
      setDiningOption("DINE_IN");
      setPaymentMethod("CASH");
      setIsSubmitting(false);
      setCustomizingProduct(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Handle open options modal for a product
  const handleOpenCustomizer = (product: PosProduct) => {
    if (!product.inStock) return;

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
  };

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

  const addItemToCart = (
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

  // Submit order handler
  const handleSubmit = async () => {
    if (cartItems.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`;
      const queueNumber = 15 + existingOrderCount;

      const orderPayload: Partial<StaffOrder> = {
        orderCode: `CLU-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
          2,
          "0",
        )}${String(now.getDate()).padStart(2, "0")}-00${queueNumber}`,
        queueNumber,
        orderSource: "COUNTER",
        diningOption,
        customerName: `Khách vãng lai #${queueNumber}`,
        customerPhone: "",
        orderType: "PICKUP",
        status: "CONFIRMED",
        paymentMethod,
        paymentStatus: paymentMethod === "CASH" ? "PENDING" : "PENDING",
        subtotal,
        discount,
        shippingFee: 0,
        total: totalAmount,
        note: orderNote.trim() || undefined,
        time: timeStr,
        createdAt: now.toISOString(),
        items: cartItems.map((ci) => ({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          itemName: ci.name,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
          options: ci.optionsSummary || undefined,
          lineTotal: ci.lineTotal,
          image: ci.image,
        })),
      };

      await onSubmitOrder(orderPayload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

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
        const isTextArea = target.tagName === "TEXTAREA";
        if (!isTextArea && !customizingProduct && cartItems.length > 0) {
          e.preventDefault();
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, customizingProduct, cartItems.length, onClose]);

  // Filter products by category and search
  const visibleProducts = useMemo(() => {
    return posProducts.filter((p) => {
      if (activeCategory !== "ALL" && p.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [posProducts, activeCategory, searchQuery]);

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
              Tối ưu thao tác thu ngân · Bàn phím & Cảm ứng
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
              <div className={styles.productGrid}>
                {visibleProducts.map((product) => {
                  const isSoldOut = !product.inStock;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isSoldOut}
                      className={`${styles.productCard} ${
                        isSoldOut ? styles.productCardSoldOut : ""
                      }`}
                      onClick={() => handleOpenCustomizer(product)}
                      title={
                        isSoldOut
                          ? `${product.name} (Tạm hết hàng)`
                          : `Chọn món ${product.name}`
                      }
                    >
                      <div className={styles.imageContainer}>
                        <img
                          src={product.image}
                          alt={product.name}
                          className={styles.productImage}
                        />
                        {product.badge && (
                          <span
                            className={`${styles.productBadge} ${
                              product.badge === "HOT" || product.badge === "BÁN CHẠY"
                                ? styles.badgeHot
                                : product.badge === "HẾT HÀNG"
                                ? styles.badgeSoldOut
                                : styles.badgeNew
                            }`}
                          >
                            {product.badge}
                          </span>
                        )}
                      </div>

                      <div className={styles.productCardBody}>
                        <div>
                          <div className={styles.productName}>{product.name}</div>
                          <div className={styles.productPrice}>
                            {formatVnd(product.price)}
                          </div>
                        </div>

                        {product.optionGroups && product.optionGroups.length > 0 && !isSoldOut && (
                          <div className={styles.customizableHint}>
                            + Tùy chọn size & vị
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
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
                  CHUYỂN KHOẢN
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
                disabled={cartItems.length === 0 || isSubmitting}
                className={styles.submitOrderBtn}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
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
