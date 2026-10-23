import { categoryByKey } from '../theme';
import type { Restaurant } from '../types';

const CHOSUNG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/** Lowercase, strip whitespace and punctuation so "포항 돼지국밥" matches "포항돼지국밥". */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s·.,()[\]{}'"`~!@#$%^&*_+=|\\/:;<>?-]/g, '');
}

/** "돼지국밥" → "ㄷㅈㄱㅂ"; non-Hangul characters are kept as is. */
export function toChosung(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    out += code >= HANGUL_START && code <= HANGUL_END ? CHOSUNG[Math.floor((code - HANGUL_START) / 588)] : ch;
  }
  return out;
}

const isChosungOnly = (q: string) => /^[ㄱ-ㅎ]+$/.test(q);

export interface SearchIndexEntry {
  restaurant: Restaurant;
  name: string;
  nameChosung: string;
  tags: string;
  address: string;
  body: string;
}

export function buildSearchIndex(restaurants: Restaurant[]): SearchIndexEntry[] {
  return restaurants.map((r) => {
    const name = normalize(`${r.name}${r.nameEn ?? ''}`);
    return {
      restaurant: r,
      name,
      nameChosung: toChosung(normalize(r.name)),
      tags: normalize(`${r.cuisine ?? ''}${categoryByKey[r.category]?.label ?? ''}`),
      address: normalize(`${r.address ?? ''}${r.region}`),
      body: normalize(`${r.menu ?? ''}${r.description ?? ''}`),
    };
  });
}

/**
 * Ranks restaurants for a free-text query. Every whitespace-separated term must
 * match somewhere ("해운대 밀면" → 밀면 places in 해운대); name hits rank highest.
 */
export function search(
  index: SearchIndexEntry[],
  query: string,
  limit = 50,
  tieBreak: (a: Restaurant, b: Restaurant) => number = (a, b) => a.name.localeCompare(b.name, 'ko'),
): Restaurant[] {
  const terms = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  if (terms.length === 0) return [];

  const scored: { r: Restaurant; score: number }[] = [];
  for (const entry of index) {
    let total = 0;
    for (const term of terms) {
      const s = scoreTerm(entry, term);
      if (s === 0) {
        total = 0;
        break;
      }
      total += s;
    }
    if (total > 0) scored.push({ r: entry.restaurant, score: total });
  }
  scored.sort((a, b) => b.score - a.score || tieBreak(a.r, b.r));
  return scored.slice(0, limit).map((s) => s.r);
}

function scoreTerm(e: SearchIndexEntry, term: string): number {
  if (isChosungOnly(term)) {
    if (e.nameChosung.startsWith(term)) return 80;
    if (e.nameChosung.includes(term)) return 50;
    return 0;
  }
  if (e.name === term) return 120;
  if (e.name.startsWith(term)) return 100;
  if (e.name.includes(term)) return 70;
  if (e.tags.includes(term)) return 45;
  if (e.address.includes(term)) return 30;
  if (e.body.includes(term)) return 15;
  return 0;
}
