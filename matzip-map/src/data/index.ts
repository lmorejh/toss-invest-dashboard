import type { Restaurant } from '../types';
import raw from './restaurants.json';

export const restaurants = raw as Restaurant[];

export const geocodedCount = restaurants.reduce((n, r) => (r.lat != null ? n + 1 : n), 0);
