# DeepDive: Autonomous AI Research Agent

[![CI](https://github.com/SH-iva/deepdive-research-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/SH-iva/deepdive-research-agent/actions/workflows/ci.yml)

DeepDive is a full-stack research assistant. You ask a question; a LangGraph agent plans search queries, pulls live web results, and writes a structured markdown report with source links. You can then ask follow-ups that refine the report instead of starting over.

**Live demo:** https://deepdive-research-agent.vercel.app  
**API health check:** https://deepdive-api-b6ww.onrender.com/health

> If the API host sleeps when idle (common on free tiers), the first request can be slow while it wakes up.

## How it works

```mermaid
flowchart LR
    U[User] --> FE[React + Vite<br/>Vercel]
    FE -- Clerk JWT --> DB[(Supabase Postgres<br/>reports, RLS)]
    FE -- POST /api/research --> API[FastAPI<br/>Render]
    API --> G{{LangGraph}}
    G -->|first message in thread| P[Planner<br/>3 search queries]
    P --> R[Researcher<br/>Tavily search]
    R --> W[Writer<br/>cited report]
    G -->|draft already in thread| F[Refiner<br/>rewrite / answer]
    P & W & F -. Llama 3.3 70B .-> LLM[Groq]
```

- **Planner → Researcher → Writer:** one LLM call turns the question into 3 search queries, Tavily fetches up to 5 results per query, and a second LLM call writes the report using only that research. The writer is instructed to cite every statistic with a markdown link and to say "Data not found" instead of inventing figures.
- **Follow-ups:** LangGraph's `MemorySaver` checkpointer keeps state per `thread_id`. If a draft already exists in the thread, a conditional edge routes to a **Refiner** node instead of re-running the search.
- **Auth and history:** Clerk handles sign-in. The frontend passes a Clerk-issued JWT to Supabase so that Row Level Security can scope each user's saved reports to their own rows.
- **Export:** client-side HTML-to-PDF in a print-friendly light theme.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, Vite, Clerk, supabase-js, html2pdf.js |
| Backend | FastAPI, Pydantic, Uvicorn |
| Agent | LangGraph, LangChain, Groq (Llama 3.3 70B), Tavily |
| Data | Supabase (PostgreSQL) with Row Level Security |
| Quality | pytest, vitest, ESLint, GitHub Actions CI |

## Repository layout

```text
.
├── agent.py                  # LangGraph state machine (planner, researcher, writer, refiner)
├── main.py                   # FastAPI app: validation, CORS, /api/research, /health
├── tests/test_api.py         # backend tests (agent mocked; no real API calls)
├── requirements.txt          # runtime dependencies
├── requirements-dev.txt      # + pytest, httpx
├── AGENTS.md                 # guidance for AI coding agents working in this repo
├── .github/workflows/ci.yml  # pytest + eslint + vitest + build
└── deepdive-frontend/        # React + Vite app
    └── src/
        ├── App.jsx           # UI, auth gating, API calls, markdown rendering
        ├── parseInline.js    # safe bold/link parsing (+ tests)
        └── supabase.js       # Supabase client with Clerk JWT injection
```

## Run locally

**Backend**
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # add GROQ_API_KEY and TAVILY_API_KEY
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd deepdive-frontend
cp .env.example .env            # add Clerk + Supabase keys
npm install
npm run dev                     # http://localhost:5173, talks to http://localhost:8000
```

**Tests**
```bash
pip install -r requirements-dev.txt && pytest -q
cd deepdive-frontend && npm test
```

## Security notes

- CORS only allows the configured origins (`ALLOWED_ORIGINS`; defaults to localhost and the Vercel app).
- Request bodies are validated: query length 3–1000 chars, `thread_id` must match `^[A-Za-z0-9_-]{8,64}$` and has no shared default, so callers can't fall into one common memory thread by omission.
- Server errors are logged server-side; the client only gets a generic message.
- Model output is rendered through a small parser that only produces bold text and `http(s)` links. It never injects raw HTML.
- API keys live in environment variables; `.env` files are git-ignored.

## Known limitations

- The research API does **not** yet verify the Clerk JWT, so anyone who can reach it can call it. Supabase RLS protects *stored history*, not the API. Adding JWT verification in FastAPI is the next planned change.
- `MemorySaver` is in-process: follow-up memory resets when the server restarts and isn't shared across instances. A Postgres-backed checkpointer is the planned upgrade.
- Report quality depends on search results. Citations are model-written links and are not independently fact-checked.
- No end-to-end (Playwright) tests yet.
- The Supabase table and RLS policy SQL are not yet versioned in this repo.

## Roadmap

1. Verify Clerk JWTs in FastAPI and tie `thread_id` to the authenticated user.
2. Persist LangGraph checkpoints in Postgres.
3. Add Playwright end-to-end tests and export the Supabase schema/RLS policies as SQL.
4. Add a verification step that checks cited URLs against retrieved sources.
