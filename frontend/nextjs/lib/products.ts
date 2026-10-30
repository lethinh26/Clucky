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
  category?: string; // For compatibility
  description: string;
  basePrice: number;
  price: number; // For compatibility
  imageUrl: string;
  image: string; // For compatibility
  alt: string;
  kcal: number;
  spicyLevel: number; // 0: Không cay, 1: Cay vừa, 2: Cay nồng, 3: Siêu cay
  isActive: boolean;
  isAvailable: boolean;
  isSoldOut: boolean;
  isBestSeller?: boolean;
  rating?: number;
  reviewCount?: number;
  options: ProductOptionGroup[];
  toppings: ProductTopping[];
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

// Common options and toppings for delicious chicken & burgers
const standardSizeOption: ProductOptionGroup = {
  id: 'opt-size',
  name: 'Kích thước',
  required: true,
  choices: [
    { id: 'size-m', name: 'Tiêu chuẩn (Vừa)', priceAdjustment: 0 },
    { id: 'size-l', name: 'Lớn (Thêm 30% thịt)', priceAdjustment: 20000 },
  ],
};

const standardSpicyOption: ProductOptionGroup = {
  id: 'opt-spicy',
  name: 'Mức cay theo yêu cầu',
  required: true,
  choices: [
    { id: 'spicy-0', name: 'Không cay (Ngọt thơm)', priceAdjustment: 0 },
    { id: 'spicy-1', name: 'Cay vừa (Tiêu chuẩn)', priceAdjustment: 0 },
    { id: 'spicy-2', name: 'Siêu cay (Ớt Habanero)', priceAdjustment: 0 },
  ],
};

const standardToppings: ProductTopping[] = [
  { id: 'top-cheese-sauce', name: 'Sốt phô mai cay hảo hạng', price: 15000 },
  { id: 'top-mash-potato', name: 'Khoai tây nghiền sốt gravy', price: 25000 },
  { id: 'top-snow-cheese', name: 'Bột phô mai tuyết phủ giòn', price: 10000 },
  { id: 'top-fried-egg', name: 'Trứng ốp la lòng đào', price: 10000 },
];

