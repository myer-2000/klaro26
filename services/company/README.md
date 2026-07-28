# Company Intelligence API

A name in; funding, competitors, pricing, hiring, tech stack and a synthesized
brief out — a live dossier on any company.

Part of [Klaro26 APIs](../../README.md).

## Run

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key npm run start:company
# → klaro26 company api → http://localhost:8085
```

Or with Docker:

```bash
docker compose up company
```

## Use

This is a synchronous `GET` lookup — the dossier comes back in one call:

```bash
curl -s "http://localhost:8085/company?name=OpenAI" \
  -H "authorization: Bearer klaro26_dev_key"
# → { "ok": true, "data": { "name": "OpenAI", "funding": [...], ... } }

# limit to specific sections
curl -s "http://localhost:8085/company?name=OpenAI&sections=funding,pricing" \
  -H "authorization: Bearer klaro26_dev_key"
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
name → resolve entity → gather sources → synthesize dossier → JSON
```

| Stage      | Scaffold ships   | Production swap                          |
| ---------- | ---------------- | --------------------------------------- |
| resolve    | echo the name    | entity resolution over company graphs    |
| gather     | canned data      | funding DBs, job boards, tech detectors  |
| synthesize | fixed brief      | LLM synthesis of the collected sources   |

Auth and rate limiting come from [`@klaro26/core`](../../packages/core), shared
by every service. Unlike the job-based endpoints, company lookups return
directly since they're fast reads.
