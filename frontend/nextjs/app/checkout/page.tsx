"use client";

import { useRef, useState } from "react";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { Select } from "@base-ui/react/select";
import { formatPrice } from "@/lib/products";
import { MOCK_STORES } from "@/lib/mock/order-mock-data";
import { Order, OrderType, PaymentMethod } from "@/lib/types/order";
import { FoodImage } from "@/components/order/food-image";
import styles from "./checkout.module.css";
import { useOrder } from "@/components/order/order-provider";
import { useNavigationTask } from "@/components/ui-loader";
import { OrderProgress } from "@/components/order/order-progress";
import {
  ShoppingBag,
  MapPin,
  Truck,
  Store,
  ArrowRight,
  ChevronDown,
  Check,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, ready, placeDemoOrder } = useOrder();
  useNavigationTask(!ready);
  const submitLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [orderType, setOrderType] = useState<OrderType>("DELIVERY");
  const [selectedStore, setSelectedStore] = useState<string>(MOCK_STORES[0].id);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("BANK_TRANSFER");
  const [orderNote, setOrderNote] = useState("");

  // Voucher & Loyalty states (Contract slots with M5)
  const [voucherInput, setVoucherInput] = useState("CLUCKYGIAM20");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
  } | null>({
    code: "CLUCKYGIAM20",
    discount: 20000,
  });
  const [voucherMsg, setVoucherMsg] = useState(
    "Áp dụng mã giảm 20.000đ thành công!",
  );
  const [usePoints, setUsePoints] = useState(false);

  // Cost calculations
  const shippingFee = orderType === "DELIVERY" ? 20000 : 0;
  const voucherDiscount =
    appliedVoucher?.code === "CLUCKYFREESHIP"
      ? shippingFee
      : (appliedVoucher?.discount ?? 0);
  const pointsDiscount = usePoints ? 5000 : 0;
  const totalAmount = Math.max(
    0,
    subtotal + shippingFee - voucherDiscount - pointsDiscount,
  );

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = voucherInput.trim().toUpperCase();
    if (cleanCode === "CLUCKYGIAM20") {
      setAppliedVoucher({ code: "CLUCKYGIAM20", discount: 20000 });
      setVoucherMsg("Áp dụng mã giảm 20.000đ thành công!");
    } else if (cleanCode === "CLUCKYFREESHIP") {
      setAppliedVoucher({ code: "CLUCKYFREESHIP", discount: 20000 });
      setVoucherMsg("Miễn phí vận chuyển thành công!");
    } else {
      setAppliedVoucher(null);
      setVoucherMsg("Mã giảm giá không hợp lệ hoặc đã hết lượt.");
    }
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !items.length || submitting || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    const id = `local-${crypto.randomUUID()}`;
    const store = MOCK_STORES.find((entry) => entry.id === selectedStore)!;
    const now = new Date().toISOString();
    const status = paymentMethod === "COD" ? "CONFIRMED" : "PENDING_PAYMENT";
    const order: Order = {
      id,
      orderCode: `DEMO-${id.slice(-6).toUpperCase()}`,
      storeId: store.id,
      storeName: store.name,
      type: orderType,
      status,
      subtotal,
      discountAmount: voucherDiscount,
      voucherCode: appliedVoucher?.code,
      pointsUsed: usePoints ? 50 : 0,
      pointsAmount: pointsDiscount,
      shippingFee,
      totalAmount,
      paymentMethod,
      paymentStatus: "PENDING",
      receiverName: receiverName.trim(),
      receiverPhone,
      deliveryAddress:
        orderType === "DELIVERY" ? deliveryAddress.trim() : undefined,
      note: orderNote.trim(),
      createdAt: now,
      updatedAt: now,
      items: items.map((item) => ({
        id: item.id,
        slug: item.slug,
        itemName: item.name,
        itemType: "PRODUCT",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        image: item.image,
        optionsSnapshot: item.options,
        toppingsSnapshot: item.toppings,
        note: item.note,
        lineTotal: item.unitPrice * item.quantity,
      })),
      timeline: [
        {
          status,
          title:
            status === "CONFIRMED"
              ? "Đã xác nhận đơn hàng"
              : "Chờ thanh toán",
          description:
            status === "CONFIRMED"
              ? "Đơn hàng thanh toán khi nhận hàng (COD) đã được xác nhận."
              : "Vui lòng hoàn tất thanh toán để Clucky chuẩn bị món.",
          time: now,
          done: true,
          current: true,
        },
      ],
    };
    placeDemoOrder(order);
    router.push(`/orders/${id}`);
  };

  return (
    <>
            <main className={`${styles.checkoutContainer} m3-page`}>
        <OrderProgress stage="checkout" />
        <div className={styles.checkoutHeading}>
          <span className={styles.eyebrow}>Hoàn tất đơn món</span>
          <h1 className={styles.title}>Thanh toán & Đặt hàng</h1>
          <p className={styles.subtitle}>
            Kiểm tra thông tin giao nhận và lựa chọn phương thức thanh toán phù
            hợp.
          </p>
        </div>

        {!ready || submitting ? (
          <div className="order-skeleton" aria-hidden="true" />
        ) : !items.length ? (
          <div className="order-empty">
            <ShoppingBag size={48} />
            <h2>Giỏ hàng đang trống</h2>
            <p>Chọn món trước khi tiếp tục thanh toán nhé.</p>
            <Link className="btn-primary" href="/menu">
              Khám phá thực đơn
            </Link>
          </div>
        ) : (
          <form
            id="checkout-order-form"
            onSubmit={handleSubmitOrder}
            className={styles.checkoutGrid}
          >
            <div className={styles.formSections}>
              {/* Section 1: Delivery Mode & Receiver Info */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.stepNumber}>1</span>
                  <h2 className={styles.sectionTitle}>Hình thức nhận món</h2>
                </div>

                <div className={styles.typeTabs}>
                  <button
                    type="button"
                    aria-pressed={orderType === "DELIVERY"}
                    className={`${styles.tabBtn} ${orderType === "DELIVERY" ? styles.tabBtnActive : ""}`}
                    onClick={() => setOrderType("DELIVERY")}
                  >
                    <Truck size={18} /> Giao tận nơi
                  </button>
                  <button
                    type="button"
                    aria-pressed={orderType === "PICKUP"}
                    className={`${styles.tabBtn} ${orderType === "PICKUP" ? styles.tabBtnActive : ""}`}
                    onClick={() => setOrderType("PICKUP")}
                  >
                    <Store size={18} /> Tự đến lấy tại quán
                  </button>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="receiverName" className={styles.fieldLabel}>
                      Họ và tên người nhận *
                    </label>
                    <input
                      autoComplete="name"
                      minLength={2}
                      id="receiverName"
                      type="text"
                      required
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      className={styles.input}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label
                      htmlFor="receiverPhone"
                      className={styles.fieldLabel}
                    >
                      Số điện thoại liên hệ *
                    </label>
                    <input
                      autoComplete="tel"
                      pattern="0[0-9]{9}"
                      title="Nhập số điện thoại gồm 10 chữ số, bắt đầu bằng 0"
                      id="receiverPhone"
                      type="tel"
                      required
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      className={styles.input}
                      placeholder="0901234567"
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label
                    htmlFor="fulfillmentStore"
                    className={styles.fieldLabel}
                  >
                    Chi nhánh chuẩn bị món
                  </label>
                  <Select.Root
                    name="storeId"
                    value={selectedStore}
                    onValueChange={(value) => {
                      if (value !== null) setSelectedStore(value);
                    }}
                    items={MOCK_STORES.map((store) => ({ value: store.id, label: store.name }))}
                  >
                    <Select.Trigger
                      id="fulfillmentStore"
                      type="button"
                      aria-describedby="fulfillmentStoreAddress"
                      className={styles.storeTrigger}
                    >
                      <span className={styles.storeTriggerIcon} aria-hidden="true"><Store size={20} /></span>
                      <Select.Value className={styles.storeValue} />
                      <Select.Icon className={styles.storeChevron}><ChevronDown size={18} /></Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner sideOffset={8} align="start" alignItemWithTrigger={false} className={styles.storePositioner}>
                        <Select.Popup className={styles.storePopup}>
                          <Select.List className={styles.storeList}>
                            {MOCK_STORES.map((store) => (
                              <Select.Item key={store.id} value={store.id} label={store.name} className={styles.storeOption}>
                                <span className={styles.storeOptionIcon} aria-hidden="true"><Store size={19} /></span>
                                <div className={styles.storeOptionContent}>
                                  <Select.ItemText className={styles.storeOptionName}>{store.name}</Select.ItemText>
                                  <span className={styles.storeOptionAddress}>{store.address}</span>
                                </div>
                                <Select.ItemIndicator className={styles.storeCheck}><Check size={18} strokeWidth={2.5} /></Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.List>
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                  <p id="fulfillmentStoreAddress" className={styles.storeHint}>
                    <MapPin size={14} />{" "}
                    {
                      MOCK_STORES.find((store) => store.id === selectedStore)
                        ?.address
                    }
                  </p>
                </div>
                {orderType === "DELIVERY" ? (
                  <div className={styles.fieldGroup}>
                    <label
                      htmlFor="deliveryAddress"
                      className={styles.fieldLabel}
                    >
                      Địa chỉ nhận hàng chi tiết *
                    </label>
                    <input
                      autoComplete="street-address"
                      minLength={8}
                      id="deliveryAddress"
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className={styles.input}
                      placeholder="Số nhà, tên đường, phường, quận..."
                    />
                  </div>
                ) : null}

                <div className={styles.fieldGroup}>
                  <label htmlFor="orderNote" className={styles.fieldLabel}>
                    Ghi chú cho đơn hàng
                  </label>
                  <textarea
                    id="orderNote"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className={styles.textarea}
                    placeholder="Ví dụ: Gọi trước khi giao 5 phút, để trước cửa giúp mình..."
                  />
                </div>
              </section>

              {/* Section 2: Promotions & Loyalty (M5 Slot) */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.stepNumber}>2</span>
                  <h2 className={styles.sectionTitle}>
                    Khuyến mãi & Điểm thưởng
                  </h2>
                </div>

                <div className={styles.promoBlock}>
                  <input
                    aria-label="Mã ưu đãi"
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    placeholder="Nhập mã ưu đãi (VD: CLUCKYGIAM20)"
                    className={`${styles.input} ${styles.promoInput}`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    className={styles.applyBtn}
                  >
                    Áp dụng
                  </button>
                </div>

                {voucherMsg && (
                  <p
                    style={{
                      fontSize: 13,
                      marginTop: 8,
                      fontWeight: 600,
                      color: appliedVoucher ? "#1e7a46" : "#b42318",
                    }}
                  >
                    {voucherMsg}
                  </p>
                )}

                <div className={styles.loyaltyBox}>
                  <label className={styles.loyaltyLabel}>
                    <input
                      type="checkbox"
                      checked={usePoints}
                      onChange={(e) => setUsePoints(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: "#8f1216" }}
                    />
                    <span>Dùng điểm tích lũy Clucky Club</span>
                  </label>
                  <span className={styles.loyaltyPoints}>
                    Có 120 điểm (-5.000đ khi dùng 50 điểm)
                  </span>
                </div>
              </section>

              {/* Section 3: Payment Method */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.stepNumber}>3</span>
                  <h2 className={styles.sectionTitle}>
                    Phương thức thanh toán
                  </h2>
                </div>

                <div className={styles.paymentOptions}>
                  <label
                    className={`${styles.paymentCard} ${
                      paymentMethod === "BANK_TRANSFER"
                        ? styles.paymentCardActive
                        : ""
                    }`}
                  >
                    <div className={styles.paymentLeft}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="BANK_TRANSFER"
                        checked={paymentMethod === "BANK_TRANSFER"}
                        onChange={() => setPaymentMethod("BANK_TRANSFER")}
                        className={styles.paymentRadio}
                      />
                      <div>
                        <p className={styles.paymentTitle}>
                          Chuyển khoản VietQR tự động
                        </p>
                        <p className={styles.paymentDesc}>
                          Mã thanh toán sẽ hiển thị khi dịch vụ thanh toán được
                          kết nối.
                        </p>
                      </div>
                    </div>
                    <span className={styles.paymentBadge}>Khuyên dùng</span>
                  </label>

                  <label
                    className={`${styles.paymentCard} ${
                      paymentMethod === "COD" ? styles.paymentCardActive : ""
                    }`}
                  >
                    <div className={styles.paymentLeft}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="COD"
                        checked={paymentMethod === "COD"}
                        onChange={() => setPaymentMethod("COD")}
                        className={styles.paymentRadio}
                      />
                      <div>
                        <p className={styles.paymentTitle}>
                          Thanh toán khi nhận hàng (COD)
                        </p>
                        <p className={styles.paymentDesc}>
                          Thanh toán tiền mặt cho tài xế hoặc thu ngân tại quán.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </section>
            </div>

            {/* Right Column: Order Summary */}
            <aside className={styles.summaryBox}>
              <div className={styles.receiptLabel}>KIỂM TRA LẦN CUỐI</div>
              <h2 className={styles.summaryTitle}>Bữa ngon sắp sẵn sàng</h2>

              <div className={styles.orderItemsList}>
                {items.map((item) => (
                  <div key={item.id} className={styles.miniItem}>
                    <img src={item.image} alt="" className={styles.miniImage} />
                    <div>
                      <div className={styles.miniItemName}>{item.name}</div>
                      <div className={styles.miniItemQty}>
                        SL: {item.quantity} phần
                      </div>
                    </div>
                    <strong className={styles.miniItemPrice}>
                      {formatPrice(item.unitPrice * item.quantity)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className={styles.costRow}>
                <span>Tạm tính</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <div className={styles.costRow}>
                <span>Phí vận chuyển</span>
                <strong>
                  {shippingFee > 0 ? formatPrice(shippingFee) : "Miễn phí"}
                </strong>
              </div>

              {voucherDiscount > 0 && (
                <div className={styles.costRow}>
                  <span>Voucher giảm giá</span>
                  <strong className={styles.discountText}>
                    -{formatPrice(voucherDiscount)}
                  </strong>
                </div>
              )}

              {pointsDiscount > 0 && (
                <div className={styles.costRow}>
                  <span>Điểm tích lũy</span>
                  <strong className={styles.discountText}>
                    -{formatPrice(pointsDiscount)}
                  </strong>
                </div>
              )}

              <hr className={styles.divider} />

              <div className={styles.totalRow}>
                <span>Tổng thanh toán</span>
                <strong className={styles.totalPrice}>
                  {formatPrice(totalAmount)}
                </strong>
              </div>

              <Link href="/cart" className={styles.editCart}>
                Chỉnh sửa giỏ hàng
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className={styles.submitBtn}
              >
                {submitting ? "Đang xử lý đơn hàng…" : "Đặt hàng ngay →"}
              </button>
            </aside>
          </form>
        )}
      </main>
          </>
  );
}
