import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getBrowserLocale } from "../../i18n/locale";
import { getTranslator } from "../../i18n/translator";
import {
  Bell,
  BellOff,
  Store,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Clock,
  Lock,
} from "lucide-react";
import { message } from "../../components/feedback";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrderContext";
import {
  ordersApi,
  paymentsApi,
  type BackendOrder,
  type BackendCounterReceipt,
  type CounterCollectionPayload,
  type Store as StoreModel,
  getErrorMessage,
} from "../../lib/api";
import {
  exportStaffDailyOrdersExcel,
  formatDateLabelVn,
  shiftDateYmd,
} from "../../utils/orderExcelExport";
import {
  type StaffOrder,
  type StaffOrderItem,
  type PaymentMethod,
  type OrderSource,
  type DiningOption,
  type PaymentStatus,
} from "../../mocks/mockStaffOrders";
import type { AdminOrder, AdminOrderStatus } from "../../types/order";
import { OrderCard } from "./components/OrderCard";
import { OrderDetailDrawer } from "../Orders/components/OrderDetailDrawer";
import { CounterOrderModal } from "./components/CounterOrderModal";
import { CounterPaymentModal } from "./components/CounterPaymentModal";
import { ReceiptBillModal } from "./components/ReceiptBillModal";
import styles from "./staff-orders.module.css";
import { loadOrderItemImages, orderItemImage, type OrderItemImages } from "../../lib/order-item-images";

const SOUND_STORAGE_KEY = "clucky_staff_sound_enabled";

type WorkQueueKey =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED";

const businessDate = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

async function loadStoreDayOrders(storeId: number, date: string): Promise<BackendOrder[]> {
  const result: BackendOrder[] = [];
  for (let page = 0; ; page++) {
    const batch = await ordersApi.list({ storeId, date, page, size: 200 });
    result.push(...batch);
    if (batch.length < 200) return result;
  }
}

export function fromBackendOrderToStaffOrder(
  bo: BackendOrder,
  images: OrderItemImages = new Map(),
  storesList: StoreModel[] = [],
  fallbackDailyQueue?: number,
): StaffOrder {
  const qNum = bo.queueNumber && bo.queueNumber > 0 ? bo.queueNumber : (fallbackDailyQueue ?? 1);
  const createdDate = bo.createdAt ? new Date(bo.createdAt) : new Date();
  const timeStr = `${String(createdDate.getHours()).padStart(2, "0")}:${String(
    createdDate.getMinutes(),
  ).padStart(2, "0")}`;

  const staffItems: StaffOrderItem[] = (bo.items || []).map((item, idx) => {
    let optionsStr: string | undefined = undefined;
    if (item.optionsSnapshot) {
      if (typeof item.optionsSnapshot === "string") {
        optionsStr = item.optionsSnapshot;
      } else if (Array.isArray(item.optionsSnapshot)) {
        optionsStr = (item.optionsSnapshot as any[])
          .map((opt: any) => opt.name || opt.groupName)
          .join(", ");
      } else {
        optionsStr = JSON.stringify(item.optionsSnapshot);
      }
    }
    return {
      id: `item-${bo.id}-${item.id || idx}`,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      note: item.note,
      options: optionsStr,
      image: orderItemImage(item, images),
    };
  });

  const tr = getTranslator(getBrowserLocale());
  const orderSrc: OrderSource =
    bo.orderSource === "COUNTER" || !bo.customerId ? "COUNTER" : "WEB";
  const diningOpt: DiningOption =
    bo.diningOption === "TAKE_AWAY" ? "TAKE_AWAY" : "DINE_IN";

  return {
    id: String(bo.id),
    orderCode: bo.orderCode,
    queueNumber: qNum,
    orderSource: orderSrc,
    diningOption: diningOpt,
    customerName:
      bo.receiverName ||
      (bo.customerId ? "Khách hàng #" + bo.customerId : "Khách quầy #" + qNum),
    customerPhone: bo.receiverPhone || "",
    storeId: String(bo.storeId),
    storeName:
      bo.storeName ||
      storesList.find((s) => Number(s.id) === Number(bo.storeId))?.name ||
      tr("business:stafforderspage.branchFallback", { id: bo.storeId }),
    orderType: bo.type === "DELIVERY" ? "DELIVERY" : "PICKUP",
    deliveryAddress: bo.deliveryAddress,
    status: (bo.status as AdminOrderStatus) || "CONFIRMED",
    paymentMethod: (bo.paymentMethod || "CASH") as PaymentMethod,
    paymentStatus: (bo.paymentStatus || "PENDING") as PaymentStatus,
    items: staffItems,
    subtotal: bo.subtotal || bo.totalAmount || 0,
    discount: bo.discountAmount || 0,
    shippingFee: bo.shippingFee || 0,
    total: bo.totalAmount || 0,
    note: bo.note,
    time: timeStr,
    createdAt: bo.createdAt || new Date().toISOString(),
    updatedAt: bo.updatedAt,
    version: bo.version ?? 0,
    printCount: 0,
  };
}

