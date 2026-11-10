import axios, { AxiosError } from 'axios';
import { signIn, endSession, loadSession, refreshSession, expireSession, getSessionState, type SessionUser } from './session';
import { getBrowserLocale, getErrorMessage as resolveError } from '../i18n/core';
import type { StoreStatus } from '../types/store';
import type { AdminVoucher, VoucherPayload } from '../types/promotion';

export interface ProductOptionGroup {
  id: string;
  name: string;
  required: boolean;
  choices: { id: string; name: string; priceAdjustment: number }[];
}

export interface ProductTopping {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  categoryId: number;
  categoryName: string;
  description: string;
  basePrice: number;
  imageUrl?: string | null;
  kcal?: number | null;
  spicyLevel?: number | null;
  isActive: boolean;
  isAvailable?: boolean | null;
  isSoldOut?: boolean | null;
  isBestSeller?: boolean | null;
  rating?: number | null;
  reviewCount?: number | null;
  options?: ProductOptionGroup[];
  toppings?: ProductTopping[];
}

export interface Combo {
  id: number;
  name: string;
  slug: string;
  description: string;
  comboPrice: number;
  imageUrl?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  isActive: boolean;
  items: { productId: number; productName: string; quantity: number; optionId?: number }[];
}

export interface Store {
  accountReadiness?: 'LEGACY' | 'PENDING' | 'PROVISIONED' | 'READY';
  recoveryEmail?: string;
  latitude?: number | null;
  longitude?: number | null;
  id: number;
  name: string;
  address: string;
  district?: string | null;
  city?: string | null;
  phone: string;
  openTime: string;
  closeTime: string;
  status: StoreStatus;
  deliveryArea?: string | null;
  managerId?: number;
  managerName?: string;
  isOpenNow?: boolean;
}

