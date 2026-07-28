/**
 * Open MCP Registry API — HTTP entry point.
 *
 * A searchable, self-hostable catalog of MCP servers so agents can discover
 * and deploy tools at runtime. Seeded with well-known open servers; register
 * more via POST. Auth and rate limiting come from @klaro26/core, keeping every
 * service on the same spine.
 *
 *   POST /registry           → register { id, name, description, tools, … }
 *   GET  /registry           → list all servers
 *   GET  /registry/search?q= → search the catalog
 *   GET  /registry/:id       → fetch one server's manifest
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { TokenBucket, authenticate, loadKeys } from "@klaro26/core";
import { parseRegisterRequest } from "./schema.js";
import { RegistryStore } from "./store.js";
import { SEED } from "./seed.js";

const PORT = Number(process.env.PORT ?? 8090);
const KEYS = loadKeys();
const LIMITER = new TokenBucket({ rpm: 1200, burst: 120 });
const store = new RegistryStore(SEED);

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
  service: "registry",
  name: "Open MCP Registry",
  version: "2026.1",
  auth: { scheme: "Bearer", header: "Authorization" },
  endpoints: [
    { method: "POST", path: "/registry", summary: "Register an MCP server." },
    { method: "GET", path: "/registry", summary: "List all servers." },
    { method: "GET", path: "/registry/search?q=", summary: "Search the catalog." },
    { method: "GET", path: "/registry/:id", summary: "Fetch one server's manifest." },
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

  // GET /registry/search?q=…
  if (req.method === "GET" && path === "/registry/search") {
    const q = url.searchParams.get("q") ?? "";
    if (q.trim().length === 0) {
      return send(res, 400, { ok: false, error: { code: "invalid_request", message: "'q' is required" } });
    }
    const limit = Math.min(Math.max(Number(url.searchParams.get("k") ?? 10) || 10, 1), 100);
    return send(res, 200, { ok: true, data: { hits: store.search(q, limit) } });
  }

  // GET /registry  (list)
  if (req.method === "GET" && path === "/registry") {
    return send(res, 200, { ok: true, data: { servers: store.list() } });
  }

  // POST /registry  (register)
  if (req.method === "POST" && path === "/registry") {
    const body = await readBody(req);
    if (body === undefined) {
      return send(res, 400, { ok: false, error: { code: "bad_json", message: "Invalid JSON" } });
    }
    const parsed = parseRegisterRequest(body);
    if (!parsed.ok) {
      return send(res, 400, { ok: false, error: { code: "invalid_request", message: parsed.message } });
    }
    const { entry, replaced } = store.register(parsed.value);
    return send(res, replaced ? 200 : 201, {
      ok: true,
      data: { id: entry.id, replaced, addedAt: entry.addedAt },
    });
  }

  // GET /registry/:id
  const m = /^\/registry\/([^/]+)$/.exec(path);
  if (req.method === "GET" && m) {
    const entry = store.get(m[1]);
    if (!entry) return send(res, 404, { ok: false, error: { code: "not_found", message: "No such server" } });
    return send(res, 200, { ok: true, data: entry });
  }

  return send(res, 404, { ok: false, error: { code: "not_found", message: "Unknown route" } });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`klaro26 registry api → http://localhost:${PORT}`);
});
