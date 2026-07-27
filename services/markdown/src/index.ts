/**
 * Everything → Markdown API — HTTP entry point.
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
import { parseMarkdownRequest, type MarkdownRequest, type MarkdownResult } from "./schema.js";
import { processMarkdown } from "./pipeline.js";

const PORT = Number(process.env.PORT ?? 8082);
const KEYS = loadKeys();
const LIMITER = new TokenBucket({ rpm: 600, burst: 60 });

type MarkdownJob = Job<MarkdownRequest, MarkdownResult>;
const store = new InMemoryStore<MarkdownJob>();
const queue = new InMemoryQueue<string>();

queue.process(async (id) => {
  const job = await store.get(id);
  if (!job) return;
  job.status = "running";
  job.updatedAt = Date.now();
  await store.set(id, job);
  try {
    job.output = await processMarkdown(job.input);
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
  service: "markdown",
  name: "Everything → Markdown",
  version: "2026.1",
  auth: { scheme: "Bearer", header: "Authorization" },
  endpoints: [
    { method: "POST", path: "/markdown", summary: "Submit a source URL to convert." },
    { method: "GET", path: "/markdown/:id", summary: "Fetch job status and result." },
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

  if (req.method === "POST" && path === "/markdown") {
    const body = await readBody(req);
    if (body === undefined) {
      return send(res, 400, { ok: false, error: { code: "bad_json", message: "Invalid JSON" } });
    }
    const parsed = parseMarkdownRequest(body);
    if (!parsed.ok) {
      return send(res, 400, { ok: false, error: { code: "invalid_request", message: parsed.message } });
    }
    const job = newJob<MarkdownRequest, MarkdownResult>(parsed.value);
    await store.set(job.id, job);
    await queue.push(job.id);
    return send(res, 202, { ok: true, data: { id: job.id, status: job.status } });
  }

  const m = /^\/markdown\/([^/]+)$/.exec(path);
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
  console.log(`klaro26 markdown api → http://localhost:${PORT}`);
});
