<h3 align="center">
  <a name="readme-top"></a>
  Klaro<b>26</b>
</h3>

<p align="center">
  <em>Whatever your agent needs to perform — we give it to you.</em>
</p>

<div align="center">
  <a href="https://github.com/myer-2000/klaro26/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/myer-2000/klaro26" alt="License">
  </a>
  <a href="https://github.com/myer-2000/klaro26/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/myer-2000/klaro26.svg" alt="Contributors">
  </a>
  <img src="https://img.shields.io/badge/status-alpha-orange" alt="Status: alpha">
  <img src="https://img.shields.io/badge/built%20for-AI%20agents-35492f" alt="Built for AI agents">
</div>

---

# **Klaro26**

**Clean, structured data APIs for AI agents.** Data is messy and comes in a hundred
formats — HTML, PDFs, video, spreadsheets, repos, half-broken exports. Klaro26 takes
all of it and hands your agent one predictable JSON schema it can actually act on.
Open source, and available as a hosted service.

> Every source in. One clean schema out. Whatever your agent needs to perform — we give it to you.

---

## Why Klaro26

- **One schema, every source.** The web, documents, video, repos, companies, people — all normalized into the same predictable shape.
- **Built for agents, not humans.** Structured JSON your model can consume directly — no scraping glue, no format-guessing, fewer tokens.
- **We handle the hard stuff.** Auth, rendering, parsing, OCR, retries, rate limits, and messy edge cases — hidden behind a single call.
- **Consistent by design.** Every endpoint shares the same request → auth → job → result spine, so once you learn one, you know them all.
- **Open source.** Self-host the whole thing under MIT, or use the hosted API and skip the infrastructure entirely.

---

## Endpoints

| Endpoint | What it does | Status |
| --- | --- | --- |
| `POST /video` | Video URL → transcript, chapters, summaries, quotes, timestamps, embeddings | ✅ Available |
| `POST /document` | PDF, Word, Excel, PowerPoint, images, email → one JSON schema | 🚧 Planned |
| `POST /markdown` | YouTube, Reddit, GitHub, Notion, Slack exports → clean Markdown + metadata | 🚧 Planned |
| `POST /extract` | Any website → pricing, FAQ, products, contact, docs as typed JSON | 🚧 Planned |
| `POST /research` | A question → papers, patents, news, companies, a cited timeline | 🚧 Planned |
| `GET /company` | A name → funding, competitors, pricing, hiring, tech stack, brief | 🚧 Planned |
| `GET /person` | A name → one resolved profile: bio, skills, companies, socials | 🚧 Planned |
| `POST /browse` | A task in plain language → structured results, not screenshots | 🚧 Planned |

---

## Quick start

Every service shares one spine — [`packages/core`](./packages/core) — so a new API is a thin
layer on top. The Video Knowledge API is the reference implementation.

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key npm run start:video
# → klaro26 video api → http://localhost:8080
```

Or with Docker:

```bash
docker compose up video
```

### Use it

```bash
# submit a job
curl -s http://localhost:8080/video \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=...", "embeddings": true}'
# → { "ok": true, "data": { "id": "<job-id>", "status": "queued" } }

# fetch the clean result
curl -s http://localhost:8080/video/<job-id> \
  -H "authorization: Bearer klaro26_dev_key"
```

Output — one predictable schema, regardless of the source:

```json
{
  "ok": true,
  "data": {
    "status": "done",
    "result": {
      "url": "https://youtube.com/watch?v=...",
      "language": "en",
      "transcript": [{ "t": 0, "text": "..." }],
      "chapters": [{ "start": 0, "title": "Intro" }],
      "summary": "...",
      "quotes": ["..."]
    }
  }
}
```

See [`services/video`](./services/video) for the OpenAPI spec and `.http` examples.

---

## SDKs

Official clients wrap every endpoint and handle polling for async jobs, so you get
one clean result back.

### TypeScript / JavaScript

```bash
npm install @klaro26/sdk
```

```ts
import { Klaro26 } from "@klaro26/sdk";

const klaro = new Klaro26({ apiKey: "klaro26_dev_key" });

