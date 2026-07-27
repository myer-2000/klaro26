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
identify source → fetch → parse → normalize → clean Markdown → (embed)
```

The key idea is a single canonical intermediate representation, so every source
connector feeds the same downstream pipeline. Seams live in
[`src/pipeline.ts`](./src/pipeline.ts) with deterministic stubs; wire real
per-source connectors behind the same signatures.

Auth, rate limiting, and the job queue come from [`@klaro26/core`](../../packages/core).
