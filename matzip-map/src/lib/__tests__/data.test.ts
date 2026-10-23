import { restaurants } from '../../data';
import { categoryByKey } from '../../theme';

describe('restaurant dataset', () => {
  it('has every guidebook entry with the fields the app relies on', () => {
    expect(restaurants.length).toBeGreaterThan(800);
    const ids = new Set<string>();
    for (const r of restaurants) {
      expect(r.name).toBeTruthy();
      expect(categoryByKey[r.category]).toBeDefined();
      expect(r.address || r.phone).toBeTruthy();
      expect(r.sources.length).toBeGreaterThan(0);
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
      if (r.lat != null) {
        expect(r.lat).toBeGreaterThan(33);
        expect(r.lat).toBeLessThan(38.7);
        expect(r.lng).toBeGreaterThan(124.5);
        expect(r.lng).toBeLessThan(131.9);
      }
    }
  });
});
