# Website Understanding API

Point at any site; get pricing, FAQ, products, contact and docs as clean, typed JSON.

Part of [Klaro26 APIs](../../README.md).

## Run

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key npm run start:extract
# → klaro26 extract api → http://localhost:8083
```

Or with Docker:

```bash
docker compose up extract
```

## Use

```bash
# submit
curl -s http://localhost:8083/extract \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"url":"https://acme.com"}'
# → { "ok": true, "data": { "id": "<job-id>", "status": "queued" } }

# poll
curl -s http://localhost:8083/extract/<job-id> \
  -H "authorization: Bearer klaro26_dev_key"
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
url → fetch → render → classify sections → extract → normalize → JSON
```

| Stage    | Scaffold ships     | Production swap                        |
| -------- | ------------------ | ------------------------------------- |
| fetch    | stub content       | fetch + readability / headless render |
| render   | skipped            | Playwright / Chromium                 |
| classify | fixed sections     | LLM section classifier                |
| extract  | canned JSON        | structured extractor over the DOM     |

The HTTP layer, auth, rate limiting and the job queue come from
[`@klaro26/core`](../../packages/core) and are shared by every service.

## Legal note

Respect `robots.txt` and each site's Terms of Service. Only fetch what
you're permitted to.
