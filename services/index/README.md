# Open Index API

An open, self-hostable index of the web for agents. Submit URLs or raw text to
index; search the corpus by meaning. The web's index shouldn't be a black box
owned by one company — this is the open alternative you can run yourself.

Part of [Klaro26 APIs](../../README.md).

## Run

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key npm run start:index
# → klaro26 index api → http://localhost:8089
```

Or with Docker:

```bash
docker compose up index
```

## Use

Stateful and synchronous. Index content, then search it by meaning:

```bash
# index raw text
curl -s http://localhost:8089/index \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"title":"Klaro26","text":"Klaro26 is an open-source AI infrastructure API company."}'
# → { "ok": true, "data": { "id": "<content-hash>", "deduped": false } }

# search
curl -s http://localhost:8089/index/search \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"query":"open source API company","k":5}'
# → { "ok": true, "data": { "hits": [ { "title": "...", "score": 0.7 } ] } }
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
url  → fetch → extract text → embed → store (content-addressed)
text →                         embed → store
query → embed → cosine scan → top-k hits
```

Documents are addressed by a hash of their content, so re-indexing identical
content is a no-op — **dedupe for free**. The scaffold ships **real search out
of the box**: a dependency-free hashed embedding (`embed.ts`) and a linear
cosine scan (`store.ts`), so you can watch the index work end to end with no
setup.

| Piece   | Scaffold ships          | Production swap                    |
| ------- | ----------------------- | ---------------------------------- |
| fetch   | stub (text works live)  | fetch + readability / headless     |
| embed   | hashed bag-of-words     | a real embedding model             |
| store   | in-memory cosine scan   | Postgres + pgvector / search engine|

`collection` partitions the corpus. Auth and rate limiting come from
[`@klaro26/core`](../../packages/core), shared by every service.

## Legal note

Respect `robots.txt` and each site's Terms of Service. Only index content
you're permitted to fetch and store.
