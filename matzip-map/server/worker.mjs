// Cloudflare Workers entry. Deploy with:
//   npx wrangler deploy server/worker.mjs --name matzip-reviews --compatibility-date 2025-01-01
//   npx wrangler secret put GOOGLE_PLACES_API_KEY   (and NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)

import { createHandler } from './handler.mjs';

let handle;

export default {
  fetch(request, env) {
    handle ??= createHandler(env);
    return handle(request);
  },
};
