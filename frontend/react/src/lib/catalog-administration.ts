import { api, type Product, type Combo, type CatalogCategory, type Store } from './api';

export type AdminProduct = Product & { version: number; imagePublicId?: string | null };
export type ComboItem = Omit<Combo['items'][number], 'optionId'> & { id?: number; optionId?: number | null };
export type AdminCombo = Omit<Combo, 'items'> & { version: number; items: ComboItem[]; imagePublicId?: string | null };
export type AdminCategory = CatalogCategory & { version: number };
export type ComboPayload = Pick<AdminCombo, 'name' | 'description' | 'comboPrice' | 'isActive' | 'startAt' | 'endAt' | 'items'>;
export type CategoryPayload = Pick<AdminCategory, 'name' | 'sortOrder' | 'isActive'>;
export type StoreReadinessStatus = { storeId: number; readiness: NonNullable<Store['accountReadiness']>; error: string };

export const catalogAdministration = {
  async list(signal: AbortSignal) {
    const [products, combos, categories] = await Promise.all([
      api.get<AdminProduct[]>('/api/catalog/products', { params: { activeOnly: false }, signal }),
      api.get<AdminCombo[]>('/api/catalog/combos', { params: { activeOnly: false }, signal }),
      api.get<AdminCategory[]>('/api/catalog/categories', { params: { activeOnly: false }, signal }),
    ]);
    return { products: products.data, combos: combos.data, categories: categories.data };
  },
  saveProduct: (data: Partial<Product>, current?: AdminProduct | null) => current
    ? api.put<AdminProduct>(`/api/catalog/products/${current.id}`, { ...data, expectedVersion: current.version }).then(response => response.data)
    : api.post<AdminProduct>('/api/catalog/products', data).then(response => response.data),
  saveCombo: (data: ComboPayload, current?: AdminCombo | null) => current
    ? api.put<AdminCombo>(`/api/catalog/combos/${current.id}`, { ...data, expectedVersion: current.version }).then(response => response.data)
    : api.post<AdminCombo>('/api/catalog/combos', data).then(response => response.data),
  saveCategory: (data: CategoryPayload, current?: AdminCategory | null) => current
    ? api.put<AdminCategory>(`/api/catalog/categories/${current.id}`, { ...data, imageUrl: current.imageUrl, expectedVersion: current.version }).then(response => response.data)
    : api.post<AdminCategory>('/api/catalog/categories', data).then(response => response.data),
  status: (kind: 'products' | 'combos', current: AdminProduct | AdminCombo, isActive: boolean) =>
    api.put(`/api/catalog/${kind}/${current.id}/status`, { isActive }, { params: { expectedVersion: current.version } }),
  remove: (kind: 'products' | 'combos' | 'categories', current: { id: number; version: number }) =>
    api.delete(`/api/catalog/${kind}/${current.id}`, { params: { expectedVersion: current.version } }),
  async upload<T extends AdminProduct | AdminCombo>(kind: 'products' | 'combos', current: T, file: File, onProgress?: (percent: number) => void) {
    const body = new FormData();
    body.append('file', file);
    return api.post<T>(`/api/catalog/${kind}/${current.id}/image`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { expectedVersion: current.version },
      onUploadProgress: event => { if (event.total) onProgress?.(Math.round(event.loaded / event.total * 100)); },
    }).then(response => response.data);
  },
  updateStore: (store: Store, data: Partial<Store>) =>
    api.put<Store>(`/api/stores/${store.id}`, { ...data, expectedVersion: store.version }).then(response => response.data),
  storeOperation: (store: Store, data: { status: string }) =>
    api.put<Store>(`/api/stores/${store.id}/operation`, { ...data, expectedVersion: store.version }).then(response => response.data),
  storeLocation: (store: Store, point: { latitude: number | null; longitude: number | null }) =>
    api.put<Store>(`/api/stores/${store.id}/location`, { ...point, expectedVersion: store.version }).then(response => response.data),
  deactivateStore: (store: Store) =>
    api.delete<Store>(`/api/stores/${store.id}`, { params: { expectedVersion: store.version } }).then(response => response.data),
  storeReadiness: (storeId: number, signal: AbortSignal) =>
    api.get<StoreReadinessStatus>(`/api/stores/${storeId}/accounts-status`, { signal }).then(response => response.data),
  retryStoreAccounts: (storeId: number) =>
    api.post<StoreReadinessStatus>(`/api/stores/${storeId}/accounts-retry`).then(response => response.data),
};
