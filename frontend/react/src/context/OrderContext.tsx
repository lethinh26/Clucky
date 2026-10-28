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
import { MOCK_ADMIN_ORDERS } from "../mocks/adminOrderData";
import { mockProducts, mockCombos } from "../mocks/catalogData";
import {
  applyAdminDemoAction,
  orderStatusLabels,
  type AdminDemoAction,
} from "../lib/order-demo";
import { useAuth } from "./AuthContext";

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
function initialOrders(): AdminOrder[] {
  return withCatalogImages(
    MOCK_ADMIN_ORDERS.map((order) => ({
      ...order,
      updatedAt: order.createdAt,
      timeline: [
        {
          status: order.status,
          title: orderStatusLabels[order.status],
          description: "Trạng thái trong dữ liệu demo ban đầu.",
          time: order.createdAt,
        },
      ],
    })),
  );
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
  ) => boolean;
  confirmCOD: (id: string) => boolean;
  reviewRefund: (
    id: string,
    action: "APPROVED" | "REJECTED",
    note: string,
  ) => boolean;
}
const OrderContext = createContext<OrderWorkspace | null>(null);
export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [allOrders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const latest = useRef(allOrders);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [actionError, setActionError] = useState("");
  const { user } = useAuth();
  useEffect(() => {
    const restore = (raw: string | null) => {
      if (!raw) return;
      try {
        const saved = withCatalogImages(schema.parse(JSON.parse(raw)));
        latest.current = saved;
        setOrders(saved);
      } catch {
        setStorageError(
          "Không đọc được dữ liệu demo đã lưu. Đang dùng danh sách mẫu.",
        );
      }
    };
    try {
      restore(localStorage.getItem(storageKey));
    } catch {
      setStorageError(
        "Trình duyệt không cho phép lưu dữ liệu. Các thao tác vẫn dùng được trong phiên này.",
      );
    }
    setLoading(false);
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey) restore(event.newValue);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(allOrders));
    } catch {
      setStorageError(
        "Không lưu được dữ liệu demo. Vui lòng giữ trang này mở để tiếp tục phiên.",
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
    (id: string, action: AdminDemoAction) => {
      const order = latest.current.find((entry) => entry.id === id);
      if (!order) {
        setActionError("Không tìm thấy đơn hàng.");
        return false;
      }
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
      setActionError("");
      const updated = latest.current.map((entry) =>
        entry.id === id ? result.order : entry,
      );
      latest.current = updated;
      setOrders(updated);
      return true;
    },
    [user],
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
    }),
    [
      orders,
      loading,
      storageError,
      actionError,
      updateStatus,
      confirmCOD,
      reviewRefund,
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
