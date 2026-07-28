/**
 * @klaro26/sdk — official TypeScript / JavaScript client for the Klaro26 APIs.
 *
 *   import { Klaro26 } from "@klaro26/sdk";
 *   const klaro = new Klaro26({ apiKey: "klaro26_dev_key" });
 *   const result = await klaro.video.run({ url: "https://youtube.com/watch?v=..." });
 *
 * Zero dependencies — uses the global `fetch` (Node 18+ / modern runtimes).
 */

export interface ClientOptions {
  apiKey: string;
  /** Defaults to the local dev server; point at the hosted API in production. */
  baseUrl?: string;
  /** Override the fetch implementation (e.g. for tests). */
  fetch?: typeof fetch;
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

export interface VideoKnowledge {
  url: string;
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

  constructor(opts: ClientOptions) {
    if (!opts.apiKey) throw new Error("Klaro26: apiKey is required");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "http://localhost:8080").replace(/\/$/, "");
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("Klaro26: no fetch implementation found — pass one via options");
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as ApiResult<T>;
    if (!json.ok) {
      throw new Klaro26Error(
        json.error?.code ?? "error",
        json.error?.message ?? res.statusText,
        res.status,
      );
    }
    return json.data;
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
