"use client";
import { getBrowserLocale } from "@/lib/i18n/locale";
import { getTranslator } from "@/lib/i18n/translator";
import { useLocaleTools } from "@/lib/i18n/hooks";

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
import { cartTotals, mapBackendCart, toCartPayload } from "@/lib/cart";
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
  type BackendCartDto,
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
    optionIds: z.array(z.number().int().positive()).optional(),
    toppingIds: z.array(z.number().int().positive()).optional(),
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
          id: z.number().optional(),
          groupName: z.string(),
          name: z.string(),
          extraPrice: z.number(),
        }),
      )
      .optional(),
    toppings: z
      .array(z.object({ id: z.number().optional(), name: z.string(), extraPrice: z.number() }))
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
    paymentMethod: (be.paymentMethod as Order["paymentMethod"]) || (be.status === "PENDING_PAYMENT" ? "BANK_TRANSFER" : "COD"),
    paymentStatus: be.status === "CANCELLED"
      ? "FAILED"
      : (be.paymentMethod === "BANK_TRANSFER" || be.status === "PENDING_PAYMENT")
        ? (be.status === "PENDING_PAYMENT" ? "PENDING" : "PAID")
        : (be.status === "COMPLETED" ? "PAID" : "PENDING"),
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

interface OrderContextValue {
  items: CartItem[];
  orders: Order[];
  count: number;
  subtotal: number;
  ready: boolean;
  cartPending: boolean;
  storageError: boolean;
  demoEnabled: boolean;
  runDemoAction: (
    id: string,
    action: DemoAction,
  ) => { ok: boolean; message: string };
  addItem: (item: CartItem) => Promise<boolean>;
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
  const { errorMessage } = useLocaleTools();
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
  const [cartPending, setCartPending] = useState(false);
  const [cartError, setCartError] = useState<unknown>(null);
  const cartBusy = useRef(false);

  const mutateCart = useCallback(async (
    request: () => Promise<BackendCartDto>,
    incoming: CartItem[] = [],
  ) => {
    if (cartBusy.current) return false;
    cartBusy.current = true;
    setCartPending(true);
    setCartError(null);
    try {
      const cart = await request();
      setWorkspace((previous) => ({
        ...previous,
        items: mapBackendCart(cart, [...previous.items, ...incoming]),
      }));
      return true;
    } catch (error) {
      setCartError(error);
      return false;
    } finally {
      cartBusy.current = false;
      setCartPending(false);
    }
  }, [setWorkspace]);

  const refreshOrders = useCallback(async () => {
    try {
      const page = await orderApi.getMyOrders(0, 50);
      if (page && Array.isArray(page.content)) {
        const serverOrders = page.content.map(mapBackendOrderToOrder);
        setWorkspace((prev) => ({
          ...prev,
          orders: serverOrders,
        }));
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
        let orders = parsedOrders.success
          ? (parsedOrders.data as Order[]).map(ensureDemoShipment)
          : [];
        orders = orders.filter((o) => !o.id.startsWith("demo-") && !o.orderCode.startsWith("DEMO-") && !o.orderCode.startsWith("CLU-24"));
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
    // Sync with Redis Cart backend
    cartApi.getCart()
      .then((cartDto) => {
        if (cartDto && Array.isArray(cartDto.items)) {
          setWorkspace((prev) => ({ ...prev, items: mapBackendCart(cartDto, prev.items) }));
        }
      })
      .catch((error) => setCartError(error))
      .finally(() => setReady(true));

    // Sync orders with backend if user has token
    refreshOrders();

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
    (item: CartItem) => mutateCart(() => cartApi.addItem(toCartPayload(item)), [item]),
    [mutateCart],
  );

  const updateQuantity = useCallback(
    (id: string, delta: number) => {
      void mutateCart(() => {
        const item = workspaceRef.current.items.find((entry) => entry.id === id);
        if (!item?.itemKey) throw { code: "RESOURCE_NOT_FOUND" };
        const quantity = item.quantity + delta;
        return quantity > 0 ? cartApi.updateItem(item.itemKey, quantity) : cartApi.removeItem(item.itemKey);
      });
    },
    [mutateCart],
  );

  const updateNote = useCallback(
    (id: string, note: string) => {
      void mutateCart(() => {
        const item = workspaceRef.current.items.find((entry) => entry.id === id);
        if (!item?.itemKey) throw { code: "RESOURCE_NOT_FOUND" };
        return cartApi.updateItem(item.itemKey, item.quantity, note);
      });
    },
    [mutateCart],
  );

  const removeItem = useCallback(
    (id: string) => {
      void mutateCart(() => {
        const item = workspaceRef.current.items.find((entry) => entry.id === id);
        if (!item?.itemKey) throw { code: "RESOURCE_NOT_FOUND" };
        return cartApi.removeItem(item.itemKey);
      });
    },
    [mutateCart],
  );

  const clearCart = useCallback(() => {
    void mutateCart(cartApi.clearCart);
  }, [mutateCart]);

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
      if (cartBusy.current) throw { code: "RESOURCE_CONFLICT" };
      const backendOrder = await orderApi.create(payload);
      const mappedOrder = mapBackendOrderToOrder(backendOrder);
      setWorkspace((prev) => ({
        items: [],
        orders: [ensureDemoShipment(mappedOrder), ...prev.orders],
      }));
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
        console.error("Cancel order backend error:", err);
        throw err;
      }
    },
    [setWorkspace],
  );

  const reorder = useCallback(
    async (order: Order) => {
      if (!await mutateCart(() => orderApi.reorder(order.id))) {
        throw { code: "UPSTREAM_ERROR" };
      }
    },
    [mutateCart],
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
      cartPending,
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
      cartPending,
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
    <OrderContext.Provider value={value}>
      {cartError != null && <p role="alert" className="container">{errorMessage(cartError)}</p>}
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrder requires OrderProvider");
  return context;
}
