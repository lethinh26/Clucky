import { catalogApi, type BackendOrderItem, type Product, type Combo } from "./api";

export type OrderItemImages = Map<string, string>;

export async function loadOrderItemImages(): Promise<OrderItemImages> {
  const [products, combos] = await Promise.all([
    catalogApi.listProducts().catch(() => [] as Product[]),
    catalogApi.listCombos().catch(() => [] as Combo[]),
  ]);
  const images: OrderItemImages = new Map();
  for (const product of products) {
    if (product.imageUrl) images.set(`PRODUCT:${product.id}`, product.imageUrl);
  }
  for (const combo of combos) {
    if (combo.imageUrl) images.set(`COMBO:${combo.id}`, combo.imageUrl);
  }
  return images;
}

export function orderItemImage(item: BackendOrderItem, images: OrderItemImages): string {
  return images.get(`${item.itemType}:${item.itemType === "COMBO" ? item.comboId : item.productId}`)
    ?? "/images/food-placeholder.svg";
}