function mapDailyStaffOrders(
  backendList: BackendOrder[],
  images: OrderItemImages,
  storesList: StoreModel[],
): StaffOrder[] {
  const sortedAsc = [...backendList].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime() || Number(a.id) - Number(b.id),
  );
  const dailyIdxById = new Map<number, number>();
  sortedAsc.forEach((bo, idx) => {
    dailyIdxById.set(Number(bo.id), (idx % 999) + 1);
  });
  return backendList.map((order) =>
    fromBackendOrderToStaffOrder(order, images, storesList, dailyIdxById.get(Number(order.id))),
  );
}

export function StaffOrdersPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { stores, currentStore, storeOpenState, refreshStores } = useOrders();
  const storesRef = useRef<StoreModel[]>(stores);
  storesRef.current = stores;
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // 1. Quản lý âm thanh chuông báo (Sound Setting persisted in localStorage)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    return saved !== null ? saved === "true" : true;
  });

  // 2. Data Layer: Khởi tạo danh sách đơn hàng (trống ban đầu, load từ backend API)
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState(businessDate);
  const imageMapRef = useRef<OrderItemImages | null>(null);
  const todayRef = useRef(businessDate());
  const fetchRevisionRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const today = businessDate();
      if (today !== todayRef.current) {
        const previous = todayRef.current;
        todayRef.current = today;
        setSelectedDate(date => date === previous ? today : date);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const isFirstLoadDoneRef = useRef<boolean>(false);
  const prevConfirmedIdsRef = useRef<Set<string>>(new Set());

  // Hàm load danh sách đơn từ backend API
  const fetchOrders = useCallback(async (isSilent = false) => {
    const revision = ++fetchRevisionRef.current;
    if (!isSilent) setIsLoading(true);
    try {
      const storeIdNum = user?.storeId ? Number(user.storeId) : currentStore?.id || 1;
      const [backendList, images] = await Promise.all([
        loadStoreDayOrders(storeIdNum, selectedDate),
        imageMapRef.current ? Promise.resolve(imageMapRef.current) : loadOrderItemImages(),
      ]);
      if (revision !== fetchRevisionRef.current) return;
      imageMapRef.current = images;
      const converted = mapDailyStaffOrders(backendList || [], images, storesRef.current);
      setOrders(converted);
      setFetchError(false);
      prevConfirmedIdsRef.current = new Set(
        converted.filter((o) => o.status === "CONFIRMED").map((o) => o.id),
      );
      isFirstLoadDoneRef.current = true;
    } catch (err) {
      if (revision !== fetchRevisionRef.current) return;
      console.warn("Lỗi tải danh sách đơn hàng từ backend cart-order-service:", err);
      setFetchError(true);
    } finally {
      if (!isSilent && revision === fetchRevisionRef.current) setIsLoading(false);
    }
  }, [user?.storeId, currentStore?.id, selectedDate]);

  // Đồng bộ lại tên chi nhánh thật khi danh sách stores tải xong
  useEffect(() => {
    if (!stores.length) return;
    setOrders((prev) =>
      prev.map((o) => {
        const matched = stores.find((s) => Number(s.id) === Number(o.storeId));
        return matched && matched.name && matched.name !== o.storeName
          ? { ...o, storeName: matched.name }
          : o;
      }),
    );
  }, [stores]);

  // Load ban đầu khi mount
  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  // 3. Tab công việc hiện tại (Mặc định vào tab 'CONFIRMED' - Mới xác nhận)
  const [activeTab, setActiveTab] = useState<WorkQueueKey>("CONFIRMED");

  // 4. Tìm kiếm & Sắp xếp
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"NEWEST" | "OLDEST">("NEWEST");

  // 5. Drawer chi tiết đơn
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Phase 2: POS Order Modal, Payment Modal, Receipt Bill Modal
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [paymentModalOrder, setPaymentModalOrder] = useState<StaffOrder | null>(null);
  const [receiptModalOrder, setReceiptModalOrder] = useState<StaffOrder | null>(null);
  const [receiptInitialMode, setReceiptInitialMode] = useState<"RECEIPT" | "KOT">("RECEIPT");

  // Web Audio API Synthesis Chime (D5 587.33Hz -> A5 880Hz nhẹ nhàng)
  const playChime = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn("Audio play blocked or unsupported:", e);
    }
  }, []);

  // Toggle sound
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem(SOUND_STORAGE_KEY, String(nextState));
    if (nextState) {
      playChime();
      message.success(t("business:staffactions.bellEnabled"));
    } else {
      message.info(t("business:staffactions.bellDisabled"));
    }
  };

  // 7. Auto-polling ngầm (5s khi active, 15s khi background) đồng bộ với backend DB
  useEffect(() => {
    const pollIntervalTime = document.hidden ? 15000 : 5000;
    let active = true;

    const intervalId = window.setInterval(async () => {
      if (!isFirstLoadDoneRef.current) return;
      try {
        const storeIdNum = user?.storeId ? Number(user.storeId) : currentStore?.id || 1;
        const backendList = await loadStoreDayOrders(storeIdNum, selectedDate);
        if (active && backendList) {
          const converted = mapDailyStaffOrders(backendList, imageMapRef.current ?? new Map(), storesRef.current);

          // Phát hiện đơn CONFIRMED mới xuất hiện
          const confirmedOrders = converted.filter(
            (o) => o.status === "CONFIRMED",
          );

          const newConfirmedList = confirmedOrders.filter(
            (order) => !prevConfirmedIdsRef.current.has(order.id),
          );

          if (newConfirmedList.length > 0) {
            const newestOrder = newConfirmedList[0];
            if (soundEnabled) {
              playChime();
            }
            message.info(t("business:staffactions.newOrder", { queue: String(newestOrder.queueNumber).padStart(3, "0"), code: newestOrder.orderCode }));
          }

          prevConfirmedIdsRef.current = new Set(
            confirmedOrders.map((o) => o.id),
          );
          setOrders(converted);
          setFetchError(false);
        }
      } catch {
        // Bỏ qua lỗi kết nối tạm thời khi polling chạy ngầm
      }
    }, pollIntervalTime);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [soundEnabled, playChime, user?.storeId, selectedDate]);

  // 8. Lắng nghe phím tắt toàn cục: F1 (Nhập đơn nhanh)
  const handleOpenPOS = useCallback(() => {
    if (!storeOpenState.isOpen) {
      return;
    }
    setIsPosModalOpen(true);
  }, [storeOpenState.isOpen]);

  // Xử lý tạo đơn quầy mới từ CounterOrderModal
  const handleCounterOrderSuccess = async (created?: BackendOrder) => {
    const today = businessDate();
    if (created?.id) {
      const mapped = fromBackendOrderToStaffOrder(
        created,
        imageMapRef.current ?? new Map(),
        storesRef.current,
      );
      setOrders((prev) =>
        prev.some((o) => o.id === mapped.id) ? prev : [mapped, ...prev],
      );
    }
    if (selectedDate !== today) {
      setSelectedDate(today);
    }
    setActiveTab("CONFIRMED");
    await fetchOrders(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        if (storeOpenState.isOpen) {
          handleOpenPOS();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleOpenPOS, storeOpenState.isOpen]);

  // 9. Nút làm mới dữ liệu từ backend DB & Xuất Excel theo ngày
  const handleRefresh = () => {
    fetchOrders(false);
    void refreshStores();
    message.success(t("admin:system.refreshed"));
  };

  const handleExportDailyExcel = async () => {
    if (isExportingExcel) return;
    setIsExportingExcel(true);
    try {
      const storeIdNum = user?.storeId ? Number(user.storeId) : currentStore?.id || 1;
      const receipts = await paymentsApi.listReceipts(storeIdNum).catch(() => [] as BackendCounterReceipt[]);
      const receiptsByCode: Record<string, BackendCounterReceipt> = {};
      if (Array.isArray(receipts)) {
        for (const r of receipts) {
          if (r.orderCode && !receiptsByCode[r.orderCode]) {
            receiptsByCode[r.orderCode] = r;
          }
        }
      }
      const branchLabel =
        currentStore?.name ||
        user?.storeName ||
        t("business:stafforderspage.branchFallback", { id: storeIdNum });
      const staffLabel = user?.fullName || t("business:stafforderspage.shiftStaffDefault");
      exportStaffDailyOrdersExcel({
        date: selectedDate,
        storeName: branchLabel,
        staffName: staffLabel,
        orders,
        receiptsByCode,
      });
      message.success(t("business:dateFilter.exportSuccess", { count: orders.length }));
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // 10. Chuyển trạng thái đơn (đồng bộ cập nhật về backend cart-order-service)
  const handleStatusChange = async (
    orderId: string,
    nextStatus: AdminOrderStatus,
    reason?: string,
  ) => {
    const numericId = Number(orderId);
    const targetOrder = orders.find((o) => o.id === orderId);

    if (reason === "COLLECT_COD") {
      if (!Number.isNaN(numericId) && numericId > 0) {
        try {
          await paymentsApi.collectCod(numericId);
          try {
            await ordersApi.updateStatus(numericId, {
              status: "COMPLETED",
              note: t("business:stafforderspage.codOnlineCompletedNote"),
            });
            setActiveTab("COMPLETED");
          } catch {
            // Bỏ qua nếu đơn đã tự chuyển hoàn tất
          }
          await fetchOrders(false);
          message.success(t("business:staffactions.codCompletedSuccess"));
          return true;
        } catch (err: any) {
          if (
            err?.response?.status === 409 ||
            err?.response?.data?.code === "RESOURCE_CONFLICT" ||
            err?.response?.data?.code === "CONCURRENCY_CONFLICT"
          ) {
            message.warning(t("business:staffactions.orderChanged"));
            await fetchOrders(false);
            return false;
          }
          message.error(t("business:orderdemo.codCollectionError", { error: getErrorMessage(err) }));
          return false;
        }
      }
      return false;
    }

    if (!Number.isNaN(numericId) && numericId > 0) {
      try {
        const updatedBackend = await ordersApi.updateStatus(numericId, {
          status: nextStatus,
          note: reason,
          version: targetOrder?.version,
        });

        const mappedFromBackend = fromBackendOrderToStaffOrder(
          updatedBackend,
          imageMapRef.current ?? new Map(),
          storesRef.current,
          targetOrder?.queueNumber,
        );
        const updatedOrder: StaffOrder = targetOrder
          ? {
              ...targetOrder,
              status: nextStatus,
              version: updatedBackend.version ?? ((targetOrder.version ?? 0) + 1),
              updatedAt: new Date().toISOString(),
            }
          : mappedFromBackend;

        setOrders((prev) =>
          prev.map((order) => {
            if (order.id !== orderId) return order;
            return {
              ...order,
              status: nextStatus,
              version: updatedBackend.version ?? ((order.version ?? 0) + 1),
              updatedAt: new Date().toISOString(),
            };
          }),
        );

        if (nextStatus === "PREPARING") {
          setSelectedOrderId(null);
          setReceiptInitialMode("KOT");
          setReceiptModalOrder(updatedOrder);
          const qFormatted = `#${String(updatedOrder.queueNumber || 1).padStart(3, "0")}`;
          message.success({
            content: t("business:staffactions.kotOpened", {
              queue: qFormatted,
              code: updatedOrder.orderCode,
            }),
            key: `kot-${orderId}-${Date.now()}`,
          });
          return true;
        }

        const statusLabels: Record<string, string> = {
          PREPARING: t("business:staffactions.kitchenAccepted"),
          READY: t("business:staffactions.mealReady"),
          COMPLETED: targetOrder
            ? t("business:staffactions.orderHandedOver", { queue: String(targetOrder.queueNumber).padStart(3, "0") })
            : t("business:staffactions.handedOver"),
        };

        message.success(statusLabels[nextStatus] || t("business:staffactions.statusUpdated"));
        return true;
      } catch (err: any) {
        if (
          err?.response?.status === 409 ||
          err?.response?.data?.code === "RESOURCE_CONFLICT" ||
          err?.response?.data?.code === "CONCURRENCY_CONFLICT"
        ) {
          message.warning(t("business:staffactions.orderChanged"));
          await fetchOrders(false);
          return false;
        }
        console.warn("order status synchronization failed:", err);
        message.error(t("business:staffactions.statusUpdateFailed", { detail: getErrorMessage(err) }));
        return false;
      }
    }
    return false;
  };

  // Thu tiền quầy / đơn tự đặt: luôn mở CounterPaymentModal (Tiền mặt - QR - Mặt + QR)
  const handlePaymentCollect = (order: StaffOrder) => {
    setPaymentModalOrder(order);
  };

  // Xác nhận thu tiền trong CounterPaymentModal (Cơ chế 2 Pha an toàn)
  const handleConfirmPayment = async (data: {
    orderId: string;
    method: PaymentMethod;
    cashTendered: number;
    cashChange: number;
    bankDeclaredAmount: number;
    manualReason?: string;
    refCode?: string;
    codEvidenceFile?: File | null;
  }) => {
    const order =
      paymentModalOrder?.id === data.orderId
        ? paymentModalOrder
        : orders.find((o) => o.id === data.orderId);
    if (!order) return;

    const numericId = Number(order.id);
    const totalDue = order.total;

    if (data.codEvidenceFile && !Number.isNaN(numericId) && numericId > 0) {
      try {
        await paymentsApi.uploadCodEvidence(numericId, data.codEvidenceFile);
      } catch (eviErr) {
        console.warn("COD evidence upload warning:", eviErr);
      }
    }

    let cashAmount = 0;
    let cashTendered = data.cashTendered;
    let bankAmount = 0;
    let manualAcceptance = false;
    let exceptionReason = data.manualReason;

    if (data.method === "CASH") {
      cashAmount = totalDue;
    } else if (data.method === "BANK_TRANSFER") {
      bankAmount = totalDue;
      if (data.manualReason) {
        manualAcceptance = true;
      }
    } else if (data.method === "SPLIT") {
      cashAmount = data.cashTendered;
      bankAmount = data.bankDeclaredAmount;
      if (data.manualReason) {
        manualAcceptance = true;
      }
    }

    const collectionPayload: CounterCollectionPayload = {
      orderId: numericId,
      orderCode: order.orderCode,
      queueNumber: order.queueNumber,
      storeId: Number(order.storeId || user?.storeId || 1),
      totalDue,
      method: data.method,
      cashAmount,
      cashTendered,
      bankAmount,
      bankRefCode: data.refCode,
      manualAcceptance,
      exceptionReason,
      staffNotes: data.manualReason,
    };

    // Pha 1: Ghi nhận thu tiền tại quầy qua payment-service
    let receipt: any;
    try {
      receipt = await paymentsApi.collectCounter(collectionPayload);
    } catch (err: any) {
      console.error("counter collection failed:", err);
      message.error(t("business:staffactions.collectionFailed", { detail: getErrorMessage(err) }));
      return;
    }

    // Pha 1 thành công (HTTP 201)
    setPaymentModalOrder(null);
    const collectionAccepted = receipt.collectionStatus === "ACCEPTED";
    const collectedOrder: StaffOrder = {
      ...order,
      paymentStatus: collectionAccepted ? "COLLECTED" : order.paymentStatus,
      paymentMethod: data.method,
      receiptId: receipt.id,
      receiptCode: receipt.receiptCode,
      cashTendered: data.cashTendered,
      cashChange: receipt.cashChange ?? data.cashChange,
      bankDeclaredAmount: data.bankDeclaredAmount,
      bankRefCode: receipt.bankRefCode || data.refCode,
      manualAcceptanceReason: data.manualReason,
      cashierName: receipt.staffName || user?.fullName || t("business:staffactions.cashier"),
      printCount: receipt.printCount ?? 0,
      updatedAt: new Date().toISOString(),
    };

    // Chỉ hiển thị đã thu khi Order Service đã chấp nhận collection qua event.
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? collectedOrder : o)),
    );

    // Tự động bật Modal Bill K80 cho thu ngân in bill
    setReceiptModalOrder(collectedOrder);
    setReceiptInitialMode("RECEIPT");

    if (receipt.collectionStatus === "PENDING") {
      message.info(t("business:staffactions.collectionRecordedForOrder", {
        queue: String(order.queueNumber).padStart(3, "0"),
      }));
      await fetchOrders(true);
      return;
    }

    if (collectionAccepted) {
      message.success(
        t("business:staffactions.collectionRecordedForOrder", {
          queue: String(order.queueNumber).padStart(3, "0"),
        }),
      );
    } else {
      message.warning(t("business:staffactions.orderChanged"));
    }
    await fetchOrders(true);
  };

  // Mở in lại hóa đơn
  const handleReprintOrder = (order: StaffOrder) => {
    setReceiptModalOrder(order);
    setReceiptInitialMode("RECEIPT");
  };

  // Cập nhật số lần in hóa đơn
  const handlePrintSuccess = (orderId: string, newPrintCount: number) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          printCount: newPrintCount,
        };
      }),
    );
    setReceiptModalOrder((prev) =>
      prev && prev.id === orderId ? { ...prev, printCount: newPrintCount } : prev,
    );
  };

  // 11. Đếm số lượng đơn trên từng tab
  const queueCounts = useMemo(() => {
    return {
      PENDING_PAYMENT: orders.filter((o) => o.status === "PENDING_PAYMENT")
        .length,
      CONFIRMED: orders.filter((o) => o.status === "CONFIRMED").length,
      PREPARING: orders.filter((o) => o.status === "PREPARING").length,
      READY: orders.filter((o) => o.status === "READY").length,
      COMPLETED: orders.filter((o) => o.status === "COMPLETED").length,
    };
  }, [orders]);

  // 12. Danh sách đơn hiển thị theo Tab & Bộ lọc tìm kiếm
  const visibleOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (order.status !== activeTab) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const qNormalized = q.replace(/^#?0*/, "");
          const paddedQueue = `#${String(order.queueNumber || 0).padStart(3, "0")}`;
          const matchCode = order.orderCode.toLowerCase().includes(q);
          const matchQueue =
            String(order.queueNumber) === qNormalized ||
            paddedQueue.toLowerCase().includes(q);
          const matchName = (order.customerName || "").toLowerCase().includes(q);
          const matchPhone = (order.customerPhone || "").includes(q);
          if (!matchCode && !matchQueue && !matchName && !matchPhone) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "NEWEST" ? timeB - timeA : timeA - timeB;
      });
  }, [orders, activeTab, searchQuery, sortOrder]);

  // Tab config
  const tabsConfig: { key: WorkQueueKey; label: string; count: number }[] = [
    {
      key: "PENDING_PAYMENT",
      label: t("business:stafforderspage.pendingPayment"),
      count: queueCounts.PENDING_PAYMENT,
    },
    {
      key: "CONFIRMED",
      label: t("business:stafforderspage.newConfirmed"),
      count: queueCounts.CONFIRMED,
    },
    {
      key: "PREPARING",
      label: t("business:stafforderspage.preparing"),
      count: queueCounts.PREPARING,
    },
    {
      key: "READY",
      label: t("business:stafforderspage.ready"),
      count: queueCounts.READY,
    },
    {
      key: "COMPLETED",
      label: t("business:stafforderspage.completedLookup"),
      count: queueCounts.COMPLETED,
    },
  ];

  // Map order for detail drawer
  const selectedOrderForDrawer: AdminOrder | null = useMemo(() => {
    if (!selectedOrderId) return null;
    const found = orders.find((o) => o.id === selectedOrderId);
    if (!found) return null;

    return {
      id: found.id,
      orderCode: found.orderCode,
      customerName: found.customerName || ("Khách hàng #" + found.queueNumber),
      customerPhone: found.customerPhone || "",
      storeId: found.storeId,
      storeName:
        stores.find((s) => Number(s.id) === Number(found.storeId))?.name ||
        found.storeName,
      orderType: found.orderType,
      deliveryAddress: found.deliveryAddress,
      status: found.status,
      paymentMethod:
        found.paymentMethod === "CASH" || found.paymentMethod === "COD"
          ? "COD"
          : "BANK_TRANSFER",
      paymentStatus: found.paymentStatus,
      items: found.items.map((it) => ({
        id: it.id,
        itemName: it.itemName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        options: it.options,
        lineTotal: it.lineTotal,
        image: it.image,
      })),
      subtotal: found.subtotal,
      discount: found.discount,
      shippingFee: found.shippingFee,
      total: found.total,
      note: found.note,
      time: found.time,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }, [selectedOrderId, orders]);

  return (
    <div className={styles.staffContainer}>
      {/* 1. Header Trang */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.eyebrow}>
            <Sparkles size={13} />
            {t("business:stafforderspage.staffWorkspace")}
          </span>
          <h1>{t("business:stafforderspage.storeOrders")}</h1>
          <p className={styles.headerSubtitle}>
            {t("business:stafforderspage.acceptOrdersTrackProgressAndConfirmCashCollectionInOnePlace")}
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* Badge Chi nhánh thực tế từ Store Context */}
          <div
            className={`${styles.branchChip} ${
              !storeOpenState.isOpen ? styles.branchChipClosed : ""
            }`}
            title="Chi nhánh tác nghiệp hiện tại"
          >
            <Store size={20} />
            <div className={styles.branchInfo}>
              <span className={styles.branchName}>
                {currentStore?.name || user?.storeName || t("business:stafforderspage.branchFallback", { id: user?.storeId || 1 })}
              </span>
              <span
                className={`${styles.branchStatus} ${
                  !storeOpenState.isOpen ? styles.branchStatusClosed : ""
                }`}
              >
                {storeOpenState.statusLabel}
              </span>
            </div>
          </div>

          {/* Nút Toggle Chuông âm thanh (Lưu localStorage) */}
          <button
            type="button"
            className={`${styles.soundButton} ${
              soundEnabled ? styles.soundEnabled : ""
            }`}
            onClick={handleToggleSound}
            aria-label={
              soundEnabled ? "Tắt chuông báo đơn mới" : "Bật chuông báo đơn mới"
            }
            title={
              soundEnabled
                ? "Chuông báo đang BẬT (Click để tắt)"
                : "Chuông báo đang TẮT (Click để bật)"
            }
          >
            {soundEnabled ? <Bell size={18} /> : <BellOff size={18} />}
            <span>{t(soundEnabled ? "business:stafforderspage.soundOn" : "business:stafforderspage.soundOff")}</span>
          </button>

          {/* Nút Đỏ Nổi Bật: Nhập đơn nhanh (F1) - Khóa khi cửa hàng chưa mở cửa */}
          <button
            type="button"
            disabled={!storeOpenState.isOpen}
            className={`${styles.posQuickButton} ${
              !storeOpenState.isOpen ? styles.posQuickButtonDisabled : ""
            }`}
            onClick={handleOpenPOS}
            title={
              storeOpenState.isOpen
                ? t("business:stafforderspage.quickOrder")
                : `${storeOpenState.bannerTitle} — ${t("business:storeStatus.lockedActionBadge")}`
            }
          >
            {!storeOpenState.isOpen ? (
              <>
                <Lock size={16} />
                <span>{t("business:storeStatus.closedNowChip")}</span>
              </>
            ) : (
              <>
                <span>{t("business:stafforderspage.quickOrder")}</span>
                <span className={styles.shortcutBadge}>F1</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Banner cảnh báo & khóa đặt hàng khi cửa hàng chưa mở cửa / ngoài giờ phục vụ */}
      {!storeOpenState.isOpen && (
        <div className={styles.storeClosedBanner} role="status" aria-live="polite">
          <div className={styles.storeClosedIcon}>
            <Clock size={22} />
          </div>
          <div className={styles.storeClosedContent}>
            <div className={styles.storeClosedTitleRow}>
              <strong>{storeOpenState.bannerTitle}</strong>
              <span className={styles.storeClosedBadge}>
                <Lock size={12} /> {t("business:storeStatus.lockedActionBadge")}
              </span>
            </div>
            <p className={styles.storeClosedDesc}>
              {storeOpenState.bannerDescription}
            </p>
          </div>
          <div className={styles.storeClosedMeta}>
            <span>{t("business:storeStatus.operatingHours")}</span>
            <strong>
              {storeOpenState.openTime} – {storeOpenState.closeTime}
            </strong>
          </div>
        </div>
      )}

      {/* Thẻ lọc theo ngày UI đẹp & Xuất thống kê Excel theo ngày */}
      <div className={styles.dateFilterCard}>
        <div className={styles.dateFilterLeft}>
          <div className={styles.dateFilterIconBox}>
            <Calendar size={20} />
          </div>
          <div className={styles.dateFilterTitleGroup}>
            <span className={styles.dateFilterLabel}>
              {t("business:stafforderspage.filterOrderDate")}
            </span>
            <strong className={styles.dateFilterReadable}>
              {formatDateLabelVn(selectedDate, i18n.language)}
              {selectedDate === businessDate() && (
                <span className={styles.todayBadge}>{t("business:stafforderspage.today")}</span>
              )}
            </strong>
          </div>
        </div>

        <div className={styles.dateFilterControls}>
          <button
            type="button"
            className={styles.dateNavBtn}
            onClick={() => setSelectedDate((d) => shiftDateYmd(d, -1))}
            title={t("business:dateFilter.prevDay")}
          >
            <ChevronLeft size={16} />
            <span>{t("business:dateFilter.prevDay")}</span>
          </button>

          <div className={styles.dateInputWrap}>
            <input
              id="staff-order-date"
              type="date"
              className={styles.dateInputStyled}
              value={selectedDate}
              max={businessDate()}
              onChange={(event) => {
                if (event.target.value) setSelectedDate(event.target.value);
              }}
            />
          </div>

          <button
            type="button"
            className={styles.dateNavBtn}
            disabled={selectedDate >= businessDate()}
            onClick={() => setSelectedDate((d) => shiftDateYmd(d, 1))}
            title={t("business:dateFilter.nextDay")}
          >
            <span>{t("business:dateFilter.nextDay")}</span>
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className={`${styles.dateTodayBtn} ${
              selectedDate === businessDate() ? styles.dateTodayBtnActive : ""
            }`}
            onClick={() => setSelectedDate(businessDate())}
          >
            {t("business:stafforderspage.today")}
          </button>
        </div>

        <div className={styles.dateStatsPills}>
          <div className={styles.dateStatPill}>
            <span>{t("business:dateFilter.totalDailyOrders")}</span>
            <strong>{t("business:dateFilter.ordersUnit", { count: orders.length })}</strong>
          </div>
          <div className={styles.dateStatPill}>
            <span>{t("business:dateFilter.completedLabel")}</span>
            <strong style={{ color: "#1e7a46" }}>
              {t("business:dateFilter.ordersUnit", {
                count: orders.filter((o) => o.status === "COMPLETED").length,
              })}
            </strong>
          </div>
          <div className={styles.dateStatPill}>
            <span>{t("business:dateFilter.collectedTodayLabel")}</span>
            <strong style={{ color: "#8f1216" }}>
              {t("business:stafforderspage.vndAmount", {
                amount: new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "vi-VN").format(
                  orders
                    .filter((o) => ["PAID", "COLLECTED"].includes(o.paymentStatus))
                    .reduce((sum, o) => sum + (o.total || 0), 0)
                ),
              })}
            </strong>
          </div>
        </div>

        <div className={styles.dateFilterActions}>
          <button
            type="button"
            className={styles.exportExcelBtn}
            disabled={isExportingExcel}
            onClick={handleExportDailyExcel}
            title={t("business:dateFilter.exportExcel")}
          >
            <FileSpreadsheet size={16} />
            <span>
              {isExportingExcel
                ? t("business:dateFilter.exportingExcel")
                : t("business:dateFilter.exportExcel")}
            </span>
          </button>

          <button
            type="button"
            className={styles.refreshBtnStyled}
            onClick={handleRefresh}
            title={t("admin:system.refresh")}
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            <span>{t("admin:system.refresh")}</span>
          </button>

          <span className={styles.autoRefreshTag}>
            ⏱️ {t("business:stafforderspage.autoRefresh")}: <strong>5s</strong>
          </span>
        </div>
      </div>

      {/* Cảnh báo lỗi kết nối backend */}
      {fetchError && (
        <div
          style={{
            margin: "0 0 16px 0",
            padding: "12px 18px",
            backgroundColor: "#FEF3F2",
            border: "1px solid #FECDCA",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#B42318",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            <AlertCircle size={20} />
            <span>{t("admin:system.notConnected")}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchOrders(false)}
            style={{
              padding: "6px 16px",
              backgroundColor: "#B42318",
              color: "#FFF",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {t("admin:system.retry")}
          </button>
        </div>
      )}

      {/* 2. Hệ Thống 5 Tab Công Việc (Work Queues) */}
      <nav
        className={styles.tabsContainer}
        role="tablist"
        aria-label={t("business:stafforderspage.workQueues")}
      >
        {tabsConfig.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              className={`${styles.queueTab} ${
                isActive ? styles.queueTabActive : ""
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              <span
                className={`${styles.tabCount} ${
                  isActive ? styles.tabCountActive : ""
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 3. Toolbar Tìm Kiếm & Sắp Xếp */}
      <section className={styles.toolbar} aria-label={t("business:stafforderspage.searchAndFilterShiftOrders")}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            className={styles.searchInput}
            aria-label={t("business:stafforderspage.searchShiftOrders")}
            placeholder={t("business:stafforderspage.orderCodeNameOrPhoneNumber")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.toolbarRight}>
          <span className={styles.queueInfo}>
            {visibleOrders.length} {t("business:stafforderspage.ordersInTab")}
          </span>
          <select
            className={styles.sortSelect}
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "NEWEST" | "OLDEST")
            }
            aria-label={t("business:stafforderspage.sortByTime")}
          >
            <option value="NEWEST">{t("business:stafforderspage.newestFirst")}</option>
            <option value="OLDEST">{t("business:stafforderspage.oldestFirst")}</option>
          </select>
        </div>
      </section>

      {/* 4. Danh Sách Thẻ Đơn Hàng (Cards Grid) */}
      {visibleOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle2 size={48} />
          <h2 className={styles.emptyTitle}>{t("admin:system.emptyOrders")}</h2>
          <p className={styles.emptyText}>
            {t("business:stafforderspage.noOrdersInThisSection")}
          </p>
        </div>
      ) : (
        <div className={styles.cardsGrid} role="region" aria-label={t("business:stafforderspage.storeOrders")}>
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onPaymentCollect={handlePaymentCollect}
              onViewDetails={(id) => setSelectedOrderId(id)}
              onReprint={handleReprintOrder}
              onPrintKot={(ord) => {
                setReceiptInitialMode("KOT");
                setReceiptModalOrder(ord);
              }}
            />
          ))}
        </div>
      )}

      {/* Drawer Chi Tiết Đơn Hàng */}
      <OrderDetailDrawer
        order={selectedOrderForDrawer}
        open={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        onStatusChange={handleStatusChange}
        onCollectCounter={(ord) => {
          const found = orders.find((o) => o.id === ord.id);
          if (found) {
            setSelectedOrderId(null);
            setPaymentModalOrder(found);
          }
        }}
      />

      {/* Phase 2: Modal Nhập Đơn Nhanh Quầy POS (F1) */}
      <CounterOrderModal
        open={isPosModalOpen}
        onClose={() => setIsPosModalOpen(false)}
        onSuccess={handleCounterOrderSuccess}
        existingOrderCount={orders.length}
      />

      {/* Phase 2: Modal Thu Tiền Đa Phương Thức */}
      <CounterPaymentModal
        open={Boolean(paymentModalOrder)}
        order={paymentModalOrder}
        onClose={() => setPaymentModalOrder(null)}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* Phase 2: Modal Xem & In Hóa Đơn K80 / Phiếu Bếp KOT */}
      <ReceiptBillModal
        key={receiptModalOrder ? `${receiptModalOrder.id}-${receiptInitialMode}` : "closed"}
        open={Boolean(receiptModalOrder)}
        order={receiptModalOrder}
        onClose={() => setReceiptModalOrder(null)}
        onPrintSuccess={handlePrintSuccess}
        initialMode={receiptInitialMode}
      />
    </div>
  );
}
export default StaffOrdersPage;
