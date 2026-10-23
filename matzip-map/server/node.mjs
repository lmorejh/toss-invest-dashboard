#!/usr/bin/env node
// Plain Node (18+) host for the review proxy. No dependencies.
//
//   GOOGLE_PLACES_API_KEY=... NAVER_CLIENT_ID=... NAVER_CLIENT_SECRET=... node server/node.mjs

import { createServer } from 'node:http';
import { createHandler } from './handler.mjs';

const port = Number(process.env.PORT ?? 8787);
const handle = createHandler(process.env);

for (const k of ['GOOGLE_PLACES_API_KEY', 'NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET']) {
  if (!process.env[k]) console.warn(`⚠︎ ${k} is not set — that provider will return null`);
}

createServer(async (req, res) => {
  try {
    const request = new Request(new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`), {
      method: req.method,
    });
    const response = await handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{"error":"internal"}');
  }
}).listen(port, () => console.log(`review proxy listening on http://localhost:${port}`));
