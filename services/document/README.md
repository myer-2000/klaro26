# Universal Document API

PDF, Word, Excel, PowerPoint, images or email in — one consistent JSON schema out.

Part of [Klaro26 APIs](../../README.md).

## Run

```bash
# from the repo root
npm install
KLARO26_API_KEYS=klaro26_dev_key PORT=8081 npm run start:document
# → klaro26 document api → http://localhost:8081
```

## Use

```bash
curl -s http://localhost:8081/document \
  -H "authorization: Bearer klaro26_dev_key" \
  -H "content-type: application/json" \
  -d '{"url": "https://example.com/report.pdf"}'
# → { "ok": true, "data": { "id": "<job-id>", "status": "queued" } }

curl -s http://localhost:8081/document/<job-id> \
  -H "authorization: Bearer klaro26_dev_key"
```

See [`requests.http`](./requests.http) and [`openapi.yaml`](./openapi.yaml).

## How it works

```
source → detect type → parse → (OCR) → normalize → JSON
```

Each stage is a marked seam in [`src/pipeline.ts`](./src/pipeline.ts). The scaffold
ships deterministic stubs; wire the real parsers behind the same signatures:

| Stage | Stub | Production |
| --- | --- | --- |
| detect | extension guess | magic bytes / content-type |
| parse | canned sections | pdf / docx / xlsx / pptx parsers |
| OCR | — | Tesseract / cloud OCR for scans & images |

Auth, rate limiting, and the job queue come from [`@klaro26/core`](../../packages/core).
