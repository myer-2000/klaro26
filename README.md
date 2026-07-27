# Klaro26 APIs

Open-source, AI-native infrastructure. Clean, structured APIs that turn messy,
fragmented sources into schemas your agents can trust.

Every endpoint follows the same spine:

```
request → auth → rate limit → job queue → worker → store → JSON
```

That spine lives once in [`packages/core`](./packages/core); each API is a thin
service on top of it.

## Endpoints

| Service                              | Endpoint     | Status   |
| ------------------------------------ | ------------ | -------- |
| [Video Knowledge](./services/video)  | `POST /video`| scaffold |
| Universal Document                   | `POST /document` | planned |
| Everything → Markdown                | `POST /markdown` | planned |
| Research                             | `POST /research` | planned |
| Website Understanding                | `POST /extract`  | planned |
| Company Intelligence                 | `GET /company`   | planned |
| People                               | `GET /person`    | planned |
| Browser                              | `POST /browse`   | planned |

## Quick start

```bash
npm install
npm run typecheck        # verify the workspace
npm run start:video      # boot the Video Knowledge API on :8080
```

The scaffold uses in-memory Queue/Store adapters, so it boots with **zero
external services**. Swap in Redis/Postgres adapters (same interfaces) for
production.

## Layout

```
apis/
├─ packages/
│  └─ core/          # shared: envelope, auth, rate limit, queue, store
├─ services/
│  └─ video/         # Video Knowledge API (built out)
├─ docker-compose.yml
└─ LICENSE           # MIT
```

## Contributing

Each service is self-contained under `services/<name>` and depends only on
`@klaro26/core`. Adding one means: define the output schema, implement the
pipeline seams, wire the routes. Copy `services/video` as the template.

## License

[MIT](./LICENSE) — free to self-host. A managed, hosted version is also
available for teams that would rather not run the infrastructure themselves.
