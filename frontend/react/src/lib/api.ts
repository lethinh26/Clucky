import axios, { AxiosError } from 'axios';
import type { Product, Combo, Store, InventoryItem } from '../mocks/catalogData';

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
  const role = localStorage.getItem('clucky_admin_role') || 'ADMIN';
  config.headers['X-User-Role'] = role;
  if (role === 'STORE_MANAGER') {
    config.headers['X-Store-Id'] = '1';
    config.headers['X-User-Id'] = '2';
    config.headers['X-User-Name'] = 'Nguyễn Minh Anh';
  } else if (role === 'STAFF') {
    config.headers['X-Store-Id'] = '1';
    config.headers['X-User-Id'] = '3';
    config.headers['X-User-Name'] = 'Trần Quốc Bảo';
  } else {
    config.headers['X-User-Id'] = '1';
    config.headers['X-User-Name'] = 'Admin';
  }
  return config;
});

export function getErrorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra.'): string {
  const e = err as AxiosError<{ message?: string }>;
  return e?.response?.data?.message || e?.message || fallback;
}

/* ---------- Auth ---------- */
export interface LoginPayload { email: string; password: string }
export interface ForgotPasswordPayload { email: string }
export interface ResetPasswordPayload { email: string; otp: string; newPassword: string }
export interface AuthTokens { accessToken: string; refreshToken: string; role?: string; storeId?: number }

export const authApi = {
  login: (body: LoginPayload) => api.post<AuthTokens>('/api/auth/login', body).then((r) => r.data),
  forgotPassword: (body: ForgotPasswordPayload) => api.post('/api/auth/forgot-password', body).then((r) => r.data),
  resetPassword: (body: ResetPasswordPayload) => api.post('/api/auth/reset-password', body).then((r) => r.data),
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
  list: (params?: { role?: string; storeId?: number; keyword?: string }, signal?: AbortSignal) =>
    api.get<AdminUser[]>('/api/users', { params, signal }).then((r) => r.data),
  assignStore: (id: number, storeId: number, signal?: AbortSignal) =>
    api.put(`/api/users/${id}/assign-store`, { storeId }, { signal }).then((r) => r.data),
  lock: (id: number, signal?: AbortSignal) => api.put(`/api/users/${id}/lock`, undefined, { signal }).then((r) => r.data),
  unlock: (id: number, signal?: AbortSignal) => api.put(`/api/users/${id}/unlock`, undefined, { signal }).then((r) => r.data),
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
    api.get<any[]>('/api/catalog/categories').then((r) => r.data),
  listCombos: (activeOnly?: boolean) =>
    api.get<Combo[]>('/api/catalog/combos', { params: { activeOnly } }).then((r) => r.data),
  createCombo: (data: Partial<Combo>) =>
    api.post<Combo>('/api/catalog/combos', data).then((r) => r.data),
  updateCombo: (id: number, data: Partial<Combo>) =>
    api.put<Combo>(`/api/catalog/combos/${id}`, data).then((r) => r.data),
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
  list: (activeOnly?: boolean) =>
    api.get<Store[]>('/api/stores', { params: { activeOnly } }).then((r) => r.data),
  get: (id: number) =>
    api.get<Store>(`/api/stores/${id}`).then((r) => r.data),
  create: (data: Partial<Store>) =>
    api.post<Store>('/api/stores', data).then((r) => r.data),
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
  updateAvailability: (storeId: number, productId: number, data: { isAvailable?: boolean; isSoldOut?: boolean; storePrice?: number }) =>
    api.put(`/api/stores/${storeId}/products/${productId}/availability`, data).then((r) => r.data),
};

export default api;

