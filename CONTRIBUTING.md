# Contributing to Klaro26

Thanks for your interest in Klaro26 — clean, structured data APIs for AI agents.

## Ground rules

- Every service lives under `services/<name>` and depends only on `@klaro26/core`.
- Keep the request → auth → job → result spine consistent across services.
- Output a single, predictable JSON schema. That consistency is the product.

## Getting set up

```bash
npm install
npm run typecheck        # verify the workspace
npm run start:video      # boot the reference service on :8080
```

The scaffold uses in-memory Queue/Store adapters, so it runs with zero external
services. Swap in Redis/Postgres adapters (same interfaces) for production.

## Adding a new endpoint

Copy `services/video` as the template, then:

1. **Define the schema** — the one JSON shape the endpoint returns (`src/schema.ts`).
2. **Implement the pipeline** — fill the marked seams in `src/pipeline.ts`.
3. **Wire the routes** — reuse auth, rate limiting, and the job queue from `@klaro26/core`.
4. **Document it** — a `README.md`, an `openapi.yaml`, and a `requests.http` per service.

## Pull requests

- Keep PRs focused and typechecking clean (`npm run typecheck`).
- Describe the source you're normalizing and the schema you're producing.
- Respect third-party Terms of Service for any source you fetch.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](./LICENSE).
