import { catalogApi, type ProductItem, type StoreItem } from './api';
import type { Store as StoreModel, StoreStatus, StoreStatusMeta } from './types/store';

export type Product = ProductItem;
export type Store = StoreModel;
export type { StoreStatus, StoreStatusMeta };

export {
  STORE_STATUSES,
  STORE_STATUS_META,
  isStoreStatus,
  normalizeStoreStatus,
  getStoreStatusMeta,
} from './types/store';

// Dynamic runtime store cache populated via catalogApi.getStores(...)
export const stores: Store[] = [];

export async function fetchStoresFromApi(activeOnly = false): Promise<StoreItem[]> {
  const data = await catalogApi.getStores(activeOnly);
  if (Array.isArray(data)) {
    stores.splice(0, stores.length, ...(data as Store[]));
    return data;
  }
  return [];
}
