# Klaro26 — Python SDK

Official Python client for the [Klaro26 APIs](https://github.com/myer-2000/klaro26) —
clean, structured data for AI agents. One client, every endpoint, one predictable
dict back.

- **One dependency** — `requests`.
- **Handles the hard parts** — async job polling, timeouts, and automatic retries with backoff.
- **Every endpoint** — job-based and synchronous, all 11 APIs.

## Install

```bash
pip install klaro26   # once published
# or, from this repo:
pip install ./sdks/python
```

## Quick start

```python
from klaro26 import Klaro26

klaro = Klaro26(api_key="klaro26_dev_key")  # or base_url="https://api.klaro26.dev"

# job-based endpoints — submit + poll until done, then one clean schema
video = klaro.video.run(url="https://youtube.com/watch?v=...", embeddings=True)
print(video["summary"])

# synchronous endpoints return directly
company = klaro.company.lookup(name="OpenAI", sections=["funding", "pricing"])
print(company["competitors"])
```

## Configuration

```python
klaro = Klaro26(
    api_key="klaro26_dev_key",
    base_url="https://api.klaro26.dev",  # defaults to http://localhost:8080
    timeout=30.0,                        # per-request timeout (seconds)
    max_retries=2,                       # retries on 429 / 5xx / network errors
    headers={"x-tenant": "acme"},        # merged into every request
)
```

Requests automatically retry on `408`, `429`, and `5xx` responses (and network errors)
with capped exponential backoff, honouring `Retry-After` when present. Deliberate API
errors (`4xx`) raise `Klaro26Error` immediately.

## Endpoints

```python
# job-based: .submit / .get / .run
klaro.video.run(url="https://youtube.com/watch?v=...", embeddings=True)
klaro.document.run(url="https://example.com/report.pdf")
klaro.markdown.run(url="https://youtube.com/watch?v=...")
klaro.extract.run(url="https://acme.com", fields=["pricing", "faq"])
klaro.research.run(query="battery tech", depth="deep")
klaro.browse.run(task="Find the cheapest flight to Tokyo", return_="structured")

# synchronous
klaro.company.lookup(name="OpenAI")
klaro.person.resolve(name="John Doe", hint="acme.com")

klaro.memory.remember(text="The user prefers dark mode.", namespace="u42")
klaro.memory.recall(query="user preferences", namespace="u42", k=5)

klaro.index.add(url="https://example.com/article")
klaro.index.search(query="open source API company", k=5)

klaro.registry.search("database")
klaro.registry.get("postgres")
```

## Error handling

```python
from klaro26 import Klaro26, Klaro26Error

try:
    klaro.video.run(url="not-a-url")
except Klaro26Error as e:
    print(e.code, e.status, e)
```

## License

MIT — the whole Klaro26 stack is open source. Self-host it, or use the hosted API.
