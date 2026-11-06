"use client";
import { getBrowserLocale } from "@/lib/i18n/locale";
import { getTranslator } from "@/lib/i18n/translator";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { z } from "zod";
import {
  addCartItem,
  cartTotals,
  loadCatalogMetadataFromApi,
  normalizeCartItem,
  normalizeOptionsSnapshot,
  normalizeToppingsSnapshot,
  resolveCatalogImage,
  resolveStoreName,
  toCartItemPayload,
} from "@/lib/cart";
import {
  applyDemoAction,
  ensureDemoShipment,
  DEMO_CONTROLS_ENABLED,
  type DemoAction,
} from "@/lib/order-demo";
import type { CartItem, Order } from "@/lib/types/order";
import {
  cartApi,
  orderApi,
  type BackendOrder,
  type BackendCartItem,
  type CreateOrderPayload,
} from "@/lib/api";

const storageKey = "clucky-order-workspace-v1";
const cartSchema = z.array(
  z.object({
    id: z.string(),
    productId: z.number().optional(),
    comboId: z.number().optional(),
    itemType: z.enum(["PRODUCT", "COMBO"]).optional(),
    itemKey: z.string().optional(),
    slug: z.string(),
    name: z.string(),
    category: z.string(),
    basePrice: z.number().nonnegative(),
    unitPrice: z.number().nonnegative(),
    quantity: z.number().int().positive(),
    image: z.string(),
    note: z.string().optional(),
    optionIds: z.array(z.number()).optional(),
    toppingIds: z.array(z.number()).optional(),
    options: z
      .array(
        z.object({
          groupName: z.string(),
          name: z.string(),
          extraPrice: z.number(),
        }),
      )
      .optional(),
    toppings: z
      .array(z.object({ name: z.string(), extraPrice: z.number() }))
      .optional(),
  }),
);
const orderStatus = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SHIPPING",
  "COMPLETED",
  "CANCELLED",
]);
const savedOrdersSchema = z.array(
  z.object({
    id: z.string(),
    orderCode: z.string(),
    storeId: z.string(),
    storeName: z.string(),
    type: z.enum(["DELIVERY", "PICKUP"]),
    status: orderStatus,
    subtotal: z.number().nonnegative(),
    discountAmount: z.number().nonnegative(),
    voucherCode: z.string().optional(),
    pointsUsed: z.number().nonnegative(),
    pointsAmount: z.number().nonnegative(),
    shippingFee: z.number().nonnegative(),
    shipmentStatus: z
      .enum([
        "CREATED",
        "ASSIGNED",
        "PICKED_UP",
        "SHIPPING",
        "DELIVERED",
        "FAILED",
      ])
      .optional(),
    totalAmount: z.number().nonnegative(),
    paymentMethod: z.enum(["COD", "BANK_TRANSFER"]),
    paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "EXPIRED"]),
    receiverName: z.string(),
    receiverPhone: z.string(),
    deliveryAddress: z.string().optional(),
    note: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    refundStatus: z
      .enum(["PENDING", "APPROVED", "REJECTED", "REFUNDED"])
      .optional(),
    items: z.array(
      z.object({
        id: z.string(),
        slug: z.string().optional(),
        itemName: z.string(),
        itemType: z.enum(["PRODUCT", "COMBO"]),
        unitPrice: z.number().nonnegative(),
        quantity: z.number().int().positive(),
        image: z.string(),
        lineTotal: z.number().nonnegative(),
        optionsSnapshot: cartSchema.element.shape.options,
        toppingsSnapshot: cartSchema.element.shape.toppings,
        note: z.string().optional(),
      }),
    ),
    timeline: z.array(
      z.object({
        status: orderStatus,
        title: z.string(),
        description: z.string(),
        time: z.string().optional(),
        done: z.boolean(),
        current: z.boolean(),
      }),
    ),
  }),
);

