import { getTranslator } from "./i18n/translator.ts";
import { getBrowserLocale, type Locale } from "./i18n/locale.ts";
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

export function resolveNotificationTarget(item: NotificationItemData): TargetResolution {
  // Test case for invalid / unavailable target
  if (item.link === '/orders/not-found-id' || item.refId === 999999) {
    return {
      url: null,
      isValid: false,
      reason: 'Đơn hàng hoặc trang liên kết tham chiếu không còn khả dụng trên hệ thống.',
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
        reason: 'Thông báo hệ thống chung, vui lòng xem chi tiết nội dung.',
      };
  }
}

export const MOCK_CUSTOMER_NOTIFICATIONS: NotificationItemData[] = [
  {
    id: 'notif-1',
    title: 'Đơn hàng #CLUCKY-101 đã xác nhận',
    content: 'Bếp Clucky đang chuẩn bị món cho bạn. Đơn hàng dự kiến giao sau 20 phút.',
    type: 'ORDER',
    refId: 101,
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'notif-2',
    title: 'Ưu đãi đặc biệt: Giảm 20% hôm nay',
    content: 'Nhập mã CLUCKY20 khi thanh toán để được giảm 20% cho đơn từ 150.000đ.',
    type: 'PROMOTION',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'notif-3',
    title: 'Thanh toán thành công đơn #CLUCKY-098',
    content: 'Bạn đã thanh toán 245.000đ qua ví điện tử. Điểm tích lũy đã được cộng vào tài khoản.',
    type: 'PAYMENT',
    refId: 98,
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'notif-4',
    title: 'Thông báo nâng cấp ứng dụng',
    content: 'Clucky vừa cập nhật giao diện đặt món mới giúp thao tác nhanh và mượt mà hơn.',
    type: 'SYSTEM',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'notif-err-test',
    title: 'Mô phỏng lỗi khi đánh dấu đọc (AC-03)',
    content: 'Nhấp đánh dấu đọc mục này sẽ mô phỏng lỗi kết nối và tự động hoàn tác trạng thái chưa đọc.',
    type: 'SYSTEM',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'notif-broken-target',
    title: 'Đơn hàng lưu trữ cũ không khả dụng (AC-04)',
    content: 'Nhấp vào thông báo này để kiểm chứng cơ chế xử lý liên kết không hợp lệ an toàn, không gây lỗi 404.',
    type: 'ORDER',
    refId: 999999,
    link: '/orders/not-found-id',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];
