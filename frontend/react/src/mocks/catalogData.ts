export interface ProductOptionChoice {
  id: string;
  name: string;
  priceAdjustment: number;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  required: boolean;
  choices: ProductOptionChoice[];
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
  imageUrl: string;
  kcal: number;
  spicyLevel: number; // 0, 1, 2, 3
  isActive: boolean;
  isAvailable: boolean;
  isSoldOut: boolean;
  isBestSeller?: boolean;
  options: ProductOptionGroup[];
  toppings: ProductTopping[];
}

export interface ComboItem {
  productId: number;
  productName: string;
  quantity: number;
}

export interface Combo {
  id: number;
  name: string;
  slug: string;
  description: string;
  comboPrice: number;
  imageUrl: string;
  startAt: string;
  endAt?: string;
  isActive: boolean;
  items: ComboItem[];
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
  status: 'OPEN' | 'CLOSED_TEMP' | 'INACTIVE';
  deliveryArea: string;
  managerId?: number;
  managerName?: string;
}

export interface InventoryItem {
  storeId: number;
  productId: number;
  productName: string;
  categoryName: string;
  imageUrl: string;
  quantityAvailable: number;
  lowStockThreshold: number;
  isSoldOut: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface StoreManager {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  assignedStoreId?: number;
}

export interface MockUser {
  id: number;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'STORE_MANAGER' | 'STAFF';
  storeId?: number;
  storeName?: string;
}

export const mockManagers: StoreManager[] = [
  { id: 1, fullName: 'Nguyễn Minh Anh', email: 'manager.d1@clucky.local', phone: '0901000002', assignedStoreId: 1 },
  { id: 2, fullName: 'Trần Gia Huy', email: 'manager.govap@clucky.local', phone: '0901000006', assignedStoreId: 2 },
  { id: 3, fullName: 'Lê Hoàng Nam', email: 'manager.d5@clucky.local', phone: '0901000007', assignedStoreId: 3 },
  { id: 4, fullName: 'Phạm Thuỳ Linh', email: 'manager.thuduc@clucky.local', phone: '0901000008', assignedStoreId: 4 },
];

export const mockUsers: Record<string, MockUser> = {
  ADMIN: {
    id: 1,
    fullName: 'Lê Phú Thịnh',
    email: 'admin@clucky.local',
    role: 'ADMIN',
  },
  STORE_MANAGER: {
    id: 2,
    fullName: 'Nguyễn Minh Anh',
    email: 'manager.d1@clucky.local',
    role: 'STORE_MANAGER',
    storeId: 1,
    storeName: 'Clucky Lê Lợi (Q.1)',
  },
  STAFF: {
    id: 3,
    fullName: 'Trần Quốc Bảo',
    email: 'staff.d1@clucky.local',
    role: 'STAFF',
    storeId: 1,
    storeName: 'Clucky Lê Lợi (Q.1)',
  },
};

export const mockProducts: Product[] = [
  {
    id: 1,
    slug: 'ga-ran-truyen-thong',
    name: 'Gà rán giòn truyền thống',
    categoryId: 1,
    categoryName: 'Gà rán',
    description: 'Miếng gà tươi ướp 12 loại gia vị độc quyền, chiên áp suất vàng rụm bên ngoài và mềm mọng nước bên trong.',
    basePrice: 89000,
    imageUrl: 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=600&q=80',
    kcal: 520,
    spicyLevel: 1,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    isBestSeller: true,
    options: [
      {
        id: 'opt-size',
        name: 'Kích thước',
        required: true,
        choices: [
          { id: 'size-m', name: 'Tiêu chuẩn (Vừa)', priceAdjustment: 0 },
          { id: 'size-l', name: 'Lớn (+30% thịt)', priceAdjustment: 20000 },
        ],
      },
    ],
    toppings: [
      { id: 'top-cheese-sauce', name: 'Sốt phô mai cay hảo hạng', price: 15000 },
      { id: 'top-mash-potato', name: 'Khoai tây nghiền sốt gravy', price: 25000 },
      { id: 'top-snow-cheese', name: 'Bột phô mai tuyết phủ giòn', price: 10000 },
    ],
  },
  {
    id: 2,
    slug: 'ga-cay-mat-ong',
    name: 'Cánh gà cay sốt mật ong',
    categoryId: 1,
    categoryName: 'Gà rán',
    description: 'Cánh gà chiên giòn áo đều lớp sốt cay dịu quyện mật ong rừng thơm lừng, rắc mè rang thơm bùi.',
    basePrice: 99000,
    imageUrl: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=600&q=80',
    kcal: 460,
    spicyLevel: 2,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    isBestSeller: true,
    options: [
      {
        id: 'opt-size',
        name: 'Kích thước',
        required: true,
        choices: [
          { id: 'size-m', name: 'Tiêu chuẩn (4 cánh)', priceAdjustment: 0 },
          { id: 'size-l', name: 'Lớn (6 cánh)', priceAdjustment: 35000 },
        ],
      },
    ],
    toppings: [
      { id: 'top-cheese-sauce', name: 'Sốt phô mai cay hảo hạng', price: 15000 },
    ],
  },
  {
    id: 3,
    slug: 'burger-ga-gion',
    name: 'Clucky Crispy Burger',
    categoryId: 2,
    categoryName: 'Burger',
    description: 'Bánh mì brioche mềm xốp, kẹp ức gà chiên giòn rụm cỡ lớn, bắp cải tím, dưa leo chua và xốt mayonnaise truffle.',
    basePrice: 69000,
    imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80',
    kcal: 610,
    spicyLevel: 1,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    isBestSeller: true,
    options: [
      {
        id: 'opt-bread',
        name: 'Loại bánh',
        required: true,
        choices: [
          { id: 'bread-brioche', name: 'Brioche bơ Pháp', priceAdjustment: 0 },
          { id: 'bread-sesame', name: 'Vỏ mè truyền thống', priceAdjustment: 0 },
        ],
      },
    ],
    toppings: [
      { id: 'top-fried-egg', name: 'Trứng ốp la lòng đào', price: 10000 },
      { id: 'top-snow-cheese', name: 'Thêm phô mai lát', price: 10000 },
    ],
  },
  {
    id: 4,
    slug: 'burger-pho-mai-ga',
    name: 'Burger phô mai gà tan chảy',
    categoryId: 2,
    categoryName: 'Burger',
    description: 'Ức gà phi lê chiên vàng giòn phủ đôi lát phô mai Cheddar béo ngậy kèm sốt phô mai ấm nồng.',
    basePrice: 79000,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    kcal: 650,
    spicyLevel: 0,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    options: [],
    toppings: [],
  },
  {
    id: 7,
    slug: 'khoai-tay-chien-gion',
    name: 'Khoai tây chiên muối biển',
    categoryId: 4,
    categoryName: 'Món phụ',
    description: 'Khoai tây nhập khẩu cắt bản lớn, chiên vàng ươm giòn rụm bên ngoài và mềm bùi bên trong.',
    basePrice: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
    kcal: 320,
    spicyLevel: 0,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    options: [],
    toppings: [
      { id: 'top-seaweed', name: 'Bột rong biển lắc', price: 8000 },
      { id: 'top-snow-cheese', name: 'Bột phô mai tuyết', price: 10000 },
    ],
  },
  {
    id: 8,
    slug: 'tra-dao-cam-sa',
    name: 'Trà đào cam sả thanh nhiệt',
    categoryId: 5,
    categoryName: 'Đồ uống',
    description: 'Trà ô long thượng hạng ủ lạnh, kết hợp tinh chất cam tươi, sả đập dập thơm mát và miếng đào giòn ngọt.',
    basePrice: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=600&q=80',
    kcal: 180,
    spicyLevel: 0,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    options: [],
    toppings: [],
  },
];

export const mockCombos: Combo[] = [
  {
    id: 1,
    name: 'Combo Clucky Classic',
    slug: 'combo-clucky-classic',
    description: 'Gà rán giòn, khoai tây chiên muối biển và ly nước ngọt thanh mát.',
    comboPrice: 129000,
    imageUrl: 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=600&q=80',
    startAt: '2026-10-01',
    isActive: true,
    items: [
      { productId: 1, productName: 'Gà rán giòn truyền thống', quantity: 1 },
      { productId: 7, productName: 'Khoai tây chiên muối biển', quantity: 1 },
      { productId: 8, productName: 'Trà đào cam sả thanh nhiệt', quantity: 1 },
    ],
  },
  {
    id: 2,
    name: 'Combo Family Feast (2 - 3 người)',
    slug: 'combo-family-feast',
    description: 'Phần ăn gia đình giòn tan gồm gà rán, burger hảo hạng, khoai tây và đồ uống.',
    comboPrice: 219000,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
    startAt: '2026-10-01',
    isActive: true,
    items: [
      { productId: 1, productName: 'Gà rán giòn truyền thống', quantity: 2 },
      { productId: 3, productName: 'Clucky Crispy Burger', quantity: 1 },
      { productId: 7, productName: 'Khoai tây chiên muối biển', quantity: 1 },
      { productId: 8, productName: 'Trà đào cam sả thanh nhiệt', quantity: 2 },
    ],
  },
];

export const mockStores: Store[] = [
  {
    id: 1,
    name: 'Clucky Lê Lợi (Flagship Store)',
    address: '128 Lê Lợi, Phường Bến Nghé, Quận 1',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    phone: '028 7300 1234',
    openTime: '09:00',
    closeTime: '22:30',
    status: 'OPEN',
    deliveryArea: 'Quận 1, Quận 3, Quận 4, Bình Thạnh (bán kính 5km)',
    managerId: 1,
    managerName: 'Nguyễn Minh Anh',
  },
  {
    id: 2,
    name: 'Clucky Phan Văn Trị',
    address: '245 Phan Văn Trị, Phường 11, Quận Gò Vấp',
    district: 'Gò Vấp',
    city: 'TP. Hồ Chí Minh',
    phone: '028 7300 5678',
    openTime: '09:00',
    closeTime: '22:00',
    status: 'OPEN',
    deliveryArea: 'Gò Vấp, Bình Thạnh, Phú Nhuận, Quận 12',
    managerId: 2,
    managerName: 'Trần Gia Huy',
  },
  {
    id: 3,
    name: 'Clucky Nguyễn Trãi',
    address: '192 Nguyễn Trãi, Phường 3, Quận 5',
    district: 'Quận 5',
    city: 'TP. Hồ Chí Minh',
    phone: '028 7300 9012',
    openTime: '10:00',
    closeTime: '23:00',
    status: 'OPEN',
    deliveryArea: 'Quận 5, Quận 10, Quận 11, Quận 6 (bán kính 6km)',
    managerId: 3,
    managerName: 'Lê Hoàng Nam',
  },
  {
    id: 4,
    name: 'Clucky Lê Văn Việt (Thủ Đức)',
    address: '88 Lê Văn Việt, Phường Hiệp Phú, TP. Thủ Đức',
    district: 'Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    phone: '028 7300 3456',
    openTime: '10:00',
    closeTime: '22:00',
    status: 'OPEN',
    deliveryArea: 'Khu công nghệ cao, Làng Đại học, TP. Thủ Đức, Quận 9',
    managerId: 4,
    managerName: 'Phạm Thuỳ Linh',
  },
  {
    id: 5,
    name: 'Clucky Landmark 81 (Tạm đóng)',
    address: 'Tầng B1, TTTM Landmark 81, 720A Điện Biên Phủ, Bình Thạnh',
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

export const mockInventory: InventoryItem[] = [
  {
    storeId: 1,
    productId: 1,
    productName: 'Gà rán giòn truyền thống',
    categoryName: 'Gà rán',
    imageUrl: 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 48,
    lowStockThreshold: 15,
    isSoldOut: false,
    updatedAt: '2026-10-27 11:30:00',
    updatedBy: 'Trần Quốc Bảo (Staff)',
  },
  {
    storeId: 1,
    productId: 2,
    productName: 'Cánh gà cay sốt mật ong',
    categoryName: 'Gà rán',
    imageUrl: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 9,
    lowStockThreshold: 12,
    isSoldOut: false, // Low stock!
    updatedAt: '2026-10-27 12:15:00',
    updatedBy: 'Trần Quốc Bảo (Staff)',
  },
  {
    storeId: 1,
    productId: 3,
    productName: 'Clucky Crispy Burger',
    categoryName: 'Burger',
    imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 24,
    lowStockThreshold: 10,
    isSoldOut: false,
    updatedAt: '2026-10-27 10:00:00',
    updatedBy: 'Nguyễn Minh Anh (Store Manager)',
  },
  {
    storeId: 1,
    productId: 4,
    productName: 'Burger phô mai gà tan chảy',
    categoryName: 'Burger',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 5,
    lowStockThreshold: 8,
    isSoldOut: false, // Low stock!
    updatedAt: '2026-10-27 12:45:00',
    updatedBy: 'Trần Quốc Bảo (Staff)',
  },
  {
    storeId: 1,
    productId: 7,
    productName: 'Khoai tây chiên muối biển',
    categoryName: 'Món phụ',
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 35,
    lowStockThreshold: 10,
    isSoldOut: false,
    updatedAt: '2026-10-27 11:00:00',
    updatedBy: 'Trần Quốc Bảo (Staff)',
  },
  {
    storeId: 1,
    productId: 8,
    productName: 'Trà đào cam sả thanh nhiệt',
    categoryName: 'Đồ uống',
    imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 60,
    lowStockThreshold: 15,
    isSoldOut: false,
    updatedAt: '2026-10-27 09:30:00',
    updatedBy: 'Trần Quốc Bảo (Staff)',
  },
  {
    storeId: 2,
    productId: 1,
    productName: 'Gà rán giòn truyền thống',
    categoryName: 'Gà rán',
    imageUrl: 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 30,
    lowStockThreshold: 10,
    isSoldOut: false,
    updatedAt: '2026-10-27 10:15:00',
    updatedBy: 'Trần Gia Huy (Store Manager)',
  },
  {
    storeId: 2,
    productId: 2,
    productName: 'Cánh gà cay sốt mật ong',
    categoryName: 'Gà rán',
    imageUrl: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 0,
    lowStockThreshold: 10,
    isSoldOut: true,
    updatedAt: '2026-10-27 11:45:00',
    updatedBy: 'Trần Gia Huy (Store Manager)',
  },
  {
    storeId: 2,
    productId: 3,
    productName: 'Clucky Crispy Burger',
    categoryName: 'Burger',
    imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 15,
    lowStockThreshold: 8,
    isSoldOut: false,
    updatedAt: '2026-10-27 09:00:00',
    updatedBy: 'Trần Gia Huy (Store Manager)',
  },
];

export const formatVND = (price: number): string => {
  return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
};
