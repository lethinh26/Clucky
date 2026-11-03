/**
 * Thin API client for the Clucky customer app.
 *
 * All requests go through the API Gateway (`NEXT_PUBLIC_API_URL`,
 * default http://localhost:8080) — never directly to a business service.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
export { getErrorMessage } from "./i18n/core";
import { getBrowserLocale } from "./i18n/core";

export interface ApiError {
  status: number;
  code?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Accept-Language", getBrowserLocale());
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw { code: "NETWORK_ERROR" };
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      code: typeof data?.code === "string" ? data.code : undefined,
    };
    throw err;
  }
  return data as T;
}

/* ---------- Auth ---------- */
export interface LoginPayload {
  email: string;
  password: string;
}
export interface RegisterPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}
export interface VerifyOtpPayload {
  email: string;
  otp: string;
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
export type GoogleAuthResult =
  AuthTokens | { status: "REQUIRES_PASSWORD"; pendingToken: string };

export const authApi = {
  google: (idToken: string) =>
    request<GoogleAuthResult>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),
  completeGoogle: (pendingToken: string, password: string) =>
    request<AuthTokens>("/api/auth/google/complete", {
      method: "POST",
      body: JSON.stringify({ pendingToken, password }),
    }),
  login: (body: LoginPayload) =>
    request<AuthTokens>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  register: (body: RegisterPayload) =>
    request<{ message?: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  verifyOtp: (body: VerifyOtpPayload) =>
    request<AuthTokens>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  forgotPassword: (body: ForgotPasswordPayload) =>
    request<{ message?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resetPassword: (body: ResetPasswordPayload) =>
    request<{ message?: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export default request;
