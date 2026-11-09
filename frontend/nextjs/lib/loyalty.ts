import request from "./api";

export type LoyaltyPolicy = {
  version: number; spendPerPoint: number; pointValue: number;
  silverThreshold: number; goldThreshold: number; silverDiscount: number; goldDiscount: number;
};
export type LoyaltyOverview = {
  points: { customerId: number; totalPoints: number; availablePoints: number; reservedPoints: number; lifetimePoints: number; tier: "MEMBER" | "SILVER" | "GOLD" };
  policy: LoyaltyPolicy;
  transactions: { id: number; orderId: number | null; change: number; balanceAfter: number; type: string; reason: string | null; createdAt: string }[];
  page: number; size: number; totalElements: number;
};
export const loyaltyApi = {
  policy: () => request<LoyaltyPolicy>("/api/loyalty/policy"),
  me: (page = 0, type = "ALL") => request<LoyaltyOverview>(`/api/loyalty/me?page=${page}&size=10&type=${encodeURIComponent(type)}`),
};
