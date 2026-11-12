import { getBrowserLocale } from "../i18n/locale";
import { useFeedback } from "../components/feedback";
import { getTranslator } from "../i18n/translator";
import { useTranslation } from "react-i18next";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AdminOrder, AdminOrderStatus } from "../types/order";

import {

  orderStatusLabels,
  type AdminDemoAction,
} from "../lib/order-demo";
import { useAuthState } from "./AuthContext";
import { getSessionState } from "../lib/session";
import { loadOrderItemImages, orderItemImage, type OrderItemImages } from "../lib/order-item-images";
import {
  ordersApi,
  paymentsApi,
  getErrorMessage,
  refundsApi,
  storesApi,
  type BackendOrder,
  type BackendRefund,
  type Store,
} from "../lib/api";

export interface StoreOpenState {
  isOpen: boolean;
  statusCode: "OPEN" | "OUTSIDE_HOURS" | "CLOSED_TEMP" | "CLOSED";
  statusLabel: string;
  bannerTitle: string;
  bannerDescription: string;
  openTime: string;
  closeTime: string;
  currentTimeVn: string;
}

function parseMinutes(hhmm?: string): number | null {
  if (!hhmm) return null;
  const parts = hhmm.trim().split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function getCurrentVnMinutes(): { minutes: number; formatted: string } {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const mins = parseMinutes(formatted);
  return {
    minutes: mins ?? now.getHours() * 60 + now.getMinutes(),
    formatted,
  };
}

export function evaluateStoreOpenState(store: Store | null | undefined): StoreOpenState {
  const t = getTranslator(getBrowserLocale());
  const { minutes: nowMins, formatted: currentTimeVn } = getCurrentVnMinutes();
  const openTime = (store?.openTime || "09:00").slice(0, 5);
  const closeTime = (store?.closeTime || "22:30").slice(0, 5);
  const storeName = store?.name || "Clucky";

  if (!store) {
    return {
      isOpen: true,
      statusCode: "OPEN",
      statusLabel: t("business:storeStatus.openShiftLabel", { openTime, closeTime }),
      bannerTitle: t("business:storeStatus.openBannerTitle"),
      bannerDescription: "",
      openTime,
      closeTime,
      currentTimeVn,
    };
  }

  const rawStatus = String(store.status || "OPEN");
  if (rawStatus === "CLOSED_TEMP") {
    return {
      isOpen: false,
      statusCode: "CLOSED_TEMP",
      statusLabel: t("business:storeStatus.closedTempLabel", { openTime, closeTime }),
      bannerTitle: t("business:storeStatus.closedTempBannerTitle", { storeName }),
      bannerDescription: t("business:storeStatus.closedTempBannerDesc", { openTime, closeTime }),
      openTime,
      closeTime,
      currentTimeVn,
    };
  }

  if (rawStatus === "CLOSED" || rawStatus === "INACTIVE") {
    return {
      isOpen: false,
      statusCode: "CLOSED",
      statusLabel: t("business:storeStatus.closedLabel", { openTime, closeTime }),
      bannerTitle: t("business:storeStatus.closedBannerTitle", { storeName }),
      bannerDescription: t("business:storeStatus.closedBannerDesc", { openTime, closeTime }),
      openTime,
      closeTime,
      currentTimeVn,
    };
  }

  const openMins = parseMinutes(openTime);
  const closeMins = parseMinutes(closeTime);
  let withinHours = true;
  if (openMins !== null && closeMins !== null) {
    if (openMins <= closeMins) {
      withinHours = nowMins >= openMins && nowMins <= closeMins;
    } else {
      withinHours = nowMins >= openMins || nowMins <= closeMins;
    }
  }

  if (store.isOpenNow === false || !withinHours) {
    return {
      isOpen: false,
      statusCode: "OUTSIDE_HOURS",
      statusLabel: t("business:storeStatus.outsideHoursLabel", { openTime, closeTime }),
      bannerTitle: t("business:storeStatus.outsideHoursBannerTitle", { openTime, closeTime }),
      bannerDescription: t("business:storeStatus.outsideHoursBannerDesc", {
        currentTime: currentTimeVn,
        storeName,
        openTime,
        closeTime,
      }),
      openTime,
      closeTime,
      currentTimeVn,
    };
  }

  return {
    isOpen: true,
    statusCode: "OPEN",
    statusLabel: t("business:storeStatus.openShiftLabel", { openTime, closeTime }),
    bannerTitle: t("business:storeStatus.openBannerTitle"),
    bannerDescription: "",
    openTime,
    closeTime,
    currentTimeVn,
  };
}

const storageKey = "clucky-admin-orders-demo-v2";

function mapBackendOrderToAdminOrder(be: BackendOrder, images: OrderItemImages = new Map()): AdminOrder {
  const statusMap: Record<string, AdminOrderStatus> = {
    PENDING_PAYMENT: "PENDING_PAYMENT",
    CONFIRMED: "CONFIRMED",
    PREPARING: "PREPARING",
    READY: "READY",
    SHIPPING: "SHIPPING",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  };
  const status = statusMap[be.status] || "CONFIRMED";

  const items = (be.items || []).map((it) => ({
    id: String(it.id),
    itemName: it.itemName,
    quantity: it.quantity,
    unitPrice: Number(it.unitPrice),
    lineTotal: Number(it.lineTotal),
    options: it.optionsSnapshot ? JSON.stringify(it.optionsSnapshot) : undefined,
    image: orderItemImage(it, images),
    note: it.note,
  }));

  const timeline = (be.timeline && be.timeline.length > 0)
    ? be.timeline.map((tl) => ({
        status: statusMap[tl.toStatus] || "CONFIRMED",
        title: orderStatusLabels[statusMap[tl.toStatus] || "CONFIRMED"] || tl.toStatus,
        description: tl.reason || tl.toStatus,
        time: tl.createdAt,
        actor: tl.changedRole,
      }))
    : [
        {
          status,
          title: orderStatusLabels[status] || status,
          description: status,
          time: be.createdAt,
        },
      ];

  return {
    id: String(be.id),
    orderCode: be.orderCode,
    queueNumber: be.queueNumber ?? undefined,
    customerName: be.receiverName || `Customer #${be.customerId}`,
    customerPhone: be.receiverPhone || "",
    storeId: String(be.storeId),
    storeName: `Clucky #${be.storeId}`,
    orderType: be.type || "DELIVERY",
    status,
    paymentMethod: (be.paymentMethod as AdminOrder["paymentMethod"]) || (status === "PENDING_PAYMENT" ? "BANK_TRANSFER" : "COD"),
    paymentStatus: be.paymentStatus ?? "UNKNOWN",
    items,
    subtotal: Number(be.subtotal),
    discount: Number(be.discountAmount || 0),
    shippingFee: Number(be.shippingFee || 0),
    total: Number(be.totalAmount),
    deliveryAddress: be.deliveryAddress,
    note: be.note,
    time: be.createdAt,
    createdAt: be.createdAt,
    updatedAt: be.updatedAt,
    timeline,
  };
}

function initialOrders(): AdminOrder[] {
  return [];
}

interface OrderWorkspace {
  orders: AdminOrder[];
  stores: Store[];
  currentStore: Store | null;
  storeOpenState: StoreOpenState;
  loading: boolean;
  storageError: string;
  actionError: string;
  updateStatus: (
    id: string,
    status: AdminOrderStatus,
    reason?: string,
  ) => Promise<boolean>;
  confirmCOD: (id: string) => Promise<boolean>;
  reviewRefund: (
    id: string,
    action: "APPROVED" | "REJECTED",
    note: string,
  ) => Promise<boolean>;
  createRefund: (data: {
    orderId: number;
    reason: string;
    bankBin: string;
    bankName?: string;
    bankAccountNo: string;
    bankAccountName: string;
  }) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
  refreshStores: () => Promise<void>;
}

const OrderContext = createContext<OrderWorkspace | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [allOrders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [stores, setStores] = useState<Store[]>([]);
  const [clockTick, setClockTick] = useState(0);
  const latest = useRef(allOrders);
  const [loading, setLoading] = useState(true);
  const [loadedRevision, setLoadedRevision] = useState(-1);

  const [actionError, setActionError] = useState("");
  useFeedback(actionError);
  const [loadError, setLoadError] = useState("");
  useFeedback(loadError);
  const storageError = loadError;
  const { user } = useAuthState();
  const { i18n } = useTranslation();

  const fetchStores = useCallback(async (signal?: AbortSignal) => {
    if (!user) return;
    const revision = getSessionState().revision;
    try {
      const list = await storesApi.list(undefined, signal);
      if (signal?.aborted || revision !== getSessionState().revision) return;
      if (Array.isArray(list)) {
        setStores(list);
      }
    } catch {
      // Ignore background store fetch errors so no false toast pops up
    }
  }, [user]);

  const refreshStores = useCallback(() => fetchStores(), [fetchStores]);

  useEffect(() => {
    setStores([]);
    if (!user) {
      return;
    }
    const controller = new AbortController();
    void fetchStores(controller.signal);
    const timer = window.setInterval(() => {
      void fetchStores(controller.signal);
      setClockTick((t) => t + 1);
    }, 30000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [user, fetchStores]);

  const currentStore = useMemo(() => {
    if (!stores.length) return null;
    const targetStoreId = user?.storeId ? Number(user.storeId) : 1;
    return stores.find((s) => Number(s.id) === targetStoreId) || stores[0] || null;
  }, [stores, user?.storeId]);

  const storeOpenState = useMemo(() => {
    void clockTick;
    void i18n.language;
    return evaluateStoreOpenState(currentStore);
  }, [currentStore, clockTick, i18n.language]);

  const refreshOrders = useCallback(async () => {
    if (!user) return;
    const revision = getSessionState().revision;
    try {
      const storeIdParam =
        user?.role === "ADMIN" || !user?.storeId ? undefined : Number(user.storeId);
      const canReadRefunds = user?.role === "ADMIN" || user?.role === "STORE_MANAGER";
      const [remoteOrders, remoteRefunds, images] = await Promise.all([
        ordersApi.list({ storeId: storeIdParam }),
        canReadRefunds
          ? refundsApi.list({ storeId: storeIdParam }).catch(() => [] as BackendRefund[])
          : Promise.resolve([] as BackendRefund[]),
        loadOrderItemImages(),
      ]);
      if (revision !== getSessionState().revision) return;
      if (Array.isArray(remoteOrders)) {
        const refundByOrderId = new Map<number, BackendRefund>();
        if (Array.isArray(remoteRefunds)) {
          for (const ref of remoteRefunds) {
            if (ref.orderId != null) {
              refundByOrderId.set(Number(ref.orderId), ref);
            }
          }
        }
        const mapped = remoteOrders.map((bo) => {
            const adminOrder = mapBackendOrderToAdminOrder(bo, images);
            const storeMatch = stores.find((s) => Number(s.id) === Number(bo.storeId));
            if (storeMatch) {
              adminOrder.storeName = storeMatch.name;
            }
            const ref = refundByOrderId.get(Number(bo.id));
            if (ref) {
              adminOrder.hasRefundRequest = ["PENDING", "APPROVED", "PROCESSING", "WAITING_BANK_DETAILS"].includes(ref.status);
              adminOrder.refundRequestId = ref.id;
              adminOrder.refundReason = ref.reason;
              adminOrder.refundAmount = Number(ref.amount);
              adminOrder.refundStatus = ref.status as any;
              adminOrder.refundData = ref;
            }
            return adminOrder;
          });
        latest.current = mapped;
        setOrders(mapped);
        setLoadedRevision(revision);
        setLoadError("");
      }
    } catch (error) {
      if (revision === getSessionState().revision) {
        latest.current = [];
        setOrders([]);
        setLoadError(getErrorMessage(error));
      }
    }
  }, [user, stores]);

  useEffect(() => {
    latest.current = [];
    setOrders([]);
    setActionError("");
    setLoadError("");
    try { localStorage.removeItem(storageKey); } catch {}
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    void refreshOrders().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, refreshOrders]);

  const orders = useMemo(
    () =>
      (loadedRevision === getSessionState().revision ? allOrders : []).filter(
        (order) =>
          user && (user.role === "ADMIN" || order.storeId === String(user.storeId)),
      ),
    [allOrders, user, loadedRevision],
  );

  const perform = useCallback(
    async (id: string, action: AdminDemoAction): Promise<boolean> => {
      if (!user) return false;
      const revision = getSessionState().revision;
      const order = latest.current.find((entry) => entry.id === id);
      const translate = getTranslator(getBrowserLocale());
      if (!order) {
        setActionError(translate("errors:RESOURCE_NOT_FOUND"));
        return false;
      }
      setActionError("");
      try {
        if (action.type === "STATUS") {
          const saved = await ordersApi.updateStatus(id, action.status, action.reason);
          if (revision !== getSessionState().revision) return false;
          latest.current = latest.current.map((entry) => {
            if (entry.id !== id) return entry;
            const updated = mapBackendOrderToAdminOrder(saved);
            return { ...entry, ...updated, items: updated.items.map(item => ({
              ...item, image: entry.items.find(previous => previous.id === item.id)?.image ?? item.image,
            })) };
          });
        } else if (action.type === "COD") {
          await paymentsApi.collectCod(id);
          if (revision !== getSessionState().revision) return false;
          await refreshOrders();
          return true;
        } else {
          if (!order.refundRequestId) {
            setActionError(translate("errors:RESOURCE_NOT_FOUND"));
            return false;
          }
          const saved = await refundsApi.review(order.refundRequestId,
            action.decision === "APPROVED" ? "APPROVE" : "REJECT", action.note);
          if (revision !== getSessionState().revision) return false;
          latest.current = latest.current.map((entry) => entry.id === id
            ? { ...entry, refundStatus: saved.status, hasRefundRequest: saved.status === "PENDING" } : entry);
        }
        setOrders(latest.current);
        return true;
      } catch (error) {
        if (revision !== getSessionState().revision) return false;
        setActionError(getErrorMessage(error));
        await refreshOrders();
        return false;
      }
    },
    [user, refreshOrders],
  );

  const updateStatus = useCallback(
    (id: string, status: AdminOrderStatus, reason?: string) =>
      perform(id, { type: "STATUS", status, reason }),
    [perform],
  );

  const confirmCOD = useCallback(
    (id: string) => perform(id, { type: "COD" }),
    [perform],
  );

  const reviewRefund = useCallback(
    (id: string, decision: "APPROVED" | "REJECTED", note: string) =>
      perform(id, { type: "REFUND", decision, note }),
    [perform],
  );

  const createRefund = useCallback(
    async (data: { orderId: number; reason: string; bankBin: string; bankName?: string; bankAccountNo: string; bankAccountName: string }) => {
      try {
        await refundsApi.create(data);
        await refreshOrders();
        return true;
      } catch (error) {
        setActionError(getErrorMessage(error));
        return false;
      }
    },
    [refreshOrders]
  );

  const value = useMemo(
    () => ({
      orders,
      stores,
      currentStore,
      storeOpenState,
      loading,
      storageError,
      actionError,
      updateStatus,
      confirmCOD,
      reviewRefund,
      createRefund,
      refreshOrders,
      refreshStores,
    }),
    [
      orders,
      stores,
      currentStore,
      storeOpenState,
      loading,
      storageError,
      actionError,
      updateStatus,
      confirmCOD,
      reviewRefund,
      createRefund,
      refreshOrders,
      refreshStores,
    ],
  );

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrders requires OrderProvider");
  return context;
}
