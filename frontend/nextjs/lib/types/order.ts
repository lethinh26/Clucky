export type OrderType = "DELIVERY" | "PICKUP";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SHIPPING"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentMethod = "COD" | "BANK_TRANSFER";

// SRS 5.3 — dùng chung enum với Payment Service.
export type PaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "MISMATCH"
  | "COLLECTED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type RefundStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";

export type PartyOrderStatus =
  | "NEW"
  | "CONTACTED"
  | "QUOTED"
  | "CONFIRMED"
  | "CLOSED";

export interface CartItemOption {
  groupName: string;
  name: string;
  extraPrice: number;
}

export interface CartItemTopping {
  name: string;
  extraPrice: number;
}

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  image: string;
  options?: CartItemOption[];
  toppings?: CartItemTopping[];
  note?: string;
}

export interface OrderItem {
  id: string;
  slug?: string;
  itemName: string;
  itemType: "PRODUCT" | "COMBO";
  unitPrice: number;
  quantity: number;
  image: string;
  optionsSnapshot?: CartItemOption[];
  toppingsSnapshot?: CartItemTopping[];
  note?: string;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderCode: string;
  storeId: string;
  storeName: string;
  type: OrderType;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  voucherCode?: string;
  pointsUsed: number;
  pointsAmount: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  receiverName: string;
  receiverPhone: string;
  deliveryAddress?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  refundStatus?: RefundStatus;
  items: OrderItem[];
  timeline: {
    status: OrderStatus;
    title: string;
    description: string;
    time?: string;
    done: boolean;
    current: boolean;
  }[];
}

export interface PartyOrderRequest {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  expectedDate: string;
  expectedTime: string;
  guestCount: number;
  storeId: string;
  storeName: string;
  notes: string;
  comboChoice?: string;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
