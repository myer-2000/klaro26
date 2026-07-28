"""Official Python client for the Klaro26 APIs.

    from klaro26 import Klaro26

    klaro = Klaro26(api_key="klaro26_dev_key")

    # job-based endpoints — submit + poll until done
    video = klaro.video.run(url="https://youtube.com/watch?v=...")
    print(video["summary"])

    # synchronous endpoints return directly
    company = klaro.company.lookup(name="OpenAI")
    print(company["competitors"])

One dependency: `requests`. Automatic retries with backoff on 429 / 5xx /
network errors, configurable timeout, and clean typed dict results.
"""

from __future__ import annotations

import random
import time
from typing import Any, Dict, List, Optional

import requests

__all__ = ["Klaro26", "Klaro26Error"]
__version__ = "0.2.0"

_RETRYABLE = {408, 429, 500, 502, 503, 504}


class Klaro26Error(Exception):
    def __init__(self, code: str, message: str, status: int):
        super().__init__(f"[{code}] {message}")
        self.code = code
        self.status = status


# --------------------------------------------------------------------------- #
# Job-based endpoints (submit + poll)
# --------------------------------------------------------------------------- #


class _Job:
    """Shared submit/get/run for endpoints that return a job to poll."""

    _path = ""

    def __init__(self, client: "Klaro26"):
        self._client = client

    def submit(self, **body: Any) -> Dict[str, Any]:
        return self._client._request("POST", self._path, body)

    def get(self, job_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"{self._path}/{job_id}")

    def run(
        self,
        poll_seconds: float = 1.0,
        timeout_seconds: float = 300.0,
        **body: Any,
    ) -> Dict[str, Any]:
        job = self.submit(**body)
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


class _Video(_Job):
    _path = "/video"

    def run(self, url: str, embeddings: bool = False, **kw: Any) -> Dict[str, Any]:
        return super().run(url=url, embeddings=embeddings, **kw)


class _Document(_Job):
    _path = "/document"

    def run(
        self,
        url: Optional[str] = None,
        content: Optional[str] = None,
        ocr: bool = False,
        **kw: Any,
    ) -> Dict[str, Any]:
        return super().run(url=url, content=content, ocr=ocr, **kw)


class _Markdown(_Job):
    _path = "/markdown"

    def run(
        self,
        url: str,
        html: Optional[str] = None,
        embeddings: bool = False,
        **kw: Any,
    ) -> Dict[str, Any]:
        return super().run(url=url, html=html, embeddings=embeddings, **kw)


class _Extract(_Job):
    _path = "/extract"

    def run(
        self, url: str, fields: Optional[List[str]] = None, **kw: Any
    ) -> Dict[str, Any]:
        return super().run(url=url, fields=fields, **kw)


class _Research(_Job):
    _path = "/research"

    def run(self, query: str, depth: str = "standard", **kw: Any) -> Dict[str, Any]:
        return super().run(query=query, depth=depth, **kw)


class _Browse(_Job):
    _path = "/browse"

    def run(
        self, task: str, return_: str = "structured", **kw: Any
    ) -> Dict[str, Any]:
        return super().run(task=task, **{"return": return_}, **kw)


# --------------------------------------------------------------------------- #
# Synchronous endpoints
# --------------------------------------------------------------------------- #


class _Company:
    def __init__(self, client: "Klaro26"):
        self._client = client

    def lookup(self, name: str, sections: Optional[List[str]] = None) -> Dict[str, Any]:
        params = {"name": name}
        if sections:
            params["sections"] = ",".join(sections)
        return self._client._request("GET", "/company", params=params)


class _Person:
    def __init__(self, client: "Klaro26"):
        self._client = client

    def resolve(self, name: str, hint: Optional[str] = None) -> Dict[str, Any]:
        params = {"name": name}
        if hint:
            params["hint"] = hint
        return self._client._request("GET", "/person", params=params)


