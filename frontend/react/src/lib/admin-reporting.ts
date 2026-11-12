import { api, type BackendOrder, type PageResponse } from './api';

export async function getDashboardOrders(storeId?: number, signal?: AbortSignal) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const pages = await Promise.all([undefined, 'CONFIRMED', 'PREPARING', 'READY', 'TODAY'].map(async (status) => {
    const { data } = await api.get<PageResponse<BackendOrder>>('/api/orders', {
      params: { storeId, status: status === 'TODAY' ? undefined : status, date: status === 'TODAY' ? today : undefined, page: 0, size: status ? 1 : 5 }, signal,
    });
    if (!Array.isArray(data.content) || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0) {
      throw { code: 'UPSTREAM_ERROR' };
    }
    return data;
  }));
  return {
    recent: pages[0].content,
    activeKitchenCount: pages.slice(1, 4).reduce((total, page) => total + page.totalElements, 0),
    todayOrderCount: pages[4].totalElements,
  };
}
