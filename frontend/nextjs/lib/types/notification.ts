export type NotificationType = 'ORDER' | 'PAYMENT' | 'PROMOTION' | 'SYSTEM';

export interface NotificationItemData {
  id: string | number;
  userId?: string | number;
  title: string;
  content: string;
  type: NotificationType;
  refId?: string | number | null;
  isRead: boolean;
  createdAt: string;
  link?: string | null;
}

export interface NotificationMeta {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

