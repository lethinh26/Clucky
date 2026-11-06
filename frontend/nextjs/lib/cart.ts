import type { CartItem } from "./types/order";
import type { BackendCartDto, CartItemPayload } from "./api";

export function toCartPayload(item: CartItem): CartItemPayload {
  const parseId = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
    if (typeof value === "string" && /^\d+$/.test(value.trim())) {
      const num = parseInt(value.trim(), 10);
      if (Number.isSafeInteger(num) && num > 0) return num;
    }
    return undefined;
  };

  const validId = (value: number | undefined) => Number.isSafeInteger(value) && Number(value) > 0;
  const productId = parseId(item.productId);
  const comboId = parseId(item.comboId);
  const rawOptionIds = item.optionIds ?? [];
  const rawToppingIds = item.toppingIds ?? [];
  const optionIds = rawOptionIds.map((id) => parseId(id) ?? id);
  const toppingIds = rawToppingIds.map((id) => parseId(id) ?? id);

  if ((productId == null) === (comboId == null)
      || !validId(productId ?? comboId)
      || !Number.isSafeInteger(item.quantity) || item.quantity < 1
      || !optionIds.every((id) => validId(id as number)) || !toppingIds.every((id) => validId(id as number))) {
    throw { code: "VALIDATION_ERROR" };
  }
  return {
    productId,
    comboId,
    itemName: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    optionIds: optionIds as number[],
    toppingIds: toppingIds as number[],
    optionsSnapshot: item.optionsSnapshot ?? item.options,
    toppingsSnapshot: item.toppingsSnapshot ?? item.toppings,
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
