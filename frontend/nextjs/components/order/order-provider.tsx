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
import { addCartItem, cartTotals } from "@/lib/cart";
import {
  applyDemoAction,
  ensureDemoShipment,
  DEMO_CONTROLS_ENABLED,
  type DemoAction,
} from "@/lib/order-demo";
import { MOCK_ORDERS } from "@/lib/mock/order-mock-data";
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
    slug: z.string(),
    name: z.string(),
    category: z.string(),
    basePrice: z.number().nonnegative(),
    unitPrice: z.number().nonnegative(),
    quantity: z.number().int().positive(),
    image: z.string(),
    note: z.string().optional(),
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
      .enum(["CREATED", "ASSIGNED", "PICKED_UP", "SHIPPING", "DELIVERED", "FAILED"])
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
    image: "/images/food-placeholder.svg",
    lineTotal: Number(it.lineTotal),
    optionsSnapshot: it.optionsSnapshot as any,
    toppingsSnapshot: it.toppingsSnapshot as any,
    note: it.note,
  }));

  const timeline = (be.timeline && be.timeline.length > 0)
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
    storeName: `Clucky #${be.storeId}`,
    type: be.type,
    status: currentStatus,
    subtotal: Number(be.subtotal),
    discountAmount: Number(be.discountAmount),
    voucherCode: be.voucherCode,
    pointsUsed: be.pointsUsed,
    pointsAmount: Number(be.pointsAmount),
    shippingFee: Number(be.shippingFee),
    totalAmount: Number(be.totalAmount),
    paymentMethod: "COD",
    paymentStatus: currentStatus === "PENDING_PAYMENT" ? "PENDING" : "PAID",
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
  return {
    id: be.itemKey,
    slug: String(be.productId || be.comboId || be.itemKey),
    name: be.itemName,
    category: "Food",
    basePrice: Number(be.unitPrice),
    unitPrice: Number(be.unitPrice),
    quantity: be.quantity,
    image: "/images/food-placeholder.svg",
    options: be.optionsSnapshot as any,
    toppings: be.toppingsSnapshot as any,
    note: be.note,
  };
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
  }>({ items: [], orders: MOCK_ORDERS });
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
      const page = await orderApi.getMyOrders(0, 50);
      if (page && page.content) {
        const serverOrders = page.content.map(mapBackendOrderToOrder);
        setWorkspace((prev) => {
          const merged = [...serverOrders];
          for (const local of prev.orders) {
            if (!merged.some((s) => s.orderCode === local.orderCode || s.id === local.id)) {
              merged.push(local);
            }
          }
          return { ...prev, orders: merged };
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
        const items = cartSchema.parse(saved.items) as CartItem[];
        const parsedOrders = savedOrdersSchema.safeParse(saved.orders);
        const orders = parsedOrders.success
          ? (parsedOrders.data as Order[]).map(ensureDemoShipment)
          : MOCK_ORDERS;
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

    // Sync with Redis Cart backend
    cartApi.getCart()
      .then((cartDto) => {
        if (cartDto && Array.isArray(cartDto.items)) {
          const serverItems = cartDto.items.map(mapBackendCartItemToCartItem);
          if (serverItems.length > 0) {
            setWorkspace((prev) => ({ ...prev, items: serverItems }));
          }
        }
      })
      .catch(() => {
        // Fallback to local items
      });

    // Sync orders with backend if user has token
    refreshOrders();

    const sync = (event: StorageEvent) => {
      if (event.key === storageKey) {
        if (event.newValue) restore(event.newValue);
        else setWorkspace({ items: [], orders: MOCK_ORDERS });
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
      if (!cartSchema.safeParse([item]).success) return;
      setWorkspace((prev) => ({
        ...prev,
        items: addCartItem(prev.items, item),
      }));
      cartApi.addItem({
        productId: Number(item.id) || undefined,
        itemName: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        optionsSnapshot: item.options,
        toppingsSnapshot: item.toppings,
        note: item.note,
      }).catch((err) => {
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
        cartApi.updateItem(id, newQty).catch((err) => console.warn("Cart updateItem:", err));
      } else {
        cartApi.removeItem(id).catch((err) => console.warn("Cart removeItem:", err));
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
        cartApi.updateItem(id, current.quantity, note).catch((err) => console.warn("Cart updateNote:", err));
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
      cartApi.removeItem(id).catch((err) => console.warn("Cart removeItem:", err));
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
      const backendOrder = await orderApi.create(payload);
      const mappedOrder = mapBackendOrderToOrder(backendOrder);
      setWorkspace((prev) => ({
        items: [],
        orders: [ensureDemoShipment(mappedOrder), ...prev.orders],
      }));
      cartApi.clearCart().catch(() => {});
      return backendOrder;
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
          orders: prev.orders.map((o) => (o.id === id || o.orderCode === id ? mapped : o)),
        }));
      } catch (err) {
        console.warn("Cancel order backend error, applying local state:", err);
        setWorkspace((prev) => ({
          ...prev,
          orders: prev.orders.map((order) => {
            if (
              (order.id !== id && order.orderCode !== id) ||
              !["PENDING_PAYMENT", "CONFIRMED"].includes(order.status)
            )
              return order;
            return {
              ...order,
              status: "CANCELLED",
              updatedAt: new Date().toISOString(),
              refundStatus:
                order.paymentStatus === "PAID" &&
                order.paymentMethod === "BANK_TRANSFER"
                  ? "PENDING"
                  : order.refundStatus,
              timeline: [
                ...order.timeline.map((step) => ({ ...step, current: false })),
                {
                  status: "CANCELLED",
                  title: getTranslator(getBrowserLocale())("business.orderprovider.orderCancelled"),
                  description: reason.trim(),
                  time: new Date().toISOString(),
                  done: true,
                  current: true,
                },
              ],
            };
          }),
        }));
      }
    },
    [setWorkspace],
  );

  const reorder = useCallback(
    async (order: Order) => {
      try {
        const beOrder = await orderApi.reorder(order.id);
        if (beOrder) {
          const mapped = mapBackendOrderToOrder(beOrder);
          setWorkspace((prev) => ({
            ...prev,
            orders: [ensureDemoShipment(mapped), ...prev.orders],
          }));
          return;
        }
      } catch (err) {
        console.warn("Backend reorder error, putting items back into cart:", err);
      }
      const incoming: CartItem[] = order.items.map((item) => ({
        id: crypto.randomUUID(),
        slug: item.slug ?? `reorder-${order.id}-${item.id}`,
        name: item.itemName,
        category: getTranslator(getBrowserLocale())("business.orderprovider.reorder"),
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
        (order) => order.id === id,
      );
      if (!previous) return { ok: false, message: getTranslator(getBrowserLocale())("business.orderprovider.orderNotFound") };
      const result = applyDemoAction(previous, action, DEMO_CONTROLS_ENABLED);
      if (result.ok)
        setWorkspace((prev) => ({
          ...prev,
          orders: prev.orders.map((order) =>
            order.id === id ? result.order : order,
          ),
        }));
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
