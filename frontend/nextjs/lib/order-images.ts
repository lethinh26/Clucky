import type { Order } from "./types/order";
import type { ProductItem } from "./api";

export function fillOrderImages(orders: Order[], products: ProductItem[]): Order[] {
  const images = new Map(products.map(product => [
    `${product.comboItems !== undefined ? "COMBO" : "PRODUCT"}:${product.id}`,
    product.imageUrl || product.image,
  ]));
  return orders.map(order => {
    let changed = false;
    const items = order.items.map(item => {
      if (item.image && item.image !== "/images/food-placeholder.svg") return item;
      const image = images.get(`${item.itemType}:${item.itemType === "COMBO" ? item.comboId : item.productId}`);
      if (!image) return item;
      changed = true;
      return { ...item, image };
    });
    return changed ? { ...order, items } : order;
  });
}