class _Memory:
    def __init__(self, client: "Klaro26"):
        self._client = client

    def remember(
        self,
        text: str,
        namespace: str = "default",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        body = {"text": text, "namespace": namespace}
        if metadata:
            body["metadata"] = metadata
        return self._client._request("POST", "/memory", body)

    def recall(
        self, query: str, namespace: str = "default", k: int = 5
    ) -> Dict[str, Any]:
        return self._client._request(
            "POST", "/memory/recall", {"query": query, "namespace": namespace, "k": k}
        )

    def get(self, memory_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/memory/{memory_id}")

    def forget(self, memory_id: str) -> Dict[str, Any]:
        return self._client._request("DELETE", f"/memory/{memory_id}")


class _Index:
    def __init__(self, client: "Klaro26"):
        self._client = client

    def add(
        self,
        url: Optional[str] = None,
        text: Optional[str] = None,
        title: Optional[str] = None,
        collection: str = "web",
    ) -> Dict[str, Any]:
        return self._client._request(
            "POST",
            "/index",
            {"url": url, "text": text, "title": title, "collection": collection},
        )

    def search(
        self, query: str, collection: str = "web", k: int = 5
    ) -> Dict[str, Any]:
        return self._client._request(
            "POST", "/index/search", {"query": query, "collection": collection, "k": k}
        )

    def get(self, doc_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/index/{doc_id}")


class _Registry:
    def __init__(self, client: "Klaro26"):
        self._client = client

    def register(self, **entry: Any) -> Dict[str, Any]:
        return self._client._request("POST", "/registry", entry)

    def list(self) -> Dict[str, Any]:
        return self._client._request("GET", "/registry")

    def search(self, query: str, k: int = 10) -> Dict[str, Any]:
        return self._client._request(
            "GET", "/registry/search", params={"q": query, "k": k}
        )

    def get(self, server_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/registry/{server_id}")


# --------------------------------------------------------------------------- #
# Client
# --------------------------------------------------------------------------- #


class Klaro26:
    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:8080",
        timeout: float = 30.0,
        max_retries: int = 2,
        headers: Optional[Dict[str, str]] = None,
    ):
        if not api_key:
            raise ValueError("Klaro26: api_key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self._session = requests.Session()
        self._session.headers.update(
            {
                "authorization": f"Bearer {api_key}",
                "user-agent": f"klaro26-sdk-python/{__version__}",
                "accept": "application/json",
                **(headers or {}),
            }
        )

        # job-based
        self.video = _Video(self)
        self.document = _Document(self)
        self.markdown = _Markdown(self)
        self.extract = _Extract(self)
        self.research = _Research(self)
        self.browse = _Browse(self)
        # synchronous
        self.company = _Company(self)
        self.person = _Person(self)
        self.memory = _Memory(self)
        self.index = _Index(self)
        self.registry = _Registry(self)

    def _request(
        self,
        method: str,
        path: str,
        body: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        # Drop None values so optional fields aren't sent as null.
        clean = {k: v for k, v in body.items() if v is not None} if body else None
        url = f"{self.base_url}{path}"

        last_exc: Optional[Exception] = None
        for attempt in range(self.max_retries + 1):
            try:
                resp = self._session.request(
                    method, url, json=clean, params=params, timeout=self.timeout
                )
            except requests.RequestException as exc:  # network / timeout
                last_exc = exc
                if attempt < self.max_retries:
                    time.sleep(self._backoff(attempt, None))
                    continue
                raise Klaro26Error("network_error", str(exc), 0) from exc

            if resp.status_code in _RETRYABLE and attempt < self.max_retries:
                time.sleep(self._backoff(attempt, resp.headers.get("retry-after")))
                continue

            try:
                payload = resp.json()
            except ValueError as exc:
                raise Klaro26Error(
                    "bad_response",
                    f"Non-JSON response (HTTP {resp.status_code})",
                    resp.status_code,
                ) from exc

            if not payload.get("ok"):
                err = payload.get("error", {})
                raise Klaro26Error(
                    err.get("code", "error"),
                    err.get("message", resp.reason),
                    resp.status_code,
                )
            return payload["data"]

        # Exhausted retries on retryable status codes.
        raise Klaro26Error("unavailable", "Request failed after retries", 0)

    @staticmethod
    def _backoff(attempt: int, retry_after: Optional[str]) -> float:
        if retry_after:
            try:
                return min(float(retry_after), 20.0)
            except ValueError:
                pass
        return min(0.5 * (2 ** attempt), 8.0) + random.random() * 0.25
