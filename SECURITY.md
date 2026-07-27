# Security Policy

## Reporting a vulnerability

If you find a security issue in Klaro26, please **do not open a public issue.**
Instead, email the maintainers with:

- a description of the vulnerability,
- steps to reproduce,
- the affected endpoint / package and version.

We'll acknowledge within a few business days and keep you updated as we work on a fix.

## Scope

- The API services (`services/*`), the shared core (`packages/core`), the SDKs
  (`packages/sdk`, `sdks/python`), and the MCP tools (`packages/mcp`).
- API keys are secrets — never commit them. The dev key `klaro26_dev_key` is for
  local use only and grants no access to any hosted service.

## Supported versions

Klaro26 is pre-1.0. Security fixes land on `main`.
