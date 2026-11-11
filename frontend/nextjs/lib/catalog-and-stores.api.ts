/**
 * API client and types for Module M2 (Catalog & Store Service).
 *
 * All requests route through the API Gateway.
 */
import { request } from "./api";
import type { StoreStatus } from "./types/store";
import { stores as fallbackStores } from "./products";

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
  isOpenNow?: boolean;
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
  comboItems?: ComboItem["items"];
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

export function comboAsProduct(combo: ComboItem): ProductItem {
  return {
    id: combo.id,
    slug: combo.slug || `combo-${combo.id}`,
    name: combo.name,
    categoryName: "Combo",
    category: "Combo",
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
  getStores: async (activeOnly = false): Promise<StoreItem[]> => {
    try {
      const data = await request<StoreItem[]>(`/api/stores?activeOnly=${activeOnly}`);
      if (Array.isArray(data) && data.length > 0) return data;
      return (fallbackStores as StoreItem[]) || [];
    } catch {
      return (fallbackStores as StoreItem[]) || [];
    }
  },
  getStoreById: (id: number) =>
    request<StoreItem>(`/api/stores/${id}`),
  getCategories: (activeOnly = true) =>
    request<CategoryItem[]>(`/api/catalog/categories?activeOnly=${activeOnly}`),
  getProducts: async (params?: {
    storeId?: number;
    categoryId?: number;
    keyword?: string;
    spicyLevel?: number;
    activeOnly?: boolean;
    page?: number;
    size?: number;
  }): Promise<ProductItem[]> => {
    const query = new URLSearchParams();
    if (params?.storeId) query.set("storeId", String(params.storeId));
    if (params?.categoryId) query.set("categoryId", String(params.categoryId));
    if (params?.keyword) query.set("keyword", params.keyword);
    if (params?.spicyLevel !== undefined) query.set("spicyLevel", String(params.spicyLevel));
    if (params?.activeOnly !== undefined) query.set("activeOnly", String(params.activeOnly));
    if (params?.page !== undefined) query.set("page", String(params.page));
    if (params?.size !== undefined) query.set("size", String(params.size));
    const qs = query.toString();

    const raw = await request<
      ProductItem[] | { content: ProductItem[]; page: number; size: number; totalElements: number; totalPages: number }
    >(`/api/catalog/products${qs ? `?${qs}` : ""}`);
    const products = Array.isArray(raw) ? raw : (raw?.content || []);
    if (params?.categoryId !== undefined) return products;
    if (params?.page !== undefined || params?.size !== undefined) return products;

    const comboQuery = new URLSearchParams();
    if (params?.storeId) comboQuery.set("storeId", String(params.storeId));
    comboQuery.set("activeOnly", String(params?.activeOnly ?? true));
    const combos = await request<ComboItem[]>(`/api/catalog/combos?${comboQuery.toString()}`).catch(() => []);
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
    return request<ProductItem>(`/api/catalog/products/${id}${storeId ? `?storeId=${storeId}` : ""}`);
  },
  getComboProductById: async (id: number, storeId?: number): Promise<ProductItem> =>
    comboAsProduct(await request<ComboItem>(`/api/catalog/combos/${id}${storeId ? `?storeId=${storeId}` : ""}`)),
  getCombos: (storeId?: number, activeOnly = true) =>
    request<ComboItem[]>(`/api/catalog/combos?activeOnly=${activeOnly}${storeId ? `&storeId=${storeId}` : ""}`),
  getComboById: (id: number, storeId?: number) =>
    request<ComboItem>(`/api/catalog/combos/${id}${storeId ? `?storeId=${storeId}` : ""}`),
};
