# Releasing

Klaro26 ships two SDKs: `@klaro26/sdk` (npm) and `klaro26` (PyPI). Both are
versioned together and published from this repo.

## One-time setup

**npm**

1. Create the `@klaro26` scope by signing up / creating an org on
   [npmjs.com](https://www.npmjs.com) with the username or org `klaro26`.
2. Create an **Automation** access token (Account → Access Tokens).
3. Add it to the GitHub repo as a secret named `NPM_TOKEN`
   (Settings → Secrets and variables → Actions).

**PyPI** (recommended: Trusted Publishing, no token to manage)

1. Create the project on [PyPI](https://pypi.org) (or let the first upload create it).
2. Add a **Trusted Publisher**: PyPI → your project → Publishing → add
   - Owner: `myer-2000`
   - Repository: `klaro26`
   - Workflow: `release.yml`
   - Environment: (leave blank)

   No token needed — the workflow authenticates via OIDC.

## Cutting a release

1. Bump the version in **both** packages so they stay in lockstep:
   - `packages/sdk/package.json` → `version`
   - `packages/sdk/src/index.ts` → `VERSION`
   - `sdks/python/pyproject.toml` → `version`
   - `sdks/python/klaro26/__init__.py` → `__version__`
2. Commit, then tag and push:

   ```bash
   git commit -am "Release v0.2.1"
   git tag v0.2.1
   git push origin main --tags
   ```

3. The [`Release`](.github/workflows/release.yml) workflow builds and publishes
   both SDKs automatically.

## Publishing by hand

If you'd rather not use CI:

```bash
# npm (from repo root)
npm login
npm run release:sdk        # builds + publishes @klaro26/sdk (public)

# PyPI
npm run release:python     # builds the wheel/sdist, then twine upload
```

`release:python` needs `build` and `twine` installed (`pip install build twine`)
and a `~/.pypirc` or `TWINE_*` env vars for auth.
