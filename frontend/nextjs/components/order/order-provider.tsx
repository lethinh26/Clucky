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
import type { CartItem, CartItemOption, CartItemTopping, Order } from "@/lib/types/order";
import {
  cartApi,
  catalogApi,
  type ProductItem,
  type StoreItem,
  orderApi,
  type BackendOrder,
  type BackendCartDto,
  type CreateOrderPayload,
} from "@/lib/api";
import { stores as FALLBACK_STORES } from "@/lib/products";

const storageKey = "clucky-order-workspace-v1";

function resolveStoreMeta(
  storeId: number | string | undefined,
  storesList: Pick<StoreItem, "id" | "name" | "address">[] = FALLBACK_STORES
): { storeName: string; storeAddress?: string } {
  const numericId = Number(storeId);
  const found =
    storesList.find((s) => Number(s.id) === numericId) ??
    FALLBACK_STORES.find((s) => Number(s.id) === numericId);
  return {
    storeName: found?.name || `Clucky #${storeId}`,
    storeAddress: found?.address,
  };
}

export function mapBackendOrderToOrder(
  be: BackendOrder,
  storesList: Pick<StoreItem, "id" | "name" | "address">[] = FALLBACK_STORES
): Order {
  const statusMap: Record<string, Order["status"]> = {
    PENDING_PAYMENT: "PENDING_PAYMENT",
    CONFIRMED: "CONFIRMED",
    PREPARING: "PREPARING",
    READY: "READY",
    SHIPPING: "SHIPPING",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    DELIVERY_FAILED: "DELIVERY_FAILED",
  };
  const currentStatus = statusMap[be.status] || "CONFIRMED";
  const normalizeOptions = (raw: unknown): CartItemOption[] => {
    if (!raw) return [];
    let parsed = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((o) => o != null)
      .map((o, idx) =>
        typeof o === "object"
          ? {
              id: Number((o as any).id ?? idx),
              groupName: String((o as any).groupName ?? ""),
              name: String((o as any).name ?? ""),
              extraPrice: Number((o as any).extraPrice ?? 0),
            }
          : {
              id: Number(o) || idx,
              groupName: "",
              name: `#${o}`,
              extraPrice: 0,
            }
      )
      .filter((o) => o.name);
  };

  const normalizeToppings = (raw: unknown): CartItemTopping[] => {
    if (!raw) return [];
    let parsed = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t != null)
      .map((t, idx) =>
        typeof t === "object"
          ? {
              id: Number((t as any).id ?? idx),
              name: String((t as any).name ?? ""),
              extraPrice: Number((t as any).extraPrice ?? 0),
            }
          : {
              id: Number(t) || idx,
              name: `#${t}`,
              extraPrice: 0,
            }
      )
      .filter((t) => t.name);
  };

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
    optionsSnapshot: normalizeOptions(it.optionsSnapshot),
    toppingsSnapshot: normalizeToppings(it.toppingsSnapshot),
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

  const storeMeta = resolveStoreMeta(be.storeId, storesList);

  return {
    id: String(be.id),
    orderCode: be.orderCode,
    storeId: String(be.storeId),
    storeName: storeMeta.storeName,
    storeAddress: storeMeta.storeAddress,
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
    refundStatus: (be as any).refundStatus,
    refundData: (be as any).refundData,
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
  const storesListRef = useRef<Pick<StoreItem, "id" | "name" | "address">[]>(FALLBACK_STORES);

  useEffect(() => {
    let active = true;
    catalogApi.getStores(false).then((storesData) => {
      if (!active || !Array.isArray(storesData) || storesData.length === 0) return;
      storesListRef.current = storesData;
      setWorkspace((previous) => {
        if (!previous.orders.length) return previous;
        let changed = false;
        const orders = previous.orders.map((ord) => {
          const meta = resolveStoreMeta(ord.storeId, storesData);
          if (ord.storeName === meta.storeName && ord.storeAddress === meta.storeAddress) return ord;
          changed = true;
          return { ...ord, storeName: meta.storeName, storeAddress: meta.storeAddress };
        });
        return changed ? { ...previous, orders } : previous;
      });
    }).catch(() => {});
    return () => { active = false; };
  }, [setWorkspace]);

  useEffect(() => {
    const needsOrderImages = workspace.orders.some(order => order.items.some(item => !item.image || item.image === "/images/food-placeholder.svg"));
    const needsCartImages = workspace.items.some(item => !item.image || item.image === "/images/food-placeholder.svg");
    if (!needsOrderImages && !needsCartImages) return;
    let active = true;
    const revision = getSessionState().revision;
    catalogForImages.current ??= catalogApi.getProducts();
    catalogForImages.current.then(products => {
      if (!active || revision !== getSessionState().revision) return;
      const imgMap = new Map(products.map(p => [`${p.comboItems !== undefined ? "COMBO" : "PRODUCT"}:${p.id}`, p.imageUrl || p.image]));
      setWorkspace(previous => {
        const orders = fillOrderImages(previous.orders, products);
        const ordersChanged = orders.some((order, index) => order !== previous.orders[index]);
        let cartChanged = false;
        const items = previous.items.map(item => {
          if (item.image && item.image !== "/images/food-placeholder.svg") return item;
          const typeKey = item.comboId != null ? "COMBO" : "PRODUCT";
          const idKey = item.comboId ?? item.productId;
          const img = imgMap.get(`${typeKey}:${idKey}`);
          if (!img) return item;
          cartChanged = true;
          return { ...item, image: img };
        });
        if (!ordersChanged && !cartChanged) return previous;
        return {
          items: cartChanged ? items : previous.items,
          orders: ordersChanged ? orders : previous.orders,
        };
      });
    }).catch(() => { catalogForImages.current = null; });
    return () => { active = false; };
  }, [workspace.orders, workspace.items, setWorkspace]);

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
  }, [setWorkspace, loadedRevision, ready, session.error, errorMessage]);

  const refreshOrders = useCallback(async () => {
    if (!getSessionState().user) return;
    const revision = getSessionState().revision;
    try {
      const collected: BackendOrder[] = [];
      for (let pageIndex = 0; ; pageIndex++) {
        const page = await orderApi.getMyOrders(pageIndex, 100);
        if (revision !== getSessionState().revision) return;
        if (!page || !Array.isArray(page.content)) break;
        collected.push(...page.content);
        if (page.content.length < 100 || (typeof page.totalPages === "number" && pageIndex + 1 >= page.totalPages)) {
          break;
        }
      }
      setOrdersError(null);
      const serverOrders = collected.map((be) => mapBackendOrderToOrder(be, storesListRef.current));
      setWorkspace((prev) => ({
        ...prev,
        orders: serverOrders,
      }));
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
      const mappedOrder = mapBackendOrderToOrder(backendOrder, storesListRef.current);
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
        const mapped = mapBackendOrderToOrder(updatedBackend, storesListRef.current);
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
