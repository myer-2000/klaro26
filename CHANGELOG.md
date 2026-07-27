# Changelog

All notable changes to Klaro26 are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
semantic versioning once it reaches 1.0.

## [Unreleased]

### Added
- Video Knowledge API (`POST /video`) — reference service.
- Shared core (`@klaro26/core`): response envelope, API-key auth, token-bucket
  rate limiting, pluggable Queue / Store interfaces.
- TypeScript SDK (`@klaro26/sdk`) with `video.submit` / `video.get` / `video.run`.
- Python SDK (`klaro26`).
- MCP tools (`@klaro26/mcp`).
- Docker Compose, OpenAPI spec, and `.http` examples for the video service.
- Examples, CI, and contribution docs.

### Planned
- `POST /document`, `POST /markdown`, `POST /extract`, `POST /research`,
  `GET /company`, `GET /person`, `POST /browse`.
