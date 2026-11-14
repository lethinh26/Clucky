export type OrderType = "DELIVERY" | "PICKUP";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SHIPPING"
  | "COMPLETED"
  | "CANCELLED"
  | "DELIVERY_FAILED";

export type PaymentMethod = "COD" | "BANK_TRANSFER";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "COLLECTED" | "REFUNDED" | "UNKNOWN";

export type ShipmentStatus =
  "CREATED" | "ASSIGNED" | "PICKED_UP" | "SHIPPING" | "DELIVERED" | "FAILED";

export type RefundStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | "PROCESSING" | "WAITING_BANK_DETAILS";


export interface CartItemOption {
  id?: number;
  groupName: string;
  name: string;
  extraPrice: number;
}

export interface CartItemTopping {
  id?: number;
  name: string;
  extraPrice: number;
}

export interface CartItem {
  id: string;
  productId?: number;
  comboId?: number;
  itemType?: "PRODUCT" | "COMBO";
  itemKey?: string;
  storeId?: number;
  slug: string;
  name: string;
  category: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  image: string;
  optionIds?: number[];
  toppingIds?: number[];
  options?: CartItemOption[];
  toppings?: CartItemTopping[];
  optionsSnapshot?: any;
  toppingsSnapshot?: any;
  note?: string;
}

export interface OrderItem {
  id: string;
  productId?: number;
  comboId?: number;
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
  storeAddress?: string;
  type: OrderType;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  voucherCode?: string;
  pointsUsed: number;
  pointsAmount: number;
  shippingFee: number;
  shipmentStatus?: ShipmentStatus;
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
  refundData?: any;
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
