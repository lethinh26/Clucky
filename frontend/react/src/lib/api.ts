import axios from 'axios';
import { getBrowserLocale, getErrorMessage as resolveError } from '../i18n/core';

/**
 * Axios client for the Clucky staff/admin app.
 * All requests go through the API Gateway (`VITE_API_URL`, default http://localhost:8080).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clucky_admin_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = getBrowserLocale();
  return config;
});

/* ---------- INT-05: 401 handling with single-flight refresh ---------- */
let refreshPromise: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<AuthTokens>('/api/auth/refresh')
      .then((r) => {
        const token = r.data?.accessToken;
        if (typeof token === 'string') {
          localStorage.setItem('clucky_admin_access_token', token);
        }
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

type RetriableConfig = import('axios').InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: import('axios').AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetriableConfig | undefined;
    const url: string = original?.url ?? '';
    const isAuthPath = url.startsWith('/api/auth/');
    if (status === 401 && original && !original._retried && !isAuthPath) {
      original._retried = true;
      if (await tryRefresh()) {
        return api.request(original);
      }
      localStorage.removeItem('clucky_admin_access_token');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(err: unknown, _fallback?: string): string {
  return resolveError(err);
}

/* ---------- Auth ---------- */
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  role?: string;
  storeId?: number;
  email?: string;
  fullName?: string;
}

export interface LoginPayload { email: string; password: string }
export interface ForgotPasswordPayload { email: string }
export interface ResetPasswordPayload { email: string; otp: string; newPassword: string }
export const authApi = {
  login: (body: LoginPayload) => api.post<AuthTokens>('/api/auth/login', body).then((r) => r.data),
  refresh: () => api.post<AuthTokens>('/api/auth/refresh').then((r) => r.data),
  logout: () => api.post<{ message: string }>('/api/auth/logout').then((r) => r.data),
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

export default api;