export interface InventoryItem {
  storeId: number;
  productId: number;
  productName: string;
  categoryName: string;
  imageUrl?: string | null;
  quantityAvailable: number;
  lowStockThreshold: number;
  isSoldOut: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface CatalogCategory {
  id: number;
  name: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

/**
 * Axios client for the Clucky staff/admin app.
 * All requests go through the API Gateway (`VITE_API_URL`, same-origin when empty).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  config.headers.delete('Authorization');
  config.headers['X-Clucky-Client'] = 'admin';
  const scoped = config as typeof config & { sessionRevision?: number };
  scoped.sessionRevision ??= getSessionState().revision;
  config.headers['Accept-Language'] = getBrowserLocale();
  return config;
});

api.interceptors.response.use(response => {
  const config = response.config as typeof response.config & { sessionRevision?: number };
  if (config.sessionRevision !== getSessionState().revision) throw new axios.CanceledError('Session changed');
  return response;
}, async (error: AxiosError) => {
  const config = error.config as (NonNullable<AxiosError['config']> & { retried?: boolean; sessionRevision?: number }) | undefined;
  if (error.response?.status !== 401 || !config || config.url?.startsWith('/api/auth/')) throw error;
  if (config.sessionRevision !== getSessionState().revision) throw new axios.CanceledError('Session changed');
  if (config.retried) { expireSession(); throw error; }
  config.retried = true;
  const userId = getSessionState().user?.userId;
  const user = await refreshSession();
  if (userId && userId !== user.userId) throw error;
  config.sessionRevision = getSessionState().revision;
  return api.request(config);
});

export function getErrorMessage(err: unknown, _fallback?: string): string {
  return resolveError(err);
}

/* ---------- Auth ---------- */
export interface LoginPayload { email: string; password: string }
export interface ForgotPasswordPayload { email: string }
export interface ResetPasswordPayload { email: string; otp: string; newPassword: string }
export type AuthTokens = SessionUser;

export const authApi = {
  login: (body: LoginPayload) => signIn<AuthTokens>('/api/auth/login', body),
  session: loadSession,
  refresh: refreshSession,
  logout: () => endSession(),
  forgotPassword: (body: ForgotPasswordPayload) => api.post('/api/auth/forgot-password', body).then((r) => r.data),
  resetPassword: (body: ResetPasswordPayload) => endSession('/api/auth/reset-password', body),
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
  customerId?: number | null;
  storeId: number;
  storeName?: string;
  type: 'DELIVERY' | 'PICKUP';
  status: string;
  paymentMethod?: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'COLLECTED' | 'REFUNDED';
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
  orderSource?: 'WEB' | 'COUNTER';
  diningOption?: 'DINE_IN' | 'TAKE_AWAY';
  queueNumber?: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const ordersApi = {
  list: (
    params?: { storeId?: number; status?: string; page?: number; size?: number },
    signal?: AbortSignal
  ) =>
    api
      .get<any>('/api/orders', { params, signal })
      .then((r) => {
        if (r.data && Array.isArray(r.data.content)) {
          return r.data.content as BackendOrder[];
        }
        if (Array.isArray(r.data)) return r.data as BackendOrder[];
        throw { code: 'UPSTREAM_ERROR' };
      }),
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
        { status, note: reason },
        { signal }
      )
      .then((r) => r.data),
  cancel: (id: string | number, reason: string, signal?: AbortSignal) =>
    api
      .put<BackendOrder>(`/api/orders/${id}/cancel`, { reason }, { signal })
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
      .get<any>('/api/refund-requests', { params, signal })
      .then((r) => {
        if (r.data && Array.isArray(r.data.content)) {
          return r.data.content as BackendRefund[];
        }
        if (Array.isArray(r.data)) return r.data as BackendRefund[];
        throw { code: 'UPSTREAM_ERROR' };
      }),
  review: (
    id: string | number,
    action: 'APPROVE' | 'REJECT',
    note?: string,
    signal?: AbortSignal
  ) => {
    const endpoint = action === 'APPROVE' ? 'approve' : 'reject';
    return api
      .put<BackendRefund>(
        `/api/refund-requests/${id}/${endpoint}`,
        { reason: note },
        { signal }
      )
      .then((r) => r.data);
  },
};

/* ---------- Party Orders ---------- */
export interface BackendPartyOrder {
  id: number;
  requestNumber?: string;
  customerId?: number;
  storeId: number;
  contactName: string;
  contactPhone?: string;
  phone?: string;
  contactEmail?: string;
  expectedDate: string;
  expectedTime?: string;
  guestCount: number;
  status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'CONFIRMED' | 'CLOSED' | 'CANCELLED';
  depositAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export const partyOrdersApi = {
  list: (
    params?: { storeId?: number; status?: string; page?: number; size?: number },
    signal?: AbortSignal
  ) =>
    api
      .get<any>('/api/party-orders', { params, signal })
      .then((r) => {
        if (r.data && Array.isArray(r.data.content)) {
          return r.data.content as BackendPartyOrder[];
        }
        return Array.isArray(r.data) ? (r.data as BackendPartyOrder[]) : [];
      }),
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
        { status, notes: reason },
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
        `/api/party-orders/${id}/status`,
        { status: 'CONFIRMED', notes: note },
        { signal }
      )
      .then((r) => r.data),
  reject: (id: string | number, reason: string, signal?: AbortSignal) =>
    api
      .put<BackendPartyOrder>(
        `/api/party-orders/${id}/status`,
        { status: 'CANCELLED', notes: reason },
        { signal }
      )
      .then((r) => r.data),
};

/* ---------- Promotions & Vouchers ---------- */
export const promotionsApi = {
  listVouchers: (params?: { scope?: string; storeId?: number; status?: string; keyword?: string }, signal?: AbortSignal) =>
    api.get<AdminVoucher[]>('/api/promotions/vouchers', { params, signal }).then((r) => r.data),
  getVoucher: (id: number | string, signal?: AbortSignal) =>
    api.get<AdminVoucher>(`/api/promotions/vouchers/${id}`, { signal }).then((r) => r.data),
  createVoucher: (data: VoucherPayload, signal?: AbortSignal) =>
    api.post<AdminVoucher>('/api/promotions/vouchers', data, { signal }).then((r) => r.data),
  updateVoucher: (id: number | string, data: VoucherPayload, signal?: AbortSignal) =>
    api.put<AdminVoucher>(`/api/promotions/vouchers/${id}`, data, { signal }).then((r) => r.data),
  deleteVoucher: (id: number | string, signal?: AbortSignal) =>
    api.delete(`/api/promotions/vouchers/${id}`, { signal }).then((r) => r.data),
};

/* ---------- Catalog & Products ---------- */
export const catalogApi = {
  listProducts: (params?: { storeId?: number; categoryId?: number; keyword?: string; activeOnly?: boolean }) =>
    api.get<Product[]>('/api/catalog/products', { params }).then((r) => r.data),
  getProduct: (id: number, storeId?: number) =>
    api.get<Product>(`/api/catalog/products/${id}`, { params: { storeId } }).then((r) => r.data),
  createProduct: (data: Partial<Product>) =>
    api.post<Product>('/api/catalog/products', data).then((r) => r.data),
  updateProduct: (id: number, data: Partial<Product>) =>
    api.put<Product>(`/api/catalog/products/${id}`, data).then((r) => r.data),
  updateProductStatus: (id: number, isActive: boolean) =>
    api.put<Product>(`/api/catalog/products/${id}/status?active=${isActive}`).then((r) => r.data),
  deleteProduct: (id: number) =>
    api.delete(`/api/catalog/products/${id}`).then((r) => r.data),
  uploadProductImage: (id: number, file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Product>(`/api/catalog/products/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }).then((r) => r.data);
  },
  listCategories: () =>
    api.get<CatalogCategory[]>('/api/catalog/categories').then((r) => r.data),
  listCombos: (activeOnly?: boolean) =>
    api.get<Combo[]>('/api/catalog/combos', { params: { activeOnly } }).then((r) => r.data),
  createCombo: (data: Partial<Combo>) =>
    api.post<Combo>('/api/catalog/combos', data).then((r) => r.data),
  updateCombo: (id: number, data: Partial<Combo>) =>
    api.put<Combo>(`/api/catalog/combos/${id}`, data).then((r) => r.data),
  updateComboStatus: (id: number, isActive: boolean) =>
    api.put<Combo>(`/api/catalog/combos/${id}/status?active=${isActive}`).then((r) => r.data),
  deleteCombo: (id: number) =>
    api.delete(`/api/catalog/combos/${id}`).then((r) => r.data),
  uploadComboImage: (id: number, file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Combo>(`/api/catalog/combos/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }).then((r) => r.data);
  },
};

/* ---------- Stores ---------- */
export const storesApi = {
  updateLocation: (id: number, point: { latitude: number | null; longitude: number | null }) =>
    api.put<Store>('/api/stores/' + id + '/location', point).then(response => response.data),
  list: (activeOnly?: boolean, signal?: AbortSignal) =>
    api.get<Store[]>('/api/stores', { params: { activeOnly }, signal }).then((r) => r.data),
  get: (id: number) =>
    api.get<Store>(`/api/stores/${id}`).then((r) => r.data),
  create: (data: Partial<Store>, idempotencyKey: string) =>
    api.post<Store>('/api/stores', data, { headers: { 'Idempotency-Key': idempotencyKey } }).then((r) => r.data),
  update: (id: number, data: Partial<Store>) =>
    api.put<Store>(`/api/stores/${id}`, data).then((r) => r.data),
  delete: (id: number) =>
    api.delete(`/api/stores/${id}`).then((r) => r.data),
  updateOperation: (id: number, data: { openTime?: string; closeTime?: string; status?: string }) =>
    api.put<Store>(`/api/stores/${id}/operation`, data).then((r) => r.data),
};

/* ---------- Inventory & Availability ---------- */
export const inventoryApi = {
  getStoreInventory: (storeId: number) =>
    api.get<InventoryItem[]>(`/api/stores/${storeId}/inventory`).then((r) => r.data),
  updateInventory: (storeId: number, productId: number, data: { quantityAvailable?: number; lowStockThreshold?: number; isSoldOut?: boolean }) =>
    api.put<InventoryItem>(`/api/stores/${storeId}/inventory/${productId}`, data).then((r) => r.data),
  updateAvailability: (storeId: number, productId: number, data: { isAvailable?: boolean; isSoldOut?: boolean; storePrice?: number | null; clearStorePrice?: boolean }) =>
    api.put(`/api/stores/${storeId}/products/${productId}/availability`, data).then((r) => r.data),
};

/* ---------- Payments (payment-service) ---------- */
export interface BackendBankTransaction {
  id: number;
  bankTxId: string;
  bankAccount: string;
  amount: number;
  content: string;
  receivedAt: string;
  matchedOrderCode?: string | null;
}

export interface BackendCounterReceipt {
  id: number;
  receiptCode: string;
  orderId: number;
  orderCode: string;
  queueNumber?: number;
  storeId: number;
  method: 'CASH' | 'BANK_TRANSFER' | 'SPLIT';
  totalDue: number;
  cashAmount: number;
  cashTendered: number;
  cashChange: number;
  roundingDifference: number;
  bankAmountDeclared: number;
  bankAmountReconciled: number;
  bankRefCode?: string;
  bankTxId?: string;
  status: 'PENDING_RECONCILIATION' | 'RECONCILED' | 'DISCREPANCY' | 'VOIDED';
  manualAcceptance: boolean;
  exceptionReason?: string;
  staffId: number;
  staffName: string;
  printCount: number;
  createdAt: string;
}

export const paymentsApi = {
  listBankTransactions: (signal?: AbortSignal) =>
    api.get<BackendBankTransaction[]>('/api/payments/bank-transactions', { signal }).then((r) => r.data),
  listReceipts: (storeId?: number, signal?: AbortSignal) =>
    api.get<BackendCounterReceipt[]>('/api/payments/receipts', { params: { storeId }, signal }).then((r) => r.data),
  getReceiptByOrderCode: (orderCode: string, signal?: AbortSignal) =>
    api.get<BackendCounterReceipt>(`/api/payments/receipts/order/${orderCode}`, { signal }).then((r) => r.data),
};

export default api;
