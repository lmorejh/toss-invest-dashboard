import type { MapRegion, Restaurant } from '../types';

export type MapItem =
  | { kind: 'place'; id: string; latitude: number; longitude: number; restaurant: Restaurant }
  | {
      kind: 'cluster';
      id: string;
      latitude: number;
      longitude: number;
      count: number;
      members: Restaurant[];
    };

/**
 * Cheap grid clustering: the visible region is split into `grid` × `grid` cells
 * and any cell holding `minClusterSize`+ places collapses into a single bubble.
 * Once zoomed in to street level every place gets its own pin.
 * Plenty for ~1k points and keeps the native map responsive.
 */
export function clusterForRegion(
  places: Restaurant[],
  region: MapRegion,
  grid = 8,
  minClusterSize = 3,
  streetLevelDelta = 0.02,
): MapItem[] {
  const streetLevel = region.latitudeDelta <= streetLevelDelta;
  const cellLat = region.latitudeDelta / grid;
  const cellLng = region.longitudeDelta / grid;
  const buckets = new Map<string, Restaurant[]>();

  for (const r of places) {
    if (r.lat == null || r.lng == null) continue;
    const key = `${Math.floor(r.lat / cellLat)}:${Math.floor(r.lng / cellLng)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(r);
    else buckets.set(key, [r]);
  }

  const items: MapItem[] = [];
  for (const [key, members] of buckets) {
    if (streetLevel || members.length < minClusterSize) {
      for (const r of members) {
        items.push({ kind: 'place', id: r.id, latitude: r.lat!, longitude: r.lng!, restaurant: r });
      }
      continue;
    }
    let lat = 0;
    let lng = 0;
    for (const m of members) {
      lat += m.lat!;
      lng += m.lng!;
    }
    items.push({
      kind: 'cluster',
      id: `c:${key}:${members.length}`,
      latitude: lat / members.length,
      longitude: lng / members.length,
      count: members.length,
      members,
    });
  }
  return items;
}
