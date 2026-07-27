# Klaro26 — Python SDK

Official Python client for the [Klaro26 APIs](../../README.md).

## Install

```bash
pip install klaro26   # once published
# or, from this repo:
pip install ./sdks/python
```

## Use

```python
from klaro26 import Klaro26

klaro = Klaro26(api_key="klaro26_dev_key")  # or base_url="https://api.klaro26.dev"

# submit + poll until done, then get one clean schema back
result = klaro.video.run(url="https://youtube.com/watch?v=...", embeddings=True)

print(result["summary"])
for chapter in result["chapters"]:
    print(chapter["start"], chapter["title"])
```

Lower-level control:

```python
job = klaro.video.submit(url="https://youtube.com/watch?v=...")
state = klaro.video.get(job["id"])
print(state["status"])
```
