import type { CartItem, CartItemOption, CartItemTopping } from "./types/order";
import {
  catalogApi,
  type CartItemPayload,
  type ProductItem,
  type StoreItem,
} from "./api";
import { stores } from "./products";

interface CatalogProductMeta {
  id: number;
  slug: string;
  name: string;
  image: string;
  defaultOptionIds: number[];
}

interface CatalogComboMeta {
  id: number;
  slug: string;
  name: string;
  image: string;
}

interface CatalogOptionMeta {
  id: number;
  productId: number;
  groupName: string;
  name: string;
  extraPrice: number;
}

interface CatalogToppingMeta {
  id: number;
  productId: number;
  name: string;
  extraPrice: number;
}

// Runtime catalog cache populated dynamically from Backend API (/api/catalog/* & /api/stores)
const runtimeProducts = new Map<number, CatalogProductMeta>();
const runtimeCombos = new Map<number, CatalogComboMeta>();
let runtimeOptions: CatalogOptionMeta[] = [];
let runtimeToppings: CatalogToppingMeta[] = [];
const runtimeStores = new Map<number, StoreItem>();
let catalogLoadPromise: Promise<{
  products: ProductItem[];
  stores: StoreItem[];
}> | null = null;

export function parseCatalogNumericId(raw: unknown): number | undefined {
  if (typeof raw === "number") {
    return Number.isSafeInteger(raw) && raw > 0 ? raw : undefined;
  }
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const prefixed = trimmed.match(/^(?:opt|top|prod|product|combo)-(\d+)$/i);
  if (prefixed) {
    const n = Number(prefixed[1]);
    return Number.isSafeInteger(n) && n > 0 ? n : undefined;
  }
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isSafeInteger(n) && n > 0 ? n : undefined;
  }
  const trailing = trimmed.match(/-(\d+)$/);
  if (trailing) {
    const n = Number(trailing[1]);
    return Number.isSafeInteger(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

export function syncCatalogMetadata(
  productsList: ProductItem[],
  storeList?: StoreItem[],
): void {
  if (Array.isArray(productsList) && productsList.length > 0) {
    const nextOptions: CatalogOptionMeta[] = [];
    const nextToppings: CatalogToppingMeta[] = [];

    for (const item of productsList) {
      if (!item || typeof item.id !== "number") continue;
      const isCombo =
        (item.categoryName ?? item.category ?? "").toLowerCase() === "combo" ||
        (Array.isArray(item.comboItems) && item.comboItems.length > 0) ||
        (typeof item.slug === "string" && item.slug.startsWith("combo-"));

      const image =
        item.imageUrl || item.image || "/images/food-placeholder.svg";

      if (isCombo) {
        runtimeCombos.set(item.id, {
          id: item.id,
          slug: item.slug || `combo-${item.id}`,
          name: item.name,
          image,
        });
        continue;
      }

      const defaultOptionIds: number[] = [];
      if (Array.isArray(item.options)) {
        for (const group of item.options) {
          if (!group || !Array.isArray(group.choices)) continue;
          for (const choice of group.choices) {
            const optId = parseCatalogNumericId(choice.id);
            if (optId !== undefined) {
              nextOptions.push({
                id: optId,
                productId: item.id,
                groupName: group.name,
                name: choice.name,
                extraPrice: Number(choice.priceAdjustment) || 0,
              });
            }
          }
          if (group.required !== false && group.choices.length > 0) {
            const defaultChoice =
              group.choices.find(
                (c) => (Number(c.priceAdjustment) || 0) === 0,
              ) ?? group.choices[0];
            const defId = parseCatalogNumericId(defaultChoice?.id);
            if (defId !== undefined) {
              defaultOptionIds.push(defId);
            }
          }
        }
      }

      if (Array.isArray(item.toppings)) {
        for (const top of item.toppings) {
          const topId = parseCatalogNumericId(top.id);
          if (topId !== undefined) {
            nextToppings.push({
              id: topId,
              productId: item.id,
              name: top.name,
              extraPrice: Number(top.price) || 0,
            });
          }
        }
      }

      runtimeProducts.set(item.id, {
        id: item.id,
        slug: item.slug || String(item.id),
        name: item.name,
        image,
        defaultOptionIds,
      });
    }

    runtimeOptions = nextOptions;
    runtimeToppings = nextToppings;
  }

  if (Array.isArray(storeList) && storeList.length > 0) {
    for (const st of storeList) {
      if (st && typeof st.id === "number") {
        runtimeStores.set(st.id, st);
      }
    }
    stores.splice(0, stores.length, ...(storeList as typeof stores));
  }
}

export async function loadCatalogMetadataFromApi(
  force = false,
): Promise<{ products: ProductItem[]; stores: StoreItem[] }> {
  if (
    !force &&
    runtimeProducts.size > 0 &&
    runtimeStores.size > 0
  ) {
    return {
      products: [],
      stores: Array.from(runtimeStores.values()),
    };
  }
  if (!force && catalogLoadPromise) {
    return catalogLoadPromise;
  }

  catalogLoadPromise = Promise.all([
    catalogApi.getProducts({ activeOnly: true }).catch(() => [] as ProductItem[]),
    catalogApi.getStores(false).catch(() => [] as StoreItem[]),
  ])
    .then(([prods, storeList]) => {
      syncCatalogMetadata(prods, storeList);
      return { products: prods, stores: storeList };
    })
    .finally(() => {
      catalogLoadPromise = null;
    });

  return catalogLoadPromise;
}

export function resolveStoreName(storeId?: number | string): string {
  const numericId = Number(storeId);
  if (Number.isSafeInteger(numericId) && numericId > 0) {
    const fromRuntime = runtimeStores.get(numericId);
    if (fromRuntime?.name) return fromRuntime.name;
    const fromShared = stores.find((s) => s.id === numericId);
    if (fromShared?.name) return fromShared.name;
    return `Clucky #${numericId}`;
  }
  return "Clucky";
}

export function resolveCatalogImage(
  productId?: number,
  comboId?: number,
  itemName?: string,
  currentImage?: string,
): string {
  if (
    currentImage &&
    currentImage !== "/images/food-placeholder.svg" &&
    currentImage.trim() !== ""
  ) {
    return currentImage;
  }
  if (comboId && runtimeCombos.has(comboId)) {
    return runtimeCombos.get(comboId)!.image;
  }
  if (productId && runtimeProducts.has(productId)) {
    return runtimeProducts.get(productId)!.image;
  }
  if (itemName) {
    const lower = itemName.trim().toLowerCase();
    for (const c of runtimeCombos.values()) {
      if (c.name.toLowerCase() === lower) return c.image;
    }
    for (const p of runtimeProducts.values()) {
      if (p.name.toLowerCase() === lower) return p.image;
    }
  }
  return currentImage || "/images/food-placeholder.svg";
}

export function normalizeOptionsSnapshot(
  raw: unknown,
  productId?: number,
): CartItemOption[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const result: CartItemOption[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === "object" && "name" in entry) {
      const obj = entry as Record<string, unknown>;
      if (typeof obj.name === "string" && obj.name.trim()) {
        result.push({
          groupName:
            typeof obj.groupName === "string" ? obj.groupName : "Tùy chọn",
          name: obj.name,
          extraPrice: Number(obj.extraPrice) || 0,
        });
      }
    } else {
      const id = parseCatalogNumericId(entry);
      if (id !== undefined) {
        const meta = runtimeOptions.find(
          (o) => o.id === id && (!productId || o.productId === productId),
        );
        if (meta) {
          result.push({
            groupName: meta.groupName,
            name: meta.name,
            extraPrice: meta.extraPrice,
          });
        }
      }
    }
  }
  return result.length > 0 ? result : undefined;
}

export function normalizeToppingsSnapshot(
  raw: unknown,
  productId?: number,
): CartItemTopping[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const result: CartItemTopping[] = [];
  for (const entry of raw) {
    if (entry && typeof entry === "object" && "name" in entry) {
      const obj = entry as Record<string, unknown>;
      if (typeof obj.name === "string" && obj.name.trim()) {
        result.push({
          name: obj.name,
          extraPrice: Number(obj.extraPrice) || 0,
        });
      }
    } else {
      const id = parseCatalogNumericId(entry);
      if (id !== undefined) {
        const meta = runtimeToppings.find(
          (t) => t.id === id && (!productId || t.productId === productId),
        );
        if (meta) {
          result.push({
            name: meta.name,
            extraPrice: meta.extraPrice,
          });
        }
      }
    }
  }
  return result.length > 0 ? result : undefined;
}

export function resolveItemCatalogIds(item: {
  id?: string;
  slug?: string;
  name?: string;
  category?: string;
  itemType?: "PRODUCT" | "COMBO";
  productId?: number;
  comboId?: number;
  optionIds?: number[];
  toppingIds?: number[];
  options?: CartItemOption[];
  toppings?: CartItemTopping[];
}): {
  itemType: "PRODUCT" | "COMBO";
  productId?: number;
  comboId?: number;
  optionIds: number[];
  toppingIds: number[];
} {
  const lowerName = (item.name || "").trim().toLowerCase();
  const lowerSlug = (item.slug || "").trim().toLowerCase();
  const lowerCat = (item.category || "").trim().toLowerCase();

  const isCombo =
    item.itemType === "COMBO" ||
    (typeof item.comboId === "number" && item.comboId > 0) ||
    lowerSlug.startsWith("combo-") ||
    lowerCat === "combo" ||
    lowerName.startsWith("combo ");

  let comboId =
    typeof item.comboId === "number" && item.comboId > 0
      ? item.comboId
      : undefined;
  let productId =
    typeof item.productId === "number" && item.productId > 0
      ? item.productId
      : undefined;

  if (isCombo) {
    if (!comboId) {
      comboId =
        parseCatalogNumericId(item.slug) ?? parseCatalogNumericId(item.id);
    }
    if (!comboId) {
      for (const meta of runtimeCombos.values()) {
        if (
          meta.name.toLowerCase() === lowerName ||
          meta.slug.toLowerCase() === lowerSlug
        ) {
          comboId = meta.id;
          break;
        }
      }
    }
    return {
      itemType: "COMBO",
      productId: undefined,
      comboId,
      optionIds: [],
      toppingIds: [],
    };
  }

  if (!productId) {
    for (const meta of runtimeProducts.values()) {
      if (
        meta.name.toLowerCase() === lowerName ||
        (lowerSlug && meta.slug.toLowerCase() === lowerSlug)
      ) {
        productId = meta.id;
        break;
      }
    }
  }
  if (!productId) {
    productId =
      parseCatalogNumericId(item.slug) ?? parseCatalogNumericId(item.id);
  }

  const validProductOptions = productId
    ? runtimeOptions.filter((o) => o.productId === productId)
    : [];
  const chosenByGroup = new Map<string, number>();

  if (Array.isArray(item.optionIds)) {
    for (const rawId of item.optionIds) {
      const id = parseCatalogNumericId(rawId);
      if (id !== undefined) {
        const meta = validProductOptions.find((o) => o.id === id);
        if (meta && !chosenByGroup.has(meta.groupName)) {
          chosenByGroup.set(meta.groupName, meta.id);
        } else if (validProductOptions.length === 0) {
          chosenByGroup.set(`raw-${id}`, id);
        }
      }
    }
  }

  if (Array.isArray(item.options)) {
    for (const opt of item.options) {
      if (!opt || typeof opt.name !== "string") continue;
      const optNameLower = opt.name.trim().toLowerCase();
      const groupLower = (opt.groupName || "").trim().toLowerCase();
      const match =
        validProductOptions.find(
          (o) =>
            o.name.toLowerCase() === optNameLower &&
            (!groupLower || o.groupName.toLowerCase() === groupLower),
        ) ||
        validProductOptions.find((o) => o.name.toLowerCase() === optNameLower);
      if (match && !chosenByGroup.has(match.groupName)) {
        chosenByGroup.set(match.groupName, match.id);
      }
    }
  }

  // Ensure every required option group for this product has a valid optionId from API metadata
  const prodMeta = productId ? runtimeProducts.get(productId) : undefined;
  if (prodMeta) {
    for (const defaultId of prodMeta.defaultOptionIds) {
      const meta = validProductOptions.find((o) => o.id === defaultId);
      if (meta && !chosenByGroup.has(meta.groupName)) {
        chosenByGroup.set(meta.groupName, meta.id);
      }
    }
  }

  const optionIds = Array.from(chosenByGroup.values());

  const validProductToppings = productId
    ? runtimeToppings.filter((t) => t.productId === productId)
    : [];
  const toppingIdSet = new Set<number>();

  if (Array.isArray(item.toppingIds)) {
    for (const rawId of item.toppingIds) {
      const id = parseCatalogNumericId(rawId);
      if (id !== undefined) {
        if (
          validProductToppings.length === 0 ||
          validProductToppings.some((t) => t.id === id)
        ) {
          toppingIdSet.add(id);
        }
      }
    }
  }

  if (Array.isArray(item.toppings)) {
    for (const top of item.toppings) {
      if (!top || typeof top.name !== "string") continue;
      const topNameLower = top.name.trim().toLowerCase();
      const match = validProductToppings.find(
        (t) => t.name.toLowerCase() === topNameLower,
      );
      if (match) {
        toppingIdSet.add(match.id);
      }
    }
  }

  return {
    itemType: "PRODUCT",
    productId,
    comboId: undefined,
    optionIds,
    toppingIds: Array.from(toppingIdSet),
  };
}

export function normalizeCartItem(item: CartItem): CartItem {
  const resolved = resolveItemCatalogIds(item);
  const normalizedOptions =
    normalizeOptionsSnapshot(item.options, resolved.productId) ??
    normalizeOptionsSnapshot(resolved.optionIds, resolved.productId);
  const normalizedToppings =
    normalizeToppingsSnapshot(item.toppings, resolved.productId) ??
    normalizeToppingsSnapshot(resolved.toppingIds, resolved.productId);

  return {
    ...item,
    itemType: resolved.itemType,
    productId: resolved.productId ?? item.productId,
    comboId: resolved.comboId ?? item.comboId,
    optionIds: resolved.optionIds,
    toppingIds: resolved.toppingIds,
    options: normalizedOptions,
    toppings: normalizedToppings,
    image: resolveCatalogImage(
      resolved.productId ?? item.productId,
      resolved.comboId ?? item.comboId,
      item.name,
      item.image,
    ),
  };
}

export function toCartItemPayload(item: CartItem): CartItemPayload {
  const normalized = normalizeCartItem(item);
  return {
    productId:
      normalized.itemType === "PRODUCT" ? normalized.productId : undefined,
    comboId: normalized.itemType === "COMBO" ? normalized.comboId : undefined,
    itemName: normalized.name,
    unitPrice: normalized.unitPrice,
    quantity: normalized.quantity,
    optionIds: normalized.optionIds,
    toppingIds: normalized.toppingIds,
    optionsSnapshot: normalized.options,
    toppingsSnapshot: normalized.toppings,
    note: normalized.note,
  };
}

// Options, toppings and notes distinguish separate portions of the same dish.
export function addCartItem(items: CartItem[], incoming: CartItem): CartItem[] {
  const normalizedIncoming = normalizeCartItem(incoming);
  const signature = (item: CartItem) =>
    JSON.stringify([
      item.slug,
      item.unitPrice,
      item.options ?? [],
      item.toppings ?? [],
      item.note?.trim() ?? "",
    ]);
  const existing = items.find(
    (item) => signature(item) === signature(normalizedIncoming),
  );
  return existing
    ? items.map((item) =>
        item.id === existing.id
          ? { ...item, quantity: item.quantity + normalizedIncoming.quantity }
          : item,
      )
    : [...items, normalizedIncoming];
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
