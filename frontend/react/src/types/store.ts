export const STORE_STATUSES = ['OPEN', 'CLOSED_TEMP', 'INACTIVE'] as const;

export type StoreStatus = (typeof STORE_STATUSES)[number];

export interface StoreStatusMeta {
  key: StoreStatus;
  label: string;
  badgeLabel: string;
  description: string;
  isOpen: boolean;
  canOrder: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeStatus: 'success' | 'warning' | 'error';
  actionText: string;
}

export const STORE_STATUS_META: Record<StoreStatus, StoreStatusMeta> = {
  OPEN: {
    key: 'OPEN',
    label: 'Mở cửa',
    badgeLabel: '● Đang mở cửa',
    description: 'Chi nhánh đang phục vụ bình thường',
    isOpen: true,
    canOrder: true,
    color: '#1E7A46',
    bgColor: '#EAF6EE',
    borderColor: '#A7F3D0',
    badgeStatus: 'success',
    actionText: 'Đặt món tại đây',
  },
  CLOSED_TEMP: {
    key: 'CLOSED_TEMP',
    label: 'Tạm đóng',
    badgeLabel: '○ Tạm đóng cửa',
    description: 'Chi nhánh tạm dừng phục vụ trong thời gian ngắn',
    isOpen: false,
    canOrder: false,
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    badgeStatus: 'warning',
    actionText: 'Tạm ngưng phục vụ',
  },
  INACTIVE: {
    key: 'INACTIVE',
    label: 'Ngừng bán',
    badgeLabel: '✕ Ngừng bán',
    description: 'Chi nhánh ngừng hoạt động hoặc ngừng nhận đơn',
    isOpen: false,
    canOrder: false,
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
    badgeStatus: 'error',
    actionText: 'Ngừng hoạt động',
  },
};

export function isStoreStatus(value: unknown): value is StoreStatus {
  return typeof value === 'string' && STORE_STATUSES.includes(value as StoreStatus);
}

export function normalizeStoreStatus(status?: string | null): StoreStatus {
  if (!status) return 'OPEN';
  const upper = status.trim().toUpperCase();
  if (upper === 'ACTIVE' || upper === 'OPEN') return 'OPEN';
  if (upper === 'CLOSED_TEMP') return 'CLOSED_TEMP';
  if (upper === 'INACTIVE') return 'INACTIVE';
  return 'INACTIVE';
}

export function getStoreStatusMeta(status?: string | null): StoreStatusMeta {
  return STORE_STATUS_META[normalizeStoreStatus(status)];
}

export interface Store {
  id: number;
  name: string;
  address: string;
  district: string;
  city: string;
  phone: string;
  openTime: string;
  closeTime: string;
  status: StoreStatus;
  deliveryArea: string;
  managerId?: number;
  managerName?: string;
}
