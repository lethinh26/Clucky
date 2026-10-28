"use client";

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
  DEMO_CONTROLS_ENABLED,
  type DemoAction,
} from "@/lib/order-demo";
import { MOCK_ORDERS } from "@/lib/mock/order-mock-data";
import type { CartItem, Order } from "@/lib/types/order";
import { useNavigationLoader } from "@/components/ui-loader";

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

interface OrderContextValue {
  items: CartItem[];
  orders: Order[];
  count: number;
  subtotal: number;
  ready: boolean;
  storageError: boolean;
  demoEnabled: boolean;
  isNavigating: boolean;
  navigationMessage: string | null;
  startNavigating: (message?: string) => void;
  stopNavigating: () => void;
  runDemoAction: (
    id: string,
    action: DemoAction,
  ) => { ok: boolean; message: string };
  addItem: (item: CartItem) => void;
  updateQuantity: (id: string, delta: number) => void;
  updateNote: (id: string, note: string) => void;
  removeItem: (id: string) => void;
  placeDemoOrder: (order: Order) => void;
  cancelOrder: (id: string, reason: string) => void;
  reorder: (order: Order) => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const {
    isLoading: isNavigating,
    message: navigationMessage,
    startLoading: startNavigating,
    stopLoading: stopNavigating,
  } = useNavigationLoader();

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

  useEffect(() => {
    const restore = (raw: string | null) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        const items = cartSchema.parse(saved.items) as CartItem[];
        // Demo orders are local UI data; never treated as confirmed server orders.
        const parsedOrders = savedOrdersSchema.safeParse(saved.orders);
        const orders = parsedOrders.success
          ? (parsedOrders.data as Order[])
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
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey) {
        if (event.newValue) restore(event.newValue);
        else setWorkspace({ items: [], orders: MOCK_ORDERS });
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [setWorkspace]);

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
    },
    [setWorkspace],
  );
  const updateQuantity = useCallback(
    (id: string, delta: number) => {
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
    },
    [setWorkspace],
  );
  const removeItem = useCallback(
    (id: string) => {
      setWorkspace((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      }));
    },
    [setWorkspace],
  );
  const placeDemoOrder = useCallback(
    (order: Order) => {
      setWorkspace((prev) =>
        prev.orders.some((entry) => entry.id === order.id)
          ? prev
          : { items: [], orders: [order, ...prev.orders] },
      );
    },
    [setWorkspace],
  );
  const cancelOrder = useCallback(
    (id: string, reason: string) => {
      if (!reason.trim()) return;
      setWorkspace((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => {
          if (
            order.id !== id ||
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
                title: "Đã hủy đơn",
                description: reason.trim(),
                time: new Date().toISOString(),
                done: true,
                current: true,
              },
            ],
          };
        }),
      }));
    },
    [setWorkspace],
  );
  const reorder = useCallback(
    (order: Order) => {
      const incoming: CartItem[] = order.items.map((item) => ({
        id: crypto.randomUUID(),
        slug: item.slug ?? `reorder-${order.id}-${item.id}`,
        name: item.itemName,
        category: "Đặt lại",
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
      if (!previous) return { ok: false, message: "Không tìm thấy đơn hàng." };
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
      isNavigating,
      navigationMessage,
      startNavigating,
      stopNavigating,
      runDemoAction,
      addItem,
      updateQuantity,
      updateNote,
      removeItem,
      placeDemoOrder,
      cancelOrder,
      reorder,
    }),
    [
      workspace,
      totals,
      ready,
      storageError,
      isNavigating,
      navigationMessage,
      startNavigating,
      stopNavigating,
      runDemoAction,
      addItem,
      updateQuantity,
      updateNote,
      removeItem,
      placeDemoOrder,
      cancelOrder,
      reorder,
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
