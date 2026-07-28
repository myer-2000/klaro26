/**
 * People API — HTTP entry point.
 *
 * A synchronous GET lookup (no job queue): resolve the person across the public
 * web and return one merged profile. Auth and rate limiting come from
 * @klaro26/core, keeping every service on the same spine.
 */

import { createServer, type ServerResponse } from "node:http";
import { TokenBucket, authenticate, loadKeys } from "@klaro26/core";
import { parsePersonQuery } from "./schema.js";
import { processPerson } from "./pipeline.js";

const PORT = Number(process.env.PORT ?? 8086);
const KEYS = loadKeys();
const LIMITER = new TokenBucket({ rpm: 600, burst: 60 });

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-schema-version": "2026.1",
  });
  res.end(JSON.stringify(body, null, 2));
}

const MANIFEST = {
  service: "person",
  name: "People",
  version: "2026.1",
  auth: { scheme: "Bearer", header: "Authorization" },
  endpoints: [
    { method: "GET", path: "/person?name=", summary: "Resolve a person into one profile." },
    { method: "GET", path: "/healthz", summary: "Liveness probe." },
  ],
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/healthz") return send(res, 200, { ok: true });
  if (req.method === "GET" && path === "/") return send(res, 200, MANIFEST);

  const auth = authenticate(req.headers.authorization, KEYS);
  if (!auth.ok) return send(res, 401, auth);
  if (!LIMITER.take(auth.data)) {
    return send(res, 429, { ok: false, error: { code: "rate_limited", message: "Slow down" } });
  }

  if (req.method === "GET" && path === "/person") {
    const parsed = parsePersonQuery(url.searchParams);
    if (!parsed.ok) {
      return send(res, 400, { ok: false, error: { code: "invalid_request", message: parsed.message } });
    }
    try {
      const result = await processPerson(parsed.value);
      return send(res, 200, { ok: true, data: result });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return send(res, 500, { ok: false, error: { code: "lookup_failed", message } });
    }
  }

  return send(res, 404, { ok: false, error: { code: "not_found", message: "Unknown route" } });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`klaro26 person api → http://localhost:${PORT}`);
});
