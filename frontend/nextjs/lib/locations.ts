import request from "./api";
import type { Coordinates } from "./geo";
export { coordinates, distanceKm, type Coordinates } from "./geo";
export type Place = Coordinates & { featureType?: string; accuracy?: string; label: string; detail: string; province: string; district: string; ward: string };
export type Address = {
  id?: number; receiverName: string; phone: string; province: string; district: string; ward: string;
  detail: string; isDefault: boolean; latitude: number | null; longitude: number | null;
};
export type Profile = { fullName: string; email: string | null; phone: string; emailVerified?: boolean; phoneVerified?: boolean };
export const emptyAddress: Address = { receiverName: "", phone: "", province: "", district: "", ward: "", detail: "", isDefault: false, latitude: null, longitude: null };

export function formatAddress(address: Address) {
  return [address.detail, address.ward, address.district, address.province].filter(Boolean).join(", ");
}
export const locationApi = {
  search: (text: string, lang: string, signal?: AbortSignal, proximity?: Coordinates | null) => request<Place[]>(
    "/api/locations/search?" + new URLSearchParams({ text, lang, ...(proximity ? { latitude: String(proximity.latitude), longitude: String(proximity.longitude) } : {}) }), { signal }),
  reverse: (point: Coordinates, lang: string, signal?: AbortSignal) => request<Place[]>(
    "/api/locations/reverse?" + new URLSearchParams({ latitude: String(point.latitude), longitude: String(point.longitude), lang }), { signal }),
};
export const profileApi = {
  get: () => request<Profile>("/api/users/me"),
  update: (profile: Profile) => request<Profile>("/api/users/me", { method: "PUT", body: JSON.stringify({ fullName: profile.fullName }) }),
  addresses: () => request<Address[]>("/api/users/me/addresses"),
  saveAddress: (address: Address) => request<Address>("/api/users/me/addresses" + (address.id ? "/" + address.id : ""), { method: address.id ? "PUT" : "POST", body: JSON.stringify(address) }),
  deleteAddress: (id: number) => request<void>("/api/users/me/addresses/" + id, { method: "DELETE" }),
};

export function locationErrorKey(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  return ({ MAPBOX_NOT_CONFIGURED: "mapboxNotConfigured", MAPBOX_ACCESS_DENIED: "mapboxAccessDenied",
    MAPBOX_RATE_LIMITED: "mapboxRateLimited", MAPBOX_UPSTREAM_ERROR: "mapboxUnavailable", MAPBOX_UNAVAILABLE: "mapboxUnavailable" } as Record<string, string>)[code ?? ""] ?? "searchError";
}
