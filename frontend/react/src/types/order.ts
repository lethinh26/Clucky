export type AdminOrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SHIPPING"
  | "COMPLETED"
  | "CANCELLED";

export type AdminPaymentMethod = "COD" | "BANK_TRANSFER";
export type AdminPaymentStatus = "PENDING" | "PAID" | "FAILED";

export interface AdminOrderItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  options?: string;
  lineTotal: number;
  image?: string;
  note?: string;
}

export interface AdminOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  storeId: string;
  storeName: string;
  orderType: "DELIVERY" | "PICKUP";
  deliveryAddress?: string;
  status: AdminOrderStatus;
  paymentMethod: AdminPaymentMethod;
  paymentStatus: AdminPaymentStatus;
  items: AdminOrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  note?: string;
  time: string;
  createdAt: string;
  hasRefundRequest?: boolean;
  refundReason?: string;
  refundAmount?: number;
  refundStatus?: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";
  updatedAt?: string;
  timeline?: {
    status: AdminOrderStatus;
    title: string;
    description: string;
    time: string;
    actor?: string;
  }[];
}
