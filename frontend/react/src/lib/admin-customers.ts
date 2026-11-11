import { api, type BackendOrder, type PageResponse } from './api';

export type CustomerStatus = 'ACTIVE' | 'LOCKED';

export interface AdminCustomer {
  id: number;
  fullName: string;
  maskedEmail: string | null;
  maskedPhone: string | null;
  status: CustomerStatus;
  createdAt: string;
}

export const adminCustomersApi = {
  list: (params: { keyword?: string; status?: CustomerStatus; page: number; size: number }, signal?: AbortSignal) =>
    api.get<PageResponse<AdminCustomer>>('/api/users/customers', { params, signal }).then(response => response.data),
  setLocked: (customer: AdminCustomer, locked: boolean, reason: string) =>
    api.put<AdminCustomer>(`/api/users/customers/${customer.id}/${locked ? 'lock' : 'unlock'}`, {
      reason: reason.trim(), expectedStatus: customer.status,
    }).then(response => response.data),
  orders: async (customerId: number, page: number, size: number, signal?: AbortSignal) => {
    const { data } = await api.get<PageResponse<BackendOrder>>('/api/orders', {
      params: { customerId, page, size }, signal,
    });
    if (!Array.isArray(data?.content) || data.content.some(order => order.customerId !== customerId)
      || data.page !== page || data.size !== size || !Number.isSafeInteger(data.totalElements) || data.totalElements < 0) {
      throw { code: 'UPSTREAM_ERROR' };
    }
    return data;
  },
  order: async (customerId: number, orderId: number, signal?: AbortSignal) => {
    const { data } = await api.get<BackendOrder>(`/api/orders/${orderId}`, { signal });
    if (data.customerId !== customerId || data.id !== orderId) throw { code: 'UPSTREAM_ERROR' };
    return data;
  },
};