export const products: Product[] = [
  {
    id: 1,
    slug: 'ga-ran-truyen-thong',
    name: 'Gà rán giòn truyền thống',
    categoryId: 1,
    categoryName: 'Gà rán',
    description: 'Miếng gà tươi ướp 12 loại gia vị độc quyền, chiên áp suất vàng rụm bên ngoài và mềm mọng nước bên trong.',
    basePrice: 89000,
    price: 89000,
    imageUrl: 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=85',
    image: 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=85',
    alt: 'Gà rán giòn truyền thống Clucky',
    kcal: 520,
    spicyLevel: 1,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 342,
    options: [standardSizeOption, standardSpicyOption],
    toppings: standardToppings,
  },
  {
    id: 2,
    slug: 'ga-cay-mat-ong',
    name: 'Cánh gà cay sốt mật ong',
    categoryId: 1,
    categoryName: 'Gà rán',
    description: 'Cánh gà chiên giòn áo đều lớp sốt cay dịu quyện mật ong rừng thơm lừng, rắc mè rang thơm bùi.',
    basePrice: 99000,
    price: 99000,
    imageUrl: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=900&q=85',
    image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=900&q=85',
    alt: 'Cánh gà cay sốt mật ong Clucky',
    kcal: 460,
    spicyLevel: 2,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 215,
    options: [standardSizeOption, standardSpicyOption],
    toppings: standardToppings,
  },
  {
    id: 3,
    slug: 'burger-ga-gion',
    name: 'Clucky Crispy Burger',
    categoryId: 2,
    categoryName: 'Burger',
    description: 'Bánh mì brioche mềm xốp, kẹp ức gà chiên giòn rụm cỡ lớn, bắp cải tím, dưa leo chua và xốt mayonnaise truffle.',
    basePrice: 69000,
    price: 69000,
    imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=900&q=85',
    image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=900&q=85',
    alt: 'Clucky Crispy Burger',
    kcal: 610,
    spicyLevel: 1,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 184,
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
      standardSpicyOption,
    ],
    toppings: standardToppings,
  },
  {
    id: 4,
    slug: 'burger-pho-mai-ga',
    name: 'Burger phô mai gà tan chảy',
    categoryId: 2,
    categoryName: 'Burger',
    description: 'Ức gà phi lê chiên vàng giòn phủ đôi lát phô mai Cheddar béo ngậy kèm sốt phô mai ấm nồng.',
    basePrice: 79000,
    price: 79000,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
    alt: 'Burger phô mai gà tan chảy',
    kcal: 650,
    spicyLevel: 0,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    rating: 4.7,
    reviewCount: 96,
    options: [standardSizeOption, standardSpicyOption],
    toppings: standardToppings,
  },
  {
    id: 5,
    slug: 'combo-clucky',
    name: 'Combo Clucky Classic',
    categoryId: 3,
    categoryName: 'Combo',
    description: '1 Miếng đùi gà giòn tan + 1 Phần khoai tây chiên giòn vàng + 1 Ly Coca-Cola mát lạnh. Trọn vẹn năng lượng.',
    basePrice: 129000,
    price: 129000,
    imageUrl: 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=900&q=85',
    image: 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=900&q=85',
    alt: 'Combo Clucky Classic',
    kcal: 850,
    spicyLevel: 1,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    isBestSeller: true,
    rating: 5.0,
    reviewCount: 520,
    options: [standardSizeOption, standardSpicyOption],
    toppings: standardToppings,
  },
  {
    id: 6,
    slug: 'combo-hai-nguoi',
    name: 'Combo Family Feast (2 - 3 người)',
    categoryId: 3,
    categoryName: 'Combo',
    description: '3 Miếng gà giòn lớn + 1 Clucky Crispy Burger + 1 Khoai tây lắc rong biển + 2 Nước ngọt tự chọn.',
    basePrice: 219000,
    price: 219000,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85',
    alt: 'Combo Family Feast 2-3 người',
    kcal: 1280,
    spicyLevel: 1,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    rating: 4.9,
    reviewCount: 168,
    options: [standardSpicyOption],
    toppings: standardToppings,
  },
  {
    id: 7,
    slug: 'khoai-tay-chien-gion',
    name: 'Khoai tây chiên muối biển',
    categoryId: 4,
    categoryName: 'Món phụ',
    description: 'Khoai tây nhập khẩu cắt bản lớn, chiên vàng ươm giòn rụm bên ngoài và mềm bùi bên trong.',
    basePrice: 35000,
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=900&q=85',
    image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=900&q=85',
    alt: 'Khoai tây chiên muối biển Clucky',
    kcal: 320,
    spicyLevel: 0,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    rating: 4.8,
    reviewCount: 88,
    options: [standardSizeOption],
    toppings: [
      { id: 'top-seaweed', name: 'Bột rong biển lắc', price: 8000 },
      { id: 'top-snow-cheese', name: 'Bột phô mai tuyết', price: 10000 },
      { id: 'top-cheese-sauce', name: 'Sốt phô mai cay', price: 15000 },
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
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=85',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=85',
    alt: 'Trà đào cam sả Clucky',
    kcal: 180,
    spicyLevel: 0,
    isActive: true,
    isAvailable: true,
    isSoldOut: false,
    rating: 4.9,
    reviewCount: 140,
    options: [
      {
        id: 'opt-ice',
        name: 'Độ đá',
        required: true,
        choices: [
          { id: 'ice-100', name: '100% đá (Tiêu chuẩn)', priceAdjustment: 0 },
          { id: 'ice-50', name: '50% đá', priceAdjustment: 0 },
          { id: 'ice-0', name: 'Không đá', priceAdjustment: 0 },
        ],
      },
      {
        id: 'opt-sweet',
        name: 'Độ ngọt',
        required: true,
        choices: [
          { id: 'sweet-100', name: '100% đường (Vừa miệng)', priceAdjustment: 0 },
          { id: 'sweet-50', name: '50% đường (Ít ngọt)', priceAdjustment: 0 },
          { id: 'sweet-0', name: 'Không thêm đường', priceAdjustment: 0 },
        ],
      },
    ],
    toppings: [
      { id: 'top-peach-slice', name: 'Thêm 2 lát đào giòn', price: 12000 },
      { id: 'top-chia-seed', name: 'Hạt chia organic', price: 8000 },
    ],
  },
  {
    id: 9,
    slug: 'ga-sot-cay-habanero',
    name: 'Gà sốt cay lửa Habanero (Tạm hết)',
    categoryId: 1,
    categoryName: 'Gà rán',
    description: 'Dành riêng cho tín đồ ăn cay cực hạn. Sốt ớt Habanero cay bùng nổ nhưng hậu vị đậm đà khó cưỡng.',
    basePrice: 105000,
    price: 105000,
    imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=900&q=85',
    image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=900&q=85',
    alt: 'Gà sốt cay lửa Habanero',
    kcal: 540,
    spicyLevel: 2,
    isActive: true,
    isAvailable: false,
    isSoldOut: true,
    rating: 4.6,
    reviewCount: 75,
    options: [standardSizeOption, standardSpicyOption],
    toppings: standardToppings,
  },
];

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