// submit + poll until done → one clean schema
const result = await klaro.video.run({
  url: "https://youtube.com/watch?v=...",
  embeddings: true,
});
console.log(result.summary);
```

### Python

```bash
pip install klaro26
```

```python
from klaro26 import Klaro26

klaro = Klaro26(api_key="klaro26_dev_key")
result = klaro.video.run(url="https://youtube.com/watch?v=...", embeddings=True)
print(result["summary"])
```

See [`packages/sdk`](./packages/sdk) and [`sdks/python`](./sdks/python). Runnable
examples live in [`examples/`](./examples) (`npm run example`).

---

## Power your agent

### MCP

Connect any MCP-compatible client (Claude, Cursor, and others) to clean data in seconds:

```json
{
  "mcpServers": {
    "klaro26": {
      "command": "npx",
      "args": ["-y", "@klaro26/mcp"],
      "env": { "KLARO26_API_KEY": "klaro26_dev_key" }
    }
  }
}
```

Each endpoint becomes a tool your agent can call. See [`packages/mcp`](./packages/mcp).

---

## How it works

Every endpoint follows the same pipeline:

```
raw source → collect → normalize → AI → schema → API
```

Concretely, each request flows through one shared spine:

```
request → auth → rate limit → job queue → worker → store → JSON
```

That spine lives once in [`@klaro26/core`](./packages/core) — a response envelope, API-key
auth, a token-bucket rate limiter, and pluggable Queue / Store interfaces. The scaffold
ships with in-memory adapters so it runs with **zero external services**, then swaps to
Redis / Postgres in production by dropping in an adapter — no service code changes.

---

## Repository layout

```
klaro26/
├─ packages/
│  ├─ core/          # shared spine: envelope, auth, rate limit, queue, store
│  ├─ sdk/           # @klaro26/sdk — TypeScript / JavaScript client
│  └─ mcp/           # @klaro26/mcp — Model Context Protocol tools
├─ services/
│  └─ video/         # Video Knowledge API (reference implementation)
├─ sdks/
│  └─ python/        # klaro26 — Python client
├─ examples/         # runnable quickstarts (TS + Python)
├─ docker-compose.yml
└─ .github/          # CI + issue / PR templates
```

Adding a service means: define the output schema, implement the pipeline seams,
wire the routes on top of `@klaro26/core`. Copy `services/video` as the template.

---

## Roadmap

- [x] Shared core (auth, rate limit, queue, store)
- [x] Video Knowledge API + SDKs + MCP
- [ ] `POST /document` — Universal Document
- [ ] `POST /markdown` — Everything → Markdown
- [ ] `POST /extract` — Website Understanding
- [ ] `POST /research` — Research
- [ ] `GET /company` — Company Intelligence
- [ ] `GET /person` — People
- [ ] `POST /browse` — Browser
- [ ] Redis queue + Postgres/pgvector store adapters

---

## Resources

- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)
- [Security policy](./SECURITY.md)
- [Code of conduct](./CODE_OF_CONDUCT.md)
- Per-service docs under [`services/`](./services)

---

## Open source vs hosted

Klaro26 is **MIT licensed** and free to self-host — bring your own keys and run every
endpoint on your own infrastructure. The same code powers a hosted version for teams
that would rather not operate browser pools, GPU transcription, and proxies themselves:
one API key, usage-based pricing, reliability handled.

| | Self-host (MIT) | Hosted |
| --- | --- | --- |
| Full source & schemas | ✅ | same code |
| Run it yourself | ✅ | — |
| Managed endpoint & scale | — | ✅ |
| Free tier → pay as you go | — | ✅ |

---

## Contributing

Each service is self-contained under `services/<name>` and depends only on
`@klaro26/core`. Adding one means: define the output schema, implement the pipeline
seams, wire the routes — copy [`services/video`](./services/video) as the template.
See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

[MIT](./LICENSE).

---

> **Respect source terms.** Some endpoints fetch third-party content; it's the end
> user's responsibility to comply with each source's Terms of Service, robots
> directives, and applicable privacy law.

<p align="right">
  <a href="#readme-top">↑ Back to top ↑</a>
</p>
