import { getBrowserLocale } from "../i18n/locale";
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
import { z } from "zod";
import type { AdminOrder, AdminOrderStatus } from "../types/order";
import { mockProducts, mockCombos } from "../mocks/catalogData";
import {
  applyAdminDemoAction,
  orderStatusLabels,
  type AdminDemoAction,
} from "../lib/order-demo";
import { useAuth } from "./AuthContext";
import {
  ordersApi,
  refundsApi,
  type BackendOrder,
  type BackendRefund,
} from "../lib/api";

const storageKey = "clucky-admin-orders-demo-v2";
const statuses = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SHIPPING",
  "COMPLETED",
  "CANCELLED",
]);
const schema = z.array(
  z.object({
    id: z.string(),
    orderCode: z.string(),
    customerName: z.string(),
    customerPhone: z.string(),
    storeId: z.string(),
    storeName: z.string(),
    orderType: z.enum(["DELIVERY", "PICKUP"]),
    status: statuses,
    paymentMethod: z.enum(["COD", "BANK_TRANSFER"]),
    paymentStatus: z.enum(["PENDING", "PAID", "FAILED"]),
    items: z.array(
      z.object({
        id: z.string(),
        itemName: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
        lineTotal: z.number().nonnegative(),
        options: z.string().optional(),
        image: z.string().optional(),
        note: z.string().optional(),
      }),
    ),
    subtotal: z.number().nonnegative(),
    discount: z.number().nonnegative(),
    shippingFee: z.number().nonnegative(),
    total: z.number().nonnegative(),
    time: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    deliveryAddress: z.string().optional(),
    note: z.string().optional(),
    hasRefundRequest: z.boolean().optional(),
    refundRequestId: z.number().optional(),
    refundReason: z.string().optional(),
    refundAmount: z.number().optional(),
    refundStatus: z
      .enum(["PENDING", "APPROVED", "REJECTED", "REFUNDED"])
      .optional(),
    timeline: z
      .array(
        z.object({
          status: statuses,
          title: z.string(),
          description: z.string(),
          time: z.string(),
          actor: z.string().optional(),
        }),
      )
      .optional(),
  }),
);

