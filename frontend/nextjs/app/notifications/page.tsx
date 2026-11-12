"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotificationInbox } from "@/components/notification/notification-inbox";
import { useNotifications } from "@/components/notification/use-notifications";
import styles from "@/components/notification/notification-popover.module.css";

export default function NotificationsPage() {
  const t = useTranslations("business");
  const inbox = useNotifications();
  return <main className={styles.inboxPage}>
    <header className={styles.pageHeading}>
      <span className={styles.pageIcon}><Bell size={26} aria-hidden="true" /></span>
      <div><h1>{t("promotionUi.yourNotifications")}</h1><p>{t("notificationInbox.subtitle")}</p></div>
    </header>
    <section className={styles.inboxPanel} aria-label={t("promotionUi.inbox")}>
      <NotificationInbox inbox={inbox} />
    </section>
  </main>;
}

