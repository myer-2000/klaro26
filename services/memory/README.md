# Agent Memory API

A self-hostable, open memory layer for AI agents: write facts, recall them by
meaning. Most agent memory today lives inside closed SaaS — this is the open
alternative you can run yourself.

Part of [Klaro26 APIs](../../README.md).

## Run

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key npm run start:memory
# → klaro26 memory api → http://localhost:8088
```

Or with Docker:

```bash
docker compose up memory
```

## Use

Unlike the pipeline services, memory is **stateful and synchronous** — writes
and recalls return immediately.

```bash
# remember
curl -s http://localhost:8088/memory \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"text":"The user is building Klaro26, an open API company.","namespace":"user-42"}'
# → { "ok": true, "data": { "id": "<id>", "createdAt": ... } }

# recall by meaning
curl -s http://localhost:8088/memory/recall \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"query":"what is the user working on?","namespace":"user-42","k":3}'
# → { "ok": true, "data": { "matches": [ { "text": "...", "score": 0.7 } ] } }
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
text → embed → store (per namespace)
query → embed → cosine scan → top-k matches
```

The scaffold ships **real recall out of the box** — no model download, no API
key. `embed.ts` is a dependency-free hashed bag-of-words embedding, and
`store.ts` does a linear cosine scan. Similar wording ranks higher, so you can
see memory working end to end immediately.

| Piece   | Scaffold ships          | Production swap                    |
| ------- | ----------------------- | ---------------------------------- |
| embed   | hashed bag-of-words     | a real embedding model             |
| store   | in-memory cosine scan   | Postgres + pgvector / a vector DB  |

`namespace` partitions memory (per-agent or per-user). Auth and rate limiting
come from [`@klaro26/core`](../../packages/core), shared by every service.
