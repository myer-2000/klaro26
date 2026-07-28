/**
 * @klaro26/sdk — official TypeScript / JavaScript client for the Klaro26 APIs.
 *
 *   import { Klaro26 } from "@klaro26/sdk";
 *   const klaro = new Klaro26({ apiKey: "klaro26_dev_key" });
 *   const result = await klaro.video.run({ url: "https://youtube.com/watch?v=..." });
 *
 * Zero dependencies — uses the global `fetch` (Node 18+ / modern runtimes).
 */

/** Package version, sent as part of the User-Agent header. */
export const VERSION = "0.2.0";

export interface ClientOptions {
  apiKey: string;
  /** Defaults to the local dev server; point at the hosted API in production. */
  baseUrl?: string;
  /** Override the fetch implementation (e.g. for tests). */
  fetch?: typeof fetch;
  /** Abort a request after this many ms (default 30000). */
  timeoutMs?: number;
  /** Retry attempts on 429 / 5xx / network errors (default 2). */
  maxRetries?: number;
  /** Extra headers merged into every request. */
  headers?: Record<string, string>;
}

export interface Ok<T> {
  ok: true;
  data: T;
}
export interface Err {
  ok: false;
  error: { code: string; message: string };
}
export type ApiResult<T> = Ok<T> | Err;

export class Klaro26Error extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "Klaro26Error";
  }
}

/* ---- Video Knowledge types ---- */

export interface VideoRequest {
  url: string;
  embeddings?: boolean;
}

export interface TranscriptSegment {
  t: number;
  text: string;
}
export interface Chapter {
  start: number;
  title: string;
}

export interface VideoSource {
  provider: string;
  videoId: string | null;
  thumbnail: string | null;
  embedUrl: string | null;
}

export interface VideoKnowledge {
  url: string;
  source: VideoSource;
  durationSec: number;
  language: string;
  transcript: TranscriptSegment[];
  chapters: Chapter[];
  summary: string;
  quotes: string[];
  entities: string[];
  embeddings?: number[][];
}

/* ---- Universal Document types ---- */

export interface DocumentRequest {
  url?: string;
  content?: string;
  type?: "pdf" | "docx" | "xlsx" | "pptx" | "image" | "email" | "auto";
  ocr?: boolean;
}

export interface DocumentResult {
  title: string;
  type: string;
  sections: { heading: string; text: string }[];
  tables: { rows: string[][] }[];
  images: string[];
  text: string;
}

/* ---- Everything → Markdown types ---- */

export interface MarkdownRequest {
  url: string;
  /** Provide raw HTML to convert directly, skipping the fetch. */
  html?: string;
  embeddings?: boolean;
}

export interface MarkdownResult {
  markdown: string;
  metadata: { source: string; title?: string; author?: string; [k: string]: unknown };
  embeddings?: number[][];
}

/* ---- Website Understanding types ---- */

export interface ExtractRequest {
  url: string;
  fields?: string[];
}

export interface WebsiteUnderstanding {
  url: string;
  title: string;
  summary: string;
  pricing: { plan: string; price: number | string; period?: string; features?: string[] }[];
  products: { name: string; price?: number | string; url?: string }[];
  faq: { q: string; a: string }[];
  contact: { email?: string; phone?: string; address?: string };
  docs: string[];
}

/* ---- Research types ---- */

export interface ResearchRequest {
  query: string;
  depth?: "quick" | "standard" | "deep";
}

export interface ResearchResult {
  query: string;
  depth: "quick" | "standard" | "deep";
  summary: string;
  results: { title: string; url?: string; snippet: string; score: number }[];
  papers: { title: string; authors?: string[]; year: number; url?: string }[];
  patents: { id: string; title?: string; assignee: string; year?: number }[];
  news: { title: string; source?: string; date?: string; url?: string }[];
  companies: string[];
  timeline: { date: string; event: string }[];
  citations: number;
}

/* ---- Company Intelligence types ---- */

export interface CompanyRequest {
  name: string;
  sections?: string[];
}

export interface CompanyIntel {
  name: string;
  domain?: string;
  summary: string;
  funding: { round: string; amount: string; date?: string; investors?: string[] }[];
  competitors: string[];
  products: string[];
  pricing: { plan: string; price: string }[];
  hiring: string[];
  techStack: string[];
}

