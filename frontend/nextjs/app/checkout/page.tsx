"use client";
import { notify, useFeedback } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";

import { useEffect, useMemo, useRef, useState } from "react";
import { toCartPayload } from "@/lib/cart";
import { useNavigationRouter as useRouter } from "@/components/ui-loader/use-navigation-router";
import Link from "@/components/ui-loader/navigation-link";
import { Select } from "@base-ui/react/select";
import { catalogApi, type StoreItem } from "@/lib/api";
import { coordinates, emptyAddress, formatAddress, profileApi, type Coordinates } from "@/lib/locations";
import { CheckoutAddress } from "@/components/maps/checkout-address";
import { BranchMap } from "@/components/maps/branch-map";
import { stores as FALLBACK_STORES } from "@/lib/products";
import { OrderType, PaymentMethod } from "@/lib/types/order";
import { FoodImage } from "@/components/order/food-image";
import styles from "./checkout.module.css";
import { useOrder } from "@/components/order/order-provider";
import { useSession } from "@/components/auth/use-session";
import { loyaltyApi } from "@/lib/loyalty";
import { useNavigationTask } from "@/components/ui-loader";
import { OrderProgress } from "@/components/order/order-progress";
import { ShippingFeeCard } from "@/components/shipping";
import { DeliveryPanel } from "@/components/shipping/delivery-panel";
import {
  orderApi,
  getErrorMessage,
  type CreateOrderPayload,
  type OrderPreviewResult,
  type ShippingQuote,
} from "@/lib/api";
import {
  ShoppingBag,
  MapPin,
  Truck,
  Store,
  ChevronDown,
  Check,
  CircleAlert,
  RefreshCw,
} from "lucide-react";

