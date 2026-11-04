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

/* ---------- Catalog & Stores ---------- */
import type { StoreStatus } from "./types/store";

export interface StoreItem {
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
  getProducts: async (params?: { storeId?: number; categoryId?: number; keyword?: string; spicyLevel?: number; activeOnly?: boolean }): Promise<ProductItem[]> => {
    const query = new URLSearchParams();
    if (params?.storeId) query.set('storeId', String(params.storeId));
    if (params?.categoryId) query.set('categoryId', String(params.categoryId));
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.spicyLevel !== undefined) query.set('spicyLevel', String(params.spicyLevel));
    if (params?.activeOnly !== undefined) query.set('activeOnly', String(params.activeOnly));
    const qs = query.toString();

    const products = await request<ProductItem[]>(`/api/catalog/products${qs ? `?${qs}` : ''}`);
    if (params?.categoryId !== undefined) return products;

    const activeOnly = params?.activeOnly ?? true;
    const combos = await request<ComboItem[]>(`/api/catalog/combos?activeOnly=${activeOnly}`);
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
  getComboProductById: async (id: number): Promise<ProductItem> =>
    comboAsProduct(await request<ComboItem>(`/api/catalog/combos/${id}`)),
  getCombos: (activeOnly = true) =>
    request<ComboItem[]>(`/api/catalog/combos?activeOnly=${activeOnly}`),
  getComboById: (id: number) =>
    request<ComboItem>(`/api/catalog/combos/${id}`),
};

export default request;
