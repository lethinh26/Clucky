"use client";

import { MessageSquareReply } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocaleTools } from "@/lib/i18n/hooks";
import type { ReviewReplyDto } from "@/lib/api";
import { responderRoleKey } from "./review-utils";
import styles from "./reviews.module.css";

export function ReviewRepliesList({ replies }: { replies: ReviewReplyDto[] }) {
  const t = useTranslations();
  const { date } = useLocaleTools();

  if (!replies || replies.length === 0) {
    return null;
  }

  return (
    <div className={styles.repliesBox}>
      <div className={styles.repliesHeading}>
        <MessageSquareReply size={15} aria-hidden="true" />
        <span>{t("business.reviews.officialReplies")}</span>
      </div>
      {replies.map((reply) => {
        const roleLabel = t(responderRoleKey(reply.responderRole));
        return (
          <div key={reply.id} className={styles.replyItem}>
            <div className={styles.replyMeta}>
              <span className={styles.replyRole}>
                {t("business.reviews.responderBadge", {
                  role: roleLabel,
                  id: reply.responderId,
                })}
              </span>
              <span className={styles.replyTime}>
                {date(reply.createdAt, {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className={styles.replyContent}>{reply.content}</p>
          </div>
        );
      })}
    </div>
  );
}
