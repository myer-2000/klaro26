/**
 * Video Knowledge API — HTTP entry point.
 *
 * Uses Node's built-in http server (zero framework deps) so the scaffold
 * runs with `tsx src/index.ts` and nothing else. In production you'd put
 * this behind Fastify/Express, a real queue (BullMQ/Redis) and a store
 * (Postgres + pgvector) — all behind the interfaces from @klaro26/core.
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
import { parseVideoRequest, type VideoKnowledge, type VideoRequest } from "./schema.js";
import { processVideo } from "./pipeline.js";

const PORT = Number(process.env.PORT ?? 8080);
const KEYS = loadKeys();
const LIMITER = new TokenBucket({ rpm: 600, burst: 60 });

type VideoJob = Job<VideoRequest, VideoKnowledge>;
const store = new InMemoryStore<VideoJob>();
const queue = new InMemoryQueue<string>();

// Worker: pull job ids, run the pipeline, persist the result.
queue.process(async (id) => {
  const job = await store.get(id);
  if (!job) return;
  job.status = "running";
  job.updatedAt = Date.now();
  await store.set(id, job);
  try {
    job.output = await processVideo(job.input);
    job.status = "done";
  } catch (e) {
    job.status = "failed";
    job.error = e instanceof Error ? e.message : String(e);
  }
  job.updatedAt = Date.now();
  await store.set(id, job);
});

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-schema-version": "2026.1",
  });
  res.end(json);
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
  service: "video",
  name: "Video Knowledge",
  version: "2026.1",
  auth: { scheme: "Bearer", header: "Authorization" },
  endpoints: [
    { method: "POST", path: "/video", summary: "Submit a video URL for processing." },
    { method: "GET", path: "/video/:id", summary: "Fetch job status and result." },
    { method: "GET", path: "/healthz", summary: "Liveness probe." },
  ],
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  // Public routes
  if (req.method === "GET" && path === "/healthz") return send(res, 200, { ok: true });
  if (req.method === "GET" && path === "/") return send(res, 200, MANIFEST);

  // Auth
  const auth = authenticate(req.headers.authorization, KEYS);
  if (!auth.ok) return send(res, 401, auth);

  // Rate limit (per key)
  if (!LIMITER.take(auth.data)) {
    return send(res, 429, { ok: false, error: { code: "rate_limited", message: "Slow down" } });
  }

  // POST /video
  if (req.method === "POST" && path === "/video") {
    const body = await readBody(req);
    if (body === undefined) {
      return send(res, 400, { ok: false, error: { code: "bad_json", message: "Invalid JSON" } });
    }
    const parsed = parseVideoRequest(body);
    if (!parsed.ok) {
      return send(res, 400, { ok: false, error: { code: "invalid_request", message: parsed.message } });
    }
    const job = newJob<VideoRequest, VideoKnowledge>(parsed.value);
    await store.set(job.id, job);
    await queue.push(job.id);
    return send(res, 202, { ok: true, data: { id: job.id, status: job.status } });
  }

  // GET /video/:id
  const m = /^\/video\/([^/]+)$/.exec(path);
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
  console.log(`klaro26 video api → http://localhost:${PORT}`);
});
