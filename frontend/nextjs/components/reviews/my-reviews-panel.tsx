"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  MessageSquareQuote,
  Pencil,
  RefreshCw,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "@/components/ui-loader/navigation-link";
import { notify } from "@/components/feedback";
import { Modal } from "@/components/ui/modal";
import {
  catalogApi,
  reviewApi,
  type ProductItem,
  type ReviewDto,
  type StoreItem,
} from "@/lib/api";
import { useLocaleTools } from "@/lib/i18n/hooks";
import { getErrorMessage } from "@/lib/i18n/core";
import { ReviewFormModal } from "./review-form-modal";
import { ReviewRepliesList } from "./review-replies-list";
import { StarDisplay } from "./star-rating-input";
import { resolveProductHref } from "./review-utils";
import styles from "./reviews.module.css";

export function MyReviewsPanel() {
  const t = useTranslations();
  const { date, locale } = useLocaleTools();

  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [productMap, setProductMap] = useState<Record<number, ProductItem>>({});
  const [storeNames, setStoreNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const [editingReview, setEditingReview] = useState<ReviewDto | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingReview, setDeletingReview] = useState<ReviewDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [myList, catalogItems, stores] = await Promise.all([
        reviewApi.getMyReviews(),
        catalogApi.getProducts({ activeOnly: false }).catch(() => [] as ProductItem[]),
        catalogApi.getStores(false).catch(() => [] as StoreItem[]),
      ]);

      const nextProducts: Record<number, ProductItem> = {};
      for (const item of catalogItems) {
        if (!item.comboItems) {
          nextProducts[item.id] = item;
        }
      }

      const nextStores: Record<number, string> = {};
      for (const store of stores) {
        nextStores[store.id] = store.name;
      }

      setReviews(myList);
      setProductMap(nextProducts);
      setStoreNames(nextStores);
    } catch (err) {
      setError(getErrorMessage(err, locale));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadData();
  }, [loadData, reloadTick]);

  const dishLabel = (review: ReviewDto) =>
    productMap[review.productId]?.name ||
    t("business.reviews.dishFallback", { value1: review.productId });

  const refreshAfterConflict = async (err: unknown) => {
    const status = (err as { status?: number } | null)?.status;
    if (status === 409) {
      try {
        setReviews(await reviewApi.getMyReviews());
        return t("business.reviews.conflictRefreshed");
      } catch {
        return getErrorMessage(err, locale);
      }
    }
    return getErrorMessage(err, locale);
  };

  return (
    <div className={styles.accountPanelWrap} aria-busy={loading}>
      <div className={styles.accountHeaderRow}>
        <div className={styles.accountPanelHeading}>
          <span className={styles.accountPanelIcon}>
            <MessageSquareQuote size={23} aria-hidden="true" />
          </span>
          <div>
            <h2>{t("business.reviews.myReviewsTitle")}</h2>
            <p className={styles.sectionSubtitle}>
              {t("business.reviews.myReviewsSubtitle")}
            </p>
          </div>
        </div>
        {!loading && !error && (
          <span className={styles.pill}>
            {t("business.reviews.reviewCountLabel", { count: reviews.length })}
          </span>
        )}
      </div>

      {loading && (
        <div className={styles.skeletonList} aria-hidden="true">
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      )}

      {!loading && error && (
        <div role="alert" className={styles.errorBox}>
          <span>{error}</span>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setReloadTick((value) => value + 1)}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {t("business.reviews.retry")}
          </button>
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div className={styles.stateBox}>
          <ShoppingBag size={36} aria-hidden="true" />
          <h3>{t("business.reviews.noMyReviewsTitle")}</h3>
          <p>{t("business.reviews.noMyReviewsBody")}</p>
          <Link href="/orders" className={styles.primaryBtn}>
            {t("business.reviews.browseOrders")}
          </Link>
        </div>
      )}

      {!loading && !error && reviews.length > 0 && (
        <div className={styles.reviewsList}>
          {reviews.map((review) => {
            const product = productMap[review.productId];
            const storeName = review.storeId ? storeNames[review.storeId] : undefined;
            const isHidden = review.status === "HIDDEN";
            const wasEdited =
              Boolean(review.updatedAt) &&
              new Date(review.updatedAt as string).getTime() >
                new Date(review.createdAt).getTime() + 1000;

            return (
              <article key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewCardTop}>
                  <div className={styles.reviewAuthorBlock}>
                    <div className={styles.reviewAuthorLine}>
                      <Link
                        href={resolveProductHref(review.productId, product, review.storeId)}
                        className={styles.dishLink}
                      >
                        {dishLabel(review)}
                      </Link>
                      <span
                        className={`${styles.pill} ${
                          isHidden ? styles.pillHidden : styles.pillVisible
                        }`}
                      >
                        {isHidden
                          ? t("business.reviews.statusHidden")
                          : t("business.reviews.statusVisible")}
                      </span>
                    </div>

                    <div className={styles.reviewAuthorLine}>
                      <StarDisplay rating={review.rating} size={15} />
                      <span className={styles.reviewDate}>
                        {date(review.createdAt, {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {wasEdited ? ` · ${t("business.reviews.editedTag")}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className={styles.reviewBadges}>
                    <Link
                      href={`/orders/${review.orderId}`}
                      className={styles.pill}
                    >
                      {t("business.reviews.viewOrder", { value1: review.orderId })}
                    </Link>
                    {review.storeId && (
                      <span className={styles.pill}>
                        <Store size={12} aria-hidden="true" />
                        {storeName ||
                          t("business.reviews.storeBadge", {
                            value1: review.storeId,
                          })}
                      </span>
                    )}
                  </div>
                </div>

                {isHidden && (
                  <div className={styles.hiddenNotice}>
                    <AlertTriangle size={16} aria-hidden="true" />
                    <span>{t("business.reviews.hiddenNote")}</span>
                  </div>
                )}

                <p className={styles.reviewComment}>{review.comment}</p>
                <ReviewRepliesList replies={review.replies} />

                <div className={styles.actionsRow}>
                  <Link
                    href={resolveProductHref(review.productId, product, review.storeId)}
                    className={styles.secondaryBtn}
                  >
                    {t("business.reviews.viewDish")}
                  </Link>
                  {review.status === "VISIBLE" && (
                    <>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => {
                          setEditError("");
                          setEditingReview(review);
                        }}
                      >
                        <Pencil size={15} aria-hidden="true" />
                        {t("business.reviews.editReview")}
                      </button>
                      <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => {
                          setDeleteError("");
                          setDeletingReview(review);
                        }}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        {t("business.reviews.deleteReview")}
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ReviewFormModal
        open={Boolean(editingReview)}
        mode="edit"
        targetKey={editingReview?.id ?? 0}
        dishName={editingReview ? dishLabel(editingReview) : ""}
        initialRating={editingReview?.rating ?? 5}
        initialComment={editingReview?.comment ?? ""}
        initialVersion={editingReview?.version}
        busy={editBusy}
        submitError={editError}
        onClose={() => {
          if (!editBusy) setEditingReview(null);
        }}
        onSubmit={async ({ rating, comment, version, idempotencyKey }) => {
          if (!editingReview) return;
          setEditBusy(true);
          setEditError("");
          try {
            await reviewApi.update(
              editingReview.id,
              { rating, comment, version },
              idempotencyKey,
            );
            setEditingReview(null);
            notify.success(t("business.reviews.updateSuccess"));
            await loadData();
          } catch (err) {
            setEditError(await refreshAfterConflict(err));
          } finally {
            setEditBusy(false);
          }
        }}
      />

      <Modal
        open={Boolean(deletingReview)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteBusy) setDeletingReview(null);
        }}
        dismissible={!deleteBusy}
        title={t("business.reviews.deleteTitle")}
        description={t("business.reviews.deleteDescription")}
      >
        {deletingReview && (
          <p className={styles.reviewComment}>{deletingReview.comment}</p>
        )}
        {deleteError && (
          <div className={styles.formGroup}>
            <p role="alert" className={styles.formError}>
              {deleteError}
            </p>
          </div>
        )}
        <div className={styles.formGroup}>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={deleteBusy}
              onClick={() => setDeletingReview(null)}
            >
              {t("business.reviews.keepReview")}
            </button>
            <button
              type="button"
              className={styles.dangerBtn}
              disabled={deleteBusy}
              onClick={async () => {
                if (!deletingReview || deleteBusy) return;
                setDeleteBusy(true);
                setDeleteError("");
                try {
                  await reviewApi.remove(deletingReview.id);
                  setDeletingReview(null);
                  notify.success(t("business.reviews.deleteSuccess"));
                  await loadData();
                } catch (err) {
                  setDeleteError(await refreshAfterConflict(err));
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              {deleteBusy
                ? t("business.reviews.deleting")
                : t("business.reviews.confirmDelete")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
