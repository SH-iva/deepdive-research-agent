import os

os.environ.setdefault("GROQ_API_KEY", "test")
os.environ.setdefault("TAVILY_API_KEY", "test")

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

client = TestClient(main.app)
VALID = {"query": "state of solid-state batteries", "thread_id": "thread_1712345678901"}


def test_health():
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "Active"


def test_research_returns_report_and_echoes_thread(monkeypatch):
    calls = {}

    def fake(query, thread_id):
        calls["args"] = (query, thread_id)
        return "## Report"

    monkeypatch.setattr(main, "run_research", fake)
    r = client.post("/api/research", json=VALID)
    assert r.status_code == 200
    assert r.json() == {"report": "## Report", "thread_id": VALID["thread_id"]}
    assert calls["args"] == (VALID["query"], VALID["thread_id"])


def test_missing_thread_id_rejected():
    r = client.post("/api/research", json={"query": "valid query here"})
    assert r.status_code == 422  # no shared default thread


def test_bad_thread_id_rejected():
    r = client.post("/api/research", json={**VALID, "thread_id": "../etc/passwd"})
    assert r.status_code == 422


def test_short_and_oversized_query_rejected():
    assert client.post("/api/research", json={**VALID, "query": "ab"}).status_code == 422
    assert client.post("/api/research", json={**VALID, "query": "x" * 1001}).status_code == 422


def test_internal_errors_do_not_leak_details(monkeypatch):
    def boom(query, thread_id):
        raise RuntimeError("GROQ key sk-secret exploded")

    monkeypatch.setattr(main, "run_research", boom)
    r = client.post("/api/research", json=VALID)
    assert r.status_code == 500
    assert "sk-secret" not in r.text


def test_cors_allows_only_configured_origins():
    ok = client.options("/api/research", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
    })
    bad = client.options("/api/research", headers={
        "Origin": "https://evil.example",
        "Access-Control-Request-Method": "POST",
    })
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers
