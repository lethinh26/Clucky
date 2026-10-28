"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/products";
import { useOrder } from "@/components/order/order-provider";
import { OrderProgress } from "@/components/order/order-progress";
import type { Order } from "@/lib/types/order";
import {
  ArrowRight,
  Store,
  RotateCcw,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { OrderStatusChip } from "@/components/order";
import { FoodImage } from "@/components/order/food-image";
import { displayOrderTime } from "@/lib/order-demo";
import styles from "./orders.module.css";

type FilterTab = "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export default function OrdersHistoryPage() {
  const { orders, reorder, ready } = useOrder();
  const activeOrder = orders.find(
    (order) => !["COMPLETED", "CANCELLED"].includes(order.status),
  );
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const filteredOrders = orders.filter((order) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchCode = order.orderCode.toLowerCase().includes(q);
      const matchStore = order.storeName.toLowerCase().includes(q);
      if (!matchCode && !matchStore) return false;
    }

    // Tab filter
    if (activeTab === "ALL") return true;
    if (activeTab === "ACTIVE") {
      return (
        order.status === "PENDING_PAYMENT" ||
        order.status === "CONFIRMED" ||
        order.status === "PREPARING" ||
        order.status === "READY" ||
        order.status === "SHIPPING"
      );
    }
    if (activeTab === "COMPLETED") return order.status === "COMPLETED";
    if (activeTab === "CANCELLED") return order.status === "CANCELLED";
    return true;
  });

  const handleReorder = (order: Order) => {
    reorder(order);
    setToastMessage(
      `Đã thêm lại các món từ đơn ${order.orderCode} vào giỏ hàng!`,
    );
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  return (
    <>
            <main className={`${styles.historyContainer} m3-page`}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>Lịch sử mua hàng</span>
          <h1 className={styles.title}>Đơn hàng của tôi</h1>
          <p className={styles.sub}>
            Theo dõi trạng thái giao món, xem lại hóa đơn hoặc đặt lại đơn hàng
            yêu thích.
          </p>
        </div>

        {activeOrder && (
          <div className={styles.activeBanner}>
            <Clock3 size={20} />
            <div>
              <strong>Bạn có đơn đang xử lý</strong>
              <span>
                {activeOrder.orderCode} · {activeOrder.storeName}
              </span>
            </div>
            <Link href={`/orders/${activeOrder.id}`}>
              Theo dõi <ArrowRight size={15} />
            </Link>
          </div>
        )}
        {/* Quick Search */}
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Tìm theo mã đơn (CLU-...) hoặc tên quán..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Tìm kiếm đơn hàng"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className={styles.searchBtn}
              style={{ background: "#6b6259" }}
            >
              Xóa
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className={styles.tabsList} aria-label="Lọc trạng thái đơn">
          <button
            type="button"

            aria-pressed={activeTab === "ALL"}
            className={`${styles.tabItem} ${activeTab === "ALL" ? styles.tabItemActive : ""}`}
            onClick={() => setActiveTab("ALL")}
          >
            Tất cả đơn ({orders.length})
          </button>
          <button
            type="button"

            aria-pressed={activeTab === "ACTIVE"}
            className={`${styles.tabItem} ${activeTab === "ACTIVE" ? styles.tabItemActive : ""}`}
            onClick={() => setActiveTab("ACTIVE")}
          >
            Đang xử lý
          </button>
          <button
            type="button"

            aria-pressed={activeTab === "COMPLETED"}
            className={`${styles.tabItem} ${activeTab === "COMPLETED" ? styles.tabItemActive : ""}`}
            onClick={() => setActiveTab("COMPLETED")}
          >
            Đã hoàn thành
          </button>
          <button
            type="button"

            aria-pressed={activeTab === "CANCELLED"}
            className={`${styles.tabItem} ${activeTab === "CANCELLED" ? styles.tabItemActive : ""}`}
            onClick={() => setActiveTab("CANCELLED")}
          >
            Đã hủy
          </button>
        </div>

        {/* Order Cards */}
        {!ready ? (
          <div className="order-skeleton" role="status">
            Đang tải đơn hàng…
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>Không tìm thấy đơn hàng nào</h3>
            <p className={styles.emptyDesc}>
              Bạn chưa có đơn hàng nào trong mục này hoặc từ khóa tìm kiếm không
              khớp.
            </p>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {filteredOrders.map((order) => (
              <article key={order.id} className={styles.orderCard}>
                <div className={styles.cardHead}>
                  <div>
                    <span className={styles.orderCode}>{order.orderCode}</span>
                    <span className={styles.orderDate}>
                      {" "}
                      · {displayOrderTime(order.createdAt)}
                    </span>
                  </div>
                  <OrderStatusChip status={order.status} />
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.storeInfo}>
                    <div className={styles.orderThumbs}>
                      {order.items.slice(0, 3).map((item) => (
                        <FoodImage
                          key={item.id}
                          src={item.image}
                          alt={item.itemName}
                        />
                      ))}
                    </div>
                    <span className={styles.storeName}>
                      <Store size={15} /> {order.storeName}
                    </span>
                    <span className={styles.itemsSummary}>
                      {order.items
                        .map((i) => `${i.itemName} (x${i.quantity})`)
                        .join(", ")}
                    </span>
                  </div>

                  <div className={styles.cardPriceGroup}>
                    <span className={styles.cardPriceLabel}>
                      Tổng thanh toán
                    </span>
                    <span className={styles.cardPriceVal}>
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </div>

                <OrderProgress
                  status={order.status}
                  type={order.type}
                  compact
                  orderCode={order.orderCode}
                  updatedAt={order.updatedAt ?? order.createdAt}
                  history={order.timeline}
                />
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    className={styles.reorderBtn}
                  >
                    <RotateCcw size={15} /> Đặt lại đơn này
                  </button>

                  <Link
                    href={`/orders/${order.id}`}
                    className={styles.detailBtn}
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Toast notification for reorder action */}
        {toastMessage && (
          <div className={styles.reorderToast} role="status">
            <span>
              <CheckCircle2 size={17} /> {toastMessage}
            </span>
            <Link
              href="/cart"
              style={{
                color: "#c9a227",
                textDecoration: "underline",
                marginLeft: 8,
              }}
            >
              Đến giỏ hàng →
            </Link>
          </div>
        )}
      </main>
          </>
  );
}
