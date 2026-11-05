import type { ProductItem } from './api';
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

// Retained for non-M2 demo flows; catalog and store pages must use the API.
export const stores: Store[] = [
  {
    id: 1,
    name: 'Clucky Lê Lợi (Flagship Store)',
    address: '128 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    phone: '028 7300 1234',
    openTime: '09:00',
    closeTime: '22:30',
    status: 'OPEN',
    deliveryArea: 'Quận 1, Quận 3, Quận 4, Bình Thạnh (bán kính 5km)',
    managerName: 'Nguyễn Minh Anh',
  },
  {
    id: 2,
    name: 'Clucky Phan Văn Trị',
    address: '245 Phan Văn Trị, Phường 11, Quận Gò Vấp, TP. Hồ Chí Minh',
    district: 'Gò Vấp',
    city: 'TP. Hồ Chí Minh',
    phone: '028 7300 5678',
    openTime: '09:00',
    closeTime: '22:00',
    status: 'OPEN',
    deliveryArea: 'Gò Vấp, Bình Thạnh, Phú Nhuận, Quận 12',
    managerName: 'Trần Gia Huy',
  },
  {
    id: 3,
    name: 'Clucky Nguyễn Trãi',
    address: '192 Nguyễn Trãi, Phường 3, Quận 5, TP. Hồ Chí Minh',
    district: 'Quận 5',
    city: 'TP. Hồ Chí Minh',
    phone: '028 7300 9012',
    openTime: '10:00',
    closeTime: '23:00',
    status: 'OPEN',
    deliveryArea: 'Quận 5, Quận 10, Quận 11, Quận 6 (bán kính 6km)',
    managerName: 'Lê Hoàng Nam',
  },
  {
    id: 4,
    name: 'Clucky Lê Văn Việt (Thủ Đức)',
    address: '88 Lê Văn Việt, Phường Hiệp Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
    district: 'Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    phone: '028 7300 3456',
    openTime: '10:00',
    closeTime: '22:00',
    status: 'OPEN',
    deliveryArea: 'Khu công nghệ cao, Làng Đại học, TP. Thủ Đức, Quận 9',
    managerName: 'Phạm Thuỳ Linh',
  },
  {
    id: 5,
    name: 'Clucky Landmark 81 (Tạm đóng bảo trì)',
    address: 'Tầng B1, TTTM Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh',
    district: 'Bình Thạnh',
    city: 'TP. Hồ Chí Minh',
    phone: '028 7300 7890',
    openTime: '09:30',
    closeTime: '22:00',
    status: 'CLOSED_TEMP',
    deliveryArea: 'Vinhomes Central Park, Bình Thạnh, Thảo Điền TP. Thủ Đức',
    managerName: 'Vũ Quốc Khánh',
  },
];
