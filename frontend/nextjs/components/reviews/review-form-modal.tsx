"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { StarRatingInput } from "./star-rating-input";
import {
  buildSubmitSignature,
  clampRating,
  generateIdempotencyKey,
  isValidReviewComment,
} from "./review-utils";
import styles from "./reviews.module.css";

export interface ReviewFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  targetKey: string | number;
  dishName: string;
  initialRating?: number;
  initialComment?: string;
  initialVersion?: number;
  busy?: boolean;
  submitError?: string;
  onClose: () => void;
  onSubmit: (values: {
    rating: number;
    comment: string;
    version?: number;
    idempotencyKey: string;
  }) => Promise<void> | void;
}

export function ReviewFormModal({
  open,
  mode,
  targetKey,
  dishName,
  initialRating = 5,
  initialComment = "",
  initialVersion,
  busy = false,
  submitError,
  onClose,
  onSubmit,
}: ReviewFormModalProps) {
  const t = useTranslations();
  const ratingLabelId = useId();
  const commentInputId = useId();

  const [rating, setRating] = useState<number>(() => clampRating(initialRating));
  const [comment, setComment] = useState<string>(initialComment);
  const [validationError, setValidationError] = useState<string>("");

  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setRating(clampRating(initialRating));
    setComment(initialComment);
    setValidationError("");
    idempotencyRef.current = null;
  }, [open, mode, targetKey, initialRating, initialComment]);

  const numericTarget = typeof targetKey === "number" ? targetKey : Number(targetKey) || 0;
  const trimmedLength = comment.trim().length;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!isValidReviewComment(comment)) {
      setValidationError(t("business.reviews.commentValidation"));
      return;
    }
    setValidationError("");

    const trimmedComment = comment.trim();
    const signature = buildSubmitSignature(
      mode,
      numericTarget,
      rating,
      trimmedComment,
      initialVersion,
    );
    if (!idempotencyRef.current || idempotencyRef.current.signature !== signature) {
      idempotencyRef.current = {
        signature,
        key: generateIdempotencyKey(),
      };
    }

    await onSubmit({
      rating,
      comment: trimmedComment,
      version: initialVersion,
      idempotencyKey: idempotencyRef.current.key,
    });
  };

  const title =
    mode === "create"
      ? t("business.reviews.createTitle", { dish: dishName })
      : t("business.reviews.editTitle", { dish: dishName });
  const description =
    mode === "create"
      ? t("business.reviews.createDescription")
      : t("business.reviews.editDescription");

  const activeError = validationError || submitError || "";

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose();
      }}
      dismissible={!busy}
      title={title}
      description={description}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <span id={ratingLabelId} className={styles.formLabel}>
            {t("business.reviews.chooseRating")}
          </span>
          <StarRatingInput
            value={rating}
            onChange={(value) => {
              setRating(value);
              setValidationError("");
            }}
            disabled={busy}
            labelId={ratingLabelId}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor={commentInputId} className={styles.formLabel}>
            {t("business.reviews.commentLabel")}
          </label>
          <textarea
            id={commentInputId}
            className={styles.textarea}
            value={comment}
            maxLength={1000}
            disabled={busy}
            placeholder={t("business.reviews.commentPlaceholder")}
            onChange={(event) => {
              setComment(event.target.value);
              if (validationError && isValidReviewComment(event.target.value)) {
                setValidationError("");
              }
            }}
          />
          <div className={styles.formMeta}>
            <span>{t("business.reviews.commentValidation")}</span>
            <span>{t("business.reviews.commentHint", { count: trimmedLength })}</span>
          </div>
        </div>

        {activeError && (
          <div className={styles.formGroup}>
            <p role="alert" className={styles.formError}>
              {activeError}
            </p>
          </div>
        )}

        <div className={styles.formGroup}>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={busy}
              onClick={onClose}
            >
              {t("business.reviews.cancel")}
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={busy}>
              {busy
                ? t("business.reviews.submitting")
                : mode === "create"
                  ? t("business.reviews.submitCreate")
                  : t("business.reviews.submitEdit")}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
