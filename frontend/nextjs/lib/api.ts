/**
 * Thin API client for the Clucky customer app.
 *
 * All requests go through the API Gateway (`NEXT_PUBLIC_API_URL`,
 * same-origin when empty) — never directly to a business service.
 */
function getBaseUrl(): string {
  if (typeof window === "undefined") {
    return (
      process.env.API_URL ||
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8080"
    );
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
}

export { getErrorMessage } from "./i18n/core";
import { getBrowserLocale } from "./i18n/core";

export interface ApiError {
  status: number;
  code?: string;
  message?: string;
}

/* ---------- INT-05: 401 handling with single-flight refresh ---------- */
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${getBaseUrl()}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const data = (await res.json().catch(() => ({}))) as {
          accessToken?: string;
        };
        if (typeof data.accessToken !== "string" || !data.accessToken) return false;
        if (typeof window !== "undefined") {
          localStorage.setItem("clucky_access_token", data.accessToken);
        }
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export function getGuestSessionId(): string {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return "ssr-session";
  let sessionId = localStorage.getItem("clucky_guest_session_id");
  if (!sessionId) {
    sessionId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `guest-${Date.now()}`;
    localStorage.setItem("clucky_guest_session_id", sessionId);
  }
  return sessionId;
}

export async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Accept-Language", getBrowserLocale());

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    const token = localStorage.getItem("clucky_access_token");
    const publicAuth = [
      "/api/auth/google", "/api/auth/google/complete", "/api/auth/login",
      "/api/auth/register", "/api/auth/resend-otp", "/api/auth/verify-otp", "/api/auth/refresh",
      "/api/auth/logout", "/api/auth/forgot-password", "/api/auth/reset-password",
    ].includes(path);
    if (token && !publicAuth && !headers.has("Authorization")) {
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
    res = await fetch(`${getBaseUrl()}${path}`, {
      credentials: "include",
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw { code: "NETWORK_ERROR" };
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // INT-05: on 401 (except the auth endpoints themselves), try one refresh
    // and replay the original request; concurrent callers share one refresh.
    const isAuthPath = path.startsWith("/api/auth/");
    if (res.status === 401 && retry && !isAuthPath && typeof window !== "undefined") {
      if (await tryRefresh()) {
        return request<T>(path, options, false);
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("clucky_access_token");
        window.location.assign("/login");
      }
    }
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
  refreshToken?: string;
  role?: string;
  storeId?: number;
  email?: string;
  fullName?: string;
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
  resendOtp: (email: string) =>
    request<{ message?: string }>("/api/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyOtp: (body: VerifyOtpPayload) =>
    request<AuthTokens>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  refresh: () =>
    request<AuthTokens>("/api/auth/refresh", {
      method: "POST",
    }),
  logout: () =>
    request<{ message?: string }>("/api/auth/logout", {
      method: "POST",
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

/* ---------- BE-18: self profile + address book ---------- */
export interface ProfileResponse {
  id: number;
  email: string;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  storeId: number | null;
  status: string;
  emailVerified: boolean;
}
export interface AddressResponse {
  id: number;
  userId: number;
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  isDefault: boolean;
}
export interface AddressPayload {
  receiverName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  isDefault: boolean;
}

export const profileApi = {
  get: () => request<ProfileResponse>("/api/users/me"),
  update: (body: { fullName: string; phone: string }) =>
    request<ProfileResponse>("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  listAddresses: () => request<AddressResponse[]>("/api/users/me/addresses"),
  createAddress: (body: AddressPayload) =>
    request<AddressResponse>("/api/users/me/addresses", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAddress: (id: number, body: AddressPayload) =>
    request<AddressResponse>(`/api/users/me/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteAddress: (id: number) =>
    request<void>(`/api/users/me/addresses/${id}`, { method: "DELETE" }),
};

/* ---------- Cart ---------- */
export interface BackendCartItem {
  itemKey: string;
  productId?: number;
  comboId?: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  optionIds?: number[];
  toppingIds?: number[];
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
  unitPrice?: number;
  quantity: number;
  optionIds?: number[];
  toppingIds?: number[];
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
    request<BackendCartDto>("/api/cart", {
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
  receiverAddress?: string;
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
  valid?: boolean;
  message?: string;
  voucherValid?: boolean;
  voucherMessage?: string;
}

export interface CreateOrderPayload {
  storeId: number;
  type: "DELIVERY" | "PICKUP";
  paymentMethod: "COD" | "BANK_TRANSFER";
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
  paymentMethod?: string;
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
    }).then((res) => ({
      ...res,
      valid: res.valid ?? res.voucherValid ?? false,
      message: res.message ?? res.voucherMessage,
    })),
  create: (payload: CreateOrderPayload) =>
    request<BackendOrder>("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMyOrders: (page = 0, size = 20) =>
    request<PageResponse<BackendOrder>>(`/api/orders/my?page=${page}&size=${size}`),
  getById: (id: string | number) =>
    request<BackendOrder>(`/api/orders/${id}`),
  getByCode: (orderCode: string) =>
    request<BackendOrder>(`/api/orders/code/${encodeURIComponent(orderCode)}`),
  cancel: (id: string | number, reason: string) =>
    request<BackendOrder>(`/api/orders/${id}/cancel`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }),
  reorder: (id: string | number) =>
    request<BackendCartDto>(`/api/orders/${id}/reorder`, {
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

/* ---------- Promotions & Loyalty ---------- */
export const promotionApi = {
  getAvailableVouchers: () =>
    request<import("./types/promotion").Voucher[]>("/api/promotions/vouchers/available"),
  validateVoucher: (body: {
    code: string;
    orderAmount: number;
    storeId?: string | number | null;
  }) =>
    request<import("./promotion").VoucherValidationResult>(
      "/api/promotions/vouchers/validate",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),
  getMyLoyalty: () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("clucky_access_token")
        : null;
    return request<{
      points: import("./types/promotion").MemberPoints;
      transactions: import("./types/promotion").PointTransaction[];
    }>("/api/loyalty/me", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
};

export * from "./catalog-and-stores.api";

export default request;
