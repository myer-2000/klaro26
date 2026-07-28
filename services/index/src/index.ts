/**
 * Open Index API — HTTP entry point.
 *
 * An open, self-hostable index of the web for agents. Submit URLs or raw text
 * to index; search the corpus by meaning. Content-addressed, so identical
 * content is stored once. Auth and rate limiting come from @klaro26/core,
 * keeping every service on the same spine.
 *
 *   POST /index          → index { url | text, title?, collection? }
 *   POST /index/search   → search { query, collection?, k? }
 *   GET  /index/:id      → fetch one indexed document
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { TokenBucket, authenticate, loadKeys } from "@klaro26/core";
import { parseIndexRequest, parseSearchRequest } from "./schema.js";
import { resolveContent } from "./pipeline.js";
import { IndexStore } from "./store.js";

const PORT = Number(process.env.PORT ?? 8089);
const KEYS = loadKeys();
const LIMITER = new TokenBucket({ rpm: 1200, burst: 120 });
const store = new IndexStore();

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-schema-version": "2026.1",
  });
  res.end(JSON.stringify(body, null, 2));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}

const MANIFEST = {
  service: "index",
  name: "Open Index",
  version: "2026.1",
  auth: { scheme: "Bearer", header: "Authorization" },
  endpoints: [
    { method: "POST", path: "/index", summary: "Index a URL or raw text." },
    { method: "POST", path: "/index/search", summary: "Search the index by meaning." },
    { method: "GET", path: "/index/:id", summary: "Fetch one indexed document." },
    { method: "GET", path: "/healthz", summary: "Liveness probe." },
  ],
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/healthz") {
    return send(res, 200, { ok: true, data: store.stats() });
  }
  if (req.method === "GET" && path === "/") return send(res, 200, MANIFEST);

  const auth = authenticate(req.headers.authorization, KEYS);
  if (!auth.ok) return send(res, 401, auth);
  if (!LIMITER.take(auth.data)) {
    return send(res, 429, { ok: false, error: { code: "rate_limited", message: "Slow down" } });
  }

  // POST /index/search  (checked before /index so the suffix wins)
  if (req.method === "POST" && path === "/index/search") {
    const body = await readBody(req);
    if (body === undefined) {
      return send(res, 400, { ok: false, error: { code: "bad_json", message: "Invalid JSON" } });
    }
    const parsed = parseSearchRequest(body);
    if (!parsed.ok) {
      return send(res, 400, { ok: false, error: { code: "invalid_request", message: parsed.message } });
    }
    const hits = store.search(parsed.value.query, parsed.value.collection, parsed.value.k);
    return send(res, 200, { ok: true, data: { hits } });
  }

  // POST /index
  if (req.method === "POST" && path === "/index") {
    const body = await readBody(req);
    if (body === undefined) {
      return send(res, 400, { ok: false, error: { code: "bad_json", message: "Invalid JSON" } });
    }
    const parsed = parseIndexRequest(body);
    if (!parsed.ok) {
      return send(res, 400, { ok: false, error: { code: "invalid_request", message: parsed.message } });
    }
    try {
      const content = await resolveContent(parsed.value);
      const { doc, deduped } = store.index({
        collection: parsed.value.collection ?? "web",
        url: content.url,
        title: content.title,
        text: content.text,
      });
      return send(res, deduped ? 200 : 201, {
        ok: true,
        data: { id: doc.id, deduped, indexedAt: doc.indexedAt },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return send(res, 500, { ok: false, error: { code: "index_failed", message } });
    }
  }

  // GET /index/:id
  const m = /^\/index\/([^/]+)$/.exec(path);
  if (req.method === "GET" && m) {
    const doc = store.get(m[1]);
    if (!doc) return send(res, 404, { ok: false, error: { code: "not_found", message: "No such document" } });
    return send(res, 200, { ok: true, data: doc });
  }

  return send(res, 404, { ok: false, error: { code: "not_found", message: "Unknown route" } });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`klaro26 index api → http://localhost:${PORT}`);
});
