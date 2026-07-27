"""Official Python client for the Klaro26 APIs.

    from klaro26 import Klaro26

    klaro = Klaro26(api_key="klaro26_dev_key")
    result = klaro.video.run(url="https://youtube.com/watch?v=...")
    print(result["summary"])

Only dependency: `requests`.
"""

from __future__ import annotations

import time
from typing import Any, Dict, Optional

import requests

__all__ = ["Klaro26", "Klaro26Error"]
__version__ = "0.1.0"


class Klaro26Error(Exception):
    def __init__(self, code: str, message: str, status: int):
        super().__init__(f"[{code}] {message}")
        self.code = code
        self.status = status


class _Video:
    def __init__(self, client: "Klaro26"):
        self._client = client

    def submit(self, url: str, embeddings: bool = False) -> Dict[str, Any]:
        return self._client._request(
            "POST", "/video", {"url": url, "embeddings": embeddings}
        )

    def get(self, job_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/video/{job_id}")

    def run(
        self,
        url: str,
        embeddings: bool = False,
        poll_seconds: float = 1.0,
        timeout_seconds: float = 300.0,
    ) -> Dict[str, Any]:
        job = self.submit(url, embeddings)
        job_id = job["id"]
        deadline = time.time() + timeout_seconds
        while True:
            state = self.get(job_id)
            if state["status"] == "done":
                return state["result"]
            if state["status"] == "failed":
                raise Klaro26Error("job_failed", state.get("error", "Job failed"), 200)
            if time.time() > deadline:
                raise Klaro26Error("timeout", f"Job {job_id} timed out", 200)
            time.sleep(poll_seconds)


class Klaro26:
    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:8080",
    ):
        if not api_key:
            raise ValueError("Klaro26: api_key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.video = _Video(self)

    def _request(
        self, method: str, path: str, body: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        resp = requests.request(
            method,
            f"{self.base_url}{path}",
            headers={"authorization": f"Bearer {self.api_key}"},
            json=body,
            timeout=30,
        )
        payload = resp.json()
        if not payload.get("ok"):
            err = payload.get("error", {})
            raise Klaro26Error(
                err.get("code", "error"),
                err.get("message", resp.reason),
                resp.status_code,
            )
        return payload["data"]
