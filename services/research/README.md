# Research API

A question in; papers, patents, news, companies and a cited timeline out —
research built for agents, not humans.

Part of [Klaro26 APIs](../../README.md).

## Run

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key npm run start:research
# → klaro26 research api → http://localhost:8084
```

Or with Docker:

```bash
docker compose up research
```

## Use

```bash
# submit
curl -s http://localhost:8084/research \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"query":"latest battery technologies","depth":"standard"}'
# → { "ok": true, "data": { "id": "<job-id>", "status": "queued" } }

# poll
curl -s http://localhost:8084/research/<job-id> \
  -H "authorization: Bearer klaro26_dev_key"
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
query → plan → search sources → dedupe → synthesize → cite → JSON
```

| Stage      | Scaffold ships    | Production swap                          |
| ---------- | ----------------- | --------------------------------------- |
| plan       | fixed             | LLM planner that fans out sub-questions  |
| search     | canned results    | academic + patent + news + company APIs  |
| synthesize | truncated text    | LLM synthesis with inline citations      |

`depth` (quick | standard | deep) trades latency for source coverage. The
HTTP layer, auth, rate limiting and the job queue come from
[`@klaro26/core`](../../packages/core) and are shared by every service.