export function mapBackendOrderToOrder(be: BackendOrder): Order {
  const statusMap: Record<string, Order["status"]> = {
    PENDING_PAYMENT: "PENDING_PAYMENT",
    CONFIRMED: "CONFIRMED",
    PREPARING: "PREPARING",
    READY: "READY",
    SHIPPING: "SHIPPING",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  };
  const currentStatus = statusMap[be.status] || "CONFIRMED";
  const items = (be.items || []).map((it) => ({
    id: String(it.id),
    slug: String(it.productId || it.comboId || it.id),
    itemName: it.itemName,
    itemType: it.itemType,
    unitPrice: Number(it.unitPrice),
    quantity: it.quantity,
    image: resolveCatalogImage(it.productId, it.comboId, it.itemName),
    lineTotal: Number(it.lineTotal),
    optionsSnapshot: normalizeOptionsSnapshot(it.optionsSnapshot, it.productId),
    toppingsSnapshot: normalizeToppingsSnapshot(
      it.toppingsSnapshot,
      it.productId,
    ),
    note: it.note,
  }));

  const timeline =
    be.timeline && be.timeline.length > 0
      ? be.timeline.map((entry, idx, arr) => ({
          status: (statusMap[entry.toStatus] || "CONFIRMED") as Order["status"],
          title: entry.toStatus,
          description: entry.reason || "",
          time: entry.createdAt,
          done: idx < arr.length - 1,
          current: idx === arr.length - 1,
        }))
      : [
          {
            status: currentStatus,
            title: currentStatus,
            description: currentStatus,
            time: be.createdAt,
            done: false,
            current: true,
          },
        ];

  return {
    id: String(be.id),
    orderCode: be.orderCode,
    storeId: String(be.storeId),
    storeName: resolveStoreName(be.storeId),
    type: be.type,
    status: currentStatus,
    subtotal: Number(be.subtotal),
    discountAmount: Number(be.discountAmount),
    voucherCode: be.voucherCode,
    pointsUsed: be.pointsUsed,
    pointsAmount: Number(be.pointsAmount),
    shippingFee: Number(be.shippingFee),
    totalAmount: Number(be.totalAmount),
    paymentMethod:
      (be.paymentMethod as Order["paymentMethod"]) ||
      (be.status === "PENDING_PAYMENT" ? "BANK_TRANSFER" : "COD"),
    paymentStatus:
      be.status === "CANCELLED"
        ? "FAILED"
        : be.paymentMethod === "BANK_TRANSFER" ||
            be.status === "PENDING_PAYMENT"
          ? be.status === "PENDING_PAYMENT"
            ? "PENDING"
            : "PAID"
          : be.status === "COMPLETED"
            ? "PAID"
            : "PENDING",
    receiverName: be.receiverName,
    receiverPhone: be.receiverPhone,
    deliveryAddress: be.deliveryAddress,
    note: be.note,
    createdAt: be.createdAt,
    updatedAt: be.updatedAt,
    items,
    timeline,
  };
}

function mapBackendCartItemToCartItem(be: BackendCartItem): CartItem {
  return normalizeCartItem({
    id: be.itemKey,
    itemKey: be.itemKey,
    productId: be.productId,
    comboId: be.comboId,
    itemType: be.productId ? "PRODUCT" : be.comboId ? "COMBO" : undefined,
    slug: String(be.productId || be.comboId || be.itemKey),
    name: be.itemName,
    category: "Food",
    basePrice: Number(be.unitPrice),
    unitPrice: Number(be.unitPrice),
    quantity: be.quantity,
    image: resolveCatalogImage(be.productId, be.comboId, be.itemName),
    optionIds: be.optionIds,
    toppingIds: be.toppingIds,
    options: normalizeOptionsSnapshot(
      be.optionsSnapshot ?? be.optionIds,
      be.productId,
    ),
    toppings: normalizeToppingsSnapshot(
      be.toppingsSnapshot ?? be.toppingIds,
      be.productId,
    ),
    note: be.note,
  });
}

