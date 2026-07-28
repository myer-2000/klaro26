# Everything → Markdown API

YouTube, Reddit, GitHub, Notion, Slack exports — any source to clean Markdown plus metadata.

Part of [Klaro26 APIs](../../README.md).

## Run

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key PORT=8082 npm run start:markdown
# → klaro26 markdown api → http://localhost:8082
```

## Use

```bash
curl -s http://localhost:8082/markdown \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=...", "embeddings": true}'
# → { "ok": true, "data": { "id": "<job-id>", "status": "queued" } }

curl -s http://localhost:8082/markdown/<job-id> \
  -H "authorization: Bearer klaro26_dev_key"
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
identify source → fetch → HTML → Markdown → (embed)
```

The **HTML → Markdown conversion and metadata extraction are real and
dependency-free** ([`src/html.ts`](./src/html.ts)): headings, links, images,
lists, inline code, `<pre>` code fences, blockquotes and emphasis are converted;
scripts, styles and nav/footer chrome are stripped; and `<article>`/`<main>`
content is preferred. Metadata (title via `og:title`/`<title>`, author,
description) is pulled from the page. With `embeddings: true`, each paragraph
gets a real hashed vector ([`src/embed.ts`](./src/embed.ts)).

Pass raw HTML directly with the `html` field to skip the fetch (handy offline
and in tests):

```bash
curl -s http://localhost:8082/markdown \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com","html":"<h1>Hi</h1><p>Body</p>"}'
```

Fetching is the one remaining seam: web pages use the global `fetch`, and
per-source connectors (YouTube transcripts, Reddit JSON, GitHub API, …) drop in
behind `fetchSource` in [`src/pipeline.ts`](./src/pipeline.ts) without touching
the rest of the pipeline. Auth, rate limiting, and the job queue come from
[`@klaro26/core`](../../packages/core).
