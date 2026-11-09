import type { Page } from "@playwright/test";
import type { Order } from "../../lib/types/order";

export async function seedOrder(page: Page) {
  const order: Order = {
    id: "901", orderCode: "CLU-20261028-TEST", storeId: "1", storeName: "Clucky",
    type: "DELIVERY", status: "CONFIRMED", paymentMethod: "BANK_TRANSFER", paymentStatus: "PAID",
    subtotal: 242000, discountAmount: 0, pointsUsed: 0, pointsAmount: 0, shippingFee: 20000, totalAmount: 262000,
    receiverName: "Trần Đức Anh", receiverPhone: "0900000000", deliveryAddress: "Hà Nội",
    note: "Giao lên tầng 3 phòng lab giúp em", createdAt: "2026-10-28T10:15:00+07:00",
    items: [{ id: "1", itemName: "Chicken", itemType: "PRODUCT", unitPrice: 242000, quantity: 1,
      lineTotal: 242000, image: "/images/food-placeholder.svg" }],
    timeline: [{ status: "CONFIRMED", title: "Confirmed", description: "", done: false, current: true,
      time: "2026-10-28T10:15:00+07:00" }],
  };
  await page.route("**/api/auth/session", route => route.fulfill({ json: {
    userId: 1, role: "CUSTOMER", fullName: "Customer", email: "customer@example.com",
  } }));
  await page.route("**/api/cart", route => route.fulfill({ json: { items: [] } }));
  await page.route("**/api/orders/**", (route) => {
    const backendOrder = { ...order, id: 901, customerId: 1, storeId: 1, timeline: [] };
    if (route.request().method() === "PUT" && new URL(route.request().url()).pathname.endsWith("/cancel")) {
      order.status = "CANCELLED";
      return route.fulfill({ json: { ...backendOrder, status: "CANCELLED" } });
    }
    if (new URL(route.request().url()).pathname === "/api/orders/my") return route.fulfill({ json: { content: [backendOrder] } });
    return route.fulfill({ json: backendOrder });
  });
  return order;
}
