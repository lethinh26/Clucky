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
  await page.addInitScript((fixture) => {
    const key = "clucky-order-workspace-v1";
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ items: [], orders: [fixture] }));
  }, order);
  await page.route("**/api/orders/**", (route) => {
    if (route.request().method() === "PUT" && new URL(route.request().url()).pathname.endsWith("/cancel")) {
      return route.fulfill({ json: { ...order, id: 901, customerId: 1, storeId: 1, status: "CANCELLED", timeline: [] } });
    }
    return route.fulfill({ status: 503, json: { code: "DEPENDENCY_UNAVAILABLE" } });
  });
}
