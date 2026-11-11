"use client";

import { useEffect, useState } from "react";
import { MessageSquareQuote, RefreshCw, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  catalogApi,
  reviewApi,
  type ProductReviewSummaryDto,
  type StoreItem,
} from "@/lib/api";
import { useLocaleTools } from "@/lib/i18n/hooks";
import { getErrorMessage } from "@/lib/i18n/core";
import { ReviewRepliesList } from "./review-replies-list";
import { StarDisplay } from "./star-rating-input";
import styles from "./reviews.module.css";

interface ProductReviewsSectionProps {
  productId: number;
  productName: string;
}

export function ProductReviewsSection({
  productId,
  productName,
}: ProductReviewsSectionProps) {
  const t = useTranslations();
  const { date, locale } = useLocaleTools();

  const [data, setData] = useState<ProductReviewSummaryDto | null>(null);
  const [storeNames, setStoreNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    Promise.all([
      reviewApi.getProductReviews(productId),
      catalogApi.getStores(false).catch(() => [] as StoreItem[]),
    ])
      .then(([summary, stores]) => {
        if (!active) return;
        setData(summary);
        const map: Record<number, string> = {};
        for (const store of stores) {
          map[store.id] = store.name;
        }
        setStoreNames(map);
      })
      .catch((err) => {
        if (!active) return;
        setError(getErrorMessage(err, locale));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId, reloadTick, locale]);

  const reviews = data?.reviews ?? [];
  const totalReviews = data?.totalReviews ?? 0;
  const averageRating = data?.averageRating ?? 0;

  return (
    <section
      className={styles.sectionCard}
      aria-labelledby="product-reviews-heading"
      aria-busy={loading}
    >
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleGroup}>
          <h2 id="product-reviews-heading" className={styles.sectionTitle}>
            <MessageSquareQuote size={24} aria-hidden="true" />
            <span>
              {t("business.reviews.sectionTitle")} · {productName}
            </span>
          </h2>
          <p className={styles.sectionSubtitle}>
            {t("business.reviews.sectionSubtitle")}
          </p>
          <p className={styles.verifiedHint}>
            {t("business.reviews.verifiedOrdersNote")}
          </p>
        </div>

        <div className={styles.ratingOverview}>
          <span className={styles.ratingScore}>
            {totalReviews > 0 ? averageRating.toFixed(1) : "—"}
          </span>
          <div className={styles.ratingMeta}>
            <span className={styles.ratingCount}>
              {t("business.reviews.averageRatingLabel")}
            </span>
            <StarDisplay rating={totalReviews > 0 ? Math.round(averageRating) : 0} />
            <span className={styles.ratingCount}>
              {t("business.reviews.reviewCountLabel", { count: totalReviews })}
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div className={styles.skeletonList} aria-hidden="true">
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      )}

      {!loading && error && (
        <div role="alert" className={styles.errorBox}>
          <span>{error || t("business.reviews.loadError")}</span>
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
          <MessageSquareQuote size={34} aria-hidden="true" />
          <h3>{t("business.reviews.noProductReviewsTitle")}</h3>
          <p>{t("business.reviews.noProductReviewsBody")}</p>
        </div>
      )}

      {!loading && !error && reviews.length > 0 && (
        <div className={styles.reviewsList}>
          {reviews.map((review) => {
            const wasEdited =
              Boolean(review.updatedAt) &&
              new Date(review.updatedAt as string).getTime() >
                new Date(review.createdAt).getTime() + 1000;
            const resolvedStoreName = review.storeId ? storeNames[review.storeId] : undefined;

            return (
              <article key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewCardTop}>
                  <div className={styles.reviewAuthorBlock}>
                    <div className={styles.reviewAuthorLine}>
                      <span className={styles.reviewAuthor}>
                        {t("business.reviews.customerLabel", {
                          value1: review.customerId,
                        })}
                      </span>
                      <StarDisplay rating={review.rating} size={15} />
                    </div>
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

                  <div className={styles.reviewBadges}>
                    {review.storeId && (
                      <span className={styles.pill}>
                        <Store size={12} aria-hidden="true" />
                        {resolvedStoreName ||
                          t("business.reviews.storeBadge", {
                            value1: review.storeId,
                          })}
                      </span>
                    )}
                  </div>
                </div>

                <p className={styles.reviewComment}>{review.comment}</p>
                <ReviewRepliesList replies={review.replies} />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
