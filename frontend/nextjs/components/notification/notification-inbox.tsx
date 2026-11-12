"use client";

import { useState } from "react";
import { CheckCheck, ChevronLeft, ChevronRight, Inbox, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "@/components/ui-loader/navigation-link";
import { useLocaleTools } from "@/lib/i18n/hooks";
import { resolveNotificationTarget } from "@/lib/notification";
import type { NotificationItemData } from "@/lib/types/notification";
import { NotificationItem } from "./notification-item";
import type { useNotifications } from "./use-notifications";
import styles from "./notification-popover.module.css";

export function NotificationInbox({ inbox, compact = false, onNavigate }: {
  inbox: ReturnType<typeof useNotifications>; compact?: boolean; onNavigate?: () => void;
}) {
  const t = useTranslations("business");
  const { locale } = useLocaleTools();
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const { data, filter, setFilter, loading, busy, error, markRead } = inbox;
  async function openItem(item: NotificationItemData) {
    if (busy || (!item.isRead && !await markRead(item.id))) return;
    const target = resolveNotificationTarget(item, locale);
    if (target.isValid && target.url) { onNavigate?.(); router.push(target.url); }
    else setNotice(target.reason ?? "");
  }
  if (inbox.ready && !inbox.signedIn) return <div className={styles.emptyState}>
    <Inbox size={32} aria-hidden="true" /><p>{error || t("notificationInbox.signInHint")}</p>
    <Link href="/login?redirect=%2Fnotifications" onClick={onNavigate}>{t("notificationInbox.signIn")}</Link>
  </div>;
  return <>
    <div className={styles.inboxToolbar}>
      <div className={styles.filterButtons} role="group" aria-label={t("notificationInbox.filter")}>
        <button type="button" aria-pressed={!filter.unread} onClick={() => setFilter(current => ({ ...current, unread: false, page: 0 }))}>{t("notificationInbox.all")}</button>
        <button type="button" aria-pressed={filter.unread} onClick={() => setFilter(current => ({ ...current, unread: true, page: 0 }))}>
          {t("promotionUi.unread")}{data && <span>{data.unreadCount}</span>}
        </button>
      </div>
      <button type="button" className={styles.markAllBtn} disabled={loading} onClick={inbox.refresh} aria-label={t("notificationInbox.refresh")}><RefreshCw size={16} /></button>
      <button type="button" className={styles.markAllBtn} disabled={busy || !data?.unreadCount} onClick={() => void markRead()}>
        <CheckCheck size={16} /><span>{t("promotionUi.markAllAsRead")}</span>
      </button>
      {!compact && <select className={styles.typeSelect} aria-label={t("notificationInbox.type")} value={filter.type}
        onChange={event => setFilter(current => ({ ...current, type: event.target.value, page: 0 }))}>
        {["ALL", "ORDER", "PAYMENT", "PROMOTION", "SYSTEM"].map(type => <option key={type} value={type}>{t(`notificationInbox.types.${type}`)}</option>)}
      </select>}
    </div>
    <div className={styles.listArea} aria-busy={loading || busy}>
      {error && <div className={styles.errorBanner} role="alert"><span>{error}</span><button type="button" onClick={inbox.refresh}>{t("notificationInbox.retry")}</button></div>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {loading && !data ? <NotificationItem loading /> : !error && !data?.content.length ? <div className={styles.emptyState}>
        <Inbox size={36} aria-hidden="true" /><h3>{t("notificationInbox.empty")}</h3><p>{t("notificationInbox.emptyHint")}</p>
      </div> : data?.content.map(item => <NotificationItem key={item.id} notification={item}
        busy={busy} onClick={item => void openItem(item)} onMarkRead={id => void markRead(id)} />)}
    </div>
    {!compact && data && data.totalPages > 1 && <nav className={styles.inboxPagination} aria-label={t("notificationInbox.pagination")}>
      <button type="button" disabled={loading || filter.page === 0} onClick={() => setFilter(current => ({ ...current, page: current.page - 1 }))} aria-label={t("notificationInbox.previous")}><ChevronLeft size={18} /></button>
      <span>{t("notificationInbox.page", { page: filter.page + 1, total: data.totalPages })}</span>
      <button type="button" disabled={loading || filter.page + 1 >= data.totalPages} onClick={() => setFilter(current => ({ ...current, page: current.page + 1 }))} aria-label={t("notificationInbox.next")}><ChevronRight size={18} /></button>
    </nav>}
  </>;
}
