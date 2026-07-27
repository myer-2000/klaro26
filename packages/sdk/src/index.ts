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
}

export default Klaro26;
