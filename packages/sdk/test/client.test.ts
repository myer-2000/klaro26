import { describe, expect, it, vi } from "vitest";
import { Klaro26, Klaro26Error, VERSION } from "@klaro26/sdk";

/** Build a minimal fetch Response stand-in. */
function res(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    status,
    statusText: `HTTP ${status}`,
    headers: { get: (h: string) => headers[h.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Response;
}

const ok = (data: unknown) => res(200, { ok: true, data });

function client(fetchImpl: typeof fetch, opts = {}) {
  return new Klaro26({ apiKey: "k", baseUrl: "http://api.test", fetch: fetchImpl, ...opts });
}

describe("constructor", () => {
  it("requires an apiKey", () => {
    // @ts-expect-error — intentionally missing apiKey
    expect(() => new Klaro26({})).toThrow(/apiKey is required/);
  });
});

describe("request", () => {
  it("returns data and sends auth + UA headers", async () => {
    const fetchImpl = vi.fn(async () => ok({ hello: "world" }));
    const k = client(fetchImpl as unknown as typeof fetch);
    const out = await k.company.lookup({ name: "OpenAI" });
    expect(out).toEqual({ hello: "world" });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain("/company?name=OpenAI");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer k");
    expect(headers["user-agent"]).toBe(`klaro26-sdk-js/${VERSION}`);
  });

  it("encodes query params for sync endpoints", async () => {
    const fetchImpl = vi.fn(async () => ok({}));
    const k = client(fetchImpl as unknown as typeof fetch);
    await k.company.lookup({ name: "Acme Co", sections: ["funding", "pricing"] });
    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain("name=Acme+Co");
    expect(url).toContain("sections=funding%2Cpricing");
  });

  it("posts a JSON body for memory.recall", async () => {
    const fetchImpl = vi.fn(async () => ok({ matches: [] }));
    const k = client(fetchImpl as unknown as typeof fetch);
    await k.memory.recall({ query: "hi", namespace: "n", k: 3 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain("/memory/recall");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      query: "hi",
      namespace: "n",
      k: 3,
    });
  });

  it("throws Klaro26Error on an API error and does not retry", async () => {
    const fetchImpl = vi.fn(async () => res(400, { ok: false, error: { code: "invalid_request", message: "bad" } }));
    const k = client(fetchImpl as unknown as typeof fetch);
    await expect(k.company.lookup({ name: "x" })).rejects.toMatchObject({
      name: "Klaro26Error",
      code: "invalid_request",
      status: 400,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(res(429, { ok: false, error: { code: "rate_limited", message: "slow" } }, { "retry-after": "0" }))
      .mockResolvedValueOnce(ok({ ok: 1 }));
    const k = client(fetchImpl as unknown as typeof fetch, { maxRetries: 2 });
    const out = await k.company.lookup({ name: "x" });
    expect(out).toEqual({ ok: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("wraps network failures as Klaro26Error after retries", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("boom");
    });
    const k = client(fetchImpl as unknown as typeof fetch, { maxRetries: 1 });
    await expect(k.company.lookup({ name: "x" })).rejects.toMatchObject({
      code: "network_error",
      status: 0,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2); // initial + 1 retry
  });
});

describe("job polling (run)", () => {
  it("submits then polls until done", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(res(202, { ok: true, data: { id: "job1", status: "queued" } }))
      .mockResolvedValueOnce(res(200, { ok: true, data: { id: "job1", status: "running" } }))
      .mockResolvedValueOnce(res(200, { ok: true, data: { id: "job1", status: "done", result: { title: "T" } } }));
    const k = client(fetchImpl as unknown as typeof fetch);
    const out = await k.extract.run({ url: "https://x.com" }, { pollMs: 1 });
    expect(out).toEqual({ title: "T" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws when the job fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(res(202, { ok: true, data: { id: "j", status: "queued" } }))
      .mockResolvedValueOnce(res(200, { ok: true, data: { id: "j", status: "failed", error: "nope" } }));
    const k = client(fetchImpl as unknown as typeof fetch);
    await expect(k.extract.run({ url: "https://x.com" }, { pollMs: 1 })).rejects.toBeInstanceOf(Klaro26Error);
  });
});

describe("timeout", () => {
  it("aborts a slow request and surfaces a network error", async () => {
    const fetchImpl = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = init.signal as AbortSignal;
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const k = client(fetchImpl as unknown as typeof fetch, { timeoutMs: 20, maxRetries: 0 });
    await expect(k.company.lookup({ name: "x" })).rejects.toMatchObject({
      code: "network_error",
    });
  });
});
