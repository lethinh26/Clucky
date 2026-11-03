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
  message?: string;
}

export function getGuestSessionId(): string {
  if (typeof window === "undefined") return "ssr-session";
  let sessionId = localStorage.getItem("clucky_guest_session_id");
  if (!sessionId) {
    sessionId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `guest-${Date.now()}`;
    localStorage.setItem("clucky_guest_session_id", sessionId);
  }
  return sessionId;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Accept-Language", getBrowserLocale());

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("clucky_access_token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const guestSession = localStorage.getItem("clucky_guest_session_id");
    if (guestSession) {
      if (!headers.has("X-Guest-Session-Id")) headers.set("X-Guest-Session-Id", guestSession);
      if (!headers.has("X-Session-Id")) headers.set("X-Session-Id", guestSession);
    } else if (!token && !headers.has("X-Session-Id") && (path.startsWith("/api/cart") || path.startsWith("/api/orders"))) {
      const newSession = getGuestSessionId();
      if (!headers.has("X-Guest-Session-Id")) headers.set("X-Guest-Session-Id", newSession);
      if (!headers.has("X-Session-Id")) headers.set("X-Session-Id", newSession);
    }
  }

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
      message: typeof data?.message === "string" ? data.message : undefined,
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

/* ---------- Cart ---------- */
export interface BackendCartItem {
  itemKey: string;
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

export interface BackendCartDto {
  items: BackendCartItem[];
  subtotal: number;
  itemCount: number;
}

export interface CartItemPayload {
  productId?: number;
  comboId?: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  optionsSnapshot?: unknown;
  toppingsSnapshot?: unknown;
  note?: string;
}

export const cartApi = {
  getCart: () => request<BackendCartDto>("/api/cart"),
  addItem: (payload: CartItemPayload) =>
    request<BackendCartDto>("/api/cart/items", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateItem: (itemKey: string, quantity: number, note?: string) =>
    request<BackendCartDto>(`/api/cart/items/${encodeURIComponent(itemKey)}`, {
      method: "PUT",
      body: JSON.stringify({ quantity, note }),
    }),
  removeItem: (itemKey: string) =>
    request<BackendCartDto>(`/api/cart/items/${encodeURIComponent(itemKey)}`, {
      method: "DELETE",
    }),
  clearCart: () =>
    request<void>("/api/cart", {
      method: "DELETE",
    }),
  mergeCart: (guestSessionId: string) =>
    request<BackendCartDto>("/api/cart/merge", {
      method: "POST",
      body: JSON.stringify({ guestSessionId }),
    }),
};

/* ---------- Order ---------- */
export interface OrderPreviewPayload {
  storeId?: number;
  type: "DELIVERY" | "PICKUP";
  items: CartItemPayload[];
  voucherCode?: string;
  pointsUsed?: number;
  address?: string;
}

export interface OrderPreviewResult {
  storeId?: number;
  type: string;
  subtotal: number;
  discountAmount: number;
  pointsUsed: number;
  pointsAmount: number;
  shippingFee: number;
  totalAmount: number;
  voucherCode?: string;
  valid: boolean;
  message?: string;
}

export interface CreateOrderPayload {
  storeId: number;
  type: "DELIVERY" | "PICKUP";
  items: CartItemPayload[];
  voucherCode?: string;
  pointsUsed?: number;
  receiverName: string;
  receiverPhone: string;
  deliveryAddress?: string;
  note?: string;
  scheduledAt?: string;
}

export interface BackendOrderItem {
  id: number;
  itemType: "PRODUCT" | "COMBO";
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

export interface BackendOrderStatusHistory {
  id: number;
  fromStatus?: string;
  toStatus: string;
  changedBy?: number;
  changedRole?: string;
  reason?: string;
  createdAt: string;
}

export interface BackendOrder {
  id: number;
  orderCode: string;
  customerId: number;
  storeId: number;
  type: "DELIVERY" | "PICKUP";
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
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: BackendOrderItem[];
  timeline?: BackendOrderStatusHistory[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const orderApi = {
  preview: (payload: OrderPreviewPayload) =>
    request<OrderPreviewResult>("/api/orders/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  create: (payload: CreateOrderPayload) =>
    request<BackendOrder>("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMyOrders: (page = 0, size = 20) =>
    request<PageResponse<BackendOrder>>(`/api/orders/my?page=${page}&size=${size}`),
  getById: (id: string | number) =>
    request<BackendOrder>(`/api/orders/${id}`),
  cancel: (id: string | number, reason: string) =>
    request<BackendOrder>(`/api/orders/${id}/cancel`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }),
  reorder: (id: string | number) =>
    request<BackendOrder>(`/api/orders/${id}/reorder`, {
      method: "POST",
    }),
};

/* ---------- Party Order ---------- */
export interface CreatePartyOrderPayload {
  storeId: number;
  contactName: string;
  phone: string;
  contactPhone?: string;
  contactEmail?: string;
  expectedDate: string;
  expectedTime?: string;
  guestCount: number;
  content: string;
  notes?: string;
}

export interface PartyOrderResult {
  id: number;
  customerId?: number;
  storeId: number;
  contactName: string;
  phone: string;
  expectedDate: string;
  guestCount: number;
  content: string;
  status: string;
}

export type BackendPartyOrder = PartyOrderResult;

export const partyOrderApi = {
  create: (payload: CreatePartyOrderPayload) =>
    request<PartyOrderResult>("/api/party-orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMyPartyOrders: (page = 0, size = 20) =>
    request<PageResponse<PartyOrderResult>>(`/api/party-orders/my?page=${page}&size=${size}`),
};

/* ---------- Refund Request ---------- */
export interface RefundResult {
  id: number;
  orderId: number;
  customerId: number;
  amount: number;
  reason: string;
  status: string;
  reviewedBy?: number;
  reviewedAt?: string;
}

export const refundApi = {
  create: (orderId: number, amount: number, reason: string) =>
    request<RefundResult>("/api/refund-requests", {
      method: "POST",
      body: JSON.stringify({ orderId, amount, reason }),
    }),
};

export default request;
