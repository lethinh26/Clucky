"use client";
import { useFeedback, notify } from "@/components/feedback";
import { getBrowserLocale } from "@/lib/i18n/locale";
import { getTranslator } from "@/lib/i18n/translator";
import { useLocaleTools } from "@/lib/i18n/hooks";
import { useSession } from "@/components/auth/use-session";
import { getSessionState } from "@/lib/session";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { cartTotals, mapBackendCart, toCartPayload } from "@/lib/cart";
import { fillOrderImages } from "@/lib/order-images";
import {
  applyDemoAction,
  ensureDemoShipment,
  DEMO_CONTROLS_ENABLED,
  type DemoAction,
} from "@/lib/order-demo";
import type { CartItem, Order } from "@/lib/types/order";
import {
  cartApi,
  catalogApi,
  type ProductItem,
  orderApi,
  type BackendOrder,
  type BackendCartDto,
  type CreateOrderPayload,
} from "@/lib/api";

const storageKey = "clucky-order-workspace-v1";

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
    productId: it.productId,
    comboId: it.comboId,
    slug: String(it.productId || it.comboId || it.id),
    itemName: it.itemName,
    itemType: it.itemType,
    unitPrice: Number(it.unitPrice),
    quantity: it.quantity,
    image: it.imageUrl || "/images/food-placeholder.svg",
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
    paymentStatus: be.paymentStatus ?? "UNKNOWN",
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
  const session = useSession();
  const userId = session.user?.userId;
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
  const [loadedRevision, setLoadedRevision] = useState(-1);
  const [storageError, setStorageError] = useState(false);
  const [cartPending, setCartPending] = useState(false);
  const [cartError, setCartError] = useState<unknown>(null);
  const [ordersError, setOrdersError] = useState<unknown>(null);
  useFeedback(ordersError ? errorMessage(ordersError) : null);
  useFeedback(cartError ? errorMessage(cartError) : session.error ? errorMessage(session.error) : null);
  const cartBusy = useRef(false);
  const catalogForImages = useRef<Promise<ProductItem[]> | null>(null);
  useEffect(() => {
    if (!workspace.orders.some(order => order.items.some(item => !item.image || item.image === "/images/food-placeholder.svg"))) return;
    let active = true;
    const revision = getSessionState().revision;
    catalogForImages.current ??= catalogApi.getProducts();
    catalogForImages.current.then(products => {
      if (!active || revision !== getSessionState().revision) return;
      setWorkspace(previous => {
        const orders = fillOrderImages(previous.orders, products);
        return orders.some((order, index) => order !== previous.orders[index]) ? { ...previous, orders } : previous;
      });
    }).catch(() => { catalogForImages.current = null; });
    return () => { active = false; };
  }, [workspace.orders, setWorkspace]);

  const mutateCart = useCallback(async (
    request: () => Promise<BackendCartDto>,
    incoming: CartItem[] = [],
  ) => {
    if (cartBusy.current || loadedRevision !== getSessionState().revision || !ready || session.error) {
      notify.warning(session.error ? errorMessage(session.error) : getTranslator(getBrowserLocale())("common.feedback.cartBusy"));
      return false;
    }
    const revision = getSessionState().revision;
    cartBusy.current = true;
    setCartPending(true);
    setCartError(null);
    try {
      const cart = await request();
      if (revision !== getSessionState().revision) return false;
      setWorkspace((previous) => ({
        ...previous,
        items: mapBackendCart(cart, [...previous.items, ...incoming]),
      }));
      return true;
    } catch (error) {
      if (revision === getSessionState().revision) setCartError(error);
      return false;
    } finally {
      cartBusy.current = false;
      setCartPending(false);
    }
  }, [setWorkspace, loadedRevision, ready, session.error]);

  const refreshOrders = useCallback(async () => {
    if (!getSessionState().user) return;
    const revision = getSessionState().revision;
    try {
      const page = await orderApi.getMyOrders(0, 50);
      if (revision !== getSessionState().revision) return;
      setOrdersError(null);
      if (page && Array.isArray(page.content)) {
        const serverOrders = page.content.map(mapBackendOrderToOrder);
        setWorkspace((prev) => ({
          ...prev,
          orders: serverOrders,
        }));
      }
    } catch (error) {
      if (revision === getSessionState().revision) setOrdersError(error);
    }
  }, [setWorkspace]);

  useEffect(() => {
    if (!session.ready || session.error) return;
    let cancelled = false;
    const revision = getSessionState().revision;
    setReady(false);
    setCartError(null);
    setWorkspace({ items: [], orders: [] });
    setOrdersError(null);
    try { localStorage.removeItem(storageKey); } catch { setStorageError(true); }
    const loadCart = async () => {
      if (userId) {
        const merge = async () => {
          const guestSession = localStorage.getItem("clucky_guest_session_id");
          if (!guestSession || cancelled) return;
          try {
            await cartApi.mergeCart(guestSession);
            localStorage.removeItem("clucky_guest_session_id");
            localStorage.removeItem(storageKey);
          } catch (error) {
            if (!cancelled) setCartError(error);
          }
        };
        if (navigator.locks) await navigator.locks.request("clucky-customer-cart-merge", merge);
        else await merge();
      }
      if (cancelled) return null;
      return cartApi.getCart();
    };
    loadCart()
      .then((cartDto) => {
        if (!cancelled && cartDto && Array.isArray(cartDto.items)) {
          setWorkspace((prev) => ({ ...prev, items: mapBackendCart(cartDto, prev.items) }));
        }
      })
      .catch((error) => { if (!cancelled) setCartError(error); })
      .finally(() => { if (!cancelled) { setReady(true); setLoadedRevision(revision); } });

    // Sync orders with backend if user has token
    if (userId) void refreshOrders();

    return () => { cancelled = true; };
  }, [setWorkspace, refreshOrders, userId, session.ready, session.error, session.revision]);

  const addItem = useCallback(
    async (item: CartItem) => {
      const added = await mutateCart(() => cartApi.addItem(toCartPayload(item)), [item]);
      if (added) notify.success(getTranslator(getBrowserLocale())("common.feedback.cartAdded"));
      return added;
    },
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
      const revision = getSessionState().revision;
      const backendOrder = await orderApi.create(payload);
      if (revision !== getSessionState().revision) throw { code: "UNAUTHENTICATED", status: 401 };
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
        const revision = getSessionState().revision;
        const updatedBackend = await orderApi.cancel(id, reason);
        if (revision !== getSessionState().revision) return;
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
      ...(loadedRevision === session.revision ? workspace : { items: [], orders: [] }),
      ...(loadedRevision === session.revision ? totals : { count: 0, subtotal: 0 }),
      ready: (ready && session.ready && loadedRevision === session.revision) || Boolean(session.error),
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
      loadedRevision,
      session.ready,
      session.error,
      session.revision,
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

      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrder requires OrderProvider");
  return context;
}
