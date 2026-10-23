import { restaurants } from '../../data';
import { buildSearchIndex, normalize, search, toChosung } from '../search';
import type { Restaurant } from '../../types';

const make = (over: Partial<Restaurant>): Restaurant => ({
  id: over.name ?? 'x',
  name: 'x',
  nameEn: null,
  category: 'korean',
  cuisine: null,
  description: null,
  menu: null,
  address: null,
  phone: null,
  hours: null,
  closed: null,
  since: null,
  region: '부산',
  sources: [],
  lat: null,
  lng: null,
  ...over,
});

const sample = [
  make({
    name: '포항돼지국밥',
    category: 'soup',
    cuisine: '돼지국밥',
    address: '부산광역시 부산진구 서면로68번길 33',
  }),
  make({
    name: '내호냉면',
    category: 'noodle',
    cuisine: '밀면',
    address: '부산광역시 남구 우암번영로26번길 17',
  }),
  make({
    name: '해운대암소갈비집',
    category: 'bbq',
    cuisine: '돼지갈비',
    address: '부산광역시 해운대구 중동2로10번길 32-10',
  }),
  make({ name: '해운대 밀면집', category: 'noodle', cuisine: '밀면', address: '부산광역시 해운대구 좌동' }),
];
const index = buildSearchIndex(sample);
const names = (q: string) => search(index, q).map((r) => r.name);

describe('normalize / toChosung', () => {
  it('drops spaces and punctuation', () => {
    expect(normalize(' 포항 돼지·국밥 (서면) ')).toBe('포항돼지국밥서면');
  });
  it('extracts initial consonants', () => {
    expect(toChosung('돼지국밥')).toBe('ㄷㅈㄱㅂ');
    expect(toChosung('18번완당')).toBe('18ㅂㅇㄷ');
  });
});

describe('search', () => {
  it('ranks name matches above cuisine matches', () => {
    expect(names('밀면')[0]).toBe('해운대 밀면집');
    expect(names('밀면')).toContain('내호냉면');
  });
  it('requires every term to match', () => {
    expect(names('해운대 밀면')).toEqual(['해운대 밀면집']);
  });
  it('matches ignoring spaces', () => {
    expect(names('포항 돼지국밥')).toEqual(['포항돼지국밥']);
  });
  it('supports chosung queries', () => {
    expect(names('ㅍㅎㄷㅈ')).toEqual(['포항돼지국밥']);
  });
  it('breaks score ties with the given comparator', () => {
    const byNameDesc = (a: Restaurant, b: Restaurant) => b.name.localeCompare(a.name, 'ko');
    expect(search(index, '부산', 50, byNameDesc).map((r) => r.name)).toEqual([
      '해운대암소갈비집',
      '해운대 밀면집',
      '포항돼지국밥',
      '내호냉면',
    ]);
  });
  it('returns nothing for blank queries', () => {
    expect(names('   ')).toEqual([]);
  });
  it('finds real guidebook entries', () => {
    const real = buildSearchIndex(restaurants);
    expect(search(real, '돼지국밥').length).toBeGreaterThan(5);
    expect(
      search(real, '제주').every((r) =>
        /제주/.test(`${r.address}${r.region}${r.name}${r.menu}${r.description}`),
      ),
    ).toBe(true);
  });
});
