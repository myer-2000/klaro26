"""Quickstart — Python SDK.

1. Start the API:  KLARO26_API_KEYS=klaro26_dev_key npm run start:video
2. Run this file:  python examples/quickstart.py
"""

import os

from klaro26 import Klaro26

klaro = Klaro26(
    api_key=os.environ.get("KLARO26_API_KEY", "klaro26_dev_key"),
    base_url=os.environ.get("KLARO26_BASE_URL", "http://localhost:8080"),
)

result = klaro.video.run(
    url="https://youtube.com/watch?v=dQw4w9WgXcQ",
    embeddings=True,
)

print("Summary:", result["summary"])
print("Chapters:")
for chapter in result["chapters"]:
    print(f"  {chapter['start']}s  {chapter['title']}")
