# AGENTS.md: guidance for AI coding agents working on DeepDive

## Layout
- `agent.py`: LangGraph graph (planner → researcher → writer, plus a refiner for follow-ups). `run_research(task, thread_id)` is the only public entry point.
- `main.py`: FastAPI app. Input validation lives in the Pydantic models.
- `deepdive-frontend/`: React + Vite UI, Clerk auth, Supabase for report history.
- `tests/`: backend (pytest). `deepdive-frontend/src/*.test.js`: frontend (vitest).

## Commands (all must pass before a PR)
- Backend: `pip install -r requirements-dev.txt && pytest -q`
- Frontend: `cd deepdive-frontend && npm ci && npm run lint && npm test && npm run build`

## Rules
- Never commit `.env` files or keys. Add new variables to the matching `.env.example`.
- Agents must not call real LLM/search APIs in tests. Mock `main.run_research` or the tool objects.
- `thread_id` is required on every research request; never reintroduce a shared default.
- Only render http(s) links from model output. Never use `dangerouslySetInnerHTML` on model output.
- Keep PRs small, and describe what changed, why, and how it was verified.

## Known gaps (don't claim otherwise in docs)
- The API does not yet verify the Clerk JWT; Supabase RLS protects stored history only.
- `MemorySaver` is in-process memory: it resets on restart and is not shared across instances.
