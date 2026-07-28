# @klaro26/sdk

Official TypeScript / JavaScript SDK for the [Klaro26 APIs](https://github.com/myer-2000/klaro26) —
clean, structured data for AI agents. One client, every endpoint, one predictable schema back.

- **Zero runtime dependencies** — uses the global `fetch` (Node 18+, Bun, Deno, browsers, edge).
- **Typed end to end** — every request and response is fully typed.
- **Handles the hard parts** — async job polling, timeouts, and automatic retries with backoff.
- **ESM + CJS** — ships both, with type declarations.

## Install

```bash
npm install @klaro26/sdk
# or: pnpm add @klaro26/sdk / yarn add @klaro26/sdk / bun add @klaro26/sdk
```

## Quick start

```ts
import { Klaro26 } from "@klaro26/sdk";

const klaro = new Klaro26({ apiKey: process.env.KLARO26_API_KEY! });

// Job-based endpoints — submit + poll until done, then one clean result:
const video = await klaro.video.run({ url: "https://youtube.com/watch?v=..." });
console.log(video.summary);

// Synchronous endpoints return directly:
const company = await klaro.company.lookup({ name: "OpenAI" });
console.log(company.competitors);
```

## Configuration

```ts
const klaro = new Klaro26({
  apiKey: "klaro26_dev_key",
  baseUrl: "https://api.klaro26.dev", // defaults to http://localhost:8080
  timeoutMs: 30_000,                  // per-request timeout (AbortController)
  maxRetries: 2,                      // retries on 429 / 5xx / network errors
  headers: { "x-tenant": "acme" },    // merged into every request
  fetch: customFetch,                 // inject a fetch impl (tests, proxies)
});
```

Requests automatically retry on `429`, `408`, and `5xx` responses (and transient network
errors) with capped exponential backoff, honouring `Retry-After` when the server sends it.
Deliberate API errors (`4xx`) are thrown immediately as `Klaro26Error`.

## Endpoints

Job-based endpoints expose `submit`, `get`, and `run` (submit + poll). Synchronous
endpoints return directly.

```ts
// Video Knowledge — transcript, chapters, summary, quotes, embeddings
await klaro.video.run({ url, embeddings: true });

// Universal Document — PDF, Word, Excel, PowerPoint, images, email → one schema
await klaro.document.run({ url });

// Everything → Markdown — any source to clean Markdown + metadata
await klaro.markdown.run({ url, embeddings: true });

// Website Understanding — pricing, FAQ, products, contact, docs as typed JSON
await klaro.extract.run({ url: "https://acme.com", fields: ["pricing", "faq"] });

// Research — papers, patents, news, companies, a cited timeline
await klaro.research.run({ query: "battery tech", depth: "deep" });

// Browser — a task in plain language → structured results
await klaro.browse.run({ task: "Find the cheapest flight to Tokyo", return: "structured" });

// Company Intelligence — funding, competitors, pricing, hiring, tech stack (sync)
await klaro.company.lookup({ name: "OpenAI", sections: ["funding", "pricing"] });

// People — resolve a person into one profile (sync)
await klaro.person.resolve({ name: "John Doe", hint: "acme.com" });

// Agent Memory — write facts, recall by meaning (sync)
await klaro.memory.remember({ text: "The user prefers dark mode.", namespace: "u42" });
await klaro.memory.recall({ query: "user preferences", namespace: "u42", k: 5 });

// Open Index — index URLs/text, search the web by meaning (sync)
await klaro.index.add({ url: "https://example.com/article" });
await klaro.index.search({ query: "open source API company", k: 5 });

// Open MCP Registry — discover and deploy agent tools at runtime (sync)
await klaro.registry.search("database");
await klaro.registry.get("postgres");
```

## Polling options

`run()` accepts optional `pollMs` and `timeoutMs`:

```ts
await klaro.research.run({ query: "..." }, { pollMs: 1500, timeoutMs: 120_000 });
```

## Error handling

```ts
import { Klaro26, Klaro26Error } from "@klaro26/sdk";

try {
  await klaro.video.run({ url: "not-a-url" });
} catch (e) {
  if (e instanceof Klaro26Error) {
    console.error(e.code, e.status, e.message);
  }
}
```

## License

[MIT](./LICENSE) — the whole Klaro26 stack is open source. Self-host it, or use the hosted API.
