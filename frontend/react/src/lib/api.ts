import axios from 'axios';
import { getBrowserLocale, getErrorMessage as resolveError } from '../i18n/core';

/**
 * Axios client for the Clucky staff/admin app.
 * All requests go through the API Gateway (`VITE_API_URL`, default http://localhost:8080).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clucky_admin_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = getBrowserLocale();
  return config;
});

export function getErrorMessage(err: unknown, _fallback?: string): string {
  return resolveError(err);
}

/* ---------- Auth ---------- */
export interface LoginPayload {
  email: string;
  password: string;
}
export interface ForgotPasswordPayload {
  email: string;
}
export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  role?: string;
  storeId?: number;
}

export const authApi = {
  login: (body: LoginPayload) =>
    api.post<AuthTokens>('/api/auth/login', body).then((r) => r.data),
  forgotPassword: (body: ForgotPasswordPayload) =>
    api.post('/api/auth/forgot-password', body).then((r) => r.data),
  resetPassword: (body: ResetPasswordPayload) =>
    api.post('/api/auth/reset-password', body).then((r) => r.data),
};

/* ---------- Admin users ---------- */
export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'STORE_MANAGER' | 'STAFF' | 'CUSTOMER' | 'SHIPPER';
  storeId?: number;
  storeName?: string;
  status: 'ACTIVE' | 'LOCKED';
}

export const usersApi = {
  list: (
    params?: { role?: string; storeId?: number; keyword?: string },
    signal?: AbortSignal
  ) =>
    api
      .get<AdminUser[]>('/api/users', { params, signal })
      .then((r) => r.data),
  assignStore: (id: number, storeId: number, signal?: AbortSignal) =>
    api
      .put(`/api/users/${id}/assign-store`, { storeId }, { signal })
      .then((r) => r.data),
  lock: (id: number, signal?: AbortSignal) =>
    api.put(`/api/users/${id}/lock`, undefined, { signal }).then((r) => r.data),
  unlock: (id: number, signal?: AbortSignal) =>
    api
      .put(`/api/users/${id}/unlock`, undefined, { signal })
      .then((r) => r.data),
};

/* ---------- Orders (cart-order-service) ---------- */
export interface BackendOrderItem {
  id: number;
  itemType: 'PRODUCT' | 'COMBO';
  productId?: number;
  comboId?: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  optionsSnapshot?: unknown;
  toppingsSnapshot?: unknown;
  note?: string;
  lineTotal: number;
}

export interface BackendOrder {
  id: number;
  orderCode: string;
  customerId: number;
  storeId: number;
  type: 'DELIVERY' | 'PICKUP';
  status: string;
  subtotal: number;
  discountAmount: number;
  pointsUsed: number;
  pointsAmount: number;
  shippingFee: number;
  totalAmount: number;
  voucherCode?: string;
  receiverName: string;
  receiverPhone: string;
  deliveryAddress?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  items?: BackendOrderItem[];
  timeline?: Array<{
    id: number;
    fromStatus?: string;
    toStatus: string;
    changedBy?: number;
    changedRole?: string;
    reason?: string;
    createdAt: string;
  }>;
}

export const ordersApi = {
  list: (
    params?: { storeId?: number; status?: string; page?: number; size?: number },
    signal?: AbortSignal
  ) =>
    api
      .get<BackendOrder[]>('/api/orders', { params, signal })
      .then((r) => r.data),
  getById: (id: string | number, signal?: AbortSignal) =>
    api.get<BackendOrder>(`/api/orders/${id}`, { signal }).then((r) => r.data),
  updateStatus: (
    id: string | number,
    status: string,
    reason?: string,
    signal?: AbortSignal
  ) =>
    api
      .put<BackendOrder>(
        `/api/orders/${id}/status`,
        { status, reason },
        { signal }
      )
      .then((r) => r.data),
  cancel: (id: string | number, reason: string, signal?: AbortSignal) =>
    api
      .post<BackendOrder>(`/api/orders/${id}/cancel`, { reason }, { signal })
      .then((r) => r.data),
};

/* ---------- Refunds ---------- */
export interface BackendRefund {
  id: number;
  orderId: number;
  orderCode: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  reviewedBy?: number;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

export const refundsApi = {
  list: (
    params?: { storeId?: number; status?: string; page?: number; size?: number },
    signal?: AbortSignal
  ) =>
    api
      .get<BackendRefund[]>('/api/refunds', { params, signal })
      .then((r) => r.data),
  review: (
    id: string | number,
    action: 'APPROVE' | 'REJECT',
    note?: string,
    signal?: AbortSignal
  ) =>
    api
      .put<BackendRefund>(
        `/api/refunds/${id}/review`,
        { action, note },
        { signal }
      )
      .then((r) => r.data),
};

/* ---------- Party Orders ---------- */
export interface BackendPartyOrder {
  id: number;
  requestNumber: string;
  customerId?: number;
  storeId: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  expectedDate: string;
  expectedTime: string;
  guestCount: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  depositAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const partyOrdersApi = {
  list: (
    params?: { storeId?: number; status?: string },
    signal?: AbortSignal
  ) =>
    api
      .get<BackendPartyOrder[]>('/api/party-orders', { params, signal })
      .then((r) => r.data),
  getById: (id: string | number, signal?: AbortSignal) =>
    api
      .get<BackendPartyOrder>(`/api/party-orders/${id}`, { signal })
      .then((r) => r.data),
  updateStatus: (
    id: string | number,
    status: string,
    reason?: string,
    signal?: AbortSignal
  ) =>
    api
      .put<BackendPartyOrder>(
        `/api/party-orders/${id}/status`,
        { status, reason },
        { signal }
      )
      .then((r) => r.data),
  confirm: (
    id: string | number,
    depositAmount?: number,
    note?: string,
    signal?: AbortSignal
  ) =>
    api
      .put<BackendPartyOrder>(
        `/api/party-orders/${id}/confirm`,
        { depositAmount, note },
        { signal }
      )
      .then((r) => r.data),
  reject: (id: string | number, reason: string, signal?: AbortSignal) =>
    api
      .put<BackendPartyOrder>(
        `/api/party-orders/${id}/reject`,
        { reason },
        { signal }
      )
      .then((r) => r.data),
};

export default api;
