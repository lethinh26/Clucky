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
    id: "prod-001",
    name: "Combo Gà Rán Giòn Cay",
    category: "COMBO",
    price: 89000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    badge: "BÁN CHẠY",
    description: "2 miếng gà giòn cay + 1 khoai vừa + 1 Pepsi",
    optionGroups: [STANDARD_SIZE_GROUP, STANDARD_SPICE_GROUP, STANDARD_DRINK_GROUP, STANDARD_SIDE_GROUP],
  },
  {
    id: "prod-002",
    name: "Khoai Tây Chiên Vừa",
    category: "BURGER_RICE",
    price: 35000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "Khoai tây chiên vàng giòn rụm",
    optionGroups: [
      {
        id: "fries-salt",
        name: "Lượng muối",
        required: true,
        choices: [
          { id: "salt-std", name: "Tiêu chuẩn", extraPrice: 0, isDefault: true },
          { id: "salt-less", name: "Ít muối", extraPrice: 0 },
          { id: "salt-none", name: "Không muối", extraPrice: 0 },
        ],
      },
    ],
  },
  {
    id: "prod-003",
    name: "Gà Rán Hoàng Kim Trứng Muối",
    category: "CHICKEN",
    price: 75000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    badge: "HOT",
    description: "Đẫm sốt trứng muối béo ngậy đặc trưng Clucky",
    optionGroups: [STANDARD_SPICE_GROUP],
  },
  {
    id: "prod-004",
    name: "Cánh Gà Sốt Chua Ngọt",
    category: "CHICKEN",
    price: 50000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "3 cánh gà chiên vàng óng sốt chua ngọt",
    optionGroups: [STANDARD_SPICE_GROUP],
  },
  {
    id: "prod-005",
    name: "Gà Giòn Cay 2 Miếng",
    category: "CHICKEN",
    price: 70000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "2 miếng gà giòn cay nồng chuẩn vị",
    optionGroups: [STANDARD_SPICE_GROUP],
  },
  {
    id: "prod-006",
    name: "Burger Gà Phô Mai Đặc Biệt",
    category: "BURGER_RICE",
    price: 65000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    badge: "MỚI",
    description: "Bánh brioche mềm kẹp ức gà giòn và phô mai cheddar",
    optionGroups: [
      {
        id: "burger-cheese",
        name: "Tùy chọn phô mai",
        required: true,
        choices: [
          { id: "ch-std", name: "1 lát phô mai", extraPrice: 0, isDefault: true },
          { id: "ch-extra", name: "Thêm lát phô mai (+10k)", extraPrice: 10000 },
        ],
      },
      STANDARD_SPICE_GROUP,
    ],
  },
  {
    id: "prod-007",
    name: "Cơm Gà Giòn Sốt Cay",
    category: "BURGER_RICE",
    price: 55000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "Cơm dẻo kèm đùi gà giòn sốt cay và dưa leo",
    optionGroups: [
      {
        id: "rice-opt",
        name: "Lượng cơm",
        required: true,
        choices: [
          { id: "rice-std", name: "Cơm tiêu chuẩn", extraPrice: 0, isDefault: true },
          { id: "rice-more", name: "Cơm thêm (+5k)", extraPrice: 5000 },
        ],
      },
      STANDARD_SPICE_GROUP,
    ],
  },
  {
    id: "prod-008",
    name: "Mì Ý Gà Giòn Sốt Bò Bằm",
    category: "BURGER_RICE",
    price: 69000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "Mì Ý sợi dai kèm gà giòn và sốt Bolognese",
    optionGroups: [STANDARD_SPICE_GROUP],
  },
  {
    id: "prod-009",
    name: "Combo Gia Đình Vui Vẻ",
    category: "COMBO",
    price: 249000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    badge: "TIẾT KIỆM",
    description: "4 miếng gà + 2 burger nhỏ + 1 khoai lớn + 2 nước",
    optionGroups: [STANDARD_SPICE_GROUP, STANDARD_DRINK_GROUP],
  },
  {
    id: "prod-010",
    name: "Combo Đôi Bạn Thân",
    category: "COMBO",
    price: 169000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "2 miếng gà rán + 1 burger + 2 nước ngọt",
    optionGroups: [STANDARD_SPICE_GROUP, STANDARD_DRINK_GROUP],
  },
  {
    id: "prod-011",
    name: "Khoai Tây Lắc Phô Mai",
    category: "BURGER_RICE",
    price: 35000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "Khoai tây giòn lắc đều bột phô mai béo ngậy",
  },
  {
    id: "prod-012",
    name: "Bắp Cải Trộn Coleslaw",
    category: "BURGER_RICE",
    price: 25000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "Rau củ tươi mát cân bằng vị béo",
  },
  {
    id: "prod-013",
    name: "Soup Bắp Gà Xé",
    category: "BURGER_RICE",
    price: 25000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "Soup bắp ngọt thanh thịt gà xé ấm bụng",
  },
  {
    id: "prod-014",
    name: "Kem Sundae Dâu Tây",
    category: "DESSERT_DRINK",
    price: 22000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "Kem vani mịn phủ mứt dâu tây ngọt ngào",
  },
  {
    id: "prod-015",
    name: "Kem Cây Vani Giòn",
    category: "DESSERT_DRINK",
    price: 10000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "Kem ốc quế giòn rụm",
  },
  {
    id: "prod-016",
    name: "Pepsi Tươi Cỡ Lớn",
    category: "DESSERT_DRINK",
    price: 15000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "Pepsi có ga sảng khoái mát lạnh",
  },
  {
    id: "prod-017",
    name: "Trà Đào Cam Sả",
    category: "DESSERT_DRINK",
    price: 35000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    badge: "HOT",
    description: "Trà đào thơm nồng cam sả mát lạnh",
  },
  {
    id: "prod-018",
    name: "Mirinda Cam Lon",
    category: "DESSERT_DRINK",
    price: 15000,
    image: "/images/food-placeholder.svg",
    inStock: true,
    description: "Nước ngọt vị cam sủi bọt",
  },
  {
    id: "prod-019",
    name: "Gà Nướng Tiêu Đen Rừng",
    category: "CHICKEN",
    price: 85000,
    image: "/images/food-placeholder.svg",
    inStock: false, // SOLD OUT TEST CASE
    badge: "HẾT HÀNG",
    description: "Tạm ngưng phục vụ hôm nay do hết nguyên liệu tiêu rừng",
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
