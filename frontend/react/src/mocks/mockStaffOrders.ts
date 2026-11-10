import type { AdminOrderStatus } from "../types/order";

export type OrderSource = "COUNTER" | "WEB";
export type DiningOption = "DINE_IN" | "TAKE_AWAY";
export type PaymentStatus = "PENDING" | "PAID" | "COLLECTED";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "COD" | "SPLIT";

export interface StaffOrderItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  options?: string;
  lineTotal: number;
  image?: string;
  note?: string;
}

export interface StaffOrder {
  id: string;
  orderCode: string;
  queueNumber: number;
  orderSource: OrderSource;
  diningOption: DiningOption;
  customerName: string;
  customerPhone: string;
  storeId: string;
  storeName: string;
  orderType: "PICKUP" | "DELIVERY";
  deliveryAddress?: string;
  status: AdminOrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: StaffOrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  note?: string;
  time: string;
  createdAt: string;
  updatedAt?: string;
  // Phase 2 extension fields:
  printCount?: number;
  cashTendered?: number;
  cashChange?: number;
  bankDeclaredAmount?: number;
  bankReconciledAmount?: number;
  bankRefCode?: string;
  cashierName?: string;
  receiptCode?: string;
  manualAcceptanceReason?: string;
  timeline?: {
    status: AdminOrderStatus;
    title: string;
    description: string;
    time: string;
    actor?: string;
  }[];
}

const DEFAULT_STORE_ID = "1";
const DEFAULT_STORE_NAME = "Store #01 - Cầu Giấy";

/**
 * Tạo danh sách mock orders với mốc thời gian createdAt tính tương đối theo thời điểm gọi,
 * đảm bảo luôn chuẩn xác khi reload trang hoặc kiểm thử thủ công:
 * - 2 đơn PENDING_PAYMENT (1 đơn quầy chưa trả tiền, 1 đơn web chưa chuyển khoản).
 * - 3 đơn CONFIRMED (1 đơn tạo cách đây 1 phút để test chuông, 1 đơn tạo cách đây 12 phút để test cảnh báo SLA >10p, 1 đơn tạo 4 phút trước).
 * - 2 đơn PREPARING (bếp đang nấu, số thứ tự #010, #011).
 * - 2 đơn READY (1 đơn đã PAID online có nút "Bàn giao", 1 đơn PENDING có nút "Đã thu tiền & bàn giao").
 * - 3 đơn COMPLETED (lịch sử ca trực đã giao thành công).
 */
