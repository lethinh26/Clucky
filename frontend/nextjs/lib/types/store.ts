export const STORE_STATUSES = ['OPEN', 'CLOSED_TEMP', 'INACTIVE'] as const;

export type StoreStatus = (typeof STORE_STATUSES)[number];

export interface StoreStatusMeta {
  key: StoreStatus;
  badgeStatus: 'success' | 'warning' | 'error';
  color: string;
  bgColor: string;
  borderColor: string;
  isOpen: boolean;
  canOrder: boolean;
}

export const STORE_STATUS_META: Record<StoreStatus, StoreStatusMeta> = {
  OPEN: {
    key: 'OPEN',
    badgeStatus: 'success',
    color: '#1E7A46',
    bgColor: '#EAF6EE',
    borderColor: '#A7F3D0',
    isOpen: true,
    canOrder: true,
  },
  CLOSED_TEMP: {
    key: 'CLOSED_TEMP',
    badgeStatus: 'warning',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
    isOpen: false,
    canOrder: false,
  },
  INACTIVE: {
    key: 'INACTIVE',
    badgeStatus: 'error',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
    isOpen: false,
    canOrder: false,
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
  managerName?: string;
  isOpenNow?: boolean;
}
