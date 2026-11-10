import type { ProductItem } from "@/lib/api";

export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(5, Math.round(value)));
}

export function isValidReviewComment(comment: string): boolean {
  const length = comment.trim().length;
  return length >= 5 && length <= 1000;
}

export function responderRoleKey(
  role?: string | null,
): "business.reviews.roleStaff" | "business.reviews.roleManager" | "business.reviews.roleAdmin" {
  if (role === "ADMIN") return "business.reviews.roleAdmin";
  if (role === "STORE_MANAGER") return "business.reviews.roleManager";
  return "business.reviews.roleStaff";
}

export function resolveProductHref(
  productId: number,
  product?: ProductItem,
  storeId?: number | null,
): string {
  const slug = product?.slug && /-(\d+)$/.test(product.slug) ? product.slug : `item-${productId}`;
  return `/menu/${slug}${storeId && storeId > 0 ? `?storeId=${storeId}` : ""}`;
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildSubmitSignature(
  mode: "create" | "edit",
  targetId: number,
  rating: number,
  comment: string,
  version?: number,
): string {
  return JSON.stringify([mode, targetId, rating, comment.trim(), version ?? null]);
}