export function createInitialStaffOrders(): StaffOrder[] {
  const now = Date.now();
  const minute = 60 * 1000;

  const toIso = (offsetMinutes: number) =>
    new Date(now - offsetMinutes * minute).toISOString();
  const toTimeString = (offsetMinutes: number) => {
    const d = new Date(now - offsetMinutes * minute);
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`;
  };

  return [
    // === 2 ĐƠN PENDING_PAYMENT ===
    {
      id: "ord-staff-001",
      orderCode: "CLU-20261110-0001",
      queueNumber: 1,
      orderSource: "COUNTER",
      diningOption: "DINE_IN",
      customerName: "Khách vãng lai #1",
      customerPhone: "",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "PENDING_PAYMENT",
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      createdAt: toIso(3),
      time: toTimeString(3),
      subtotal: 124000,
      discount: 0,
      shippingFee: 0,
      total: 124000,
      note: "Lấy thêm 2 gói tương cà và ớt",
      items: [
        {
          id: "item-101",
          itemName: "Combo Gà Rán Giòn Cay",
          quantity: 1,
          unitPrice: 89000,
          options: "Cay vừa · Đổi nước 7Up",
          lineTotal: 89000,
          image: "/images/food-placeholder.svg",
        },
        {
          id: "item-102",
          itemName: "Khoai Tây Chiên Vừa",
          quantity: 1,
          unitPrice: 35000,
          options: "Ít muối",
          lineTotal: 35000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },
    {
      id: "ord-staff-002",
      orderCode: "CLU-20261110-0002",
      queueNumber: 2,
      orderSource: "WEB",
      diningOption: "TAKE_AWAY",
      customerName: "Nguyễn Văn Minh",
      customerPhone: "0988123456",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "PENDING_PAYMENT",
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "PENDING",
      createdAt: toIso(6),
      time: toTimeString(6),
      subtotal: 130000,
      discount: 0,
      shippingFee: 0,
      total: 130000,
      note: "Khách đang quét VietQR thanh toán",
      items: [
        {
          id: "item-103",
          itemName: "Burger Gà Phô Mai Đặc Biệt",
          quantity: 2,
          unitPrice: 65000,
          options: "Thêm lát phô mai · Ít sốt mayonnaise",
          lineTotal: 130000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },

    // === 3 ĐƠN CONFIRMED (1 đơn 1p, 1 đơn 12p SLA, 1 đơn 4p) ===
    {
      id: "ord-staff-003",
      orderCode: "CLU-20261110-0003",
      queueNumber: 3,
      orderSource: "WEB",
      diningOption: "TAKE_AWAY",
      customerName: "Lê Hoàng Yến",
      customerPhone: "0912345678",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "CONFIRMED",
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "PAID",
      createdAt: toIso(1), // 1 phút trước -> test chuông
      time: toTimeString(1),
      subtotal: 249000,
      discount: 0,
      shippingFee: 0,
      total: 249000,
      note: "Giao liền giúp em đang vội, không lấy đá nước ngọt",
      items: [
        {
          id: "item-104",
          itemName: "Combo Gia Đình Vui Vẻ",
          quantity: 1,
          unitPrice: 249000,
          options: "4 miếng giòn cay · 2 Pepsi lon · 1 Khoai lớn",
          lineTotal: 249000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },
    {
      id: "ord-staff-004",
      orderCode: "CLU-20261110-0004",
      queueNumber: 4,
      orderSource: "COUNTER",
      diningOption: "DINE_IN",
      customerName: "Khách bàn số 6",
      customerPhone: "0977889900",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "CONFIRMED",
      paymentMethod: "CASH",
      paymentStatus: "COLLECTED",
      createdAt: toIso(12), // 12 phút trước -> test cảnh báo SLA >10 phút (Viền đỏ)
      time: toTimeString(12),
      subtotal: 185000,
      discount: 0,
      shippingFee: 0,
      total: 185000,
      note: "Khách nhắc đã đợi hơn 10 phút, bếp ưu tiên làm gấp!",
      items: [
        {
          id: "item-105",
          itemName: "Cánh Gà Sốt Chua Ngọt",
          quantity: 3,
          unitPrice: 50000,
          options: "Cay nhiều · Rắc mè rang",
          lineTotal: 150000,
          image: "/images/food-placeholder.svg",
        },
        {
          id: "item-106",
          itemName: "Trà Đào Cam Sả",
          quantity: 1,
          unitPrice: 35000,
          options: "Ít đá · 50% đường",
          lineTotal: 35000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },
    {
      id: "ord-staff-005",
      orderCode: "CLU-20261110-0005",
      queueNumber: 5,
      orderSource: "COUNTER",
      diningOption: "TAKE_AWAY",
      customerName: "Trần Hải Nam",
      customerPhone: "0903112233",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "CONFIRMED",
      paymentMethod: "CASH",
      paymentStatus: "COLLECTED",
      createdAt: toIso(4),
      time: toTimeString(4),
      subtotal: 160000,
      discount: 0,
      shippingFee: 0,
      total: 160000,
      note: "Đóng hộp riêng từng phần cơm",
      items: [
        {
          id: "item-107",
          itemName: "Cơm Gà Giòn Sốt Cay",
          quantity: 2,
          unitPrice: 55000,
          options: "Cơm thêm · Sốt cay đặc biệt",
          lineTotal: 110000,
          image: "/images/food-placeholder.svg",
        },
        {
          id: "item-108",
          itemName: "Soup Bắp Gà Xé",
          quantity: 2,
          unitPrice: 25000,
          options: "Thêm tiêu",
          lineTotal: 50000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },

    // === 2 ĐƠN PREPARING (Bếp đang nấu: #010, #011) ===
    {
      id: "ord-staff-010",
      orderCode: "CLU-20261110-0010",
      queueNumber: 10,
      orderSource: "COUNTER",
      diningOption: "DINE_IN",
      customerName: "Phạm Thanh Thảo",
      customerPhone: "0934567890",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "PREPARING",
      paymentMethod: "CASH",
      paymentStatus: "COLLECTED",
      createdAt: toIso(8),
      time: toTimeString(8),
      subtotal: 163000,
      discount: 0,
      shippingFee: 0,
      total: 163000,
      note: "Bàn 12 lầu 1, bé nhỏ ăn không ớt",
      items: [
        {
          id: "item-109",
          itemName: "Mì Ý Gà Giòn Sốt Bò Bằm",
          quantity: 2,
          unitPrice: 69000,
          options: "Nhiều phô mai bào · Không cay",
          lineTotal: 138000,
          image: "/images/food-placeholder.svg",
        },
        {
          id: "item-110",
          itemName: "Bắp Cải Trộn Coleslaw",
          quantity: 1,
          unitPrice: 25000,
          options: "Chuẩn vị",
          lineTotal: 25000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },
    {
      id: "ord-staff-011",
      orderCode: "CLU-20261110-0011",
      queueNumber: 11,
      orderSource: "WEB",
      diningOption: "TAKE_AWAY",
      customerName: "Đặng Quốc Huy",
      customerPhone: "0945671234",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "PREPARING",
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "PAID",
      createdAt: toIso(3),
      time: toTimeString(3),
      subtotal: 141000,
      discount: 0,
      shippingFee: 0,
      total: 141000,
      note: "Khách hẹn 5 phút nữa ghé lấy quầy mang về",
      items: [
        {
          id: "item-111",
          itemName: "Combo Gà Cay Phô Mai",
          quantity: 1,
          unitPrice: 119000,
          options: "Đổi Pepsi sang Pepsi Zero Calo",
          lineTotal: 119000,
          image: "/images/food-placeholder.svg",
        },
        {
          id: "item-112",
          itemName: "Kem Sundae Dâu Tây",
          quantity: 1,
          unitPrice: 22000,
          options: "Nhiều mứt dâu",
          lineTotal: 22000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },

    // === 2 ĐƠN READY (1 đã PAID có nút "Bàn giao", 1 PENDING có nút "Đã thu tiền & bàn giao") ===
    {
      id: "ord-staff-012",
      orderCode: "CLU-20261110-0012",
      queueNumber: 12,
      orderSource: "WEB",
      diningOption: "TAKE_AWAY",
      customerName: "Hoàng Mai Chi",
      customerPhone: "0918889922",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "READY",
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "PAID",
      createdAt: toIso(7),
      time: toTimeString(7),
      subtotal: 215000,
      discount: 0,
      shippingFee: 0,
      total: 215000,
      note: "Đã có mặt tại quầy đợi nhận món",
      items: [
        {
          id: "item-113",
          itemName: "Gà Rán Hoàng Kim Trứng Muối",
          quantity: 2,
          unitPrice: 75000,
          options: "Sốt đậm vị trứng muối",
          lineTotal: 150000,
          image: "/images/food-placeholder.svg",
        },
        {
          id: "item-114",
          itemName: "Khoai Tây Lắc Phô Mai",
          quantity: 1,
          unitPrice: 35000,
          options: "Lắc đều phô mai",
          lineTotal: 35000,
          image: "/images/food-placeholder.svg",
        },
        {
          id: "item-115",
          itemName: "Mirinda Cam Lon",
          quantity: 2,
          unitPrice: 15000,
          options: "Ướp lạnh không đá",
          lineTotal: 30000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },
    {
      id: "ord-staff-013",
      orderCode: "CLU-20261110-0013",
      queueNumber: 13,
      orderSource: "COUNTER",
      diningOption: "DINE_IN",
      customerName: "Khách vãng lai #2",
      customerPhone: "",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "READY",
      paymentMethod: "CASH",
      paymentStatus: "PENDING",
      createdAt: toIso(9),
      time: toTimeString(9),
      subtotal: 105000,
      discount: 0,
      shippingFee: 0,
      total: 105000,
      note: "Nhắc thu 105.000 đ tiền mặt tại quầy trước khi giao khay thức ăn!",
      items: [
        {
          id: "item-116",
          itemName: "Combo Burger Bò Phô Mai",
          quantity: 1,
          unitPrice: 95000,
          options: "Khoai chiên vừa · Coca lon",
          lineTotal: 95000,
          image: "/images/food-placeholder.svg",
        },
        {
          id: "item-117",
          itemName: "Kem Cây Vani Giòn",
          quantity: 1,
          unitPrice: 10000,
          options: "Lấy khi ăn tráng miệng",
          lineTotal: 10000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },

    // === 3 ĐƠN COMPLETED (Lịch sử ca trực đã giao thành công) ===
    {
      id: "ord-staff-007",
      orderCode: "CLU-20261110-0007",
      queueNumber: 7,
      orderSource: "COUNTER",
      diningOption: "DINE_IN",
      customerName: "Ngô Kiến Huy",
      customerPhone: "0972334455",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "COMPLETED",
      paymentMethod: "CASH",
      paymentStatus: "COLLECTED",
      createdAt: toIso(45),
      time: toTimeString(45),
      subtotal: 100000,
      discount: 0,
      shippingFee: 0,
      total: 100000,
      printCount: 1,
      cashTendered: 100000,
      cashChange: 0,
      cashierName: "Trần Đức Anh",
      receiptCode: "RCP-20261110-0007",
      items: [
        {
          id: "item-118",
          itemName: "Gà Giòn Cay 2 Miếng",
          quantity: 1,
          unitPrice: 70000,
          options: "Cay nồng",
          lineTotal: 70000,
          image: "/images/food-placeholder.svg",
        },
        {
          id: "item-119",
          itemName: "Pepsi Tươi Cỡ Lớn",
          quantity: 2,
          unitPrice: 15000,
          options: "Nhiều đá",
          lineTotal: 30000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },
    {
      id: "ord-staff-008",
      orderCode: "CLU-20261110-0008",
      queueNumber: 8,
      orderSource: "WEB",
      diningOption: "TAKE_AWAY",
      customerName: "Bùi Thị Lan",
      customerPhone: "0989223344",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "COMPLETED",
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "PAID",
      createdAt: toIso(35),
      time: toTimeString(35),
      subtotal: 169000,
      discount: 0,
      shippingFee: 0,
      total: 169000,
      items: [
        {
          id: "item-120",
          itemName: "Combo Đôi Bạn Thân",
          quantity: 1,
          unitPrice: 169000,
          options: "Gà truyền thống · 2 Trà đào túi lọc",
          lineTotal: 169000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },
    {
      id: "ord-staff-009",
      orderCode: "CLU-20261110-0009",
      queueNumber: 9,
      orderSource: "COUNTER",
      diningOption: "TAKE_AWAY",
      customerName: "Vũ Đức Thịnh",
      customerPhone: "0909123789",
      storeId: DEFAULT_STORE_ID,
      storeName: DEFAULT_STORE_NAME,
      orderType: "PICKUP",
      status: "COMPLETED",
      paymentMethod: "CASH",
      paymentStatus: "COLLECTED",
      createdAt: toIso(25),
      time: toTimeString(25),
      subtotal: 70000,
      discount: 0,
      shippingFee: 0,
      total: 70000,
      items: [
        {
          id: "item-121",
          itemName: "Cơm Gà Xối Mỡ",
          quantity: 1,
          unitPrice: 55000,
          options: "Nhiều mỡ hành",
          lineTotal: 55000,
          image: "/images/food-placeholder.svg",
        },
        {
          id: "item-122",
          itemName: "Canh Rong Biển Thịt Bằm",
          quantity: 1,
          unitPrice: 15000,
          options: "Nóng hổi",
          lineTotal: 15000,
          image: "/images/food-placeholder.svg",
        },
      ],
    },
  ];
}

/**
 * Sinh nhanh 1 đơn hàng mới mô phỏng khách vừa đặt qua Web để test chuông báo ngầm
 */
export function generateIncomingMockOrder(existingCount: number): StaffOrder {
  const now = Date.now();
  const queueNum = 15 + existingCount;
  const d = new Date(now);
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;

  return {
    id: `ord-staff-incoming-${now}`,
    orderCode: `CLU-${d.getFullYear()}${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}${String(d.getDate()).padStart(2, "0")}-00${queueNum}`,
    queueNumber: queueNum,
    orderSource: "WEB",
    diningOption: "TAKE_AWAY",
    customerName: `Khách Online #${queueNum}`,
    customerPhone: "0966998877",
    storeId: DEFAULT_STORE_ID,
    storeName: DEFAULT_STORE_NAME,
    orderType: "PICKUP",
    status: "CONFIRMED",
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: "PAID",
    createdAt: new Date(now).toISOString(),
    time: timeStr,
    subtotal: 189000,
    discount: 0,
    shippingFee: 0,
    total: 189000,
    note: "Đơn mới đặt qua web khách chờ lấy",
    items: [
      {
        id: `item-incoming-${now}`,
        itemName: "Combo Gà Giòn Sốt Cay Phô Mai",
        quantity: 1,
        unitPrice: 189000,
        options: "Cay nhiều · 2 Pepsi vừa · 1 Khoai chiên",
        lineTotal: 189000,
        image: "/images/food-placeholder.svg",
      },
    ],
  };
}