export default function CheckoutPage() {
  const t = useTranslations();
  const loyaltyText = useTranslations("loyalty");
  const shippingText = useTranslations("shipping");

  const { money: formatPrice } = useLocaleTools();
  const router = useRouter();
  const { items, subtotal, ready, cartPending, createOrder } = useOrder();
  const [stores, setStores] = useState<StoreItem[]>(FALLBACK_STORES as StoreItem[]);
  const [selectedStore, setSelectedStore] = useState<string>(String(FALLBACK_STORES[0]?.id || 1));
  const [storesError, setStoresError] = useState(false);
  useFeedback(storesError && t("maps.storesError"));
  const [storesReload, setStoresReload] = useState(0);
  const [deliveryPoint, setDeliveryPoint] = useState<Coordinates | null>(null);

  useEffect(() => {
    let active = true;
    setStoresError(false);
    catalogApi.getStores(false)
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
          setSelectedStore((prev) => {
            const exists = data.some((s) => String(s.id) === prev);
            return exists ? prev : String(data[0].id);
          });
        }
      })
      .catch((err) => {
        console.warn("Could not load stores from API, using fallback:", err);
        if (active) setStoresError(true);
      });
    return () => { active = false; };
  }, [storesReload]);

  useEffect(() => {
    const itemWithStore = items.find((it) => (it as { storeId?: number | string }).storeId != null);
    if ((itemWithStore as { storeId?: number | string } | undefined)?.storeId) {
      setSelectedStore(String((itemWithStore as { storeId?: number | string }).storeId));
    }
  }, [items]);

  const storePoint = coordinates(stores.find(store => String(store.id) === selectedStore));

  const payloadItems = useMemo(() => {
    if (!items.length) return [];
    try {
      const sanitized = items.map((item) => {
        let prodId = item.productId;
        let comboId = item.comboId;
        if (prodId == null && comboId == null) {
          const numId = Number(item.id);
          if (Number.isSafeInteger(numId) && numId > 0) {
            if (item.itemType === "COMBO") comboId = numId;
            else prodId = numId;
          } else {
            prodId = 1;
          }
        }
        return {
          ...item,
          productId: prodId,
          comboId: comboId,
          quantity: item.quantity > 0 ? item.quantity : 1,
          optionIds: (item.optionIds || []).filter((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0).map(Number),
          toppingIds: (item.toppingIds || []).filter((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0).map(Number),
        };
      });
      return sanitized.map(toCartPayload);
    } catch (err) {
      console.warn("Payload mapping error:", err);
      return [];
    }
  }, [items]);
  useNavigationTask(!ready);
  const submitLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  useFeedback(submitError);
  const session = useSession();
  const userId = session.user?.userId;
  const isAuthenticated = session.ready ? Boolean(session.user) : null;

  // Form states
  const [orderType, setOrderType] = useState<OrderType>("DELIVERY");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("BANK_TRANSFER");
  const [orderNote, setOrderNote] = useState("");

  useEffect(() => {
    if (userId === undefined) return;
    let active = true;
    profileApi.get().then(profile => {
      if (!active) return;
      setReceiverName(current => current || profile.fullName || "");
      setReceiverPhone(current => current || profile.phone || "");
    }).catch(() => {});
    return () => { active = false; };
  }, [userId]);

  // Voucher & Loyalty states (Contract slots with M5)
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [voucherMsg, setVoucherMsg] = useState("");
  useFeedback(voucherMsg ? (t.has(voucherMsg) ? t(voucherMsg) : voucherMsg) : null, appliedVoucher ? "success" : "warning");
  const [usePoints, setUsePoints] = useState(false);
  const [requestedPoints, setRequestedPoints] = useState(0);
  const [loyaltyBalance, setLoyaltyBalance] = useState<{ userId: number; available: number } | null>(null);
  const [loyaltyError, setLoyaltyError] = useState(false);
  useFeedback(loyaltyError && loyaltyText("error"));
  const [loyaltyReload, setLoyaltyReload] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  useFeedback(previewError);
  const [previewReload, setPreviewReload] = useState(0);
  const availablePoints = loyaltyBalance?.userId === session.user?.userId ? loyaltyBalance?.available : undefined;
  useEffect(() => {
    let active = true;
    setLoyaltyBalance(null); setLoyaltyError(false); setUsePoints(false); setRequestedPoints(0);
    if (userId !== undefined) {
      loyaltyApi.me().then(result => {
        if (active) setLoyaltyBalance({ userId, available: result.points.availablePoints });
      }).catch(() => { if (active) setLoyaltyError(true); });
    }
    return () => { active = false; };
  }, [userId, loyaltyReload]);

  const previewPayload = useMemo(() => ({
    storeId: Number(selectedStore), type: orderType, items: payloadItems ?? [],
    voucherCode: appliedVoucher?.code,
    pointsUsed: usePoints ? Math.min(requestedPoints, availablePoints ?? 0) : 0,
    receiverAddress: orderType === "DELIVERY" ? deliveryAddress.trim() : undefined,
    latitude: orderType === "DELIVERY" ? deliveryPoint?.latitude : undefined,
    longitude: orderType === "DELIVERY" ? deliveryPoint?.longitude : undefined,
  }), [selectedStore, orderType, payloadItems, appliedVoucher?.code, usePoints, requestedPoints, availablePoints, deliveryAddress, deliveryPoint]);
  const previewKey = JSON.stringify([userId, previewPayload, previewReload]);
  const [quote, setQuote] = useState<{ key: string; data: OrderPreviewResult } | null>(null);
  const [deliveryQuote, setDeliveryQuote] = useState<{ key: string; data: ShippingQuote } | null>(null);
  const deliveryCheck = deliveryQuote?.key === previewKey ? deliveryQuote.data : undefined;
  const previewData = quote?.key === previewKey ? quote.data : null;
  const shippingFee = orderType === "PICKUP" ? 0 : (previewData?.shippingFee ?? 0);
  const voucherDiscount = previewData ? Math.max(0, previewData.discountAmount - (previewData.tierDiscount ?? 0)) : (appliedVoucher?.discount ?? 0);
  const pointsDiscount = previewData?.pointsAmount ?? (usePoints ? 5000 : 0);
  const calculatedTotal = Math.max(0, subtotal + shippingFee - voucherDiscount - pointsDiscount);
  const totalAmount = previewData?.totalAmount ?? (orderType === "PICKUP" ? calculatedTotal : null);
  const needsDeliveryAddress = orderType === "DELIVERY" && deliveryAddress.trim().length < 8;
  const needsDeliveryPoint = orderType === "DELIVERY" && !deliveryPoint;
  const orderBlockReason = !ready || !session.ready ? loyaltyText("cartLoading")
    : cartPending ? loyaltyText("cartUpdating")
    : !payloadItems || !items.length ? loyaltyText("cartInvalid")
    : !selectedStore ? loyaltyText("storeRequired")
    : needsDeliveryAddress ? loyaltyText("addressRequired")
    : needsDeliveryPoint ? t("maps.deliveryPinRequired")
    : previewError ? previewError
    : !previewData ? loyaltyText("quotePending")
    : null;

  useEffect(() => {
    setPreviewError(null);
    if (!ready || !session.ready || !selectedStore || !payloadItems?.length || needsDeliveryAddress || needsDeliveryPoint) {
      setQuote(null); setPreviewLoading(false);
      return;
    }
    let active = true;
    setPreviewLoading(true);
    const timer = setTimeout(() => {
      orderApi.preview(previewPayload).then(result => {
        if (!active) return;
        setDeliveryQuote(result.shipping ? { key: previewKey, data: result.shipping } : null);
        if (result.orderValid === false || (previewPayload.voucherCode && !result.voucherValid)) {
          setPreviewError(result.message || getErrorMessage({ code: "RESOURCE_CONFLICT" }));
          return;
        }
        setQuote({ key: previewKey, data: result });
      }).catch(failure => {
        if (active) { setPreviewError(getErrorMessage(failure)); setQuote(null); }
      }).finally(() => { if (active) setPreviewLoading(false); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [ready, session.ready, selectedStore, payloadItems, needsDeliveryAddress, needsDeliveryPoint, previewKey, previewPayload]);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payloadItems || cartPending || !selectedStore) return;
    const cleanCode = voucherInput.trim().toUpperCase();
    if (!cleanCode) {
      setAppliedVoucher(null);
      setVoucherMsg("");
      return;
    }
    orderApi
      .preview({
        storeId: Number(selectedStore),
        type: orderType,
        items: payloadItems,
        voucherCode: cleanCode,
        pointsUsed: usePoints ? Math.min(requestedPoints, availablePoints ?? 0) : 0,
        receiverAddress: orderType === "DELIVERY" ? deliveryAddress.trim() : undefined,
        latitude: orderType === "DELIVERY" ? deliveryPoint?.latitude : undefined,
        longitude: orderType === "DELIVERY" ? deliveryPoint?.longitude : undefined,
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
    if (!ready || cartPending || !payloadItems || !items.length || !selectedStore || submitting || submitLock.current) return;
    if (needsDeliveryAddress) { setSubmitError(loyaltyText("addressRequired")); return; }
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);

    if (!isAuthenticated) {
      submitLock.current = false;
      setSubmitting(false);
      setSubmitError(t("errors.UNAUTHENTICATED"));
      router.push("/login?redirect=/checkout");
      return;
    }


    const payload: CreateOrderPayload = {
      expectedTotal: totalAmount,
      storeId: Number(selectedStore),
      type: orderType,
      paymentMethod: paymentMethod,
      items: payloadItems,
      voucherCode: appliedVoucher?.code,
      pointsUsed: usePoints ? Math.min(requestedPoints, availablePoints ?? 0) : 0,
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      deliveryAddress:
        orderType === "DELIVERY" ? deliveryAddress.trim() : undefined,
      latitude: orderType === "DELIVERY" ? deliveryPoint?.latitude : undefined,
      longitude: orderType === "DELIVERY" ? deliveryPoint?.longitude : undefined,
      note: orderNote.trim() || undefined,
    };

    try {
      const backendOrder = await createOrder(payload);
      const targetId = String(backendOrder.id);
      notify.success(t("common.feedback.orderCreated"));
      router.push(`/orders/${targetId}`);
    } catch (err: any) {
      console.warn("Order creation failed:", err);
      setLoyaltyReload(value => value + 1);
      setPreviewReload(value => value + 1);
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
                      pattern="[+0-9 ]{9,30}"
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
                    items={stores.map((store) => ({
                      value: String(store.id),
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
                            {stores.map((store) => (
                              <Select.Item
                                key={store.id}
                                value={String(store.id)}
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
                      stores.find((store) => String(store.id) === selectedStore)
                        ?.address
                    }
                  </p>
                </div>
                {orderType === "DELIVERY" ? (
                  <div className={styles.fieldGroup}>
                    <CheckoutAddress value={{ ...emptyAddress, receiverName, phone: receiverPhone, detail: deliveryAddress, latitude: deliveryPoint?.latitude ?? null, longitude: deliveryPoint?.longitude ?? null }} onSelect={address => {
                      setReceiverName(address.receiverName); setReceiverPhone(address.phone); setDeliveryAddress(formatAddress(address)); setDeliveryPoint(coordinates(address));
                    }} />
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
                      maxLength={600}
                      onChange={(e) => { setDeliveryAddress(e.target.value); setDeliveryPoint(null); }}
                      className={styles.input}
                      placeholder={t(
                        "business.checkout.houseNumberStreetWardDistrict",
                      )}
                    />
                  </div>
                ) : null}
                {orderType === "DELIVERY" ? <DeliveryPanel store={stores.find(store => String(store.id) === selectedStore)} pin={deliveryPoint}
                  quote={deliveryCheck} loading={previewLoading} error={Boolean(previewError)} onPickup={() => setOrderType("PICKUP")}
                  onRetry={() => { setPreviewReload(value => value + 1); setStoresReload(value => value + 1); }} />
                  : <><p className={styles.pickupHint}><Store size={17} aria-hidden="true" />{shippingText("pickupHint")}</p>
                    {storePoint && <div style={{ height: 240, marginBottom: 20 }}><BranchMap points={[{ ...storePoint, id: selectedStore, label: stores.find(store => String(store.id) === selectedStore)?.name ?? "Clucky" }]} selectedId={selectedStore} /></div>}</>}
                {storesError && <p role="alert">{t("maps.storesError")} <button type="button" onClick={() => setStoresReload(value => value + 1)}>{t("maps.retry")}</button></p>}
                {!selectedStore && <p role="status">{t("maps.pickStore")}</p>}

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
                    {t.has(voucherMsg) ? t(voucherMsg) : voucherMsg}
                  </p>
                )}
                {appliedVoucher && (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedVoucher(null);
                      setVoucherInput("");
                      setVoucherMsg("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#b42318",
                      fontSize: "12px",
                      cursor: "pointer",
                      textDecoration: "underline",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    {t("business.checkout.removeVoucher", { code: appliedVoucher.code })}
                  </button>
                )}

                <div className={styles.loyaltyBox}>
                  <label className={styles.loyaltyLabel}>
                    <input
                      type="checkbox"
                      checked={usePoints}
                      disabled={!availablePoints || loyaltyError}
                      onChange={(e) => { setUsePoints(e.target.checked); setRequestedPoints(availablePoints ?? 0); }}
                      style={{ width: 18, height: 18, accentColor: "#8f1216" }}
                    />
                    <span>{loyaltyText("usePoints")}</span>
                  </label>
                  <span className={styles.loyaltyPoints}>
                    {availablePoints !== undefined ? loyaltyText("availableCheckout", { points: availablePoints }) : loyaltyError ? loyaltyText("error") : loyaltyText("loading")}
                  </span>
                </div>
                {loyaltyError && <button type="button" className="btn-secondary" onClick={() => setLoyaltyReload(value => value + 1)}>{loyaltyText("retry")}</button>}
                {usePoints && <div><label htmlFor="points-to-use">{loyaltyText("pointsInput")}</label><input id="points-to-use" type="number" min={0} max={availablePoints ?? 0} step={1} value={requestedPoints} onChange={event => setRequestedPoints(Math.min(availablePoints ?? 0, Math.max(0, Math.floor(Number(event.target.value) || 0))))} className={styles.input} /><p>{loyaltyText("checkoutHint")}</p>{previewData && <p>{loyaltyText("applied", { points: previewData.pointsUsed ?? 0 })}</p>}</div>}
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
                    <FoodImage src={item.image} alt="" className={styles.miniImage} />
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
                <strong>{formatPrice(previewData?.subtotal ?? subtotal)}</strong>
              </div>

              {orderType === "DELIVERY" && (
                <ShippingFeeCard fee={shippingFee} loading={previewLoading && !needsDeliveryAddress} />
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

              {(previewData?.tierDiscount ?? 0) > 0 && <div className={styles.costRow}><span>{loyaltyText("tierSavings")}</span><strong className={styles.discountText}>-{formatPrice(previewData!.tierDiscount!)}</strong></div>}

              <hr className={styles.divider} />

              <div className={styles.totalRow}>
                <span>{t("business.checkout.totalDue")}</span>
                <strong className={styles.totalPrice}>
                  {totalAmount !== null ? formatPrice(totalAmount) : <span className={styles.quotePending}>{loyaltyText("quotePending")}</span>}
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
                  {submitError}
                </div>
              )}

              {orderBlockReason && <div id="checkout-submit-status" className={styles.submitStatus + (previewError ? " " + styles.submitStatusError : "")} role={previewError ? "alert" : "status"}>
                <div><CircleAlert size={18} aria-hidden="true" /><span>{previewError ? <><strong>{loyaltyText("quoteFailedTitle")}</strong>{orderBlockReason}</> : orderBlockReason}</span></div>
                {previewError && !needsDeliveryAddress && <button type="button" className="btn-secondary" disabled={previewLoading} onClick={() => setPreviewReload(value => value + 1)}><RefreshCw size={15} aria-hidden="true" />{loyaltyText("retry")}</button>}
              </div>}

              <button
                type="submit"
                disabled={submitting || Boolean(orderBlockReason)}
                aria-describedby={orderBlockReason ? "checkout-submit-status" : undefined}
                className={styles.submitBtn}
              >
                {submitting
                  ? t("business.checkout.processingYourOrder")
                  : previewLoading ? loyaltyText("quoteLoading")
                  : t("business.checkout.placeOrderNow")}
              </button>
            </aside>
          </form>
        )}
      </main>
    </>
  );
}
