/**
 * Browser API — HTTP entry point.
 * Shares the request → auth → job → result spine from @klaro26/core.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  InMemoryQueue,
  InMemoryStore,
  TokenBucket,
  authenticate,
  loadKeys,
  newJob,
  type Job,
} from "@klaro26/core";
import { parseBrowseRequest, type BrowseRequest, type BrowseResult } from "./schema.js";
import { processBrowse } from "./pipeline.js";

const PORT = Number(process.env.PORT ?? 8087);
const KEYS = loadKeys();
const LIMITER = new TokenBucket({ rpm: 300, burst: 30 });

type BrowseJob = Job<BrowseRequest, BrowseResult>;
const store = new InMemoryStore<BrowseJob>();
const queue = new InMemoryQueue<string>();

queue.process(async (id) => {
  const job = await store.get(id);
  if (!job) return;
  job.status = "running";
  job.updatedAt = Date.now();
  await store.set(id, job);
  try {
    job.output = await processBrowse(job.input);
    job.status = "done";
  } catch (e) {
    job.status = "failed";
    job.error = e instanceof Error ? e.message : String(e);
  }
  job.updatedAt = Date.now();
  await store.set(id, job);
});

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
  service: "browse",
  name: "Browser",
  version: "2026.1",
  auth: { scheme: "Bearer", header: "Authorization" },
  endpoints: [
    { method: "POST", path: "/browse", summary: "Give an agent a browser task." },
    { method: "GET", path: "/browse/:id", summary: "Fetch job status and result." },
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

  if (req.method === "POST" && path === "/browse") {
    const body = await readBody(req);
    if (body === undefined) {
      return send(res, 400, { ok: false, error: { code: "bad_json", message: "Invalid JSON" } });
    }
    const parsed = parseBrowseRequest(body);
    if (!parsed.ok) {
      return send(res, 400, { ok: false, error: { code: "invalid_request", message: parsed.message } });
    }
    const job = newJob<BrowseRequest, BrowseResult>(parsed.value);
    await store.set(job.id, job);
    await queue.push(job.id);
    return send(res, 202, { ok: true, data: { id: job.id, status: job.status } });
  }

  const m = /^\/browse\/([^/]+)$/.exec(path);
  if (req.method === "GET" && m) {
    const job = await store.get(m[1]);
    if (!job) return send(res, 404, { ok: false, error: { code: "not_found", message: "No such job" } });
    return send(res, 200, {
      ok: true,
      data: { id: job.id, status: job.status, result: job.output, error: job.error },
    });
  }

  return send(res, 404, { ok: false, error: { code: "not_found", message: "Unknown route" } });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`klaro26 browse api → http://localhost:${PORT}`);
});
