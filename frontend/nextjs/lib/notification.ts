import type { NotificationItemData, NotificationType } from './types/notification';

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
    label: 'Đơn hàng',
    badgeClass: 'notifBadgeOrder',
    iconBgClass: 'notifIconOrder',
    iconName: 'ShoppingBag',
  },
  PAYMENT: {
    type: 'PAYMENT',
    label: 'Thanh toán',
    badgeClass: 'notifBadgePayment',
    iconBgClass: 'notifIconPayment',
    iconName: 'CreditCard',
  },
  PROMOTION: {
    type: 'PROMOTION',
    label: 'Khuyến mãi',
    badgeClass: 'notifBadgePromo',
    iconBgClass: 'notifIconPromo',
    iconName: 'Tag',
  },
  SYSTEM: {
    type: 'SYSTEM',
    label: 'Hệ thống',
    badgeClass: 'notifBadgeSystem',
    iconBgClass: 'notifIconSystem',
    iconName: 'Bell',
  },
};

export function formatRelativeTime(isoString: string, now = new Date()): string {
  if (!isoString) return 'Gần đây';

  const date = new Date(isoString);
  const time = date.getTime();
  if (isNaN(time)) return 'Gần đây';

  const diffMs = now.getTime() - time;
  if (diffMs < 0) return 'Vừa xong';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Vừa xong';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;

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
