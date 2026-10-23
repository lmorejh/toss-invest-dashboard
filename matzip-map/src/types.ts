export type CategoryKey =
  | 'korean'
  | 'bbq'
  | 'soup'
  | 'seafood'
  | 'noodle'
  | 'chinese'
  | 'japanese'
  | 'western'
  | 'cafe'
  | 'snack';

export type SourceKey = 'busan-nopo' | 'ceo-500' | 'post-office';

export interface SourceRef {
  source: SourceKey;
  page: number;
  recommender: string | null;
  badge: string | null;
}

export interface Restaurant {
  id: string;
  name: string;
  nameEn: string | null;
  category: CategoryKey;
  cuisine: string | null;
  description: string | null;
  menu: string | null;
  address: string | null;
  phone: string | null;
  hours: string | null;
  closed: string | null;
  since: number | null;
  region: string;
  sources: SourceRef[];
  lat: number | null;
  lng: number | null;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends LatLng {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Review {
  author: string;
  rating: number | null;
  text: string;
  date: string | null;
  url: string | null;
}

export interface ReviewBundle {
  google: {
    rating: number | null;
    count: number | null;
    url: string | null;
    reviews: Review[];
  } | null;
  naver: {
    // Naver's open API does not expose star ratings, only place + blog review search.
    blogTotal: number | null;
    placeUrl: string | null;
    category: string | null;
    reviews: Review[];
  } | null;
}