/* ---- People types ---- */

export interface PersonRequest {
  name: string;
  hint?: string;
}

export interface PersonProfile {
  name: string;
  bio: string;
  skills: string[];
  companies: string[];
  projects: string[];
  socials: Record<string, string>;
  confidence: number;
}

/* ---- Browser types ---- */

export interface BrowseRequest {
  task: string;
  return?: "structured" | "markdown" | "screenshots";
  timeout?: number;
}

export interface BrowseResult {
  task: string;
  return: "structured" | "markdown" | "screenshots";
  result: unknown;
  steps: string[];
  sources: string[];
  screenshots?: string[];
}

/* ---- Agent Memory types ---- */

export interface RememberRequest {
  text: string;
  namespace?: string;
  metadata?: Record<string, unknown>;
}

export interface RecallRequest {
  query: string;
  namespace?: string;
  k?: number;
}

export interface MemoryRecord {
  id: string;
  namespace: string;
  text: string;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface RecallMatch {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
  score: number;
}

/* ---- Open Index types ---- */

export interface IndexRequest {
  url?: string;
  text?: string;
  title?: string;
  collection?: string;
}

export interface IndexSearchRequest {
  query: string;
  collection?: string;
  k?: number;
}

export interface IndexDoc {
  id: string;
  collection: string;
  url?: string;
  title: string;
  text: string;
  indexedAt: number;
}

export interface SearchHit {
  id: string;
  url?: string;
  title: string;
  snippet: string;
  score: number;
}

/* ---- Open MCP Registry types ---- */

export interface RegisterRequest {
  id: string;
  name: string;
  description: string;
  url?: string;
  tools: string[];
  tags?: string[];
  transport?: "stdio" | "http" | "sse";
  install?: { command: string; args: string[] };
  publisher?: string;
  license?: string;
}

export interface RegistryEntry {
  id: string;
  name: string;
  description: string;
  url?: string;
  tools: string[];
  tags: string[];
  transport: "stdio" | "http" | "sse";
  install?: { command: string; args: string[] };
  publisher: string;
  license: string;
  addedAt: number;
}

export interface RegistryHit {
  id: string;
  name: string;
  description: string;
  tools: string[];
  tags: string[];
  url?: string;
  score: number;
}

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface JobState<T> {
  id: string;
  status: JobStatus;
  result?: T;
  error?: string;
}

export interface RunOptions {
  /** How often to poll for completion, in ms. */
  pollMs?: number;
  /** Give up after this many ms. */
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Klaro26 {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly extraHeaders: Record<string, string>;

  constructor(opts: ClientOptions) {
    if (!opts.apiKey) throw new Error("Klaro26: apiKey is required");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "http://localhost:8080").replace(/\/$/, "");
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("Klaro26: no fetch implementation found — pass one via options");
    }
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 2;
    this.extraHeaders = opts.headers ?? {};
  }

