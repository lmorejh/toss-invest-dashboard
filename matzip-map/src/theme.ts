import type { CategoryKey } from './types';

export const colors = {
  bg: '#FBFAF8',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F3F7',
  ink: '#2A2833',
  inkSoft: '#5E5B6B',
  muted: '#9A97A6',
  hairline: '#ECE9F1',
  primary: '#A99BF0',
  primaryInk: '#6E5CC9',
  primarySoft: '#EEEAFE',
  star: '#F2B84B',
  google: '#7FA7F2',
  naver: '#7CCB9C',
  scrim: 'rgba(42, 40, 51, 0.18)',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const type = {
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4, color: colors.ink },
  heading: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.ink },
  body: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.2, color: colors.ink, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500' as const, letterSpacing: -0.1, color: colors.muted },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0, color: colors.muted },
};

export const shadow = {
  soft: {
    shadowColor: '#4B3F7A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  lifted: {
    shadowColor: '#4B3F7A',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
};

export interface CategoryStyle {
  key: CategoryKey;
  label: string;
  emoji: string;
  /** Pastel fill */
  tint: string;
  /** Readable foreground on the tint */
  ink: string;
}

export const categories: CategoryStyle[] = [
  { key: 'korean', label: '한식', emoji: '🍚', tint: '#FFDCCF', ink: '#B4644C' },
  { key: 'bbq', label: '고기·구이', emoji: '🥩', tint: '#FFD0DC', ink: '#B24E6E' },
  { key: 'soup', label: '국밥·탕', emoji: '🍲', tint: '#FFEDB0', ink: '#94741C' },
  { key: 'seafood', label: '해산물·회', emoji: '🐟', tint: '#CDE6FF', ink: '#3E78B4' },
  { key: 'noodle', label: '면요리', emoji: '🍜', tint: '#CDF1DF', ink: '#2F8A5F' },
  { key: 'chinese', label: '중식', emoji: '🥟', tint: '#FFE0BF', ink: '#A9671F' },
  { key: 'japanese', label: '일식', emoji: '🍣', tint: '#E6DAFF', ink: '#6E54BE' },
  { key: 'western', label: '양식·세계', emoji: '🍝', tint: '#C9EFF1', ink: '#23817F' },
  { key: 'cafe', label: '카페·디저트', emoji: '☕', tint: '#EFE4D8', ink: '#7D6046' },
  { key: 'snack', label: '분식·간식', emoji: '🍢', tint: '#E7F3BF', ink: '#6B8222' },
];

export const categoryByKey = Object.fromEntries(categories.map((c) => [c.key, c])) as Record<
  CategoryKey,
  CategoryStyle
>;

export const sourceLabels: Record<string, string> = {
  'busan-nopo': '부산 노포맛집 100선',
  'ceo-500': '중소기업CEO 단골맛집 500선',
  'post-office': '우체국 추천 맛집가이드',
};

/** Soft, low-contrast Google Maps style so pastel pins stand out. */
export const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#F6F4F1' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E8A99' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FBFAF8' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#E4E0EA' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E3F2E6' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FDFCFA' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F3E9F7' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#E8DCEF' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#E9E5EF' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#D7E9F7' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9DB8CF' }] },
];