function withCatalogImages(orders: AdminOrder[]): AdminOrder[] {
  return orders.map((order) => ({
    ...order,
    items: order.items.map((item) => {
      if (item.image && item.image !== "/images/food-placeholder.svg")
        return item;
      const name = item.itemName.toLocaleLowerCase("vi-VN");
      const combo = name.includes("combo")
        ? mockCombos[name.includes("hai") || name.includes("couple") ? 1 : 0]
        : undefined;
      const product = mockProducts.find(
        (entry) =>
          entry.slug ===
          (name.includes("burger")
            ? "burger-ga-gion"
            : name.includes("cay")
              ? "ga-cay-mat-ong"
              : "ga-ran-truyen-thong"),
      );
      return {
        ...item,
        image:
          combo?.imageUrl ??
          product?.imageUrl ??
          "/images/food-placeholder.svg",
      };
    }),
  }));
}

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
    paymentStatus: status === "CANCELLED"
      ? "FAILED"
      : (be.paymentMethod === "BANK_TRANSFER" || status === "PENDING_PAYMENT")
        ? (status === "PENDING_PAYMENT" ? "PENDING" : "PAID")
        : (status === "COMPLETED" ? "PAID" : "PENDING"),
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
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderWorkspace | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [allOrders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const latest = useRef(allOrders);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [actionError, setActionError] = useState("");
  const { user } = useAuth();

  const refreshOrders = useCallback(async () => {
    try {
      const storeIdParam =
        user?.role === "ADMIN" || !user?.storeId ? undefined : Number(user.storeId);
      const [remoteOrders, remoteRefunds] = await Promise.all([
        ordersApi.list({ storeId: storeIdParam }),
        refundsApi.list({ storeId: storeIdParam }).catch(() => [] as BackendRefund[]),
      ]);
      if (Array.isArray(remoteOrders)) {
        const refundByOrderId = new Map<number, BackendRefund>();
        if (Array.isArray(remoteRefunds)) {
          for (const ref of remoteRefunds) {
            if (ref.orderId != null) {
              refundByOrderId.set(Number(ref.orderId), ref);
            }
          }
        }
        const mapped = withCatalogImages(
          remoteOrders.map((bo) => {
            const adminOrder = mapBackendOrderToAdminOrder(bo);
            const ref = refundByOrderId.get(Number(bo.id));
            if (ref) {
              adminOrder.hasRefundRequest = ref.status === "PENDING";
              adminOrder.refundRequestId = ref.id;
              adminOrder.refundReason = ref.reason;
              adminOrder.refundAmount = Number(ref.amount);
              adminOrder.refundStatus = ref.status;
            }
            return adminOrder;
          }),
        );
        latest.current = mapped;
        setOrders(mapped);
      }
    } catch {
      // Fallback silently to localStorage or mock
    }
  }, [user]);

  useEffect(() => {
    const restore = (raw: string | null) => {
      if (!raw) return;
      try {
        let saved = withCatalogImages(schema.parse(JSON.parse(raw)));
        saved = saved.filter((o) => !o.orderCode.startsWith("CLU-24"));
        latest.current = saved;
        setOrders(saved);
      } catch {
        setStorageError(
          getTranslator(getBrowserLocale())(
            "business:ordercontext.unableToReadSavedDemoDataUsingTheSampleList",
          ),
        );
      }
    };
    try {
      restore(localStorage.getItem(storageKey));
    } catch {
      setStorageError(
        getTranslator(getBrowserLocale())(
          "business:ordercontext.yourBrowserDoesNotAllowDataStorageActionsAreStillAvailableIn",
        ),
      );
    }
    setLoading(false);
    refreshOrders();

    const sync = (event: StorageEvent) => {
      if (event.key === storageKey) restore(event.newValue);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [refreshOrders]);

  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(allOrders));
    } catch {
      setStorageError(
        getTranslator(getBrowserLocale())(
          "business:ordercontext.unableToSaveDemoDataKeepThisPageOpenToContinueThe",
        ),
      );
    }
  }, [allOrders, loading]);

  const orders = useMemo(
    () =>
      allOrders.filter(
        (order) =>
          user.role === "ADMIN" || order.storeId === String(user.storeId),
      ),
    [allOrders, user],
  );

  const perform = useCallback(
    async (id: string, action: AdminDemoAction): Promise<boolean> => {
      const order = latest.current.find((entry) => entry.id === id);
      if (!order) {
        setActionError(
          getTranslator(getBrowserLocale())("business:orderprovider.orderNotFound"),
        );
        return false;
      }

      // Local optimistic check
      const result = applyAdminDemoAction(
        order,
        action,
        user.role,
        user.storeId,
      );
      if (!result.ok) {
        setActionError(result.message);
        return false;
      }

      // Snapshot previous state for rollback
      const previousOrders = latest.current;

      setActionError("");
      const updated = latest.current.map((entry) =>
        entry.id === id ? result.order : entry,
      );
      latest.current = updated;
      setOrders(updated);

      // Backend sync with strict rollback on failure (P2-05)
      try {
        if (action.type === "STATUS") {
          await ordersApi.updateStatus(id, action.status, action.reason);
        } else if (action.type === "COD") {
          await ordersApi.updateStatus(id, "COMPLETED", "COD confirmed");
        } else if (action.type === "REFUND") {
          const refundAction = action.decision === "APPROVED" ? "APPROVE" : "REJECT";
          if (!order.refundRequestId) {
            setActionError("Không tìm thấy mã yêu cầu hoàn tiền (Refund Request ID) hợp lệ cho đơn hàng này.");
            return false;
          }
          await refundsApi.review(order.refundRequestId, refundAction, action.note);
        }
        return true;
      } catch (err: any) {
        // Rollback optimistic state immediately
        latest.current = previousOrders;
        setOrders(previousOrders);

        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          "Order operation failed.";
        setActionError(errorMsg);
        console.warn("Backend order update rejected, rolled back optimistic state:", errorMsg);

        if (err?.response?.status === 409 || err?.response?.status === 400 || err?.response?.status === 403) {
          await refreshOrders();
        }
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

  const value = useMemo(
    () => ({
      orders,
      loading,
      storageError,
      actionError,
      updateStatus,
      confirmCOD,
      reviewRefund,
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
