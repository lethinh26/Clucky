export interface PosProductOptionGroup {
  id: string;
  name: string;
  required?: boolean;
  choices: {
    id: string;
    name: string;
    extraPrice: number;
    isDefault?: boolean;
  }[];
}

export interface PosProduct {
  id: string;
  name: string;
  category: "CHICKEN" | "BURGER_RICE" | "COMBO" | "DESSERT_DRINK";
  price: number;
  image: string;
  inStock: boolean;
  badge?: string;
  description?: string;
  optionGroups?: PosProductOptionGroup[];
}

export interface PosCartItemOption {
  groupId: string;
  groupName: string;
  choiceId: string;
  choiceName: string;
  extraPrice: number;
}

export interface PosCartItem {
  id: string; // unique cart entry ID
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  options: PosCartItemOption[];
  optionsSummary: string;
  lineTotal: number;
  image: string;
  note?: string;
}

export const POS_CATEGORIES = [
  { key: "ALL", label: "Tất cả" },
  { key: "CHICKEN", label: "Gà Rán" },
  { key: "BURGER_RICE", label: "Burger & Cơm" },
  { key: "COMBO", label: "Combo Ưu Đãi" },
  { key: "DESSERT_DRINK", label: "Tráng Miệng & Nước" },
] as const;

export const STANDARD_SPICE_GROUP: PosProductOptionGroup = {
  id: "spice",
  name: "Độ cay",
  required: true,
  choices: [
    { id: "spice-none", name: "Không cay", extraPrice: 0 },
    { id: "spice-medium", name: "Cay vừa", extraPrice: 0, isDefault: true },
    { id: "spice-hot", name: "Cay nhiều", extraPrice: 0 },
  ],
};

export const STANDARD_DRINK_GROUP: PosProductOptionGroup = {
  id: "drink",
  name: "Đổi nước ngọt",
  required: true,
  choices: [
    { id: "drink-pepsi", name: "Pepsi tươi", extraPrice: 0, isDefault: true },
    { id: "drink-7up", name: "7Up Chanh", extraPrice: 0 },
    { id: "drink-mirinda", name: "Mirinda Cam", extraPrice: 0 },
    { id: "drink-peach-tea", name: "Trà Đào Cam Sả", extraPrice: 10000 },
  ],
};

export const STANDARD_SIDE_GROUP: PosProductOptionGroup = {
  id: "side",
  name: "Đổi món phụ",
  required: true,
  choices: [
    { id: "side-fries", name: "Khoai tây chiên", extraPrice: 0, isDefault: true },
    { id: "side-coleslaw", name: "Bắp cải trộn", extraPrice: 0 },
    { id: "side-soup", name: "Soup bắp gà xé", extraPrice: 5000 },
  ],
};

export const STANDARD_SIZE_GROUP: PosProductOptionGroup = {
  id: "size",
  name: "Kích cỡ (Size)",
  required: true,
  choices: [
    { id: "size-reg", name: "Vừa (Tiêu chuẩn)", extraPrice: 0, isDefault: true },
    { id: "size-large", name: "Cỡ Lớn (L)", extraPrice: 10000 },
  ],
};

export const MOCK_POS_PRODUCTS: PosProduct[] = [
  {
    id: "1",
    name: "Gà rán giòn truyền thống",
    category: "CHICKEN",
    price: 89000,
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop&q=80",
    inStock: true,
    badge: "BÁN CHẠY",
    description: "Gà rán giòn truyền thống chuẩn vị Clucky",
    optionGroups: [
      {
        id: "grp-1",
        name: "Kích thước",
        required: true,
        choices: [
          { id: "opt-1", name: "Tiêu chuẩn (Vừa)", extraPrice: 0, isDefault: true },
          { id: "opt-2", name: "Lớn (Thêm 30% thịt)", extraPrice: 20000 },
        ],
      },
      {
        id: "grp-2",
        name: "Mức cay theo yêu cầu",
        required: true,
        choices: [
          { id: "opt-3", name: "Không cay (Ngọt thơm)", extraPrice: 0 },
          { id: "opt-4", name: "Cay vừa (Tiêu chuẩn)", extraPrice: 0, isDefault: true },
          { id: "opt-5", name: "Siêu cay (Ớt Habanero)", extraPrice: 0 },
        ],
      },
    ],
  },
  {
    id: "2",
    name: "Cánh gà cay sốt mật ong",
    category: "CHICKEN",
    price: 99000,
    image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=500&auto=format&fit=crop&q=80",
    inStock: true,
    badge: "HOT",
    description: "Cánh gà chiên giòn thấm đẫm sốt mật ong cay ngọt",
    optionGroups: [
      {
        id: "grp-1",
        name: "Kích thước",
        required: true,
        choices: [
          { id: "opt-6", name: "Tiêu chuẩn (Vừa)", extraPrice: 0, isDefault: true },
          { id: "opt-7", name: "Lớn (Thêm 30% thịt)", extraPrice: 20000 },
        ],
      },
    ],
  },
  {
    id: "3",
    name: "Clucky Crispy Burger",
    category: "BURGER_RICE",
    price: 69000,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
    inStock: true,
    description: "Burger ức gà giòn rụm kèm xà lách và sốt đặc biệt",
    optionGroups: [
      {
        id: "grp-1",
        name: "Loại bánh",
        required: true,
        choices: [
          { id: "opt-8", name: "Brioche bơ Pháp", extraPrice: 0, isDefault: true },
          { id: "opt-9", name: "Vỏ mè truyền thống", extraPrice: 0 },
        ],
      },
    ],
  },
  {
    id: "4",
    name: "Burger phô mai gà tan chảy",
    category: "BURGER_RICE",
    price: 79000,
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
    inStock: true,
    badge: "MỚI",
    description: "Burger gà kẹp phô mai cheddar tan chảy béo ngậy",
  },
  {
    id: "5",
    name: "Khoai tây chiên muối biển",
    category: "DESSERT_DRINK",
    price: 35000,
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80",
    inStock: true,
    description: "Khoai tây chiên vàng giòn rắc muối biển tự nhiên",
  },
  {
    id: "6",
    name: "Trà đào cam sả thanh nhiệt",
    category: "DESSERT_DRINK",
    price: 35000,
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80",
    inStock: true,
    description: "Trà đào thơm nồng cam sả mát lạnh",
    optionGroups: [
      {
        id: "grp-1",
        name: "Độ đá",
        required: true,
        choices: [
          { id: "opt-10", name: "100% đá (Tiêu chuẩn)", extraPrice: 0, isDefault: true },
          { id: "opt-11", name: "50% đá", extraPrice: 0 },
          { id: "opt-12", name: "Không đá", extraPrice: 0 },
        ],
      },
      {
        id: "grp-2",
        name: "Độ ngọt",
        required: true,
        choices: [
          { id: "opt-13", name: "100% đường (Vừa miệng)", extraPrice: 0, isDefault: true },
          { id: "opt-14", name: "50% đường (Ít ngọt)", extraPrice: 0 },
          { id: "opt-15", name: "Không thêm đường", extraPrice: 0 },
        ],
      },
    ],
  },
  {
    id: "combo-1",
    name: "Combo Clucky Classic",
    category: "COMBO",
    price: 109000,
    image: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=500&auto=format&fit=crop&q=80",
    inStock: true,
    badge: "Combo Tiết Kiệm",
    description: "1x Gà rán giòn truyền thống + 1x Khoai tây chiên muối biển",
  },
  {
    id: "combo-2",
    name: "Combo Family Feast",
    category: "COMBO",
    price: 449000,
    image: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=500&auto=format&fit=crop&q=80",
    inStock: true,
    badge: "Combo Tiết Kiệm",
    description: "4x Gà rán giòn truyền thống + 2x Clucky Crispy Burger + 2x Khoai tây chiên",
  },
];

