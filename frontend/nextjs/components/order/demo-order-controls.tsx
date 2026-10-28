"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleX,
  FlaskConical,
  Wallet,
  ChefHat,
} from "lucide-react";
import type { Order } from "@/lib/types/order";
import {
  nextDemoStatus,
  orderStatusLabels,
  type DemoAction,
} from "@/lib/order-demo";
import { formatPrice } from "@/lib/products";
import { useOrder } from "./order-provider";
import styles from "./order-experience.module.css";

export function DemoOrderControls({ order }: { order: Order }) {
  const { demoEnabled, runDemoAction } = useOrder();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string }>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  if (!demoEnabled) return null;
  const act = (action: DemoAction) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFeedback(runDemoAction(order.id, action));
    queueMicrotask(() => {
      lock.current = false;
      setBusy(false);
    });
  };
  const pending =
    order.status === "PENDING_PAYMENT" && order.paymentStatus === "PENDING";
  const terminal = ["CANCELLED", "COMPLETED"].includes(order.status);
  const next = nextDemoStatus(order.status);
  return (
    <section
      className={styles.demoControls}
      aria-label="Điều khiển tiến trình đơn hàng"
    >
      <div className={styles.demoHeading}>
        <FlaskConical size={18} />
        <div>
          <strong>
            {pending
              ? "Thanh toán đơn hàng"
              : terminal
                ? "Trạng thái đơn hàng"
                : "Tiến trình đơn hàng"}
          </strong>
          <p>Cập nhật trạng thái đơn hàng</p>
        </div>
      </div>
      {order.paymentStatus === "PAID" && (
        <div className={styles.paymentSuccess} role="status">
          <CheckCircle2 size={22} />
          <div>
            <strong>Đã thanh toán</strong>
            <span>
              {order.orderCode} · {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      )}
      {order.paymentStatus === "FAILED" && (
        <p role="status" className={styles.actionError}>
          <CircleX size={18} /> Thanh toán không thành công. Đơn đã hủy, bạn có
          thể đặt lại món.
        </p>
      )}
      <div className={styles.demoButtons}>
        {pending && (
          <>
            <button
              type="button"
              className={styles.primaryAction}
              disabled={busy}
              onClick={() => act("PAY_SUCCESS")}
            >
              <CheckCircle2 size={17} />
              Xác nhận thanh toán thành công
            </button>
            <button
              type="button"
              className={styles.secondaryAction}
              disabled={busy}
              onClick={() => act("PAY_FAILED")}
            >
              <CircleX size={17} />
              Báo thanh toán thất bại
            </button>
          </>
        )}
        {!terminal &&
          order.paymentMethod === "COD" &&
          order.paymentStatus === "PENDING" && (
            <button
              type="button"
              className={styles.secondaryAction}
              disabled={busy}
              onClick={() => act("COLLECT_COD")}
            >
              <Wallet size={17} />
              Xác nhận đã thu COD
            </button>
          )}
        {!terminal && next && (
          <button
            type="button"
            className={styles.primaryAction}
            disabled={
              busy || (next === "COMPLETED" && order.paymentStatus !== "PAID")
            }
            onClick={() => act("ADVANCE")}
          >
            <ChefHat size={17} />
            Chuyển bước: {orderStatusLabels[next].toLocaleLowerCase("vi-VN")}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
      {next === "COMPLETED" && order.paymentStatus !== "PAID" && (
        <small>Xác nhận đã thu tiền COD trước khi hoàn thành.</small>
      )}
      {feedback && order.paymentStatus !== "FAILED" && (
        <p
          role="status"
          className={feedback.ok ? styles.actionSuccess : styles.actionError}
        >
          {feedback.message}
        </p>
      )}
      {order.status === "COMPLETED" && (
        <p className={styles.completionNote}>
          <CheckCircle2 size={20} /> Đơn hàng đã hoàn tất. Cảm ơn bạn đã chọn
          Clucky!
        </p>
      )}
    </section>
  );
}
