/**
 * Thin API client for the Clucky customer app.
 *
 * All requests go through the API Gateway (`NEXT_PUBLIC_API_URL`,
 * same-origin when empty) — never directly to a business service.
 */
import { sessionRequest, signIn, endSession, loadSession, refreshSession, getSessionState, type SessionUser } from "./session";

export { getErrorMessage } from "./i18n/core";
import { getBrowserLocale } from "./i18n/core";

export interface ApiError {
  status: number;
  code?: string;
  message?: string;
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

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept-Language", getBrowserLocale());
  if (typeof window !== "undefined" && (path.startsWith("/api/cart") || path.startsWith("/api/orders"))) {
    const guestSession = getSessionState().user ? localStorage.getItem("clucky_guest_session_id") : getGuestSessionId();
    if (guestSession) {
      if (!headers.has("X-Guest-Session-Id")) headers.set("X-Guest-Session-Id", guestSession);
      if (!headers.has("X-Session-Id")) headers.set("X-Session-Id", guestSession);
    }
  }
  return sessionRequest<T>(path, { ...options, headers });
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
export type AuthTokens = SessionUser;
export type GoogleAuthResult =
  AuthTokens | { status: "REQUIRES_PASSWORD"; pendingToken: string };

export const authApi = {
  google: (idToken: string) =>
    signIn<GoogleAuthResult>("/api/auth/google", { idToken }),
  completeGoogle: (pendingToken: string, password: string) =>
    signIn<AuthTokens>("/api/auth/google/complete", { pendingToken, password }),
  login: (body: LoginPayload) =>
    signIn<AuthTokens>("/api/auth/login", body),
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
    signIn<AuthTokens>("/api/auth/verify-otp", body),
  session: loadSession,
  refresh: refreshSession,
  logout: () => endSession(),
  forgotPassword: (body: ForgotPasswordPayload) =>
    request<{ message?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resetPassword: (body: ResetPasswordPayload) =>
    endSession("/api/auth/reset-password", body),
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
  latitude?: number;
  longitude?: number;
  storeId?: number;
  type: "DELIVERY" | "PICKUP";
  items: CartItemPayload[];
  voucherCode?: string;
  pointsUsed?: number;
  receiverAddress?: string;
}

export interface OrderPreviewResult {
  shipping?: ShippingQuote;
  orderValid?: boolean;
  tierDiscount?: number;
  storeId?: number;
  type: string;
  subtotal: number;
  discountAmount: number;
  pointsUsed: number;
  pointsAmount: number;
  shippingFee: number | null;
  totalAmount: number | null;
  voucherCode?: string;
  valid?: boolean;
  message?: string;
  voucherValid?: boolean;
  voucherMessage?: string;
}

export type ShippingQuote = {
  available: boolean;
  fee: number | null;
  reason: 'OK' | 'PICKUP' | 'LOCATION_REQUIRED' | 'STORE_LOCATION_MISSING' | 'RADIUS_NOT_CONFIGURED' | 'OUT_OF_RANGE' | 'FEE_NOT_CONFIGURED' | 'UNAVAILABLE';
  distanceKm: number | null;
  radiusKm: number | null;
  policyVersion: number | null;
};

export interface CreateOrderPayload {
  expectedTotal?: number;
  latitude?: number;
  longitude?: number;
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
  imageUrl?: string | null;
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
  customerId?: number;
  amount: number;
  reason: string;
  status: string;
  bankName?: string;
  bankBin?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  bankDetailsVersion?: number;
  reviewNote?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  evidencePublicId?: string;
  updatedAt?: string;
}

export interface VietQrBank {
  bin: string;
  shortName?: string;
  name?: string;
  logo?: string;
}

export const vietQrApi = {
  banks: () => request<VietQrBank[]>("/api/payments/banks"),
};

export const refundApi = {
  create: (
    dataOrOrderId:
      | { orderId: number; reason: string; bankBin: string; bankName?: string; bankAccountNo: string; bankAccountName: string }
      | number,
    amountOrReason?: number | string,
    legacyReason?: string
  ) => {
    let payload: { orderId: number; reason: string; bankBin?: string; bankName?: string; bankAccountNo?: string; bankAccountName?: string };
    if (typeof dataOrOrderId === "object") {
      payload = dataOrOrderId;
    } else {
      payload = {
        orderId: dataOrOrderId,
        reason: legacyReason || (typeof amountOrReason === "string" ? amountOrReason : ""),
      };
    }
    return request<RefundResult>("/api/refund-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  get: (id: number) =>
    request<RefundResult>(`/api/refund-requests/${id}`),
  list: async (params?: { orderId?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.orderId) qs.set("orderId", String(params.orderId));
    if (params?.status) qs.set("status", params.status);
    const res = await request<any>(`/api/refund-requests${qs.toString() ? `?${qs.toString()}` : ""}`);
    if (Array.isArray(res)) return res as RefundResult[];
    if (res && Array.isArray(res.content)) return res.content as RefundResult[];
    return [];
  },
  getEvidence: (id: number) =>
    request<{ signedUrl: string; publicId: string }>(`/api/refund-requests/${id}/evidence`),
  updateBankDetails: (id: number, data: { bankBin: string; bankName?: string; bankAccountNo: string; bankAccountName: string; expectedBankDetailsVersion?: number }) =>
    request<RefundResult>(`/api/refund-requests/${id}/bank-details`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

/* ---------- Catalog & Stores ---------- */
import type { StoreStatus } from "./types/store";

export interface StoreItem {
  deliveryRadiusKm?: number | null;
  isOpenNow?: boolean;
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
  deliveryArea: string;
  managerName?: string;
}

export interface CategoryItem {
  id: number;
  name: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductItem {
  id: number;
  slug: string;
  name: string;
  categoryId?: number;
  categoryName?: string;
  category?: string;
  description: string;
  basePrice: number;
  price: number;
  imageUrl?: string | null;
  image?: string | null;
  alt?: string;
  kcal?: number | null;
  spicyLevel?: number | null;
  isActive: boolean;
  isAvailable?: boolean | null;
  isSoldOut?: boolean | null;
  isBestSeller?: boolean | null;
  rating?: number | null;
  reviewCount?: number | null;
  options?: {
    id: string;
    name: string;
    required: boolean;
    choices: { id: string; name: string; priceAdjustment: number }[];
  }[];
  toppings?: { id: string; name: string; price: number }[];
  comboItems?: ComboItem['items'];
}

export interface ComboItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  comboPrice: number;
  imageUrl?: string | null;
  startAt?: string;
  endAt?: string;
  isActive: boolean;
  isAvailable?: boolean | null;
  isSoldOut?: boolean | null;
  items: { productId: number; productName: string; quantity: number; optionId?: number }[];
}

function comboAsProduct(combo: ComboItem): ProductItem {
  return {
    id: combo.id,
    slug: combo.slug || `combo-${combo.id}`,
    name: combo.name,
    categoryName: 'Combo',
    category: 'Combo',
    description: combo.description,
    basePrice: combo.comboPrice,
    price: combo.comboPrice,
    imageUrl: combo.imageUrl,
    image: combo.imageUrl,
    alt: combo.name,
    isActive: combo.isActive,
    isAvailable: combo.isAvailable,
    isSoldOut: combo.isSoldOut,
    options: [],
    toppings: [],
    comboItems: combo.items,
  };
}

export const catalogApi = {
  getStores: (activeOnly = false) =>
    request<StoreItem[]>(`/api/stores?activeOnly=${activeOnly}`),
  getStoreById: (id: number) =>
    request<StoreItem>(`/api/stores/${id}`),
  getCategories: (activeOnly = true) =>
    request<CategoryItem[]>(`/api/catalog/categories?activeOnly=${activeOnly}`),
  getProducts: async (params?: { storeId?: number; categoryId?: number; keyword?: string; spicyLevel?: number; activeOnly?: boolean; page?: number; size?: number }): Promise<ProductItem[]> => {
    const query = new URLSearchParams();
    if (params?.storeId) query.set('storeId', String(params.storeId));
    if (params?.categoryId) query.set('categoryId', String(params.categoryId));
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.spicyLevel !== undefined) query.set('spicyLevel', String(params.spicyLevel));
    if (params?.activeOnly !== undefined) query.set('activeOnly', String(params.activeOnly));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.size !== undefined) query.set('size', String(params.size));
    const qs = query.toString();

    const response = await request<ProductItem[] | { content: ProductItem[] }>(`/api/catalog/products${qs ? `?${qs}` : ''}`);
    const products = Array.isArray(response) ? response : response.content;
    if (params?.categoryId !== undefined || params?.page !== undefined || params?.size !== undefined) return products;

    const comboQuery = new URLSearchParams();
    if (params?.storeId) comboQuery.set('storeId', String(params.storeId));
    comboQuery.set('activeOnly', String(params?.activeOnly ?? true));
    const combos = await request<ComboItem[]>(`/api/catalog/combos?${comboQuery.toString()}`);
    const mappedCombos = combos.map(comboAsProduct);
    const keyword = params?.keyword?.toLocaleLowerCase();
    const filteredCombos = keyword
      ? mappedCombos.filter((combo) =>
          `${combo.name} ${combo.description}`.toLocaleLowerCase().includes(keyword)
        )
      : mappedCombos;

    return [...products, ...filteredCombos];
  },
  getProductById: async (id: number, storeId?: number): Promise<ProductItem> => {
    return request<ProductItem>(`/api/catalog/products/${id}${storeId ? `?storeId=${storeId}` : ''}`);
  },
  getComboProductById: async (id: number, storeId?: number): Promise<ProductItem> =>
    comboAsProduct(await request<ComboItem>(`/api/catalog/combos/${id}${storeId ? `?storeId=${storeId}` : ''}`)),
  getCombos: (storeId?: number, activeOnly = true) =>
    request<ComboItem[]>(`/api/catalog/combos?activeOnly=${activeOnly}${storeId ? `&storeId=${storeId}` : ''}`),
  getComboById: (id: number, storeId?: number) =>
    request<ComboItem>(`/api/catalog/combos/${id}${storeId ? `?storeId=${storeId}` : ''}`),
}

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
    return request<{
      points: import("./types/promotion").MemberPoints;
      transactions: import("./types/promotion").PointTransaction[];
    }>("/api/loyalty/me");
  },
};

/* ---------- Reviews ---------- */
export type ReviewStatus = "VISIBLE" | "HIDDEN" | "DELETED";

export interface ReviewReplyDto {
  id: number;
  responderId: number;
  responderRole: string;
  content: string;
  createdAt: string;
}

export interface ReviewDto {
  id: number;
  customerId: number;
  productId: number;
  orderId: number;
  storeId?: number | null;
  rating: number;
  comment: string;
  status: ReviewStatus;
  version?: number;
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
  replies: ReviewReplyDto[];
}

export interface ProductReviewSummaryDto {
  productId: number;
  averageRating: number;
  totalReviews: number;
  reviews: ReviewDto[];
}

export interface CreateReviewPayload {
  orderId: number;
  productId: number;
  rating: number;
  comment: string;
}

export interface UpdateReviewPayload {
  rating: number;
  comment: string;
  version?: number;
}

function withIdempotencyHeaders(idempotencyKey?: string): Record<string, string> | undefined {
  return idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
}

export const reviewApi = {
  getProductReviews: (productId: number) =>
    request<ProductReviewSummaryDto>(`/api/reviews/products/${productId}`),
  getMyReviews: () =>
    request<ReviewDto[]>("/api/reviews/my"),
  create: (payload: CreateReviewPayload, idempotencyKey?: string) =>
    request<ReviewDto>("/api/reviews", {
      method: "POST",
      headers: withIdempotencyHeaders(idempotencyKey),
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: UpdateReviewPayload, idempotencyKey?: string) =>
    request<ReviewDto>(`/api/reviews/${id}`, {
      method: "PUT",
      headers: withIdempotencyHeaders(idempotencyKey),
      body: JSON.stringify(payload),
    }),
  remove: (id: number) =>
    request<void>(`/api/reviews/${id}`, {
      method: "DELETE",
    }),
};

export default request;
