export type NotificationType = 'ORDER' | 'PAYMENT' | 'PROMOTION' | 'SYSTEM';

export interface AdminNotification {
  id: string | number;
  userId?: string | number;
  title: string;
  content: string;
  type: NotificationType;
  refId?: string | number | null;
  isRead: boolean;
  createdAt: string;
}

