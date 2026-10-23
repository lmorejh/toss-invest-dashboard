#!/usr/bin/env node
// Fills lat/lng for every restaurant in src/data/restaurants.json that has none yet.
//
//   GOOGLE_MAPS_API_KEY=... npm run geocode            # Google Geocoding API (+ Places fallback)
//   KAKAO_REST_API_KEY=...  npm run geocode -- --kakao  # Kakao Local API (very good for KR addresses)
//   npm run geocode -- --force                         # re-geocode everything
//
// The address is tried first; when that fails (some guidebook addresses are incomplete)
// it falls back to a place search on "<name> <address>". Each result records which
// method produced it in `geocode`, so low-confidence hits can be reviewed.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'src/data/restaurants.json');
const args = new Set(process.argv.slice(2));
const useKakao = args.has('--kakao');
const force = args.has('--force');

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
if (useKakao ? !KAKAO_KEY : !GOOGLE_KEY) {
  console.error(
    useKakao
      ? 'Set KAKAO_REST_API_KEY'
      : 'Set GOOGLE_MAPS_API_KEY (Geocoding API + Places API (New) enabled)',
  );
  process.exit(1);
}

const inKorea = (lat, lng) => lat > 33 && lat < 38.7 && lng > 124.5 && lng < 131.9;

/** Drops floor / unit / parenthetical noise that confuses geocoders. */
function addressForGeocoding(address) {
  return address
    .replace(/\([^)]*\)/g, ' ')
    .split(',')[0]
    .replace(/\s(지하\s?)?\d+(-\d+)?층.*$/, '')
    .replace(/\s[A-Za-z]?\d+호.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function googleGeocode(address) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.search = new URLSearchParams({ address, language: 'ko', region: 'kr', key: GOOGLE_KEY });
  const res = await fetch(url);
  const json = await res.json();
  if (json.status === 'REQUEST_DENIED') throw new Error(`Geocoding API: ${json.error_message}`);
  const hit = json.results?.[0];
  if (!hit) return null;
  // A bare city/district match is too coarse to be useful for "nearby".
  const precise =
    hit.types.some((t) =>
      ['street_address', 'premise', 'subpremise', 'establishment', 'point_of_interest'].includes(t),
    ) ||
    hit.geometry.location_type === 'ROOFTOP' ||
    hit.geometry.location_type === 'RANGE_INTERPOLATED';
  if (!precise) return null;
  return { lat: hit.geometry.location.lat, lng: hit.geometry.location.lng };
}

async function googlePlace(query) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'places.location',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'ko', regionCode: 'KR', pageSize: 1 }),
  });
  if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
  const loc = (await res.json()).places?.[0]?.location;
  return loc ? { lat: loc.latitude, lng: loc.longitude } : null;
}

async function kakao(path, query) {
  const url = new URL(`https://dapi.kakao.com/v2/local/search/${path}.json`);
  url.search = new URLSearchParams({ query, size: '1' });
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
  if (!res.ok) throw new Error(`Kakao ${res.status}: ${await res.text()}`);
  const doc = (await res.json()).documents?.[0];
  return doc ? { lat: Number(doc.y), lng: Number(doc.x) } : null;
}

async function locate(r) {
  const addr = r.address ? addressForGeocoding(r.address) : null;
  const placeQuery = [r.name, addr ?? r.region].join(' ');
  const attempts = useKakao
    ? [
        ['address', () => addr && kakao('address', addr)],
        ['place', () => kakao('keyword', placeQuery)],
      ]
    : [
        ['address', () => addr && googleGeocode(addr)],
        ['place', () => googlePlace(placeQuery)],
      ];
  for (const [method, run] of attempts) {
    const hit = await run();
    if (hit && inKorea(hit.lat, hit.lng)) return { ...hit, method };
  }
  return null;
}

const data = JSON.parse(readFileSync(file, 'utf8'));
const todo = data.filter((r) => force || r.lat == null);
console.log(`Geocoding ${todo.length} of ${data.length} restaurants with ${useKakao ? 'Kakao' : 'Google'}…`);

const failed = [];
let done = 0;
const CONCURRENCY = 4;
async function worker() {
  while (todo.length) {
    const r = todo.shift();
    try {
      const hit = await locate(r);
      if (hit) {
        r.lat = Math.round(hit.lat * 1e6) / 1e6;
        r.lng = Math.round(hit.lng * 1e6) / 1e6;
        r.geocode = `${useKakao ? 'kakao' : 'google'}:${hit.method}`;
      } else {
        failed.push(r);
      }
    } catch (err) {
      console.error(`\n${r.name}: ${err.message}`);
      if (/REQUEST_DENIED|40[13]/.test(err.message)) process.exit(1);
      failed.push(r);
    }
    if (++done % 25 === 0) {
      process.stdout.write(`  ${done}\n`);
      writeFileSync(file, JSON.stringify(data, null, 1) + '\n'); // checkpoint
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
writeFileSync(file, JSON.stringify(data, null, 1) + '\n');

console.log(`\nDone. ${data.filter((r) => r.lat != null).length}/${data.length} have coordinates.`);
if (failed.length) {
  console.log(`Could not place ${failed.length}:`);
  for (const r of failed) console.log(`  ${r.id}  ${r.name}  ${r.address ?? '(no address)'}`);
}
