#!/usr/bin/env node
// Merges the per-page transcriptions in data/raw/*.json into src/data/restaurants.json.
// Restaurants that appear in more than one guidebook are merged into one record with
// several `sources`. Existing coordinates in the output file are preserved by id, so
// re-running this after `npm run geocode` does not throw geocoding work away.
//
//   node scripts/build-data.mjs

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'data/raw');
const outFile = join(root, 'src/data/restaurants.json');

const CATEGORIES = new Set([
  'korean',
  'bbq',
  'soup',
  'seafood',
  'noodle',
  'chinese',
  'japanese',
  'western',
  'cafe',
  'snack',
]);
const SOURCE_ORDER = ['busan-nopo', 'post-office', 'ceo-500'];

const PROVINCES = [
  ['서울', '서울'],
  ['부산', '부산'],
  ['대구', '대구'],
  ['인천', '인천'],
  ['광주', '광주'],
  ['대전', '대전'],
  ['울산', '울산'],
  ['세종', '세종'],
  ['경기', '경기'],
  ['강원', '강원'],
  ['충북', '충북'],
  ['충청북', '충북'],
  ['충남', '충남'],
  ['충청남', '충남'],
  ['전북', '전북'],
  ['전라북', '전북'],
  ['전남', '전남'],
  ['전라남', '전남'],
  ['경북', '경북'],
  ['경상북', '경북'],
  ['경남', '경남'],
  ['경상남', '경남'],
  ['제주', '제주'],
];
/** "부산광역시 부산진구 …" → "부산"; falls back to the guidebook's section name. */
function provinceOf(address, fallback) {
  const first = (address ?? '').trim().split(/\s+/)[0] ?? '';
  for (const [prefix, short] of PROVINCES) if (first.startsWith(prefix)) return short;
  return fallback;
}

const clean = (v) => {
  if (v == null) return null;
  const s = String(v)
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s === '' ? null : s;
};
const norm = (s) => (s ?? '').toLowerCase().replace(/[\s·.,()[\]\-_'"]/g, '');
const digits = (s) => (s ?? '').replace(/\D/g, '');

const raw = readdirSync(rawDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(join(rawDir, f), 'utf8')));

const previous = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : [];
const previousById = new Map(previous.map((r) => [r.id, r]));

/** @type {Map<string, any>} */
const merged = new Map();
const byPhone = new Map();
const byNameAddr = new Map();
const skipped = [];

function sameShop(a, b) {
  const na = norm(a.name);
  const nb = norm(b.name);
  return na === nb || na.includes(nb) || nb.includes(na);
}

for (const e of raw) {
  const name = clean(e.name);
  if (!name) continue;
  // A few guidebook mentions (e.g. 부산어묵노포 list) print neither address nor phone,
  // so they can't be located or contacted — leave them out of the app.
  if (!clean(e.address) && !clean(e.phone)) {
    skipped.push(name);
    continue;
  }
  if (!CATEGORIES.has(e.category)) throw new Error(`Unknown category "${e.category}" for ${name}`);

  const rec = {
    name,
    nameEn: clean(e.nameEn),
    category: e.category,
    cuisine: clean(e.cuisine),
    description: clean(e.description),
    menu: clean(e.menu),
    address: clean(e.address),
    phone: clean(e.phone),
    hours: clean(e.hours),
    closed: clean(e.closed),
    since: Number.isInteger(e.since) ? e.since : null,
    region: provinceOf(e.address, clean(e.region) ?? ''),
  };
  const source = {
    source: e.source,
    page: e.page,
    // Post-office headers print "부산우체국 (…)" and "부산우체국(…)" interchangeably.
    recommender: clean(e.recommender)?.replace(/\s+\(/g, '(') ?? null,
    badge: clean(e.badge),
  };

  const phoneKey = digits(rec.phone);
  const nameAddrKey = `${norm(rec.name)}|${norm(rec.address)}`;
  let existing = null;
  if (phoneKey.length >= 8) {
    const candidate = byPhone.get(phoneKey);
    if (candidate && sameShop(candidate, rec)) existing = candidate;
  }
  existing ??= byNameAddr.get(nameAddrKey) ?? null;

  if (existing) {
    // Fill gaps from the second guidebook without overwriting what the first printed.
    for (const [k, v] of Object.entries(rec)) if (existing[k] == null || existing[k] === '') existing[k] = v;
    existing.sources.push(source);
    continue;
  }

  const id = createHash('sha1')
    .update(`${norm(rec.name)}|${phoneKey || norm(rec.address)}`)
    .digest('hex')
    .slice(0, 10);
  if (merged.has(id)) throw new Error(`id collision for ${rec.name}`);
  const prev = previousById.get(id);
  const full = { id, ...rec, sources: [source], lat: prev?.lat ?? null, lng: prev?.lng ?? null };
  if (prev?.geocode) full.geocode = prev.geocode;
  merged.set(id, full);
  if (phoneKey.length >= 8) byPhone.set(phoneKey, full);
  byNameAddr.set(nameAddrKey, full);
}

const out = [...merged.values()];
for (const r of out) {
  r.sources.sort(
    (a, b) => SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source) || a.page - b.page,
  );
}
out.sort((a, b) => a.region.localeCompare(b.region, 'ko') || a.name.localeCompare(b.name, 'ko'));

writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');

const multi = out.filter((r) => r.sources.length > 1);
const withCoords = out.filter((r) => r.lat != null).length;
console.log(`raw entries: ${raw.length}`);
console.log(`restaurants: ${out.length} (${multi.length} listed in more than one guide)`);
if (skipped.length) console.log(`skipped (no address/phone): ${skipped.join(', ')}`);
console.log(`with coordinates: ${withCoords}/${out.length}`);
for (const r of multi)
  console.log(`  merged: ${r.name} ← ${r.sources.map((s) => `${s.source}#p${s.page}`).join(', ')}`);