interface OrderContextValue {
  items: CartItem[];
  orders: Order[];
  count: number;
  subtotal: number;
  ready: boolean;
  storageError: boolean;
  demoEnabled: boolean;
  runDemoAction: (
    id: string,
    action: DemoAction,
  ) => { ok: boolean; message: string };
  addItem: (item: CartItem) => void;
  updateQuantity: (id: string, delta: number) => void;
  updateNote: (id: string, note: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  createOrder: (payload: CreateOrderPayload) => Promise<BackendOrder>;
  placeDemoOrder: (order: Order) => void;
  cancelOrder: (id: string, reason: string) => Promise<void>;
  reorder: (order: Order) => Promise<void>;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setSnapshot] = useState<{
    items: CartItem[];
    orders: Order[];
  }>({ items: [], orders: [] });
  const workspaceRef = useRef(workspace);
  const setWorkspace = useCallback(
    (
      update: typeof workspace | ((prev: typeof workspace) => typeof workspace),
    ) => {
      const next =
        typeof update === "function" ? update(workspaceRef.current) : update;
      workspaceRef.current = next;
      setSnapshot(next);
    },
    [],
  );
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);

  const refreshOrders = useCallback(async () => {
    try {
      await loadCatalogMetadataFromApi();
      const page = await orderApi.getMyOrders(0, 50);
      if (page && Array.isArray(page.content)) {
        const serverOrders = page.content.map(mapBackendOrderToOrder);
        setWorkspace((prev) => {
          const merged = serverOrders.map((sOrder) => {
            const local = prev.orders.find(
              (l) => l.id === sOrder.id || l.orderCode === sOrder.orderCode,
            );
            if (
              local &&
              local.paymentStatus === "PAID" &&
              sOrder.paymentStatus !== "PAID"
            ) {
              return {
                ...sOrder,
                status:
                  sOrder.status === "PENDING_PAYMENT"
                    ? local.status
                    : sOrder.status,
                paymentStatus: "PAID" as const,
                timeline:
                  local.timeline.length >= sOrder.timeline.length
                    ? local.timeline
                    : sOrder.timeline,
              };
            }
            return sOrder;
          });
          return {
            ...prev,
            orders: merged,
          };
        });
      }
    } catch {
      // Offline/unauthenticated fallback
    }
  }, [setWorkspace]);

  useEffect(() => {
    const restore = (raw: string | null) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        const items = (cartSchema.parse(saved.items) as CartItem[]).map(
          normalizeCartItem,
        );
        const parsedOrders = savedOrdersSchema.safeParse(saved.orders);
        let orders = parsedOrders.success
          ? (parsedOrders.data as Order[]).map(ensureDemoShipment)
          : [];
        orders = orders.filter(
          (o) =>
            !o.id.startsWith("demo-") &&
            !o.orderCode.startsWith("DEMO-") &&
            !o.orderCode.startsWith("CLU-24"),
        );
        setWorkspace({ items, orders });
      } catch {
        setStorageError(true);
      }
    };
    try {
      restore(localStorage.getItem(storageKey));
    } catch {
      setStorageError(true);
    }
    setReady(true);

    // Load live catalog + store metadata from Backend API, then re-normalize cart & sync Redis
    loadCatalogMetadataFromApi()
      .then(() => {
        setWorkspace((prev) => ({
          ...prev,
          items: prev.items.map(normalizeCartItem),
          orders: prev.orders.map((ord) => ({
            ...ord,
            storeName: resolveStoreName(ord.storeId),
            items: ord.items.map((it) => ({
              ...it,
              image: resolveCatalogImage(
                undefined,
                undefined,
                it.itemName,
                it.image,
              ),
            })),
          })),
        }));
      })
      .finally(() => {
        // Sync with Redis Cart backend
        cartApi
          .getCart()
          .then((cartDto) => {
            if (cartDto && Array.isArray(cartDto.items)) {
              const serverItems = cartDto.items.map(
                mapBackendCartItemToCartItem,
              );
              if (serverItems.length > 0) {
                setWorkspace((prev) => {
                  const merged = serverItems.map((sItem) => {
                    const localMatch = prev.items.find(
                      (lItem) =>
                        lItem.itemKey === sItem.itemKey ||
                        (lItem.productId &&
                          lItem.productId === sItem.productId) ||
                        (lItem.comboId && lItem.comboId === sItem.comboId) ||
                        lItem.name === sItem.name,
                    );
                    if (!localMatch) return sItem;
                    return normalizeCartItem({
                      ...sItem,
                      slug: localMatch.slug || sItem.slug,
                      category: localMatch.category || sItem.category,
                      image:
                        localMatch.image &&
                        localMatch.image !== "/images/food-placeholder.svg"
                          ? localMatch.image
                          : sItem.image,
                      options: localMatch.options?.length
                        ? localMatch.options
                        : sItem.options,
                      toppings: localMatch.toppings?.length
                        ? localMatch.toppings
                        : sItem.toppings,
                      optionIds: localMatch.optionIds?.length
                        ? localMatch.optionIds
                        : sItem.optionIds,
                      toppingIds: localMatch.toppingIds?.length
                        ? localMatch.toppingIds
                        : sItem.toppingIds,
                    });
                  });
                  return { ...prev, items: merged };
                });
              }
            }
          })
          .catch(() => {
            // Fallback to local items
          });

        // Sync orders with backend if user has token
        refreshOrders();
      });

    const sync = (event: StorageEvent) => {
      if (event.key === storageKey) {
        if (event.newValue) restore(event.newValue);
        else setWorkspace({ items: [], orders: [] });
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [setWorkspace, refreshOrders]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspace));
    } catch {
      setStorageError(true);
    }
  }, [workspace, ready]);

  const addItem = useCallback(
    (item: CartItem) => {
      const normalized = normalizeCartItem(item);
      if (!cartSchema.safeParse([normalized]).success) return;
      setWorkspace((prev) => ({
        ...prev,
        items: addCartItem(prev.items, normalized),
      }));
      cartApi.addItem(toCartItemPayload(normalized)).catch((err) => {
        console.warn("Cart backend sync:", err);
      });
    },
    [setWorkspace],
  );

  const updateQuantity = useCallback(
    (id: string, delta: number) => {
      const currentItem = workspaceRef.current.items.find((it) => it.id === id);
      const newQty = currentItem ? currentItem.quantity + delta : 0;
      setWorkspace((prev) => ({
        ...prev,
        items: prev.items
          .map((item) =>
            item.id === id
              ? { ...item, quantity: item.quantity + delta }
              : item,
          )
          .filter((item) => item.quantity > 0),
      }));
      if (newQty > 0) {
        cartApi
          .updateItem(id, newQty)
          .catch((err) => console.warn("Cart updateItem:", err));
      } else {
        cartApi
          .removeItem(id)
          .catch((err) => console.warn("Cart removeItem:", err));
      }
    },
    [setWorkspace],
  );

  const updateNote = useCallback(
    (id: string, note: string) => {
      setWorkspace((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, note } : item,
        ),
      }));
      const current = workspaceRef.current.items.find((it) => it.id === id);
      if (current) {
        cartApi
          .updateItem(id, current.quantity, note)
          .catch((err) => console.warn("Cart updateNote:", err));
      }
    },
    [setWorkspace],
  );

  const removeItem = useCallback(
    (id: string) => {
      setWorkspace((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      }));
      cartApi
        .removeItem(id)
        .catch((err) => console.warn("Cart removeItem:", err));
    },
    [setWorkspace],
  );

  const clearCart = useCallback(() => {
    setWorkspace((prev) => ({
      ...prev,
      items: [],
    }));
    cartApi.clearCart().catch((err) => console.warn("Cart clear:", err));
  }, [setWorkspace]);

  const placeDemoOrder = useCallback(
    (order: Order) => {
      setWorkspace((prev) =>
        prev.orders.some((entry) => entry.id === order.id)
          ? prev
          : { items: [], orders: [ensureDemoShipment(order), ...prev.orders] },
      );
    },
    [setWorkspace],
  );

  const createOrder = useCallback(
    async (payload: CreateOrderPayload): Promise<BackendOrder> => {
      await loadCatalogMetadataFromApi();
      // Clear stale Redis cart before creating the order so cart-order-service
      // uses payload.items (which includes normalized optionIds/toppingIds and selected storeId).
      await cartApi.clearCart().catch(() => {});
      try {
        const backendOrder = await orderApi.create(payload);
        const mappedOrder = mapBackendOrderToOrder(backendOrder);
        setWorkspace((prev) => ({
          items: [],
          orders: [ensureDemoShipment(mappedOrder), ...prev.orders],
        }));
        cartApi.clearCart().catch(() => {});
        return backendOrder;
      } catch (err) {
        // Restore cart items in Redis if order creation failed
        const currentItems = workspaceRef.current.items;
        for (const it of currentItems) {
          cartApi.addItem(toCartItemPayload(it)).catch(() => {});
        }
        throw err;
      }
    },
    [setWorkspace],
  );

  const cancelOrder = useCallback(
    async (id: string, reason: string) => {
      if (!reason.trim()) return;
      try {
        const updatedBackend = await orderApi.cancel(id, reason);
        const mapped = mapBackendOrderToOrder(updatedBackend);
        setWorkspace((prev) => ({
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === id || o.orderCode === id ? mapped : o,
          ),
        }));
      } catch (err) {
        console.error("Cancel order backend error:", err);
        throw err;
      }
    },
    [setWorkspace],
  );

  const reorder = useCallback(
    async (order: Order) => {
      try {
        await loadCatalogMetadataFromApi();
        const cartDto = await orderApi.reorder(order.id);
        if (cartDto && Array.isArray(cartDto.items)) {
          const cartItems = cartDto.items.map(mapBackendCartItemToCartItem);
          setWorkspace((prev) => ({
            ...prev,
            items: cartItems,
          }));
          return;
        }
      } catch (err) {
        console.warn(
          "Backend reorder error, putting items back into local cart:",
          err,
        );
      }
      const incoming: CartItem[] = order.items.map((item) => ({
        id: crypto.randomUUID(),
        slug: item.slug ?? `reorder-${order.id}-${item.id}`,
        name: item.itemName,
        category: getTranslator(getBrowserLocale())(
          "business.orderprovider.reorder",
        ),
        basePrice: item.unitPrice,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        image: item.image,
        options: item.optionsSnapshot,
        toppings: item.toppingsSnapshot,
        note: item.note,
      }));
      setWorkspace((prev) => ({
        ...prev,
        items: incoming.reduce(addCartItem, prev.items),
      }));
    },
    [setWorkspace],
  );

  const runDemoAction = useCallback(
    (id: string, action: DemoAction) => {
      const previous = workspaceRef.current.orders.find(
        (order) => order.id === id || order.orderCode === id,
      );
      if (!previous)
        return {
          ok: false,
          message: getTranslator(getBrowserLocale())(
            "business.orderprovider.orderNotFound",
          ),
        };
      const result = applyDemoAction(previous, action, DEMO_CONTROLS_ENABLED);
      if (result.ok) {
        setWorkspace((prev) => ({
          ...prev,
          orders: prev.orders.map((order) =>
            order.id === id || order.orderCode === id ? result.order : order,
          ),
        }));
        if (action === "PAY_FAILED") {
          orderApi
            .cancel(previous.id, "Thanh toán không thành công")
            .catch(() => {});
        }
      }
      return { ok: result.ok, message: result.message };
    },
    [setWorkspace],
  );

  const totals = useMemo(() => cartTotals(workspace.items), [workspace.items]);
  const value = useMemo(
    () => ({
      ...workspace,
      ...totals,
      ready,
      storageError,
      demoEnabled: DEMO_CONTROLS_ENABLED,
      runDemoAction,
      addItem,
      updateQuantity,
      updateNote,
      removeItem,
      clearCart,
      createOrder,
      placeDemoOrder,
      cancelOrder,
      reorder,
      refreshOrders,
    }),
    [
      workspace,
      totals,
      ready,
      storageError,
      runDemoAction,
      addItem,
      updateQuantity,
      updateNote,
      removeItem,
      clearCart,
      createOrder,
      placeDemoOrder,
      cancelOrder,
      reorder,
      refreshOrders,
    ],
  );

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrder requires OrderProvider");
  return context;
}
