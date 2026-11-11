import i18n from "../i18n/index.ts";
import { api, type PageResponse } from './api';

export const auditDomains = [
  { value: 'identity-service', get label() { return i18n.t("accounts:account"); } },
  { value: 'cart-order-service', get label() { return i18n.t("business:promotionUi.order"); } },
  { value: 'payment-service', get label() { return i18n.t("business:cart.checkout"); } },
  { value: 'catalog-store-service', get label() { return i18n.t("admin:ui.catalogBranches"); } },
  { value: 'promotion-loyalty-service', get label() { return i18n.t("admin:ui.promotionsLoyalty"); } },
  { value: 'review-report-service', get label() { return i18n.t("admin:ui.reviewsReports"); } },
  { value: 'notification-service', get label() { return i18n.t("common:toast.info"); } },
  { value: 'shipping-service', get label() { return i18n.t("business:ordersummarycard.deliveryFee"); } },
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
