"use client";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";


import { useRef, useState } from "react";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { Select } from "@base-ui/react/select";
import { MOCK_STORES } from "@/lib/mock/order-mock-data";
import { Order, OrderType, PaymentMethod } from "@/lib/types/order";
import { FoodImage } from "@/components/order/food-image";
import styles from "./checkout.module.css";
import { useOrder } from "@/components/order/order-provider";
import { useNavigationTask } from "@/components/ui-loader";
import { OrderProgress } from "@/components/order/order-progress";
import { ShippingFeeCard } from "@/components/shipping";
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
  const t = useTranslations();

  const { money: formatPrice } = useLocaleTools();
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
    "business.checkout.theDiscountHasBeenApplied",
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
      setVoucherMsg("business.checkout.theDiscountHasBeenApplied");
    } else if (cleanCode === "CLUCKYFREESHIP") {
      setAppliedVoucher({ code: "CLUCKYFREESHIP", discount: 20000 });
      setVoucherMsg("business.checkout.freeDeliveryApplied");
    } else {
      setAppliedVoucher(null);
      setVoucherMsg("business.checkout.theVoucherIsInvalidOrHasReachedItsUsageLimit");
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
              ? t("business.checkout.orderConfirmed")
              : t("business.checkout.awaitingPayment"),
          description:
            status === "CONFIRMED"
              ? t("business.checkout.yourCashOnDeliveryOrderHasBeenConfirmed")
              : t("business.checkout.pleaseCompletePaymentSoCluckyCanPrepareYourMeal"),
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
          <span className={styles.eyebrow}>{t("business.checkout.completeYourOrder")}</span>
          <h1 className={styles.title}>{t("business.checkout.checkoutPlaceOrder")}</h1>
          <p className={styles.subtitle}> {t("business.checkout.checkYourDeliveryDetailsAndChooseAPaymentMethod")} </p>
        </div>

        {!ready || submitting ? (
          <div className="order-skeleton" aria-hidden="true" />
        ) : !items.length ? (
          <div className="order-empty">
            <ShoppingBag size={48} />
            <h2>{t("business.checkout.yourCartIsEmpty")}</h2>
            <p>{t("business.checkout.chooseYourDishesBeforeProceedingToCheckout")}</p>
            <Link className="btn-primary" href="/menu"> {t("business.checkout.exploreTheMenu")} </Link>
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
                  <h2 className={styles.sectionTitle}>{t("business.checkout.orderFulfilment")}</h2>
                </div>

                <div className={styles.typeTabs}>
                  <button
                    type="button"
                    aria-pressed={orderType === "DELIVERY"}
                    className={`${styles.tabBtn} ${orderType === "DELIVERY" ? styles.tabBtnActive : ""}`}
                    onClick={() => setOrderType("DELIVERY")}
                  >
                    <Truck size={18} /> {t("business.checkout.homeDelivery")} </button>
                  <button
                    type="button"
                    aria-pressed={orderType === "PICKUP"}
                    className={`${styles.tabBtn} ${orderType === "PICKUP" ? styles.tabBtnActive : ""}`}
                    onClick={() => setOrderType("PICKUP")}
                  >
                    <Store size={18} /> {t("business.checkout.pickUpAtTheStore")} </button>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="receiverName" className={styles.fieldLabel}> {t("business.checkout.recipientFullName")} </label>
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
                    > {t("business.checkout.contactPhoneNumber")} </label>
                    <input
                      autoComplete="tel"
                      pattern="0[0-9]{9}"
                      title={t("business.checkout.enterADigitPhoneNumberStartingWith")}
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
                  > {t("business.checkout.preparingStore")} </label>
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
                    > {t("business.checkout.fullDeliveryAddress")} </label>
                    <input
                      autoComplete="street-address"
                      minLength={8}
                      id="deliveryAddress"
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className={styles.input}
                      placeholder={t("business.checkout.houseNumberStreetWardDistrict")}
                    />
                  </div>
                ) : null}

                <div className={styles.fieldGroup}>
                  <label htmlFor="orderNote" className={styles.fieldLabel}> {t("business.checkout.orderNotes")} </label>
                  <textarea
                    id="orderNote"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className={styles.textarea}
                    placeholder={t("business.checkout.forExampleCallMinutesBeforeDeliveryLeaveAtTheDoor")}
                  />
                </div>
              </section>

              {/* Section 2: Promotions & Loyalty (M5 Slot) */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.stepNumber}>2</span>
                  <h2 className={styles.sectionTitle}> {t("business.checkout.promotionsRewards")} </h2>
                </div>

                <div className={styles.promoBlock}>
                  <input
                    aria-label={t("business.checkout.promoCode")}
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    placeholder={t("business.checkout.enterAPromoCodeEGCluckygiam")}
                    className={`${styles.input} ${styles.promoInput}`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    className={styles.applyBtn}
                  > {t("business.checkout.apply")} </button>
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
                    {t(voucherMsg)}
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
                  <span className={styles.loyaltyPoints}> {t("business.checkout.pointsAvailableUsePointsForOff")} </span>
                </div>
              </section>

              {/* Section 3: Payment Method */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.stepNumber}>3</span>
                  <h2 className={styles.sectionTitle}> {t("business.checkout.paymentMethod")} </h2>
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
                        <p className={styles.paymentTitle}> {t("business.checkout.automaticVietqrBankTransfer")} </p>
                        <p className={styles.paymentDesc}> {t("business.checkout.thePaymentCodeWillAppearWhenThePaymentServiceIsConnected")} </p>
                      </div>
                    </div>
                    <span className={styles.paymentBadge}>{t("business.checkout.recommended")}</span>
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
                        <p className={styles.paymentTitle}> {t("business.checkout.cashOnDeliveryCod")} </p>
                        <p className={styles.paymentDesc}> {t("business.checkout.payCashToTheDriverOrTheStoreCashier")} </p>
                      </div>
                    </div>
                  </label>
                </div>
              </section>
            </div>

            {/* Right Column: Order Summary */}
            <aside className={styles.summaryBox}>
              <div className={styles.receiptLabel}>{t("business.checkout.oneLastCheck")}</div>
              <h2 className={styles.summaryTitle}>{t("business.checkout.yourMealIsAlmostReady")}</h2>

              <div className={styles.orderItemsList}>
                {items.map((item) => (
                  <div key={item.id} className={styles.miniItem}>
                    <img src={item.image} alt="" className={styles.miniImage} />
                    <div>
                      <div className={styles.miniItemName}>{item.name}</div>
                      <div className={styles.miniItemQty}>
                        SL: {item.quantity} {t("business.cart.servings")} </div>
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

              <Link href="/cart" className={styles.editCart}> {t("business.checkout.editCart")} </Link>
              <button
                type="submit"
                disabled={submitting}
                className={styles.submitBtn}
              >
                {submitting ? t("business.checkout.processingYourOrder") : t("business.checkout.placeOrderNow")}
              </button>
            </aside>
          </form>
        )}
      </main>
          </>
  );
}
