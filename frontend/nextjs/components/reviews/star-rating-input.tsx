"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./reviews.module.css";

export function StarDisplay({ rating, size = 16 }: { rating: number; size?: number }) {
  const t = useTranslations();
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <span
      className={styles.starsRow}
      aria-label={t("business.reviews.starRatingAria", { rating: safeRating })}
      role="img"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          aria-hidden="true"
          className={star <= safeRating ? styles.starFilled : styles.starEmpty}
        />
      ))}
    </span>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  labelId?: string;
}

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  labelId,
}: StarRatingInputProps) {
  const t = useTranslations();

  return (
    <div
      className={styles.starPicker}
      role="radiogroup"
      aria-labelledby={labelId}
      aria-label={labelId ? undefined : t("business.reviews.chooseRating")}
    >
      {[1, 2, 3, 4, 5].map((stars) => {
        const active = stars <= value;
        return (
          <button
            key={stars}
            type="button"
            role="radio"
            aria-checked={value === stars}
            aria-label={t("business.reviews.selectStarsAria", { stars })}
            disabled={disabled}
            data-active={active}
            className={styles.starButton}
            onClick={() => onChange(stars)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                onChange(Math.min(5, value + 1));
              } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                onChange(Math.max(1, value - 1));
              }
            }}
          >
            <Star
              size={20}
              aria-hidden="true"
              className={active ? styles.starFilled : styles.starEmpty}
            />
          </button>
        );
      })}
    </div>
  );
}
