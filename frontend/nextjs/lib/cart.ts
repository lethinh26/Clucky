import type { CartItem } from "./types/order";
import type { BackendCartDto, CartItemPayload } from "./api";

export function toCartPayload(item: CartItem): CartItemPayload {
  const validId = (value: number | undefined) => Number.isSafeInteger(value) && Number(value) > 0;
  const optionIds = item.optionIds ?? [];
  const toppingIds = item.toppingIds ?? [];
  if ((item.productId == null) === (item.comboId == null)
      || !validId(item.productId ?? item.comboId)
      || !Number.isSafeInteger(item.quantity) || item.quantity < 1
      || !optionIds.every(validId) || !toppingIds.every(validId)) {
    throw { code: "VALIDATION_ERROR" };
  }
  return {
    productId: item.productId,
    comboId: item.comboId,
    itemName: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    optionIds,
    toppingIds,
    note: item.note,
  };
}

export function mapBackendCart(cart: BackendCartDto, previous: CartItem[] = []): CartItem[] {
  const ids = (values: number[] = []) => JSON.stringify([...values].sort((first, second) => first - second));
  return cart.items.map((item) => {
    const saved = previous.find((candidate) => candidate.itemKey === item.itemKey
      || ((candidate.productId ?? null) === (item.productId ?? null) && (candidate.comboId ?? null) === (item.comboId ?? null)
        && ids(candidate.optionIds) === ids(item.optionIds)
        && ids(candidate.toppingIds) === ids(item.toppingIds)));
    return {
      ...saved,
      id: item.itemKey,
      itemKey: item.itemKey,
      productId: item.productId ?? undefined,
      comboId: item.comboId ?? undefined,
      itemType: item.productId != null ? "PRODUCT" : "COMBO",
      optionIds: item.optionIds ?? [],
      toppingIds: item.toppingIds ?? [],
      slug: saved?.slug ?? String(item.productId ?? item.comboId),
      name: item.itemName,
      category: saved?.category ?? "",
      basePrice: saved?.basePrice ?? Number(item.unitPrice),
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      image: saved?.image ?? "/images/food-placeholder.svg",
      note: item.note,
    };
  });
}

// Options, toppings and notes distinguish separate portions of the same dish.
export function addCartItem(items: CartItem[], incoming: CartItem): CartItem[] {
  const signature = (item: CartItem) =>
    JSON.stringify([
      item.slug,
      item.unitPrice,
      item.options ?? [],
      item.toppings ?? [],
      item.note?.trim() ?? "",
    ]);
  const existing = items.find(
    (item) => signature(item) === signature(incoming),
  );
  return existing
    ? items.map((item) =>
        item.id === existing.id
          ? { ...item, quantity: item.quantity + incoming.quantity }
          : item,
      )
    : [...items, incoming];
}

export function cartTotals(items: CartItem[]) {
  return items.reduce(
    (total, item) => ({
      count: total.count + item.quantity,
      subtotal: total.subtotal + item.unitPrice * item.quantity,
    }),
    { count: 0, subtotal: 0 },
  );
}
