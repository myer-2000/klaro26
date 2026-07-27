# Video Knowledge API

A video URL in; transcript, chapters, summaries, quotes, timestamps and embeddings out.

Part of [Klaro26 APIs](../../README.md).

## Run

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

## Use

```bash
# submit
curl -s http://localhost:8080/video \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"url":"https://youtube.com/watch?v=...","embeddings":true}'
# → { "ok": true, "data": { "id": "<job-id>", "status": "queued" } }

# poll
curl -s http://localhost:8080/video/<job-id> \
  -H "authorization: Bearer klaro26_dev_key"
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
URL → download audio → transcribe → align → summarise → embed → JSON
```

Each stage lives in [`src/pipeline.ts`](./src/pipeline.ts) as a marked seam. The
scaffold ships deterministic **stubs** so the whole request/response loop runs
with no models or binaries installed. To make it real, wire these behind the
same signatures:

| Stage        | Stub                | Production                              |
| ------------ | ------------------- | --------------------------------------- |
| download     | fake path           | `yt-dlp` + `ffmpeg` (mind source ToS)   |
| transcribe   | canned segments     | faster-whisper / Deepgram / OpenAI      |
| chapterise   | one per segment     | LLM over timestamped transcript         |
| summarise    | truncated text      | LLM (summary, quotes, entities)         |
| embed        | tiny vectors        | embedding model → pgvector              |

The HTTP layer, auth, rate limiting and the job queue come from
[`@klaro26/core`](../../packages/core) and are shared by every service.

## Legal note

Downloading from third-party platforms may violate their Terms of Service.
Enable real downloads only for sources you're permitted to fetch, or use a
licensed provider.
