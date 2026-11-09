"use client";
import { notify, useFeedback } from "@/components/feedback";

import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";
import { useEffect, useState } from "react";
import { coordinates, distanceKm } from "@/lib/locations";
import { useDistanceOrigin } from "@/components/maps/use-distance-origin";
import styles from "./party.module.css";
import { OrderDialog } from "@/components/order/order-dialog";
import {
  PartyPopper,
  CheckCircle2,
  CalendarDays,
  Users,
  Store,
} from "lucide-react";
import { catalogApi, partyOrderApi, getErrorMessage, type BackendPartyOrder, type StoreItem } from "@/lib/api";

export default function PartyOrderPage() {
  const t = useTranslations();
  const maps = useTranslations("maps");
  const { money, number, locale } = useLocaleTools();
  const { origin, fromHome } = useDistanceOrigin();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState(false);
  useFeedback(storesError && maps("storesError"));
  const [reloadStores, setReloadStores] = useState(0);

  useEffect(() => {
    let active = true;
    setStoresLoading(true);
    setStoresError(false);
    catalogApi.getStores(true).then(result => { if (active) setStores(result); })
      .catch(() => { if (active) setStoresError(true); })
      .finally(() => { if (active) setStoresLoading(false); });
    return () => { active = false; };
  }, [reloadStores]);

  const rankedStores = stores.map(store => {
    const point = coordinates(store);
    return { store, distance: point && origin ? distanceKm(origin, point) : null };
  }).sort((first, second) => (first.distance ?? Infinity) - (second.distance ?? Infinity)
    || first.store.name.localeCompare(second.store.name, locale));

  const PARTY_PACKAGES = [
    {
      id: "pkg-birthday",
      title: "Tiệc Sinh Nhật Vui Vẻ",
      desc: "Phù hợp 10-15 người: 30 miếng gà giòn, 4 khoai lắc, nước ngọt thỏa thích.",
      price: money(1290000),
    },
    {
      id: "pkg-office",
      title: "Tiệc Công Ty & Hội Nghị",
      desc: "Phù hợp 20-30 người: 60 miếng gà giòn + sốt cay mật ong, 10 burger mini.",
      price: money(2590000),
    },
    {
      id: "pkg-custom",
      title: t("business.party.customMenu"),
      desc: t("business.party.ourTeamWillCallToDesignAMenuThatFitsYourBudget"),
      price: t("business.party.custom"),
    },
  ];

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [expectedTime, setExpectedTime] = useState("11:30");
  const [guestCount, setGuestCount] = useState<number>(15);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedPackage, setSelectedPackage] =
    useState<string>("pkg-birthday");
  const [notes, setNotes] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  useFeedback(submitError);
  const [createdPartyOrder, setCreatedPartyOrder] =
    useState<BackendPartyOrder | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storesLoading || storesError || !stores.some(store => String(store.id) === selectedStore)) {
      setSubmitError(maps("pickStore"));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const chosenPkg = PARTY_PACKAGES.find((pkg) => pkg.id === selectedPackage);
    const combinedNotes = notes.trim()
      ? `${notes.trim()} (Pkg: ${selectedPackage})`
      : `Pkg: ${selectedPackage}`;

    const content = `Time: ${expectedTime}. Email: ${customerEmail.trim()}. Notes: ${notes.trim() || "None"}. Pkg: ${selectedPackage}`;

    try {
      const result = await partyOrderApi.create({
        storeId: Number(selectedStore),
        contactName: customerName.trim(),
        phone: customerPhone.trim(),
        contactPhone: customerPhone.trim(),
        contactEmail: customerEmail.trim(),
        expectedDate,
        expectedTime,
        guestCount,
        content,
        notes: combinedNotes,
      });
      setCreatedPartyOrder(result);
      notify.success(t("common.feedback.orderCreated"));
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.warn("Party order API submission error:", err);
      const errMsg = getErrorMessage(err);
      setSubmitError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <main className={`${styles.partyContainer} m3-page`}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>
            {t("business.party.eventsPartyBookings")}
          </span>
          <h1 className={styles.title}>
            {t("business.party.partyBookingsBulkOrders")}
          </h1>
          <p className={styles.sub}>
            {t(
              "business.party.cluckyBringsGoldenCrispyChickenToBirthdaysCompanyPartiesAndClassCelebrations",
            )}
          </p>
        </div>

        <section className="order-hero">
          <div>
            <small>{t("business.party.morePeopleMoreJoy")}</small>
            <h2>{t("business.party.bringTheCrunchShareTheJoy")}</h2>
            <p>
              {t(
                "business.party.chooseAPackageLeaveYourDetailsAndPlanYourMenuWithClucky",
              )}
            </p>
          </div>
          <PartyPopper size={48} strokeWidth={1.2} />
        </section>
        <div className={styles.partyCard}>
          {submitError && (
            <div
              role="alert"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "12px",
                padding: "12px 16px",
                marginBottom: "20px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {submitError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            {/* Packages */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                {t("business.party.chooseASuggestedPartyPackage")}
              </label>
              <div className={styles.packageGrid}>
                {PARTY_PACKAGES.map((pkg) => (
                  <button
                    type="button"
                    aria-pressed={selectedPackage === pkg.id}
                    key={pkg.id}
                    className={`${styles.packageCard} ${
                      selectedPackage === pkg.id ? styles.packageCardActive : ""
                    }`}
                    onClick={() => setSelectedPackage(pkg.id)}
                  >
                    {selectedPackage === pkg.id && (
                      <CheckCircle2 className={styles.packageCheck} size={20} />
                    )}
                    <h3 className={styles.packageTitle}>{pkg.title}</h3>
                    <p className={styles.packageDesc}>{pkg.desc}</p>
                    <div className={styles.packagePrice}>{pkg.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className={styles.fieldGrid}>
              <div className={styles.fieldGroup}>
                <label htmlFor="partyName" className={styles.fieldLabel}>
                  {t("business.party.contactFullName")}
                </label>
                <input
                  id="partyName"
                  type="text"
                  required
                  placeholder={t("business.party.forExampleTrNCAnh")}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="partyPhone" className={styles.fieldLabel}>
                  {t("business.checkout.contactPhoneNumber")}
                </label>
                <input
                  pattern="0[0-9]{9}"
                  title={t("business.party.aDigitPhoneNumberStartingWith")}
                  id="partyPhone"
                  type="tel"
                  required
                  placeholder="0909123456"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.fieldGroup}>
                <label htmlFor="partyEmail" className={styles.fieldLabel}>
                  {t("business.party.emailForQuotation")}
                </label>
                <input
                  id="partyEmail"
                  type="email"
                  required
                  placeholder="ducanh@gmail.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="guestCount" className={styles.fieldLabel}>
                  {t("business.party.estimatedNumberOfGuests")}
                </label>
                <input
                  id="guestCount"
                  type="number"
                  min="5"
                  max="500"
                  required
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className={styles.input}
                />
              </div>
            </div>

            {/* Date, Time & Branch */}
            <div className={styles.fieldGrid}>
              <div className={styles.fieldGroup}>
                <label htmlFor="partyDate" className={styles.fieldLabel}>
                  {t("business.party.preferredEventDate")}
                </label>
                <input
                  id="partyDate"
                  type="date"
                  min={new Intl.DateTimeFormat("sv-SE", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date())}
                  required
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="partyTime" className={styles.fieldLabel}>
                  {t("business.party.deliveryPartyStartTime")}
                </label>
                <input
                  id="partyTime"
                  type="time"
                  required
                  value={expectedTime}
                  onChange={(e) => setExpectedTime(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="storeSelect" className={styles.fieldLabel}>
                {t("business.party.selectTheResponsibleCluckyStore")}
              </label>
              <select
                id="storeSelect"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className={styles.select}
                required
                disabled={storesLoading || storesError || !stores.length}
                aria-describedby={origin ? "party-distance-origin" : undefined}
              >
                <option value="">{maps(storesLoading ? "storesLoading" : !storesError && !stores.length ? "noStores" : "chooseStore")}</option>
                {rankedStores.map(({ store, distance }) => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.address}) — {distance !== null
                      ? maps("distanceAway", { distance: number(distance, { maximumFractionDigits: 1 }) })
                      : maps(coordinates(store) ? "distanceUnavailable" : "unknownDistance")}
                  </option>
                ))}
              </select>
              {origin && <small id="party-distance-origin" title={maps("approximate")}>{maps(fromHome ? "defaultAddressOrigin" : "currentLocationOrigin")}</small>}
              {storesError && <div role="alert">{maps("storesError")} <button type="button" className="btn-secondary" onClick={() => setReloadStores(value => value + 1)}>{maps("retry")}</button></div>}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="partyNotes" className={styles.fieldLabel}>
                {t("business.party.specialRequestsAdditionalNotes")}
              </label>
              <textarea
                id="partyNotes"
                placeholder={t(
                  "business.party.individualPackagingGreetingCardsVatInvoiceHomeDelivery",
                )}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.textarea}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || storesLoading || storesError || !stores.some(store => String(store.id) === selectedStore)}
              className={styles.submitBtn}
            >
              {submitting
                ? t("business.checkout.processingYourOrder")
                : t("business.party.sendPartyBookingRequest")}
            </button>
          </form>
        </div>

        {/* Success Modal */}
        <OrderDialog
          open={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          titleId="party-success-title"
        >
          <div className={styles.modalBox}>
            <div className={styles.modalEmoji} aria-hidden="true">
              <CheckCircle2 size={48} />
            </div>
            <h2 id="party-success-title" className={styles.modalTitle}>
              {t("business.party.yourDemoPartyRequestIsReady")}
            </h2>
            <p className={styles.modalDesc}>
              {t("business.party.youHaveCompletedTheFormFor")}{" "}
              {guestCount}{" "}
              {t("business.party.guestsThisIsAUiPreviewNoRequestHasBeenSentTo")}
            </p>
            <dl className={styles.partyReceipt}>
              <div>
                <dt>
                  <Users size={15} /> {t("business.party.guestCount")}
                </dt>
                <dd>
                  {guestCount} {t("business.party.people")}
                </dd>
              </div>
              <div>
                <dt>
                  <CalendarDays size={15} /> {t("business.party.time")}
                </dt>
                <dd>
                  {expectedTime} · {expectedDate}
                </dd>
              </div>
              <div>
                <dt>
                  <Store size={15} /> {t("business.party.store")}
                </dt>
                <dd>
                  {
                    stores.find((store) => String(store.id) === selectedStore)
                      ?.name
                  }
                </dd>
              </div>
              <div>
                <dt>{t("business.party.partyPackage")}</dt>
                <dd>
                  {
                    PARTY_PACKAGES.find((pkg) => pkg.id === selectedPackage)
                      ?.title
                  }
                </dd>
              </div>
            </dl>
            {createdPartyOrder?.id && (
              <p className={styles.saveHint}>
                ID #{createdPartyOrder.id}
              </p>
            )}
            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(false)}
              className={styles.modalBtn}
            >
              {t("business.party.backToForm")}
            </button>
          </div>
        </OrderDialog>
      </main>
    </>
  );
}
