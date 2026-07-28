import { describe, expect, it, vi } from "vitest";
import { Klaro26 } from "@klaro26/sdk";
import { createDispatcher, listTools, tools } from "../src/index.js";

function res(status: number, body: unknown): Response {
  return {
    status,
    statusText: `HTTP ${status}`,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}
const ok = (data: unknown) => res(200, { ok: true, data });

function clientWith(fetchImpl: typeof fetch) {
  return new Klaro26({ apiKey: "k", baseUrl: "http://api.test", fetch: fetchImpl });
}

describe("tool catalog", () => {
  it("exposes all expected tools", () => {
    const names = listTools().map((t) => t.name);
    for (const expected of [
      "video_knowledge",
      "parse_document",
      "to_markdown",
      "understand_website",
      "research",
      "company_intel",
      "resolve_person",
      "browse",
      "remember",
      "recall",
      "index_content",
      "search_index",
      "find_mcp_server",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("every tool has a description and input schema", () => {
    for (const t of tools) {
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.inputSchema).toBeTypeOf("object");
    }
  });
});

describe("dispatcher", () => {
  it("routes find_mcp_server to the registry search endpoint", async () => {
    const fetchImpl = vi.fn(async () => ok({ hits: [{ id: "postgres" }] }));
    const callTool = createDispatcher(clientWith(fetchImpl as unknown as typeof fetch));
    const out = await callTool("find_mcp_server", { query: "database" });
    expect(out.isError).toBe(false);
    expect(String(fetchImpl.mock.calls[0][0])).toContain("/registry/search?q=database");
  });

  it("routes company_intel to the company endpoint", async () => {
    const fetchImpl = vi.fn(async () => ok({ name: "OpenAI" }));
    const callTool = createDispatcher(clientWith(fetchImpl as unknown as typeof fetch));
    const out = await callTool("company_intel", { name: "OpenAI" });
    expect(out.isError).toBe(false);
    expect(out.content).toMatchObject({ name: "OpenAI" });
  });

  it("returns an error result for an unknown tool", async () => {
    const callTool = createDispatcher(clientWith((async () => ok({})) as unknown as typeof fetch));
    const out = await callTool("nope", {});
    expect(out.isError).toBe(true);
  });

  it("surfaces API errors as an error result", async () => {
    const fetchImpl = vi.fn(async () => res(400, { ok: false, error: { code: "invalid_request", message: "bad" } }));
    const callTool = createDispatcher(clientWith(fetchImpl as unknown as typeof fetch));
    const out = await callTool("company_intel", { name: "" });
    expect(out.isError).toBe(true);
  });
});
