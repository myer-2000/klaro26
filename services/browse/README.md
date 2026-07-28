# Browser API

Give an agent a task; get structured results back, not screenshots. Logins,
CAPTCHAs and dynamic UIs handled.

Part of [Klaro26 APIs](../../README.md).

## Run

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key npm run start:browse
# → klaro26 browse api → http://localhost:8087
```

Or with Docker:

```bash
docker compose up browse
```

## Use

```bash
# submit
curl -s http://localhost:8087/browse \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"task":"Find the cheapest flight to Tokyo next month","return":"structured"}'
# → { "ok": true, "data": { "id": "<job-id>", "status": "queued" } }

# poll
curl -s http://localhost:8087/browse/<job-id> \
  -H "authorization: Bearer klaro26_dev_key"
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
task → plan → drive browser (click / type / read) → extract → JSON
```

| Stage   | Scaffold ships   | Production swap                          |
| ------- | ---------------- | ---------------------------------------- |
| plan    | fixed steps      | LLM planner over the live DOM             |
| drive   | skipped          | Playwright / Chromium agent loop          |
| extract | canned result    | structured extraction from the final page |

`return` picks the output shape: `structured` (default), `markdown`, or
`screenshots`. The HTTP layer, auth, rate limiting and the job queue come from
[`@klaro26/core`](../../packages/core) and are shared by every service.

## Legal note

Respect each site's Terms of Service and `robots.txt`. Don't use the browser
to bypass access controls you're not authorized to pass.
