export type AdminOrderStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SHIPPING"
  | "COMPLETED"
  | "CANCELLED";

export type AdminPaymentMethod = "COD" | "BANK_TRANSFER";
// SRS 5.3: chuyển khoản UNPAID → PENDING → PAID/EXPIRED/MISMATCH; COD UNPAID → COLLECTED; hoàn PAID → REFUND_PENDING → REFUNDED.
export type AdminPaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "MISMATCH"
  | "COLLECTED"
  | "REFUND_PENDING"
  | "REFUNDED";

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
