/**
 * Agent Memory API — HTTP entry point.
 *
 * A self-hostable, open memory layer for AI agents: write facts, recall by
 * meaning. Unlike the pipeline services this is *stateful* and synchronous —
 * writes and recalls return immediately. Auth and rate limiting still come
 * from @klaro26/core, keeping every service on the same spine.
 *
 *   POST   /memory          → remember { text, namespace?, metadata? }
 *   POST   /memory/recall   → recall   { query, namespace?, k? }
 *   GET    /memory/:id      → fetch one memory
 *   DELETE /memory/:id      → forget one memory
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { TokenBucket, authenticate, loadKeys } from "@klaro26/core";
import { parseRecallRequest, parseRememberRequest } from "./schema.js";
import { MemoryStore } from "./store.js";

const PORT = Number(process.env.PORT ?? 8088);
const KEYS = loadKeys();
const LIMITER = new TokenBucket({ rpm: 1200, burst: 120 });
const memory = new MemoryStore();

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
  service: "memory",
  name: "Agent Memory",
  version: "2026.1",
  auth: { scheme: "Bearer", header: "Authorization" },
  endpoints: [
    { method: "POST", path: "/memory", summary: "Remember a piece of text." },
    { method: "POST", path: "/memory/recall", summary: "Recall memories by meaning." },
    { method: "GET", path: "/memory/:id", summary: "Fetch one memory." },
    { method: "DELETE", path: "/memory/:id", summary: "Forget one memory." },
    { method: "GET", path: "/healthz", summary: "Liveness probe." },
  ],
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/healthz") {
    return send(res, 200, { ok: true, data: memory.stats() });
  }
  if (req.method === "GET" && path === "/") return send(res, 200, MANIFEST);

  const auth = authenticate(req.headers.authorization, KEYS);
  if (!auth.ok) return send(res, 401, auth);
  if (!LIMITER.take(auth.data)) {
    return send(res, 429, { ok: false, error: { code: "rate_limited", message: "Slow down" } });
  }

  // POST /memory/recall  (checked before /memory so the suffix wins)
  if (req.method === "POST" && path === "/memory/recall") {
    const body = await readBody(req);
    if (body === undefined) {
      return send(res, 400, { ok: false, error: { code: "bad_json", message: "Invalid JSON" } });
    }
    const parsed = parseRecallRequest(body);
    if (!parsed.ok) {
      return send(res, 400, { ok: false, error: { code: "invalid_request", message: parsed.message } });
    }
    const matches = memory.recall(parsed.value.query, parsed.value.namespace, parsed.value.k);
    return send(res, 200, { ok: true, data: { matches } });
  }

  // POST /memory
  if (req.method === "POST" && path === "/memory") {
    const body = await readBody(req);
    if (body === undefined) {
      return send(res, 400, { ok: false, error: { code: "bad_json", message: "Invalid JSON" } });
    }
    const parsed = parseRememberRequest(body);
    if (!parsed.ok) {
      return send(res, 400, { ok: false, error: { code: "invalid_request", message: parsed.message } });
    }
    const record = memory.remember(parsed.value);
    return send(res, 201, { ok: true, data: { id: record.id, createdAt: record.createdAt } });
  }

  // GET / DELETE /memory/:id
  const m = /^\/memory\/([^/]+)$/.exec(path);
  if (m) {
    const id = m[1];
    if (req.method === "GET") {
      const record = memory.get(id);
      if (!record) return send(res, 404, { ok: false, error: { code: "not_found", message: "No such memory" } });
      return send(res, 200, { ok: true, data: record });
    }
    if (req.method === "DELETE") {
      const removed = memory.forget(id);
      if (!removed) return send(res, 404, { ok: false, error: { code: "not_found", message: "No such memory" } });
      return send(res, 200, { ok: true, data: { id, forgotten: true } });
    }
  }

  return send(res, 404, { ok: false, error: { code: "not_found", message: "Unknown route" } });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`klaro26 memory api → http://localhost:${PORT}`);
});
