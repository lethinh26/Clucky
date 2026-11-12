"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "@/components/ui-loader/navigation-link";
import { NotificationInbox } from "./notification-inbox";
import { useNotifications } from "./use-notifications";
import styles from "./notification-popover.module.css";

export function NotificationPopover() {
  const t = useTranslations("business");
  const inbox = useNotifications();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const id = useId();
  const unread = inbox.data?.unreadCount ?? 0;
  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const pointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", keyboard); };
  }, [open]);
  return <div className={styles.container} ref={root}>
    <button ref={trigger} className={styles.bellButton} type="button" onClick={() => setOpen(value => !value)}
      aria-label={unread ? t("promotionUi.notificationUnreadCount", { count: unread }) : t("promotionUi.notification")}
      aria-expanded={open} aria-controls={id} aria-haspopup="dialog">
      <Bell size={20} aria-hidden="true" />{unread > 0 && <span className={styles.badge} aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <div ref={dialog} id={id} className={styles.popover} role="dialog" aria-label={t("promotionUi.inbox")}>
      <header className={styles.header}><h2 className={styles.headerTitle}>{t("promotionUi.notification")}</h2>
        <button className={styles.markAllBtn} type="button" aria-label={t("promotionUi.close")} onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={18} /></button>
      </header>
      <NotificationInbox inbox={inbox} compact onNavigate={() => setOpen(false)} />
      <Link className={styles.viewAllLink} href="/notifications" onClick={() => setOpen(false)}>{t("notificationInbox.viewAll")}</Link>
    </div>}
  </div>;
}

