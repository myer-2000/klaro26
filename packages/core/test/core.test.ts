import { describe, expect, it } from "vitest";
import {
  InMemoryQueue,
  InMemoryStore,
  TokenBucket,
  authenticate,
  err,
  loadKeys,
  newJob,
  ok,
} from "@klaro26/core";

describe("envelope", () => {
  it("wraps data in an ok envelope", () => {
    expect(ok({ a: 1 })).toEqual({ ok: true, data: { a: 1 } });
  });
  it("wraps an error envelope", () => {
    expect(err("bad", "nope")).toEqual({ ok: false, error: { code: "bad", message: "nope" } });
  });
});

describe("newJob", () => {
  it("creates a queued job with an id and timestamps", () => {
    const job = newJob<{ x: number }, unknown>({ x: 1 });
    expect(job.status).toBe("queued");
    expect(job.input).toEqual({ x: 1 });
    expect(typeof job.id).toBe("string");
    expect(job.createdAt).toBeGreaterThan(0);
  });
});

describe("InMemoryStore", () => {
  it("gets and sets values", async () => {
    const store = new InMemoryStore<{ n: number }>();
    expect(await store.get("missing")).toBeUndefined();
    await store.set("a", { n: 5 });
    expect(await store.get("a")).toEqual({ n: 5 });
  });
});

describe("InMemoryQueue", () => {
  it("processes pushed items in order", async () => {
    const seen: number[] = [];
    const queue = new InMemoryQueue<number>();
    queue.process(async (n) => {
      seen.push(n);
    });
    await queue.push(1);
    await queue.push(2);
    await queue.push(3);
    await new Promise((r) => setTimeout(r, 10));
    expect(seen).toEqual([1, 2, 3]);
  });
});

describe("loadKeys", () => {
  it("parses comma-separated keys", () => {
    const keys = loadKeys({ KLARO26_API_KEYS: "a, b ,c" } as NodeJS.ProcessEnv);
    expect([...keys].sort()).toEqual(["a", "b", "c"]);
  });
  it("falls back to a dev key when unset", () => {
    const keys = loadKeys({} as NodeJS.ProcessEnv);
    expect(keys.has("klaro26_dev_key")).toBe(true);
  });
});

describe("authenticate", () => {
  const keys = new Set(["good-key"]);
  it("rejects a missing header", () => {
    expect(authenticate(undefined, keys).ok).toBe(false);
  });
  it("rejects a malformed header", () => {
    expect(authenticate("Token good-key", keys).ok).toBe(false);
  });
  it("rejects an unknown key", () => {
    expect(authenticate("Bearer nope", keys).ok).toBe(false);
  });
  it("accepts a valid bearer key", () => {
    const res = authenticate("Bearer good-key", keys);
    expect(res).toEqual({ ok: true, data: "good-key" });
  });
});

describe("TokenBucket", () => {
  it("allows up to the burst then rate-limits", () => {
    const bucket = new TokenBucket({ rpm: 60, burst: 3 });
    expect(bucket.take("k")).toBe(true);
    expect(bucket.take("k")).toBe(true);
    expect(bucket.take("k")).toBe(true);
    expect(bucket.take("k")).toBe(false);
  });
  it("tracks buckets per key", () => {
    const bucket = new TokenBucket({ rpm: 60, burst: 1 });
    expect(bucket.take("a")).toBe(true);
    expect(bucket.take("b")).toBe(true);
    expect(bucket.take("a")).toBe(false);
  });
});
