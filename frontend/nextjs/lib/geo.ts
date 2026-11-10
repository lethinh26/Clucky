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

export function deliveryCircle(center: Coordinates, radiusKm: number): number[][] {
  if (!coordinates(center) || !Number.isFinite(radiusKm) || radiusKm <= 0) return [];
  if (radiusKm >= Math.PI * 6371) return [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  const latitude = center.latitude * Math.PI / 180;
  const longitude = center.longitude * Math.PI / 180;
  const arc = radiusKm / 6371;
  const ring = Array.from({ length: 64 }, (_, index) => {
    const bearing = index * 2 * Math.PI / 64;
    const nextLatitude = Math.asin(Math.max(-1, Math.min(1, Math.sin(latitude) * Math.cos(arc) + Math.cos(latitude) * Math.sin(arc) * Math.cos(bearing))));
    const nextLongitude = longitude + Math.atan2(Math.sin(bearing) * Math.sin(arc) * Math.cos(latitude), Math.cos(arc) - Math.sin(latitude) * Math.sin(nextLatitude));
    return [nextLongitude * 180 / Math.PI, nextLatitude * 180 / Math.PI];
  });
  return [...ring, ring[0]];
}
