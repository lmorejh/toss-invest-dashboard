import { clusterForRegion } from '../cluster';
import { distanceMeters, formatDistance, isInRegion, regionForPoints } from '../geo';
import type { Restaurant } from '../../types';

describe('geo', () => {
  it('measures Seoul City Hall → Busan City Hall ≈ 325km', () => {
    const d = distanceMeters(
      { latitude: 37.5663, longitude: 126.9779 },
      { latitude: 35.1798, longitude: 129.075 },
    );
    expect(d / 1000).toBeGreaterThan(315);
    expect(d / 1000).toBeLessThan(335);
  });
  it('formats distances', () => {
    expect(formatDistance(3)).toBe('10m');
    expect(formatDistance(447)).toBe('450m');
    expect(formatDistance(1530)).toBe('1.5km');
    expect(formatDistance(23456)).toBe('23km');
  });
  it('checks region membership with padding', () => {
    const r = { latitude: 35, longitude: 129, latitudeDelta: 0.1, longitudeDelta: 0.1 };
    expect(isInRegion({ latitude: 35.04, longitude: 129.04 }, r)).toBe(true);
    expect(isInRegion({ latitude: 35.2, longitude: 129 }, r)).toBe(false);
  });
  it('fits a region around points', () => {
    expect(regionForPoints([])).toBeNull();
    const r = regionForPoints([
      { latitude: 35, longitude: 129 },
      { latitude: 35.1, longitude: 129.2 },
    ])!;
    expect(r.latitude).toBeCloseTo(35.05);
    expect(r.longitudeDelta).toBeCloseTo(0.28);
  });
});

describe('clusterForRegion', () => {
  const at = (id: string, lat: number | null, lng: number | null) =>
    ({ id, name: id, lat, lng }) as Restaurant;
  const region = { latitude: 35, longitude: 129, latitudeDelta: 0.7, longitudeDelta: 0.7 };

  const dense = [at('a', 35.0001, 129.0001), at('b', 35.0002, 129.0002), at('c', 35.0003, 129.0003)];

  it('keeps isolated places as pins and merges dense cells', () => {
    const items = clusterForRegion([...dense, at('e', 35.3, 129.3), at('d', null, null)], region);
    const cluster = items.find((i) => i.kind === 'cluster');
    expect(cluster && cluster.kind === 'cluster' && cluster.count).toBe(3);
    expect(items.filter((i) => i.kind === 'place').map((i) => i.id)).toEqual(['e']);
  });

  it('does not cluster pairs', () => {
    const items = clusterForRegion(dense.slice(0, 2), region);
    expect(items.map((i) => i.kind)).toEqual(['place', 'place']);
  });

  it('shows every pin at street level', () => {
    const street = { ...region, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    expect(clusterForRegion(dense, street).every((i) => i.kind === 'place')).toBe(true);
  });
});