  /** Retry on rate limits, server errors and transient network failures. */
  private retryable(status: number): boolean {
    return status === 429 || status === 408 || (status >= 500 && status <= 599);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.apiKey}`,
      "user-agent": `klaro26-sdk-js/${VERSION}`,
      accept: "application/json",
      ...this.extraHeaders,
      ...(body ? { "content-type": "application/json" } : {}),
    };
    const payload = body ? JSON.stringify(body) : undefined;

    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchImpl(url, {
          method,
          headers,
          body: payload,
          signal: controller.signal,
        });

        // Retry transient HTTP failures with capped exponential backoff.
        if (this.retryable(res.status) && attempt < this.maxRetries) {
          await sleep(this.backoff(attempt, res.headers.get("retry-after")));
          continue;
        }

        let json: ApiResult<T>;
        try {
          json = (await res.json()) as ApiResult<T>;
        } catch {
          throw new Klaro26Error(
            "bad_response",
            `Non-JSON response (HTTP ${res.status})`,
            res.status,
          );
        }
        if (!json.ok) {
          throw new Klaro26Error(
            json.error?.code ?? "error",
            json.error?.message ?? res.statusText,
            res.status,
          );
        }
        return json.data;
      } catch (e) {
        lastErr = e;
        // Don't retry deliberate API errors — only network/abort failures.
        if (e instanceof Klaro26Error) throw e;
        if (attempt < this.maxRetries) {
          await sleep(this.backoff(attempt, null));
          continue;
        }
        const message = e instanceof Error ? e.message : String(e);
        throw new Klaro26Error("network_error", message, 0);
      } finally {
        clearTimeout(timer);
      }
    }
    // Unreachable in practice, but keeps the type checker happy.
    throw lastErr instanceof Error ? lastErr : new Error("Klaro26: request failed");
  }

  /** Capped exponential backoff with jitter; honours Retry-After when present. */
  private backoff(attempt: number, retryAfter: string | null): number {
    if (retryAfter) {
      const secs = Number(retryAfter);
      if (Number.isFinite(secs)) return Math.min(secs * 1000, 20_000);
    }
    const base = Math.min(500 * 2 ** attempt, 8_000);
    return base + Math.floor(Math.random() * 250);
  }

  /* ---- Video Knowledge ---- */

  video = {
    /** Submit a video for processing; returns a job you can poll. */
    submit: (input: VideoRequest): Promise<{ id: string; status: JobStatus }> =>
      this.request("POST", "/video", input),

    /** Fetch the current state (and result, when done) of a job. */
    get: (id: string): Promise<JobState<VideoKnowledge>> =>
      this.request("GET", `/video/${encodeURIComponent(id)}`),

    /** Submit and poll until the job finishes, then return the clean result. */
    run: async (
      input: VideoRequest,
      opts: RunOptions = {},
    ): Promise<VideoKnowledge> => {
      const { pollMs = 1000, timeoutMs = 300_000 } = opts;
      const { id } = await this.video.submit(input);
      const deadline = Date.now() + timeoutMs;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const state = await this.video.get(id);
        if (state.status === "done" && state.result) return state.result;
        if (state.status === "failed") {
          throw new Klaro26Error("job_failed", state.error ?? "Job failed", 200);
        }
        if (Date.now() > deadline) {
          throw new Klaro26Error("timeout", `Job ${id} timed out`, 200);
        }
        await sleep(pollMs);
      }
    },
  };

  /* ---- Universal Document ---- */

  document = {
    submit: (input: DocumentRequest): Promise<{ id: string; status: JobStatus }> =>
      this.request("POST", "/document", input),
    get: (id: string): Promise<JobState<DocumentResult>> =>
      this.request("GET", `/document/${encodeURIComponent(id)}`),
    run: async (input: DocumentRequest, opts: RunOptions = {}): Promise<DocumentResult> => {
      const { id } = await this.document.submit(input);
      return this.poll<DocumentResult>((jid) => this.document.get(jid), id, opts);
    },
  };

  /* ---- Everything → Markdown ---- */

  markdown = {
    submit: (input: MarkdownRequest): Promise<{ id: string; status: JobStatus }> =>
      this.request("POST", "/markdown", input),
    get: (id: string): Promise<JobState<MarkdownResult>> =>
      this.request("GET", `/markdown/${encodeURIComponent(id)}`),
    run: async (input: MarkdownRequest, opts: RunOptions = {}): Promise<MarkdownResult> => {
      const { id } = await this.markdown.submit(input);
      return this.poll<MarkdownResult>((jid) => this.markdown.get(jid), id, opts);
    },
  };

  /* ---- Website Understanding ---- */

  extract = {
    submit: (input: ExtractRequest): Promise<{ id: string; status: JobStatus }> =>
      this.request("POST", "/extract", input),
    get: (id: string): Promise<JobState<WebsiteUnderstanding>> =>
      this.request("GET", `/extract/${encodeURIComponent(id)}`),
    run: async (input: ExtractRequest, opts: RunOptions = {}): Promise<WebsiteUnderstanding> => {
      const { id } = await this.extract.submit(input);
      return this.poll<WebsiteUnderstanding>((jid) => this.extract.get(jid), id, opts);
    },
  };

  /* ---- Research ---- */

  research = {
    submit: (input: ResearchRequest): Promise<{ id: string; status: JobStatus }> =>
      this.request("POST", "/research", input),
    get: (id: string): Promise<JobState<ResearchResult>> =>
      this.request("GET", `/research/${encodeURIComponent(id)}`),
    run: async (input: ResearchRequest, opts: RunOptions = {}): Promise<ResearchResult> => {
      const { id } = await this.research.submit(input);
      return this.poll<ResearchResult>((jid) => this.research.get(jid), id, opts);
    },
  };

  /* ---- Browser ---- */

  browse = {
    submit: (input: BrowseRequest): Promise<{ id: string; status: JobStatus }> =>
      this.request("POST", "/browse", input),
    get: (id: string): Promise<JobState<BrowseResult>> =>
      this.request("GET", `/browse/${encodeURIComponent(id)}`),
    run: async (input: BrowseRequest, opts: RunOptions = {}): Promise<BrowseResult> => {
      const { id } = await this.browse.submit(input);
      return this.poll<BrowseResult>((jid) => this.browse.get(jid), id, opts);
    },
  };

  /* ---- Company Intelligence (synchronous GET) ---- */

  company = {
    lookup: (input: CompanyRequest): Promise<CompanyIntel> => {
      const q = new URLSearchParams({ name: input.name });
      if (input.sections?.length) q.set("sections", input.sections.join(","));
      return this.request("GET", `/company?${q.toString()}`);
    },
  };

  /* ---- People (synchronous GET) ---- */

  person = {
    resolve: (input: PersonRequest): Promise<PersonProfile> => {
      const q = new URLSearchParams({ name: input.name });
      if (input.hint) q.set("hint", input.hint);
      return this.request("GET", `/person?${q.toString()}`);
    },
  };

  /* ---- Agent Memory (synchronous) ---- */

  memory = {
    remember: (input: RememberRequest): Promise<{ id: string; createdAt: number }> =>
      this.request("POST", "/memory", input),
    recall: (input: RecallRequest): Promise<{ matches: RecallMatch[] }> =>
      this.request("POST", "/memory/recall", input),
    get: (id: string): Promise<MemoryRecord> =>
      this.request("GET", `/memory/${encodeURIComponent(id)}`),
    forget: (id: string): Promise<{ id: string; forgotten: boolean }> =>
      this.request("DELETE", `/memory/${encodeURIComponent(id)}`),
  };

  /* ---- Open Index (synchronous) ---- */

  index = {
    add: (input: IndexRequest): Promise<{ id: string; deduped: boolean; indexedAt: number }> =>
      this.request("POST", "/index", input),
    search: (input: IndexSearchRequest): Promise<{ hits: SearchHit[] }> =>
      this.request("POST", "/index/search", input),
    get: (id: string): Promise<IndexDoc> =>
      this.request("GET", `/index/${encodeURIComponent(id)}`),
  };

  /* ---- Open MCP Registry (synchronous) ---- */

  registry = {
    register: (input: RegisterRequest): Promise<{ id: string; replaced: boolean; addedAt: number }> =>
      this.request("POST", "/registry", input),
    list: (): Promise<{ servers: RegistryEntry[] }> =>
      this.request("GET", "/registry"),
    search: (query: string, k?: number): Promise<{ hits: RegistryHit[] }> => {
      const q = new URLSearchParams({ q: query });
      if (k) q.set("k", String(k));
      return this.request("GET", `/registry/search?${q.toString()}`);
    },
    get: (id: string): Promise<RegistryEntry> =>
      this.request("GET", `/registry/${encodeURIComponent(id)}`),
  };

  /** Shared polling loop used by every job-based endpoint. */
  private async poll<T>(
    get: (id: string) => Promise<JobState<T>>,
    id: string,
    opts: RunOptions,
  ): Promise<T> {
    const { pollMs = 1000, timeoutMs = 300_000 } = opts;
    const deadline = Date.now() + timeoutMs;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const state = await get(id);
      if (state.status === "done" && state.result) return state.result;
      if (state.status === "failed") {
        throw new Klaro26Error("job_failed", state.error ?? "Job failed", 200);
      }
      if (Date.now() > deadline) {
        throw new Klaro26Error("timeout", `Job ${id} timed out`, 200);
      }
      await sleep(pollMs);
    }
  }
}

export default Klaro26;