export interface BankTransactionItem {
  id: string;
  bankTxId: string;
  gateway: string;
  accountNumber: string;
  amount: number;
  content: string;
  transactionDate: string;
  referenceCode: string;
  status: "RECONCILED" | "PENDING_RECONCILIATION" | "UNASSIGNED";
  orderCode?: string;
  storeId: string;
  storeName: string;
}

export function createInitialBankTransactions(): BankTransactionItem[] {
  const now = Date.now();
  const m = 60 * 1000;
  const toIso = (offsetMin: number) => new Date(now - offsetMin * m).toISOString();

  return [
    {
      id: "btx-001",
      bankTxId: "MB_TX_98765432",
      gateway: "MBBank",
      accountNumber: "0387654321",
      amount: 249000,
      content: "CLU-20261110-0003 thanh toan don hang",
      transactionDate: toIso(4),
      referenceCode: "FT2611108921",
      status: "RECONCILED",
      orderCode: "CLU-20261110-0003",
      storeId: "1",
      storeName: "Store #01 - Cầu Giấy",
    },
    {
      id: "btx-002",
      bankTxId: "MB_TX_98765433",
      gateway: "MBBank",
      accountNumber: "0387654321",
      amount: 141000,
      content: "CLU-20261110-0011 Dang Quoc Huy chuyen khoan",
      transactionDate: toIso(7),
      referenceCode: "FT2611108922",
      status: "RECONCILED",
      orderCode: "CLU-20261110-0011",
      storeId: "1",
      storeName: "Store #01 - Cầu Giấy",
    },
    {
      id: "btx-003",
      bankTxId: "MB_TX_98765434",
      gateway: "MBBank",
      accountNumber: "0387654321",
      amount: 215000,
      content: "CLU-20261110-0012 Hoang Mai Chi thanh toan",
      transactionDate: toIso(10),
      referenceCode: "FT2611108923",
      status: "RECONCILED",
      orderCode: "CLU-20261110-0012",
      storeId: "1",
      storeName: "Store #01 - Cầu Giấy",
    },
    {
      id: "btx-004",
      bankTxId: "MB_TX_98765435",
      gateway: "MBBank",
      accountNumber: "0387654321",
      amount: 130000,
      content: "CLU-20261110-0002 CK don hang",
      transactionDate: toIso(15),
      referenceCode: "FT2611108924",
      status: "PENDING_RECONCILIATION",
      orderCode: "CLU-20261110-0002",
      storeId: "1",
      storeName: "Store #01 - Cầu Giấy",
    },
    {
      id: "btx-005",
      bankTxId: "MB_TX_98765436",
      gateway: "MBBank",
      accountNumber: "0387654321",
      amount: 188000,
      content: "Khach chuyen tien an trua khong ghi ma",
      transactionDate: toIso(20),
      referenceCode: "FT2611108925",
      status: "UNASSIGNED",
      storeId: "1",
      storeName: "Store #01 - Cầu Giấy",
    },
    {
      id: "btx-006",
      bankTxId: "MB_TX_98765437",
      gateway: "MBBank",
      accountNumber: "0387654321",
      amount: 169000,
      content: "CLU-20261110-0008 thanh toan Clucky",
      transactionDate: toIso(38),
      referenceCode: "FT2611108926",
      status: "RECONCILED",
      orderCode: "CLU-20261110-0008",
      storeId: "1",
      storeName: "Store #01 - Cầu Giấy",
    },
  ];
}
