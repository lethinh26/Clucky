import { api } from './api';

export interface NotificationPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type EmailStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'EXPIRED';

export interface EmailLog {
  id: number;
  toEmail: string;
  subject: string;
  status: EmailStatus;
  template: string;
  sentAt: string | null;
  createdAt: string;
  failureCode: string | null;
  retryCount: number;
  eventId: string | null;
  correlationId: string | null;
  nextAttemptAt: string | null;
  messageId: string;
  storeId: number | null;
  attemptCount: number;
  generation: number;
  expiresAt: string | null;
  canRetry: boolean;
  retryBlockedReason: string | null;
  failureDeliveryStatus: 'NONE' | 'PENDING' | 'PUBLISHED';
}

export interface EmailLogDetail {
  delivery: EmailLog;
  attempts: { attemptNumber: number; generation: number; startedAt: string; finishedAt: string | null; outcome: string }[];
  failures: { id: string; generation: number; attemptNumber: number; failureCode: string; createdAt: string; publishedAt: string | null; publishAttempts: number; nextAttemptAt: string | null }[];
  retries: { expectedGeneration: number; requestId: string; actorId: number; createdAt: string }[];
}

export interface AdminNotification {
  id: number;
  title: string;
  content: string;
  type: string;
  refId: number;
  storeId: number;
  isRead: boolean;
  createdAt: string;
}

export interface EmailLogFilters {
  recipient?: string;
  status?: EmailStatus;
  template?: string;
  from?: string;
  to?: string;
}

export const adminNotificationsApi = {
  emailDetail: async (id: number, signal?: AbortSignal) =>
    (await api.get<EmailLogDetail>(`/api/notifications/email-logs/${id}`, { signal })).data,
  retryEmail: async (id: number, expectedGeneration: number, requestId: string) =>
    (await api.post<{ id: number; generation: number; replayed: boolean }>(`/api/notifications/email-logs/${id}/retry`, { expectedGeneration, requestId })).data,
  emailLogs: async (page: number, size: number, filters: EmailLogFilters, signal?: AbortSignal) =>
    (await api.get<NotificationPage<EmailLog>>('/api/notifications/email-logs', { params: { page, size, ...filters }, signal })).data,
  inbox: async (page: number, size: number, signal?: AbortSignal) =>
    (await api.get<NotificationPage<AdminNotification>>('/api/notifications/admin', { params: { page, size }, signal })).data,
  unreadCount: async (signal?: AbortSignal) =>
    (await api.get<{ unreadCount: number }>('/api/notifications/admin/unread-count', { signal })).data.unreadCount,
  markRead: async (id: number) =>
    (await api.put<{ id: number; isRead: boolean }>(`/api/notifications/admin/${id}/read`)).data,
  markAllRead: async () =>
    (await api.put<{ updatedCount: number }>('/api/notifications/admin/read-all')).data,
};
