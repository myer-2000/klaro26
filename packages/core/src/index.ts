/**
 * @klaro26/core — the shared spine every API service sits on.
 *
 * Every Klaro26 endpoint follows the same shape:
 *   request → auth → rate limit → job queue → worker → store → JSON
 *
 * Core provides the reusable, transport-agnostic pieces: a response
 * envelope, API-key auth, a token-bucket rate limiter, and pluggable
 * Queue / Store interfaces with in-memory implementations so a service
 * runs with zero external dependencies, then swaps to Redis / Postgres
 * in production by dropping in an adapter.
 */

import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ *
 * Response envelope
 * ------------------------------------------------------------------ */

export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: { code: string; message: string } };
export type Result<T> = Ok<T> | Err;

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
export const err = (code: string, message: string): Err => ({
  ok: false,
  error: { code, message },
});

/* ------------------------------------------------------------------ *
 * Jobs
 * ------------------------------------------------------------------ */

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface Job<Input, Output> {
  id: string;
  status: JobStatus;
  input: Input;
  output?: Output;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export const newJob = <I, O>(input: I): Job<I, O> => {
  const now = Date.now();
  return { id: randomUUID(), status: "queued", input, createdAt: now, updatedAt: now };
};

/* ------------------------------------------------------------------ *
 * Queue — enqueue work, a worker pulls it. Swap InMemoryQueue for a
 * Redis/BullMQ adapter in production; the interface stays the same.
 * ------------------------------------------------------------------ */

export interface Queue<T> {
  push(item: T): Promise<void>;
  process(handler: (item: T) => Promise<void>): void;
}

export class InMemoryQueue<T> implements Queue<T> {
  private items: T[] = [];
  private handler?: (item: T) => Promise<void>;
  private draining = false;

  async push(item: T): Promise<void> {
    this.items.push(item);
    void this.drain();
  }

  process(handler: (item: T) => Promise<void>): void {
    this.handler = handler;
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining || !this.handler) return;
    this.draining = true;
    try {
      while (this.items.length > 0) {
        const item = this.items.shift()!;
        await this.handler(item);
      }
    } finally {
      this.draining = false;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Store — persist jobs/results. Swap InMemoryStore for Postgres+pgvector.
 * ------------------------------------------------------------------ */

export interface Store<T> {
  get(id: string): Promise<T | undefined>;
  set(id: string, value: T): Promise<void>;
}

export class InMemoryStore<T> implements Store<T> {
  private map = new Map<string, T>();
  async get(id: string): Promise<T | undefined> {
    return this.map.get(id);
  }
  async set(id: string, value: T): Promise<void> {
    this.map.set(id, value);
  }
}

/* ------------------------------------------------------------------ *
 * Auth — API keys via `Authorization: Bearer <key>`.
 * Keys come from KLARO26_API_KEYS (comma-separated) so the demo runs
 * without a database; production swaps in a real key store.
 * ------------------------------------------------------------------ */

export function loadKeys(env = process.env): Set<string> {
  const raw = env.KLARO26_API_KEYS ?? "";
  const keys = raw.split(",").map((k) => k.trim()).filter(Boolean);
  // Dev fallback so `docker compose up` works out of the box.
  if (keys.length === 0) keys.push("klaro26_dev_key");
  return new Set(keys);
}

export function authenticate(
  authHeader: string | undefined,
  keys: Set<string>,
): Result<string> {
  if (!authHeader) return err("unauthorized", "Missing Authorization header");
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) return err("unauthorized", "Expected 'Bearer <key>'");
  const key = match[1];
  if (!keys.has(key)) return err("unauthorized", "Invalid API key");
  return ok(key);
}

/* ------------------------------------------------------------------ *
 * Rate limiting — a simple in-memory token bucket per key.
 * ------------------------------------------------------------------ */

export interface RateLimit {
  rpm: number;
  burst: number;
}

export class TokenBucket {
  private buckets = new Map<string, { tokens: number; last: number }>();
  constructor(private limit: RateLimit) {}

  take(key: string): boolean {
    const now = Date.now();
    const refillPerMs = this.limit.rpm / 60_000;
    const b = this.buckets.get(key) ?? { tokens: this.limit.burst, last: now };
    b.tokens = Math.min(this.limit.burst, b.tokens + (now - b.last) * refillPerMs);
    b.last = now;
    if (b.tokens < 1) {
      this.buckets.set(key, b);
      return false;
    }
    b.tokens -= 1;
    this.buckets.set(key, b);
    return true;
  }
}
