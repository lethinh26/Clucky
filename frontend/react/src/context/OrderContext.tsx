import { getBrowserLocale } from "../i18n/locale";
import { useFeedback } from "../components/feedback";
import { getTranslator } from "../i18n/translator";
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
import {
  ordersApi,
  getErrorMessage,
  refundsApi,
  type BackendOrder,
  type BackendRefund,
} from "../lib/api";

const storageKey = "clucky-admin-orders-demo-v2";

function mapBackendOrderToAdminOrder(be: BackendOrder): AdminOrder {
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
    image: "/images/food-placeholder.svg",
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
  createRefund: (data: { orderId: number; reason: string; bankName?: string; bankAccountNo?: string; bankAccountName?: string }) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderWorkspace | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [allOrders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const latest = useRef(allOrders);
  const [loading, setLoading] = useState(true);
  const [loadedRevision, setLoadedRevision] = useState(-1);

  const [actionError, setActionError] = useState("");
  useFeedback(actionError);
  const [loadError, setLoadError] = useState("");
  useFeedback(loadError);
  const storageError = loadError;
  const { user } = useAuthState();

  const refreshOrders = useCallback(async () => {
    if (!user) return;
    const revision = getSessionState().revision;
    try {
      const storeIdParam =
        user?.role === "ADMIN" || !user?.storeId ? undefined : Number(user.storeId);
      const [remoteOrders, remoteRefunds] = await Promise.all([
        ordersApi.list({ storeId: storeIdParam }),
        refundsApi.list({ storeId: storeIdParam }),
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
            const adminOrder = mapBackendOrderToAdminOrder(bo);
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
  }, [user]);

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
      if (action.type === "COD") {
        setActionError(translate("admin:collectionUnavailable"));
        return false;
      }
      setActionError("");
      try {
        if (action.type === "STATUS") {
          const saved = await ordersApi.updateStatus(id, action.status, action.reason);
          if (revision !== getSessionState().revision) return false;
          latest.current = latest.current.map((entry) => entry.id === id
            ? { ...entry, ...mapBackendOrderToAdminOrder(saved) } : entry);
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
    async (data: { orderId: number; reason: string; bankName?: string; bankAccountNo?: string; bankAccountName?: string }) => {
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
      loading,
      storageError,
      actionError,
      updateStatus,
      confirmCOD,
      reviewRefund,
      createRefund,
      refreshOrders,
    }),
    [
      orders,
      loading,
      storageError,
      actionError,
      updateStatus,
      confirmCOD,
      reviewRefund,
      createRefund,
      refreshOrders,
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
