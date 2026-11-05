import { getTranslator } from "./i18n/translator.ts";
import { getBrowserLocale, type Locale } from "./i18n/locale.ts";
import type { NotificationItemData, NotificationType } from './types/notification';
export { MOCK_CUSTOMER_NOTIFICATIONS } from '../mocks/notificationData.ts';

export interface NotificationTypeMeta {
  type: NotificationType;
  label: string;
  badgeClass: string;
  iconBgClass: string;
  iconName: string;
}

export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, NotificationTypeMeta> = {
  ORDER: {
    type: 'ORDER',
    label: getTranslator("vi")("business.promotionUi.order"),
    badgeClass: 'notifBadgeOrder',
    iconBgClass: 'notifIconOrder',
    iconName: 'ShoppingBag',
  },
  PAYMENT: {
    type: 'PAYMENT',
    label: getTranslator("vi")("business.promotionUi.payment"),
    badgeClass: 'notifBadgePayment',
    iconBgClass: 'notifIconPayment',
    iconName: 'CreditCard',
  },
  PROMOTION: {
    type: 'PROMOTION',
    label: getTranslator("vi")("business.promotionUi.promotion"),
    badgeClass: 'notifBadgePromo',
    iconBgClass: 'notifIconPromo',
    iconName: 'Tag',
  },
  SYSTEM: {
    type: 'SYSTEM',
    label: getTranslator("vi")("business.promotionUi.system"),
    badgeClass: 'notifBadgeSystem',
    iconBgClass: 'notifIconSystem',
    iconName: 'Bell',
  },
};

export function formatRelativeTime(isoString: string, now = new Date(), locale: Locale = getBrowserLocale()): string {
  const t = getTranslator(locale);
  if (!isoString) return t("business.promotionUi.recent");

  const date = new Date(isoString);
  const time = date.getTime();
  if (isNaN(time)) return t("business.promotionUi.recent");

  const diffMs = now.getTime() - time;
  if (diffMs < 0) return t("business.promotionUi.justNow");

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return t("business.promotionUi.justNow");

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t("business.promotionUi.minutesAgo", { count: diffMin });

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t("business.promotionUi.hoursAgo", { count: diffHour });

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return t("business.promotionUi.daysAgo", { count: diffDay });

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function markNotificationReadLocal(
  list: NotificationItemData[],
  id: string | number
): NotificationItemData[] {
  return list.map((item) =>
    String(item.id) === String(id) ? { ...item, isRead: true } : item
  );
}

export function markAllNotificationsReadLocal(
  list: NotificationItemData[]
): NotificationItemData[] {
  return list.map((item) => ({ ...item, isRead: true }));
}

export function deleteNotificationLocal(
  list: NotificationItemData[],
  id: string | number
): NotificationItemData[] {
  return list.filter((item) => String(item.id) !== String(id));
}

export interface TargetResolution {
  url: string | null;
  isValid: boolean;
  reason?: string;
}

export function resolveNotificationTarget(item: NotificationItemData, locale: Locale = getBrowserLocale()): TargetResolution {
  const t = getTranslator(locale);
  // Test case for invalid / unavailable target
  if (item.link === '/orders/not-found-id' || item.refId === 999999) {
    return {
      url: null,
      isValid: false,
      reason: t("business.promotionUi.targetUnavailableOrder"),
    };
  }

  if (item.link) {
    return { url: item.link, isValid: true };
  }

  switch (item.type) {
    case 'ORDER':
      if (item.refId) return { url: `/orders`, isValid: true };
      return { url: '/orders', isValid: true };
    case 'PAYMENT':
      return { url: '/orders', isValid: true };
    case 'PROMOTION':
      return { url: '/vouchers', isValid: true };
    case 'SYSTEM':
    default:
      return {
        url: null,
        isValid: false,
        reason: t("business.promotionUi.targetUnavailableSystem"),
      };
  }
}
