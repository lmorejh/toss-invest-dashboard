import Constants from 'expo-constants';
import type { Restaurant, ReviewBundle } from '../types';

const apiUrl: string | undefined = Constants.expoConfig?.extra?.reviewApiUrl || undefined;

export const reviewsConfigured = Boolean(apiUrl);

// Reviews are fetched on demand and only kept for the app session: Google's terms
// do not allow persisting Places content on the device.
const memo = new Map<string, Promise<ReviewBundle>>();

export function fetchReviews(r: Restaurant): Promise<ReviewBundle> {
  if (!apiUrl) return Promise.reject(new Error('리뷰 서버 주소(REVIEW_API_URL)가 설정되지 않았어요.'));
  const cached = memo.get(r.id);
  if (cached) return cached;

  const params = new URLSearchParams({ id: r.id, name: r.name });
  if (r.address) params.set('address', r.address);
  if (r.lat != null && r.lng != null) {
    params.set('lat', String(r.lat));
    params.set('lng', String(r.lng));
  }
  const request = fetch(`${apiUrl.replace(/\/$/, '')}/v1/reviews?${params}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`리뷰를 불러오지 못했어요 (${res.status})`);
      return (await res.json()) as ReviewBundle;
    })
    .catch((err) => {
      memo.delete(r.id); // allow retry
      throw err;
    });
  memo.set(r.id, request);
  return request;
}

const q = (s: string) => encodeURIComponent(s);

export function googleMapsSearchUrl(r: Restaurant) {
  return `https://www.google.com/maps/search/?api=1&query=${q(`${r.name} ${r.address ?? r.region}`)}`;
}

export function googleDirectionsUrl(r: Restaurant) {
  const dest = r.lat != null ? `${r.lat},${r.lng}` : `${r.name} ${r.address ?? ''}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q(dest)}&travelmode=transit`;
}

export function naverMapSearchUrl(r: Restaurant) {
  const district = r.address?.split(' ').slice(0, 2).join(' ') ?? r.region;
  return `https://map.naver.com/p/search/${q(`${district} ${r.name}`)}`;
}
