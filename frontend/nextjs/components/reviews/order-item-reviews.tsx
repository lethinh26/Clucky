"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  MessageSquarePlus,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "@/components/ui-loader/navigation-link";
import { notify } from "@/components/feedback";
import { useSession } from "@/components/auth/use-session";
import { Modal } from "@/components/ui/modal";
import { reviewApi, type ReviewDto } from "@/lib/api";
import { useLocaleTools } from "@/lib/i18n/hooks";
import { getErrorMessage } from "@/lib/i18n/core";
import type { Order, OrderItem } from "@/lib/types/order";
import { ReviewFormModal } from "./review-form-modal";
import { ReviewRepliesList } from "./review-replies-list";
import { StarDisplay } from "./star-rating-input";
import styles from "./reviews.module.css";

interface OrderItemReviewsProps {
  order: Order;
}

interface EligibleDish {
  productId: number;
  name: string;
  quantity: number;
}

export function OrderItemReviews({ order }: OrderItemReviewsProps) {
  const t = useTranslations();
  const { date, locale } = useLocaleTools();
  const { user } = useSession();

  const numericOrderId = Number(order.id);
  const hasServerOrderId =
    Number.isSafeInteger(numericOrderId) && numericOrderId > 0;
  const isCompleted = order.status === "COMPLETED";
  const isCustomer = user?.role === "CUSTOMER";

  const [myReviews, setMyReviews] = useState<ReviewDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const [modalState, setModalState] = useState<{
    mode: "create" | "edit";
    dish: EligibleDish;
    review?: ReviewDto;
  } | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const [deletingReview, setDeletingReview] = useState<ReviewDto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchMyReviews = useCallback(async () => {
    if (!isCompleted || !isCustomer || !hasServerOrderId) return;
    setLoading(true);
    setLoadError("");
    try {
      const list = await reviewApi.getMyReviews();
      setMyReviews(list);
    } catch (err) {
      setLoadError(getErrorMessage(err, locale));
    } finally {
      setLoading(false);
    }
  }, [isCompleted, isCustomer, hasServerOrderId, locale]);

  useEffect(() => {
    void fetchMyReviews();
  }, [fetchMyReviews, reloadTick]);

  const { eligibleDishes, comboItems } = useMemo(() => {
    const productMap = new Map<number, EligibleDish>();
    const combos: OrderItem[] = [];

    for (const item of order.items) {
      if (item.itemType === "COMBO") {
        combos.push(item);
        continue;
      }
      if (
        item.itemType === "PRODUCT" &&
        typeof item.productId === "number" &&
        item.productId > 0
      ) {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            name: item.itemName,
            quantity: item.quantity,
          });
        }
      }
    }

    return {
      eligibleDishes: Array.from(productMap.values()),
      comboItems: combos,
    };
  }, [order.items]);

  const reviewByProduct = useMemo(() => {
    const map = new Map<number, ReviewDto>();
    if (!hasServerOrderId) return map;
    for (const review of myReviews) {
      if (review.orderId === numericOrderId && review.status !== "DELETED") {
        map.set(review.productId, review);
      }
    }
    return map;
  }, [myReviews, numericOrderId, hasServerOrderId]);

  if (!isCompleted || (eligibleDishes.length === 0 && comboItems.length === 0)) {
    return null;
  }

  const refreshAfterConflict = async (err: unknown) => {
    const status = (err as { status?: number } | null)?.status;
    if (status === 409) {
      try {
        const refreshed = await reviewApi.getMyReviews();
        setMyReviews(refreshed);
        return t("business.reviews.conflictRefreshed");
      } catch {
        return getErrorMessage(err, locale);
      }
    }
    return getErrorMessage(err, locale);
  };

  return (
    <section
      className={styles.sectionCard}
      aria-labelledby="order-reviews-heading"
      aria-busy={loading}
      style={{ marginTop: 0 }}
    >
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleGroup}>
          <h2 id="order-reviews-heading" className={styles.sectionTitle}>
            <MessageSquarePlus size={22} aria-hidden="true" />
            <span>{t("business.reviews.orderSectionTitle")}</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            {t("business.reviews.orderSectionSubtitle")}
          </p>
        </div>
      </div>

      {!user && (
        <div className={styles.stateBox}>
          <p>{t("business.reviews.signInToReview")}</p>
          <Link href="/login" className={styles.primaryBtn}>
            {t("business.reviews.signInAction")}
          </Link>
        </div>
      )}

      {user && !isCustomer && (
        <div className={styles.stateBox}>
          <p>{t("business.reviews.onlyCustomerCanReview")}</p>
        </div>
      )}

      {user && isCustomer && loading && (
        <div className={styles.skeletonList} aria-hidden="true">
          <div className={styles.skeletonCard} />
        </div>
      )}

      {user && isCustomer && !loading && loadError && (
        <div role="alert" className={styles.errorBox}>
          <span>{loadError}</span>
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

      {user && isCustomer && !loading && !loadError && (
        <div className={styles.reviewsList}>
          {eligibleDishes.map((dish) => {
            const existing = reviewByProduct.get(dish.productId);
            const isHidden = existing?.status === "HIDDEN";

            return (
              <article key={dish.productId} className={styles.orderItemRow}>
                <div className={styles.orderItemHeader}>
                  <div>
                    <h3 className={styles.orderItemTitle}>{dish.name}</h3>
                    <p className={styles.orderItemMeta}>
                      × {dish.quantity} {t("business.cart.servings")}
                    </p>
                  </div>

                  <div className={styles.actionsRow}>
                    {!existing && hasServerOrderId && (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => {
                          setFormError("");
                          setModalState({ mode: "create", dish });
                        }}
                      >
                        <MessageSquarePlus size={16} aria-hidden="true" />
                        {t("business.reviews.writeReview")}
                      </button>
                    )}

                    {existing && (
                      <span
                        className={`${styles.pill} ${
                          isHidden ? styles.pillHidden : styles.pillVisible
                        }`}
                      >
                        {isHidden
                          ? t("business.reviews.statusHidden")
                          : t("business.reviews.statusVisible")}
                      </span>
                    )}

                    {existing && existing.status === "VISIBLE" && (
                      <>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => {
                            setFormError("");
                            setModalState({
                              mode: "edit",
                              dish,
                              review: existing,
                            });
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
                            setDeletingReview(existing);
                          }}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          {t("business.reviews.deleteReview")}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {existing && (
                  <>
                    <div className={styles.reviewAuthorLine}>
                      <StarDisplay rating={existing.rating} size={15} />
                      <span className={styles.reviewDate}>
                        {date(existing.createdAt, {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {isHidden && (
                      <div className={styles.hiddenNotice}>
                        <AlertTriangle size={16} aria-hidden="true" />
                        <span>{t("business.reviews.hiddenNote")}</span>
                      </div>
                    )}

                    <p className={styles.reviewComment}>{existing.comment}</p>
                    <ReviewRepliesList replies={existing.replies} />
                  </>
                )}
              </article>
            );
          })}

          {comboItems.map((combo) => (
            <article key={combo.id} className={styles.orderItemRow}>
              <div className={styles.orderItemHeader}>
                <div>
                  <h3 className={styles.orderItemTitle}>{combo.itemName}</h3>
                  <p className={styles.orderItemMeta}>
                    × {combo.quantity} {t("business.cart.servings")}
                  </p>
                </div>
                <span className={`${styles.pill} ${styles.pillMuted}`}>
                  {t("business.reviews.comboNotEligible")}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <ReviewFormModal
        open={Boolean(modalState)}
        mode={modalState?.mode ?? "create"}
        targetKey={modalState?.review?.id ?? modalState?.dish.productId ?? 0}
        dishName={modalState?.dish.name ?? ""}
        initialRating={modalState?.review?.rating ?? 5}
        initialComment={modalState?.review?.comment ?? ""}
        initialVersion={modalState?.review?.version}
        busy={formBusy}
        submitError={formError}
        onClose={() => {
          if (!formBusy) setModalState(null);
        }}
        onSubmit={async ({ rating, comment, version, idempotencyKey }) => {
          if (!modalState || !hasServerOrderId) return;
          setFormBusy(true);
          setFormError("");
          try {
            if (modalState.mode === "create") {
              await reviewApi.create(
                {
                  orderId: numericOrderId,
                  productId: modalState.dish.productId,
                  rating,
                  comment,
                },
                idempotencyKey,
              );
              notify.success(t("business.reviews.createSuccess"));
            } else if (modalState.review) {
              await reviewApi.update(
                modalState.review.id,
                { rating, comment, version },
                idempotencyKey,
              );
              notify.success(t("business.reviews.updateSuccess"));
            }
            setModalState(null);
            await fetchMyReviews();
          } catch (err) {
            setFormError(await refreshAfterConflict(err));
          } finally {
            setFormBusy(false);
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
        {deletingReview && <p className={styles.reviewComment}>{deletingReview.comment}</p>}
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
                  await fetchMyReviews();
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
    </section>
  );
}
