import type { LatLng, MapRegion } from '../types';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters / 1000)}km`;
}

export function isInRegion(p: LatLng, r: MapRegion, padding = 0.15): boolean {
  const latPad = (r.latitudeDelta / 2) * (1 + padding);
  const lngPad = (r.longitudeDelta / 2) * (1 + padding);
  return Math.abs(p.latitude - r.latitude) <= latPad && Math.abs(p.longitude - r.longitude) <= lngPad;
}

/** Region that fits every point with some breathing room. */
export function regionForPoints(points: LatLng[], minDelta = 0.01): MapRegion | null {
  if (points.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(minDelta, (maxLat - minLat) * 1.4),
    longitudeDelta: Math.max(minDelta, (maxLng - minLng) * 1.4),
  };
}

/** Whole of South Korea — used before GPS is available. */
export const KOREA_REGION: MapRegion = {
  latitude: 36.2,
  longitude: 127.8,
  latitudeDelta: 6.2,
  longitudeDelta: 4.6,
};
