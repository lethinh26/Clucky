import { api, type BackendOrder, type PageResponse } from './api';

export async function getDashboardOrders(storeId?: number, signal?: AbortSignal) {
  const pages = await Promise.all([undefined, 'CONFIRMED', 'PREPARING', 'READY'].map(async (status) => {
    const { data } = await api.get<PageResponse<BackendOrder>>('/api/orders', {
      params: { storeId, status, page: 0, size: status ? 1 : 5 }, signal,
    });
    if (!Array.isArray(data.content) || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0) {
      throw { code: 'UPSTREAM_ERROR' };
    }
    return data;
  }));
  return {
    recent: pages[0].content,
    activeKitchenCount: pages.slice(1).reduce((total, page) => total + page.totalElements, 0),
  };
}
