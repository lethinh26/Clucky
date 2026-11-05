"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";

import { useEffect, useRef, useState } from "react";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { Select } from "@base-ui/react/select";
import { MOCK_STORES } from "@/lib/mock/order-mock-data";
import { OrderType, PaymentMethod } from "@/lib/types/order";
import { FoodImage } from "@/components/order/food-image";
import styles from "./checkout.module.css";
import { useOrder } from "@/components/order/order-provider";
import { useNavigationTask } from "@/components/ui-loader";
import { OrderProgress } from "@/components/order/order-progress";
import { ShippingFeeCard } from "@/components/shipping";
import {
  orderApi,
  getErrorMessage,
  type CartItemPayload,
  type CreateOrderPayload,
} from "@/lib/api";
import {
  ShoppingBag,
  MapPin,
  Truck,
  Store,
  ChevronDown,
  Check,
} from "lucide-react";

export default function CheckoutPage() {
  const t = useTranslations();

  const { money: formatPrice } = useLocaleTools();
  const router = useRouter();
  const { items, subtotal, ready, createOrder } = useOrder();
  useNavigationTask(!ready);
  const submitLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("clucky_access_token") : null;
    setIsAuthenticated(!!token);
  }, []);

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
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [voucherMsg, setVoucherMsg] = useState("");
  const [usePoints, setUsePoints] = useState(false);

  // Server-preview breakdown
  const [previewData, setPreviewData] = useState<{
    subtotal?: number;
    discountAmount?: number;
    pointsAmount?: number;
    shippingFee?: number;
    totalAmount?: number;
  } | null>(null);

  // Cost calculations with server preview or graceful local fallback
  const baseShippingFee = orderType === "DELIVERY" ? 20000 : 0;
  const shippingFee =
    previewData?.shippingFee !== undefined
      ? previewData.shippingFee
      : baseShippingFee;
  const voucherDiscount =
    previewData?.discountAmount !== undefined
      ? previewData.discountAmount
      : appliedVoucher?.code === "CLUCKYFREESHIP"
        ? shippingFee
        : (appliedVoucher?.discount ?? 0);
  const pointsDiscount =
    previewData?.pointsAmount !== undefined
      ? previewData.pointsAmount
      : usePoints
        ? 5000
        : 0;
  const totalAmount =
    previewData?.totalAmount !== undefined
      ? previewData.totalAmount
      : Math.max(0, subtotal + shippingFee - voucherDiscount - pointsDiscount);

  // Preview breakdown sync
  useEffect(() => {
    if (!items.length) {
      setPreviewData(null);
      return;
    }
    let active = true;
    const payloadItems: CartItemPayload[] = items.map((it) => ({
      productId:
        it.productId ||
        Number(it.slug?.replace(/\D/g, "")) ||
        Number(it.id?.replace(/\D/g, "")) ||
        undefined,
      comboId: it.comboId,
      itemName: it.name,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      optionsSnapshot: it.options,
      toppingsSnapshot: it.toppings,
      note: it.note,
    }));

    orderApi
      .preview({
        storeId: Number(selectedStore) || 1,
        type: orderType,
        items: payloadItems,
        voucherCode: appliedVoucher?.code,
        pointsUsed: usePoints ? 50 : 0,
        address: orderType === "DELIVERY" ? deliveryAddress.trim() : undefined,
      })
      .then((res) => {
        if (!active || !res) return;
        setPreviewData({
          subtotal: res.subtotal,
          discountAmount: res.discountAmount,
          pointsAmount: res.pointsAmount,
          shippingFee: res.shippingFee,
          totalAmount: res.totalAmount,
        });
      })
      .catch((err) => {
        console.warn("Order preview fallback to local:", err);
      });

    return () => {
      active = false;
    };
  }, [
    items,
    orderType,
    selectedStore,
    appliedVoucher,
    usePoints,
    deliveryAddress,
  ]);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = voucherInput.trim().toUpperCase();
    if (!cleanCode) {
      setAppliedVoucher(null);
      setVoucherMsg("");
      return;
    }
    const payloadItems: CartItemPayload[] = items.map((it) => ({
      productId:
        it.productId ||
        Number(it.slug?.replace(/\D/g, "")) ||
        Number(it.id?.replace(/\D/g, "")) ||
        undefined,
      comboId: it.comboId,
      itemName: it.name,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      optionsSnapshot: it.options,
      toppingsSnapshot: it.toppings,
      note: it.note,
    }));
    orderApi
      .preview({
        storeId: Number(selectedStore) || 1,
        type: orderType,
        items: payloadItems,
        voucherCode: cleanCode,
        pointsUsed: usePoints ? 50 : 0,
        address: orderType === "DELIVERY" ? deliveryAddress.trim() : undefined,
      })
      .then((res) => {
        if (res && res.valid && res.discountAmount > 0) {
          setAppliedVoucher({ code: cleanCode, discount: res.discountAmount });
          setVoucherMsg("business.checkout.theDiscountHasBeenApplied");
        } else {
          setAppliedVoucher(null);
          setVoucherMsg(res?.message || "business.checkout.theVoucherIsInvalidOrHasReachedItsUsageLimit");
        }
      })
      .catch((err: any) => {
        setAppliedVoucher(null);
        const msg = getErrorMessage(err);
        setVoucherMsg(msg || "business.checkout.theVoucherIsInvalidOrHasReachedItsUsageLimit");
      });
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !items.length || submitting || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("clucky_access_token") : null;
    if (!token) {
      submitLock.current = false;
      setSubmitting(false);
      setSubmitError(t("errors.UNAUTHENTICATED"));
      router.push("/login?redirect=/checkout");
      return;
    }

    const payloadItems: CartItemPayload[] = items.map((it) => ({
      productId:
        it.productId ||
        Number(it.slug?.replace(/\D/g, "")) ||
        Number(it.id?.replace(/\D/g, "")) ||
        undefined,
      comboId: it.comboId,
      itemName: it.name,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      optionsSnapshot: it.options,
      toppingsSnapshot: it.toppings,
      note: it.note,
    }));

    const payload: CreateOrderPayload = {
      storeId: Number(selectedStore) || 1,
      type: orderType,
      paymentMethod: paymentMethod,
      items: payloadItems,
      voucherCode: appliedVoucher?.code,
      pointsUsed: usePoints ? 50 : 0,
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      deliveryAddress:
        orderType === "DELIVERY" ? deliveryAddress.trim() : undefined,
      note: orderNote.trim() || undefined,
    };

    try {
      const backendOrder = await createOrder(payload);
      const targetId = String(backendOrder.id);
      router.push(`/orders/${targetId}`);
    } catch (err: any) {
      console.warn("Order creation failed:", err);
      submitLock.current = false;
      setSubmitting(false);
      if (err?.status === 401 || err?.code === "UNAUTHENTICATED") {
        setSubmitError(getErrorMessage(err));
        router.push("/login?redirect=/checkout");
        return;
      }
      const message = getErrorMessage(err);
      setSubmitError(message);
    }
  };

  return (
    <>
      <main className={`${styles.checkoutContainer} m3-page`}>
        <OrderProgress stage="checkout" />
        <div className={styles.checkoutHeading}>
          <span className={styles.eyebrow}>
            {t("business.checkout.completeYourOrder")}
          </span>
          <h1 className={styles.title}>
            {t("business.checkout.checkoutPlaceOrder")}
          </h1>
          <p className={styles.subtitle}>
            {t("business.checkout.checkYourDeliveryDetailsAndChooseAPaymentMethod")}
          </p>
        </div>

        {!ready || submitting ? (
          <div className="order-skeleton" aria-hidden="true" />
        ) : !items.length ? (
          <div className="order-empty">
            <ShoppingBag size={48} />
            <h2>{t("business.checkout.yourCartIsEmpty")}</h2>
            <p>
              {t("business.checkout.chooseYourDishesBeforeProceedingToCheckout")}
            </p>
            <Link className="btn-primary" href="/menu">
              {t("business.checkout.exploreTheMenu")}
            </Link>
          </div>
        ) : (
          <form
            id="checkout-order-form"
            onSubmit={handleSubmitOrder}
            className={styles.checkoutGrid}
          >
            <div className={styles.formSections}>
              {isAuthenticated === false && (
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: "12px",
                    backgroundColor: "#fffbeb",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>
                    {t("errors.UNAUTHENTICATED")}
                  </span>
                  <Link
                    href="/login?redirect=/checkout"
                    style={{
                      fontWeight: 600,
                      color: "#b45309",
                      textDecoration: "underline",
                      fontSize: "14px",
                    }}
                  >
                    {t("auth.login.action")} &rarr;
                  </Link>
                </div>
              )}
              {/* Section 1: Delivery Mode & Receiver Info */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.stepNumber}>1</span>
                  <h2 className={styles.sectionTitle}>
                    {t("business.checkout.orderFulfilment")}
                  </h2>
                </div>

                <div className={styles.typeTabs}>
                  <button
                    type="button"
                    aria-pressed={orderType === "DELIVERY"}
                    className={`${styles.tabBtn} ${
                      orderType === "DELIVERY" ? styles.tabBtnActive : ""
                    }`}
                    onClick={() => setOrderType("DELIVERY")}
                  >
                    <Truck size={18} /> {t("business.checkout.homeDelivery")}
                  </button>
                  <button
                    type="button"
                    aria-pressed={orderType === "PICKUP"}
                    className={`${styles.tabBtn} ${
                      orderType === "PICKUP" ? styles.tabBtnActive : ""
                    }`}
                    onClick={() => setOrderType("PICKUP")}
                  >
                    <Store size={18} /> {t("business.checkout.pickUpAtTheStore")}
                  </button>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="receiverName" className={styles.fieldLabel}>
                      {t("business.checkout.recipientFullName")}
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
                    <label htmlFor="receiverPhone" className={styles.fieldLabel}>
                      {t("business.checkout.contactPhoneNumber")}
                    </label>
                    <input
                      autoComplete="tel"
                      pattern="0[0-9]{9}"
                      title={t(
                        "business.checkout.enterADigitPhoneNumberStartingWith",
                      )}
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
                    {t("business.checkout.preparingStore")}
                  </label>
                  <Select.Root
                    name="storeId"
                    value={selectedStore}
                    onValueChange={(value) => {
                      if (value !== null) setSelectedStore(value);
                    }}
                    items={MOCK_STORES.map((store) => ({
                      value: store.id,
                      label: store.name,
                    }))}
                  >
                    <Select.Trigger
                      id="fulfillmentStore"
                      type="button"
                      aria-describedby="fulfillmentStoreAddress"
                      className={styles.storeTrigger}
                    >
                      <span className={styles.storeTriggerIcon} aria-hidden="true">
                        <Store size={20} />
                      </span>
                      <Select.Value className={styles.storeValue} />
                      <Select.Icon className={styles.storeChevron}>
                        <ChevronDown size={18} />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner
                        sideOffset={8}
                        align="start"
                        alignItemWithTrigger={false}
                        className={styles.storePositioner}
                      >
                        <Select.Popup className={styles.storePopup}>
                          <Select.List className={styles.storeList}>
                            {MOCK_STORES.map((store) => (
                              <Select.Item
                                key={store.id}
                                value={store.id}
                                label={store.name}
                                className={styles.storeOption}
                              >
                                <span
                                  className={styles.storeOptionIcon}
                                  aria-hidden="true"
                                >
                                  <Store size={19} />
                                </span>
                                <div className={styles.storeOptionContent}>
                                  <Select.ItemText
                                    className={styles.storeOptionName}
                                  >
                                    {store.name}
                                  </Select.ItemText>
                                  <span className={styles.storeOptionAddress}>
                                    {store.address}
                                  </span>
                                </div>
                                <Select.ItemIndicator
                                  className={styles.storeCheck}
                                >
                                  <Check size={18} strokeWidth={2.5} />
                                </Select.ItemIndicator>
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
                      {t("business.checkout.fullDeliveryAddress")}
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
                      placeholder={t(
                        "business.checkout.houseNumberStreetWardDistrict",
                      )}
                    />
                  </div>
                ) : null}

                <div className={styles.fieldGroup}>
                  <label htmlFor="orderNote" className={styles.fieldLabel}>
                    {t("business.checkout.orderNotes")}
                  </label>
                  <textarea
                    id="orderNote"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className={styles.textarea}
                    placeholder={t(
                      "business.checkout.forExampleCallMinutesBeforeDeliveryLeaveAtTheDoor",
                    )}
                  />
                </div>
              </section>

              {/* Section 2: Promotions & Loyalty (M5 Slot) */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.stepNumber}>2</span>
                  <h2 className={styles.sectionTitle}>
                    {t("business.checkout.promotionsRewards")}
                  </h2>
                </div>

                <div className={styles.promoBlock}>
                  <input
                    aria-label={t("business.checkout.promoCode")}
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    placeholder={t(
                      "business.checkout.enterAPromoCodeEGCluckygiam",
                    )}
                    className={`${styles.input} ${styles.promoInput}`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    className={styles.applyBtn}
                  >
                    {t("business.checkout.apply")}
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
                    {voucherMsg.includes(".") ? t(voucherMsg) : voucherMsg}
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
                    <span>{t("business.checkout.useCluckyClubPoints")}</span>
                  </label>
                  <span className={styles.loyaltyPoints}>
                    {t("business.checkout.pointsAvailableUsePointsForOff")}
                  </span>
                </div>
              </section>

              {/* Section 3: Payment Method */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.stepNumber}>3</span>
                  <h2 className={styles.sectionTitle}>
                    {t("business.checkout.paymentMethod")}
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
                          {t("business.checkout.automaticVietqrBankTransfer")}
                        </p>
                        <p className={styles.paymentDesc}>
                          {t(
                            "business.checkout.thePaymentCodeWillAppearWhenThePaymentServiceIsConnected",
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={styles.paymentBadge}>
                      {t("business.checkout.recommended")}
                    </span>
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
                          {t("business.checkout.cashOnDeliveryCod")}
                        </p>
                        <p className={styles.paymentDesc}>
                          {t(
                            "business.checkout.payCashToTheDriverOrTheStoreCashier",
                          )}
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </section>
            </div>

            {/* Right Column: Order Summary */}
            <aside className={styles.summaryBox}>
              <div className={styles.receiptLabel}>
                {t("business.checkout.oneLastCheck")}
              </div>
              <h2 className={styles.summaryTitle}>
                {t("business.checkout.yourMealIsAlmostReady")}
              </h2>

              <div className={styles.orderItemsList}>
                {items.map((item) => (
                  <div key={item.id} className={styles.miniItem}>
                    <img src={item.image} alt="" className={styles.miniImage} />
                    <div>
                      <div className={styles.miniItemName}>{item.name}</div>
                      <div className={styles.miniItemQty}>
                        SL: {item.quantity} {t("business.cart.servings")}
                      </div>
                    </div>
                    <strong className={styles.miniItemPrice}>
                      {formatPrice(item.unitPrice * item.quantity)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className={styles.costRow}>
                <span>{t("business.cart.subtotal")}</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              {orderType === "DELIVERY" && (
                <ShippingFeeCard fee={shippingFee} />
              )}

              {voucherDiscount > 0 && (
                <div className={styles.costRow}>
                  <span>{t("business.checkout.voucherDiscount")}</span>
                  <strong className={styles.discountText}>
                    -{formatPrice(voucherDiscount)}
                  </strong>
                </div>
              )}

              {pointsDiscount > 0 && (
                <div className={styles.costRow}>
                  <span>{t("business.checkout.rewardPoints")}</span>
                  <strong className={styles.discountText}>
                    -{formatPrice(pointsDiscount)}
                  </strong>
                </div>
              )}

              <hr className={styles.divider} />

              <div className={styles.totalRow}>
                <span>{t("business.checkout.totalDue")}</span>
                <strong className={styles.totalPrice}>
                  {formatPrice(totalAmount)}
                </strong>
              </div>

              <Link href="/cart" className={styles.editCart}>
                {t("business.checkout.editCart")}
              </Link>

              {submitError && (
                <div
                  role="alert"
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "#fef3f2",
                    border: "1px solid #fecdca",
                    color: "#b42318",
                    fontSize: "13px",
                    fontWeight: 600,
                    margin: "12px 0",
                    lineHeight: 1.4,
                  }}
                >
                  {submitError.includes(".") ? t(submitError) : submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={styles.submitBtn}
              >
                {submitting
                  ? t("business.checkout.processingYourOrder")
                  : t("business.checkout.placeOrderNow")}
              </button>
            </aside>
          </form>
        )}
      </main>
    </>
  );
}
