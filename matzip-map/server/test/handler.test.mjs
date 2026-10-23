import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createHandler, districtOf, stripHtml } from '../handler.mjs';

const realFetch = globalThis.fetch;
afterEach(() => (globalThis.fetch = realFetch));

const env = { GOOGLE_PLACES_API_KEY: 'g', NAVER_CLIENT_ID: 'id', NAVER_CLIENT_SECRET: 'secret' };
const req = (q) => new Request(`http://x/v1/reviews?${new URLSearchParams(q)}`);

function mockUpstreams(calls) {
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.startsWith('https://places.googleapis.com')) {
      return Response.json({
        places: [
          {
            rating: 4.4,
            userRatingCount: 1532,
            googleMapsUri: 'https://maps.google.com/?cid=1',
            reviews: [
              {
                rating: 5,
                text: { text: '국물이 진해요' },
                relativePublishTimeDescription: '1주 전',
                authorAttribution: { displayName: '김', uri: 'https://g/u' },
              },
            ],
          },
        ],
      });
    }
    if (u.includes('/search/local.json')) {
      return Response.json({ items: [{ title: '<b>포항돼지국밥</b>', category: '한식>국밥' }] });
    }
    if (u.includes('/search/blog.json')) {
      return Response.json({
        total: 2310,
        items: [
          {
            title: '서면 <b>포항돼지국밥</b>',
            description: '맛있&amp;친절',
            bloggername: '먹방러',
            postdate: '20260912',
            link: 'https://blog.naver.com/a/1',
          },
        ],
      });
    }
    throw new Error(`unexpected ${u}`);
  };
}

test('districtOf / stripHtml', () => {
  assert.equal(districtOf('부산광역시 부산진구 서면로68번길 33 (부전동)'), '부산진구');
  assert.equal(districtOf('경남 진주시 진주대로 1317-20'), '진주시');
  assert.equal(stripHtml('<b>a</b> &amp; &quot;b&quot;'), 'a & "b"');
});

test('combines Google and Naver results and caches them', async () => {
  const calls = [];
  mockUpstreams(calls);
  const handle = createHandler(env);
  const q = {
    name: '포항돼지국밥',
    address: '부산광역시 부산진구 서면로68번길 33 (부전동)',
    lat: '35.15',
    lng: '129.06',
  };

  const res = await handle(req(q));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.google.rating, 4.4);
  assert.equal(body.google.count, 1532);
  assert.equal(body.google.reviews[0].text, '국물이 진해요');
  assert.equal(body.naver.blogTotal, 2310);
  assert.equal(body.naver.category, '한식>국밥');
  assert.equal(body.naver.reviews[0].text, '서면 포항돼지국밥\n맛있&친절');
  assert.equal(body.naver.reviews[0].date, '2026.09.12');

  const google = calls.find((c) => c.url.startsWith('https://places'));
  assert.equal(google.init.headers['X-Goog-Api-Key'], 'g');
  assert.deepEqual(JSON.parse(google.init.body).locationBias.circle.center, {
    latitude: 35.15,
    longitude: 129.06,
  });
  assert.ok(
    calls.some((c) => c.url.includes(encodeURIComponent('부산진구 포항돼지국밥').replace(/%20/g, '+'))),
  );

  const before = calls.length;
  const again = await handle(req(q));
  assert.equal(again.headers.get('X-Cache'), 'hit');
  assert.equal(calls.length, before);
});

test('a failing provider degrades to null instead of failing the request', async () => {
  globalThis.fetch = async (url) =>
    String(url).startsWith('https://places')
      ? new Response('quota', { status: 429 })
      : Response.json({ total: 0, items: [] });
  const handle = createHandler(env);
  const body = await (await handle(req({ name: '어딘가' }))).json();
  assert.equal(body.google, null);
  assert.equal(body.naver.blogTotal, 0);
});

test('validates input and routes', async () => {
  const handle = createHandler({});
  assert.equal((await handle(req({}))).status, 400);
  assert.equal((await handle(new Request('http://x/nope'))).status, 404);
  assert.equal((await handle(new Request('http://x/health'))).status, 200);
  const body = await (await handle(req({ name: '키없음' }))).json();
  assert.deepEqual(body, { google: null, naver: null });
});
