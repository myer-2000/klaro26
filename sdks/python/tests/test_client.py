"""Unit tests for the Klaro26 Python SDK.

Dependency-free: we monkeypatch the client's requests.Session with a fake that
records calls and returns canned responses — no network, no extra packages.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from klaro26 import Klaro26, Klaro26Error  # noqa: E402


class FakeResponse:
    def __init__(self, status_code=200, payload=None, headers=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else {"ok": True, "data": {}}
        self.headers = headers or {}
        self.reason = "OK"

    def json(self):
        return self._payload


class FakeSession:
    """Returns queued responses and records every request() call."""

    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []
        self.headers = {}

    def request(self, method, url, json=None, params=None, timeout=None):
        self.calls.append(
            {"method": method, "url": url, "json": json, "params": params}
        )
        resp = self._responses.pop(0)
        if isinstance(resp, Exception):
            raise resp
        return resp


def make(responses, **kw):
    client = Klaro26(api_key="k", base_url="http://api.test", **kw)
    client._session = FakeSession(responses)
    return client


def test_api_key_required():
    with pytest.raises(ValueError):
        Klaro26(api_key="")


def test_returns_data_on_success():
    c = make([FakeResponse(200, {"ok": True, "data": {"name": "OpenAI"}})])
    out = c.company.lookup(name="OpenAI")
    assert out == {"name": "OpenAI"}
    call = c._session.calls[0]
    assert call["method"] == "GET"
    assert call["params"] == {"name": "OpenAI"}


def test_company_sections_joined():
    c = make([FakeResponse(200, {"ok": True, "data": {}})])
    c.company.lookup(name="Acme", sections=["funding", "pricing"])
    assert c._session.calls[0]["params"]["sections"] == "funding,pricing"


def test_memory_recall_posts_body():
    c = make([FakeResponse(200, {"ok": True, "data": {"matches": []}})])
    c.memory.recall(query="hi", namespace="n", k=3)
    call = c._session.calls[0]
    assert call["method"] == "POST"
    assert call["url"].endswith("/memory/recall")
    assert call["json"] == {"query": "hi", "namespace": "n", "k": 3}


def test_none_values_dropped_from_body():
    c = make([FakeResponse(200, {"ok": True, "data": {"id": "1", "deduped": False}})])
    c.index.add(text="hello")  # url and title are None
    body = c._session.calls[0]["json"]
    assert "url" not in body and "title" not in body
    assert body["text"] == "hello"


def test_api_error_raises():
    c = make([FakeResponse(400, {"ok": False, "error": {"code": "invalid_request", "message": "bad"}})])
    with pytest.raises(Klaro26Error) as exc:
        c.company.lookup(name="x")
    assert exc.value.code == "invalid_request"
    assert exc.value.status == 400


def test_retries_on_429_then_succeeds():
    c = make(
        [
            FakeResponse(429, {"ok": False, "error": {"code": "rate_limited", "message": "slow"}}, {"retry-after": "0"}),
            FakeResponse(200, {"ok": True, "data": {"ok": 1}}),
        ],
        max_retries=2,
    )
    out = c.company.lookup(name="x")
    assert out == {"ok": 1}
    assert len(c._session.calls) == 2


def test_job_run_polls_until_done():
    c = make(
        [
            FakeResponse(202, {"ok": True, "data": {"id": "j", "status": "queued"}}),
            FakeResponse(200, {"ok": True, "data": {"id": "j", "status": "running"}}),
            FakeResponse(200, {"ok": True, "data": {"id": "j", "status": "done", "result": {"title": "T"}}}),
        ]
    )
    out = c.extract.run(url="https://x.com", poll_seconds=0.001)
    assert out == {"title": "T"}


def test_job_run_raises_on_failure():
    c = make(
        [
            FakeResponse(202, {"ok": True, "data": {"id": "j", "status": "queued"}}),
            FakeResponse(200, {"ok": True, "data": {"id": "j", "status": "failed", "error": "nope"}}),
        ]
    )
    with pytest.raises(Klaro26Error):
        c.extract.run(url="https://x.com", poll_seconds=0.001)
