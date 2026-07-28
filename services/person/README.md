# People API

Resolve a person across the public web into one structured profile — bio,
skills, companies, projects and socials.

Part of [Klaro26 APIs](../../README.md).

## Run

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key npm run start:person
# → klaro26 person api → http://localhost:8086
```

Or with Docker:

```bash
docker compose up person
```

## Use

A synchronous `GET` lookup — the profile comes back in one call. Pass a `hint`
(company, handle or URL) to disambiguate common names and raise confidence:

```bash
curl -s "http://localhost:8086/person?name=John+Doe&hint=acme.com" \
  -H "authorization: Bearer klaro26_dev_key"
# → { "ok": true, "data": { "bio": "...", "confidence": 0.92, ... } }
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
name (+ hint) → search public web → disambiguate → merge → JSON
```

| Stage        | Scaffold ships   | Production swap                       |
| ------------ | ---------------- | ------------------------------------ |
| search       | canned profile   | public-web search across sources      |
| disambiguate | hint → confidence| entity matching + scoring             |
| merge        | fixed shape      | profile merge with provenance         |

Only public information is resolved. Auth and rate limiting come from
[`@klaro26/core`](../../packages/core), shared by every service.
