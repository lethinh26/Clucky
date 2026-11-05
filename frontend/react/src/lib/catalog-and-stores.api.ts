/**
 * API client and types for Module M2 (Catalog & Store Service) in React Admin/Staff app.
 *
 * All requests route through the API Gateway via the shared Axios client.
 */
import { api } from './api';
import type { StoreStatus } from '../types/store';

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
  updateAvailability: (storeId: number, productId: number, data: { isAvailable?: boolean; isSoldOut?: boolean; storePrice?: number | null; clearStorePrice?: boolean }) =>
    api.put(`/api/stores/${storeId}/products/${productId}/availability`, data).then((r) => r.data),
};
