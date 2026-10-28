/**
 * Thin API client for the Clucky customer app.
 *
 * All requests go through the API Gateway (`NEXT_PUBLIC_API_URL`,
 * default http://localhost:8080) — never directly to a business service.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export interface ApiError {
  status: number;
  message: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: (data?.message as string) || `Request failed (${res.status})`,
    };
    throw err;
  }
  return data as T;
}

/* ---------- Auth ---------- */
export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { fullName: string; email: string; phone?: string; password: string }
export interface VerifyOtpPayload { email: string; otp: string }
export interface ForgotPasswordPayload { email: string }
export interface ResetPasswordPayload { email: string; otp: string; newPassword: string }
export interface AuthTokens { accessToken: string; refreshToken: string; role?: string; storeId?: number }

export const authApi = {
  login: (body: LoginPayload) => request<AuthTokens>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: RegisterPayload) => request<{ message?: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  verifyOtp: (body: VerifyOtpPayload) => request<AuthTokens>('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (body: ForgotPasswordPayload) => request<{ message?: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body: ResetPasswordPayload) => request<{ message?: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
};

export default request;

