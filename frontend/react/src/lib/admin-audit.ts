import { api, type PageResponse } from './api';

export const auditDomains = [
  { value: 'identity-service', label: 'Tài khoản' },
  { value: 'cart-order-service', label: 'Đơn hàng' },
  { value: 'payment-service', label: 'Thanh toán' },
  { value: 'catalog-store-service', label: 'Danh mục / chi nhánh' },
  { value: 'promotion-loyalty-service', label: 'Khuyến mãi / tích điểm' },
  { value: 'review-report-service', label: 'Đánh giá / báo cáo' },
  { value: 'notification-service', label: 'Thông báo' },
  { value: 'shipping-service', label: 'Phí giao hàng' },
];

export interface AuditLogEntry {
  id: number;
  eventId: string;
  correlationId: string;
  sourceService: string;
  actorId: number;
  actorRole: string;
  storeId: number | null;
  action: string;
  targetType: string;
  targetId: number;
  detail: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

export interface AuditFilters {
  action?: string;
  targetType?: string;
  targetId?: number;
  sourceService?: string;
  actorId?: number;
  storeId?: number;
  from?: string;
  to?: string;
}

export async function getAuditLogs(params: AuditFilters & { page: number; size: number }, signal: AbortSignal) {
  const { data } = await api.get<PageResponse<AuditLogEntry>>('/api/audit-logs', { params, signal });
  if (!Array.isArray(data.content) || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0) {
    throw { code: 'UPSTREAM_ERROR' };
  }
  return data;
}

export async function exportAuditLogs(params: AuditFilters, signal: AbortSignal) {
  try {
    const response = await api.get<Blob>('/api/audit-logs/export', {
      params, signal, responseType: 'blob', timeout: 30000,
    });
    if (!response.data.size || !String(response.headers['content-type']).toLowerCase().startsWith('text/csv')) {
      throw { code: 'UPSTREAM_ERROR' };
    }
    return response.data;
  } catch (error) {
    const response = (error as { response?: { status: number; data: unknown } }).response;
    if (response?.data instanceof Blob && response.data.type.includes('json')) {
      const data = await response.data.text();
      try { response.data = JSON.parse(data); } catch { throw { code: 'UPSTREAM_ERROR' }; }
    }
    throw error;
  }
}
