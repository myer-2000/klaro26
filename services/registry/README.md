# Open MCP Registry API

A searchable, self-hostable catalog of MCP servers so agents can discover and
deploy tools at runtime. The tool layer of the internet should be open and
self-describing — this is the index that makes it so.

Part of [Klaro26 APIs](../../README.md).

## Run

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key npm run start:registry
# → klaro26 registry api → http://localhost:8090
```

Or with Docker:

```bash
docker compose up registry
```

It boots **seeded with real, well-known open MCP servers** (filesystem, git,
fetch, memory, postgres, and Klaro26 itself), so search returns useful results
immediately.

## Use

```bash
# search the catalog
curl -s "http://localhost:8090/registry/search?q=database" \
  -H "authorization: Bearer klaro26_dev_key"
# → { "ok": true, "data": { "hits": [ { "id": "postgres", "score": 5, ... } ] } }

# fetch a server's install manifest
curl -s http://localhost:8090/registry/filesystem \
  -H "authorization: Bearer klaro26_dev_key"
# → { "ok": true, "data": { "install": { "command": "npx", "args": [...] }, ... } }

# register your own server
curl -s http://localhost:8090/registry \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"id":"acme-crm","name":"Acme CRM","description":"...","tools":["list_contacts"]}'
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
register → validate → store (keyed by slug)
search   → keyword score over id / name / tools / tags / description → top-k
```

Search is a **transparent, weighted keyword score** — an exact id match ranks
highest, then name, then tools/tags, then description. Easy to reason about and
zero-dependency. The seed list lives in [`seed.ts`](./src/seed.ts).

| Piece    | Scaffold ships        | Production swap                     |
| -------- | --------------------- | ----------------------------------- |
| store    | in-memory by slug     | Postgres                            |
| search   | weighted keyword scan | Postgres full-text / a search index |
| trust    | open registration     | signing, ownership, moderation      |

Auth and rate limiting come from [`@klaro26/core`](../../packages/core), shared
by every service.
