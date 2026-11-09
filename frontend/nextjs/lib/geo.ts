export type Coordinates = { latitude: number; longitude: number };
export function coordinates(value: { latitude?: number | null; longitude?: number | null } | null | undefined): Coordinates | null {
  if (!value || typeof value.latitude !== "number" || typeof value.longitude !== "number" || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) return null;
  return { latitude: value.latitude, longitude: value.longitude };
}
export function distanceKm(origin: Coordinates, target: Coordinates): number {
  const radians = Math.PI / 180;
  const halfLat = Math.sin((target.latitude - origin.latitude) * radians / 2);
  const halfLon = Math.sin((target.longitude - origin.longitude) * radians / 2);
  const arc = halfLat ** 2 + Math.cos(origin.latitude * radians) * Math.cos(target.latitude * radians) * halfLon ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, arc))));
}
