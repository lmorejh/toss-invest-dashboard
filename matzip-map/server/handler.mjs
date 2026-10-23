// Review proxy: looks a restaurant up on Google Places (rating, count, reviews) and the
// Naver Search API (local place + blog reviews) and returns one JSON bundle.
// Keys stay on the server; the app only knows this endpoint's URL.
//
// Written against the web Fetch API so the same code runs on Node 18+ (server/node.mjs)
// and Cloudflare Workers (server/worker.mjs).
//
//   GET /v1/reviews?id=<restaurant id>&name=<name>&address=<address>&lat=<lat>&lng=<lng>

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // short-lived; Google terms disallow long-term caching
const MAX_CACHE = 2000;

export function createHandler(env) {
  const cache = new Map();

  return async function handle(request) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/health') return json({ ok: true }, 200, cors);
    if (url.pathname !== '/v1/reviews' || request.method !== 'GET') {
      return json({ error: 'not_found' }, 404, cors);
    }

    const name = url.searchParams.get('name')?.trim();
    if (!name || name.length > 80) return json({ error: 'name is required' }, 400, cors);
    const address = url.searchParams.get('address')?.trim().slice(0, 160) || '';
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const point = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 ? { lat, lng } : null;

    const key = `${name}|${address}`;
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return json(hit.body, 200, { ...cors, 'X-Cache': 'hit' });

    const [google, naver] = await Promise.all([
      env.GOOGLE_PLACES_API_KEY
        ? googleReviews(env.GOOGLE_PLACES_API_KEY, name, address, point).catch(logNull('google'))
        : null,
      env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET
        ? naverReviews(env.NAVER_CLIENT_ID, env.NAVER_CLIENT_SECRET, name, address).catch(logNull('naver'))
        : null,
    ]);
    const body = { google, naver };

    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(key, { body, expires: Date.now() + CACHE_TTL_MS });
    return json(body, 200, { ...cors, 'Cache-Control': 'public, max-age=3600' });
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

const logNull = (who) => (err) => {
  console.error(`[${who}]`, err?.message ?? err);
  return null;
};

/** "부산광역시 부산진구 서면로68번길 33 (부전동)" → "부산진구" */
export function districtOf(address) {
  const parts = address
    .replace(/\([^)]*\)/g, ' ')
    .trim()
    .split(/\s+/);
  return parts.find((p, i) => i > 0 && /(시|군|구)$/.test(p)) ?? parts[0] ?? '';
}

export function stripHtml(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

const compact = (s) => s.replace(/\s+/g, '').toLowerCase();

// ---------------------------------------------------------------- Google Places (New)

async function googleReviews(apiKey, name, address, point) {
  const body = {
    textQuery: `${name} ${address}`.trim(),
    languageCode: 'ko',
    regionCode: 'KR',
    pageSize: 1,
  };
  if (point) {
    body.locationBias = { circle: { center: { latitude: point.lat, longitude: point.lng }, radius: 500 } };
  }
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.reviews',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`places ${res.status} ${await res.text()}`);
  const place = (await res.json()).places?.[0];
  if (!place) return { rating: null, count: null, url: null, reviews: [] };

  return {
    rating: place.rating ?? null,
    count: place.userRatingCount ?? null,
    url: place.googleMapsUri ?? null,
    reviews: (place.reviews ?? []).map((r) => ({
      author: r.authorAttribution?.displayName ?? 'Google 사용자',
      rating: r.rating ?? null,
      text: r.text?.text ?? r.originalText?.text ?? '',
      date: r.relativePublishTimeDescription ?? null,
      url: r.authorAttribution?.uri ?? null,
    })),
  };
}

// ---------------------------------------------------------------- Naver Search API
// The open API has no star ratings; it offers place lookup and blog search, so we
// return the blog review count and the most relevant posts.

async function naverSearch(id, secret, kind, params) {
  const url = new URL(`https://openapi.naver.com/v1/search/${kind}.json`);
  url.search = new URLSearchParams(params);
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret },
  });
  if (!res.ok) throw new Error(`naver ${kind} ${res.status} ${await res.text()}`);
  return res.json();
}

async function naverReviews(id, secret, name, address) {
  const district = address ? districtOf(address) : '';
  const query = `${district} ${name}`.trim();

  const [local, blog] = await Promise.all([
    naverSearch(id, secret, 'local', { query, display: '5' }),
    naverSearch(id, secret, 'blog', { query: `${query} 후기`, display: '5', sort: 'sim' }),
  ]);

  // Only trust the place match when the name lines up.
  const place = (local.items ?? []).find((p) => {
    const title = compact(stripHtml(p.title));
    return title.includes(compact(name)) || compact(name).includes(title);
  });

  return {
    blogTotal: blog.total ?? null,
    placeUrl: `https://map.naver.com/p/search/${encodeURIComponent(query)}`,
    category: place ? place.category : null,
    reviews: (blog.items ?? []).map((b) => ({
      author: stripHtml(b.bloggername ?? '네이버 블로그'),
      rating: null,
      text: `${stripHtml(b.title)}\n${stripHtml(b.description)}`,
      date: b.postdate
        ? `${b.postdate.slice(0, 4)}.${b.postdate.slice(4, 6)}.${b.postdate.slice(6, 8)}`
        : null,
      url: b.link ?? null,
    })),
  };
}