export const inventoryItems: InventoryItem[] = [
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
    isSoldOut: false, // Low stock warning (< 12)
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
    isSoldOut: false, // Low stock warning
    updatedAt: '2026-10-27 12:45:00',
    updatedBy: 'Trần Quốc Bảo (Staff)',
  },
  {
    storeId: 1,
    productId: 5,
    productName: 'Combo Clucky Classic',
    categoryName: 'Combo',
    imageUrl: 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 35,
    lowStockThreshold: 10,
    isSoldOut: false,
    updatedAt: '2026-10-27 11:00:00',
    updatedBy: 'Trần Quốc Bảo (Staff)',
  },
  {
    storeId: 1,
    productId: 9,
    productName: 'Gà sốt cay lửa Habanero (Tạm hết)',
    categoryName: 'Gà rán',
    imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=200&q=80',
    quantityAvailable: 0,
    lowStockThreshold: 10,
    isSoldOut: true, // Marked sold out in shift
    updatedAt: '2026-10-27 13:00:00',
    updatedBy: 'Nguyễn Minh Anh (Store Manager)',
  },
];

// Ensure category backward compatibility
products.forEach((p) => {
  p.category = p.categoryName;
});

export const formatPrice = (price: number): string => {
  return `${new Intl.NumberFormat('vi-VN').format(price)}đ`;
};

export const getProduct = (slug: string): Product | undefined => {
  const exact = products.find((product) => product.slug === slug);
  if (exact) return exact;
  if (slug.startsWith('combo-')) {
    const comboId = Number(slug.replace('combo-', ''));
    if (!isNaN(comboId)) {
      const foundCombo = products.find((p) => p.categoryId === 3 && (p.id === comboId || p.slug === slug));
      if (foundCombo) return foundCombo;
    }
    return undefined;
  }
  const match = slug.match(/-(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    const foundById = products.find((p) => p.id === id);
    if (foundById) return foundById;
  }
  return undefined;
};

export const getProductById = (id: number): Product | undefined => {
  return products.find((product) => product.id === id);
};

export const categories = [
  { id: 0, name: 'Tất cả' },
  { id: 1, name: 'Gà rán' },
  { id: 2, name: 'Burger' },
  { id: 3, name: 'Combo' },
  { id: 4, name: 'Món phụ' },
  { id: 5, name: 'Đồ uống' },
];
