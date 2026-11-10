import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  Store,
  Search,
  PlusCircle,
  RotateCcw,
  CheckCircle2,
  Clock3,
  ChefHat,
  PackageCheck,
  Landmark,
  Sparkles,
} from "lucide-react";
import { message } from "../../components/feedback";
import { useAuth } from "../../context/AuthContext";
import { ordersApi, type BackendOrder } from "../../lib/api";
import {
  createInitialStaffOrders,
  generateIncomingMockOrder,
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

const SOUND_STORAGE_KEY = "clucky_staff_sound_enabled";

type WorkQueueKey =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED";

export function fromBackendOrderToStaffOrder(bo: BackendOrder): StaffOrder {
  const qNum = bo.queueNumber ?? (typeof bo.id === "number" ? bo.id : 1);
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
    };
  });

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
      (bo.customerId ? `Khách hàng #${bo.customerId}` : `Khách quầy #${qNum}`),
    customerPhone: bo.receiverPhone || "",
    storeId: String(bo.storeId),
    storeName: bo.storeName || "Store #01 - Cầu Giấy",
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
    printCount: 0,
  };
}

export function StaffOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Quản lý âm thanh chuông báo (Sound Setting persisted in localStorage)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    return saved !== null ? saved === "true" : true;
  });

  // 2. Data Layer: Khởi tạo danh sách đơn hàng
  const [orders, setOrders] = useState<StaffOrder[]>(() => {
    return createInitialStaffOrders();
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hàm load danh sách đơn từ backend API
  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const storeIdNum = user?.storeId ? Number(user.storeId) : 1;
      const backendList = await ordersApi.list({ storeId: storeIdNum, size: 50 });
      if (backendList && backendList.length > 0) {
        const converted = backendList.map(fromBackendOrderToStaffOrder);
        setOrders(converted);
        prevConfirmedIdsRef.current = new Set(
          converted.filter((o) => o.status === "CONFIRMED").map((o) => o.id),
        );
      } else if (!isSilent) {
        setOrders(createInitialStaffOrders());
      }
    } catch (err) {
      console.warn("Chưa thể kết nối cart-order-service, dùng dữ liệu khởi tạo:", err);
      if (!isSilent) {
        setOrders(createInitialStaffOrders());
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [user?.storeId]);

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
      message.success("Đã bật chuông báo đơn mới");
    } else {
      message.info("Đã tắt chuông báo");
    }
  };

  // 6. Theo dõi danh sách ID đơn CONFIRMED để kích hoạt chuông khi có đơn mới
  const prevConfirmedIdsRef = useRef<Set<string>>(
    new Set(
      orders
        .filter((o) => o.status === "CONFIRMED")
        .map((o) => o.id),
    ),
  );

  // 7. Auto-polling ngầm (5s khi active, 15s khi background) đồng bộ với backend DB
  useEffect(() => {
    const pollIntervalTime = document.hidden ? 15000 : 5000;

    const intervalId = window.setInterval(async () => {
      try {
        const storeIdNum = user?.storeId ? Number(user.storeId) : 1;
        const backendList = await ordersApi.list({ storeId: storeIdNum, size: 50 });
        if (backendList && backendList.length > 0) {
          const converted = backendList.map(fromBackendOrderToStaffOrder);

          // Phát hiện đơn CONFIRMED mới xuất hiện
          const confirmedOrders = converted.filter(
            (o) => o.status === "CONFIRMED",
          );

          let hasNewConfirmed = false;
          let newestOrder: StaffOrder | null = null;

          for (const order of confirmedOrders) {
            if (!prevConfirmedIdsRef.current.has(order.id)) {
              hasNewConfirmed = true;
              newestOrder = order;
              break;
            }
          }

          if (hasNewConfirmed && newestOrder) {
            if (soundEnabled) {
              playChime();
            }
            message.info(
              `🔔 Đơn mới #${String(newestOrder.queueNumber).padStart(3, "0")} (${
                newestOrder.orderCode
              }) vừa vào!`,
            );
          }

          prevConfirmedIdsRef.current = new Set(
            confirmedOrders.map((o) => o.id),
          );
          setOrders(converted);
        }
      } catch {
        // Bỏ qua lỗi kết nối tạm thời khi polling chạy ngầm
      }
    }, pollIntervalTime);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [soundEnabled, playChime, user?.storeId]);

  // 8. Lắng nghe phím tắt toàn cục: F1 (Nhập đơn nhanh)
  const handleOpenPOS = useCallback(() => {
    setIsPosModalOpen(true);
  }, []);

  // Xử lý tạo đơn quầy mới từ CounterOrderModal
  const handleCreateCounterOrder = async (orderPayload: Partial<StaffOrder>) => {
    const queueNumber = orderPayload.queueNumber || (15 + orders.length);
    const newOrder: StaffOrder = {
      id: `ord-staff-counter-${Date.now()}`,
      orderCode: orderPayload.orderCode || `CLU-${Date.now()}`,
      queueNumber,
      orderSource: "COUNTER",
      diningOption: orderPayload.diningOption || "DINE_IN",
      customerName: orderPayload.customerName || `Khách vãng lai #${queueNumber}`,
      customerPhone: orderPayload.customerPhone || "",
      storeId: user?.storeId ? String(user.storeId) : "1",
      storeName: user?.storeName || "Store #01 - Cầu Giấy",
      orderType: "PICKUP",
      status: "CONFIRMED",
      paymentMethod: orderPayload.paymentMethod || "CASH",
      paymentStatus: "PENDING",
      subtotal: orderPayload.subtotal || 0,
      discount: orderPayload.discount || 0,
      shippingFee: 0,
      total: orderPayload.total || 0,
      note: orderPayload.note,
      time: orderPayload.time || "Vừa xong",
      createdAt: orderPayload.createdAt || new Date().toISOString(),
      items: orderPayload.items || [],
      printCount: 0,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setActiveTab("CONFIRMED");
    message.success(
      `Đã tạo đơn #${String(newOrder.queueNumber).padStart(3, "0")} thành công!`,
    );
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        handleOpenPOS();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleOpenPOS]);

  // 9. Nút mô phỏng tạo thêm 1 đơn mới khách đặt qua Web (Để test Auto-polling & Chuông)
  const handleSimulateIncomingOrder = () => {
    const newOrder = generateIncomingMockOrder(orders.length);
    setOrders((prev) => [newOrder, ...prev]);
    if (soundEnabled) {
      playChime();
    }
    message.success(
      `Đã mô phỏng khách đặt Web #${String(newOrder.queueNumber).padStart(
        3,
        "0",
      )} (Chuông ting-ting)`,
    );
  };

  // Nút đặt lại/đồng bộ dữ liệu từ DB
  const handleResetMockData = () => {
    fetchOrders(false);
    message.info("Đã đồng bộ lại dữ liệu đơn hàng từ cơ sở dữ liệu");
  };

  // 10. Chuyển trạng thái đơn (đồng bộ cập nhật về backend cart-order-service)
  const handleStatusChange = async (orderId: string, nextStatus: AdminOrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    const statusLabels: Record<string, string> = {
      PREPARING: "Bếp đã nhận nấu",
      READY: "Món đã sẵn sàng bàn giao",
      COMPLETED: "Đã hoàn tất bàn giao cho khách",
    };

    message.success(statusLabels[nextStatus] || "Đã cập nhật trạng thái");

    const numericId = Number(orderId);
    if (!Number.isNaN(numericId) && numericId > 0) {
      try {
        await ordersApi.updateStatus(numericId, nextStatus);
      } catch (err) {
        console.warn("Lỗi đồng bộ trạng thái đơn lên backend:", err);
      }
    }
  };

  // Thu tiền quầy: mở CounterPaymentModal
  const handlePaymentCollect = (order: StaffOrder) => {
    setPaymentModalOrder(order);
  };

  // Xác nhận thu tiền trong CounterPaymentModal
  const handleConfirmPayment = (data: {
    orderId: string;
    method: PaymentMethod;
    cashTendered: number;
    cashChange: number;
    bankDeclaredAmount: number;
    manualReason?: string;
    refCode?: string;
  }) => {
    let targetOrder: StaffOrder | null = null;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== data.orderId) return ord;
        const nextPaymentStatus = "COLLECTED" as const;
        const nextStatus =
          ord.status === "READY"
            ? ("COMPLETED" as const)
            : ord.status === "PENDING_PAYMENT"
            ? ("CONFIRMED" as const)
            : ord.status;

        targetOrder = {
          ...ord,
          paymentMethod: data.method,
          paymentStatus: nextPaymentStatus,
          status: nextStatus,
          cashTendered: data.cashTendered,
          cashChange: data.cashChange,
          bankDeclaredAmount: data.bankDeclaredAmount,
          manualAcceptanceReason: data.manualReason,
          bankRefCode: data.refCode,
          cashierName: user?.fullName || "Trần Đức Anh (Staff)",
          receiptCode: `RCP-${Date.now().toString().slice(-8)}`,
          updatedAt: new Date().toISOString(),
        };
        return targetOrder;
      }),
    );

    setPaymentModalOrder(null);
    message.success("Đã xác nhận thu tiền thành công!");

    // TỰ ĐỘNG MỞ NGAY MODAL BILL K80
    if (targetOrder) {
      setReceiptModalOrder(targetOrder);
      setReceiptInitialMode("RECEIPT");
    }
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
          const matchCode = order.orderCode.toLowerCase().includes(q);
          const matchQueue = String(order.queueNumber).includes(q);
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
      label: "Chờ tiền",
      count: queueCounts.PENDING_PAYMENT,
    },
    {
      key: "CONFIRMED",
      label: "Mới xác nhận",
      count: queueCounts.CONFIRMED,
    },
    {
      key: "PREPARING",
      label: "Đang chuẩn bị",
      count: queueCounts.PREPARING,
    },
    {
      key: "READY",
      label: "Sẵn sàng",
      count: queueCounts.READY,
    },
    {
      key: "COMPLETED",
      label: "Tra cứu đã xong",
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
      customerName: found.customerName || `Khách hàng #${found.queueNumber}`,
      customerPhone: found.customerPhone || "",
      storeId: found.storeId,
      storeName: found.storeName,
      orderType: found.orderType,
      status: found.status,
      paymentMethod:
        found.paymentMethod === "CASH" ? "COD" : "BANK_TRANSFER",
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
            Không Gian Tác Nghiệp Quầy & Bếp - Clucky
          </span>
          <h1>Quản Lý Đơn Hàng Chi Nhánh</h1>
          <p className={styles.headerSubtitle}>
            Xử lý hàng đợi chế biến, kiểm soát thời gian chờ SLA và bàn giao món
            chuẩn Fast-Food.
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* Badge Chi nhánh */}
          <div className={styles.branchChip} title="Chi nhánh tác nghiệp hiện tại">
            <Store size={20} />
            <div className={styles.branchInfo}>
              <span className={styles.branchName}>
                {user?.storeName || "Store #01 - Cầu Giấy"}
              </span>
              <span className={styles.branchStatus}>Đang mở ca phục vụ</span>
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
            <span>{soundEnabled ? "Chuông: BẬT" : "Chuông: TẮT"}</span>
          </button>

          {/* Link Tab Phụ: Tiền vào chi nhánh */}
          <button
            type="button"
            className={styles.transfersLink}
            onClick={() => {
              navigate("/staff/transfers");
              message.info("Chuyển tới sổ quỹ dòng tiền chi nhánh");
            }}
            title="Xem chi tiết đối soát dòng tiền và két ca trực"
          >
            <Landmark size={17} />
            <span>Tiền vào chi nhánh</span>
          </button>

          {/* Nút Đỏ Nổi Bật: Nhập đơn nhanh (F1) */}
          <button
            type="button"
            className={styles.posQuickButton}
            onClick={handleOpenPOS}
            title="Mở giao diện POS thu ngân để tạo đơn nhanh tại quầy (Phím F1)"
          >
            <span>Nhập đơn nhanh</span>
            <span className={styles.shortcutBadge}>F1</span>
          </button>
        </div>
      </header>

      {/* Thanh công cụ mô phỏng cho Tester / Reviewer */}
      <div className={styles.simControls}>
        <span>🛠️ Công cụ hỗ trợ test nhanh:</span>
        <button
          type="button"
          className={styles.simBtn}
          onClick={handleSimulateIncomingOrder}
          title="Thêm 1 đơn mới đặt qua Web vào tab 'Mới xác nhận' để test chuông Web Audio API"
        >
          <PlusCircle size={14} /> Thêm đơn Web mới (+1 Ting-Ting)
        </button>
        <button
          type="button"
          className={styles.simBtn}
          onClick={handleResetMockData}
          title="Khôi phục lại 12 đơn mẫu chuẩn ban đầu"
        >
          <RotateCcw size={14} /> Đặt lại dữ liệu mẫu
        </button>
        <span style={{ marginLeft: "auto", color: "#6b6259" }}>
          ⏱️ Auto-polling: <strong>5 giây/lần</strong>
        </span>
      </div>

      {/* 2. Hệ Thống 5 Tab Công Việc (Work Queues) */}
      <nav
        className={styles.tabsContainer}
        role="tablist"
        aria-label="Các hàng đợi xử lý đơn hàng"
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
      <section className={styles.toolbar} aria-label="Tìm kiếm và sắp xếp đơn">
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm theo số thứ tự #012, mã CLU-XXXX, tên hoặc SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm đơn hàng"
          />
        </div>

        <div className={styles.toolbarRight}>
          <span className={styles.queueInfo}>
            {visibleOrders.length} đơn trong tab này
          </span>
          <select
            className={styles.sortSelect}
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "NEWEST" | "OLDEST")
            }
            aria-label="Sắp xếp thời gian"
          >
            <option value="NEWEST">Mới nhất trước</option>
            <option value="OLDEST">Cũ nhất trước</option>
          </select>
        </div>
      </section>

      {/* 4. Danh Sách Thẻ Đơn Hàng (Cards Grid) */}
      {visibleOrders.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle2 size={48} />
          <h2 className={styles.emptyTitle}>Không có đơn hàng nào</h2>
          <p className={styles.emptyText}>
            Hàng đợi này hiện đang trống. Hãy kiểm tra các tab khác hoặc nhấn nút
            "Thêm đơn Web mới" để thử nghiệm.
          </p>
        </div>
      ) : (
        <div className={styles.cardsGrid} role="region" aria-label="Danh sách đơn hàng">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onPaymentCollect={handlePaymentCollect}
              onViewDetails={(id) => setSelectedOrderId(id)}
              onReprint={handleReprintOrder}
            />
          ))}
        </div>
      )}

      {/* Drawer Chi Tiết Đơn Hàng */}
      <OrderDetailDrawer
        order={selectedOrderForDrawer}
        open={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        onStatusChange={async (id, nextStatus) => {
          handleStatusChange(id, nextStatus);
          return true;
        }}
      />

      {/* Phase 2: Modal Nhập Đơn Nhanh Quầy POS (F1) */}
      <CounterOrderModal
        open={isPosModalOpen}
        onClose={() => setIsPosModalOpen(false)}
        onSubmitOrder={handleCreateCounterOrder}
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
