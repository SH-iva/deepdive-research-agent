import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agent import run_research

logger = logging.getLogger("deepdive")

app = FastAPI(title="Deep Dive API", version="1.1")

# Origins are configurable so staging/preview deployments don't require a code change.
DEFAULT_ORIGINS = "http://localhost:5173,https://deepdive-research-agent.vercel.app"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


class ResearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=1000)
    # No shared default: a missing thread_id must fail instead of silently
    # putting every anonymous caller into the same memory thread.
    thread_id: str = Field(pattern=r"^[A-Za-z0-9_-]{8,64}$")


class ResearchResponse(BaseModel):
    report: str
    thread_id: str


# Plain `def` (not `async def`): run_research is blocking (LLM + web search),
# so FastAPI runs it in a worker thread instead of freezing the event loop.
@app.post("/api/research", response_model=ResearchResponse)
def generate_research_report(request: ResearchRequest):
    try:
        report = run_research(request.query, thread_id=request.thread_id)
        return ResearchResponse(report=report, thread_id=request.thread_id)
    except Exception:
        # Log details server-side; don't leak internals to the client.
        logger.exception("Research run failed (thread_id=%s)", request.thread_id)
        raise HTTPException(status_code=500, detail="Research failed. Please try again.")


@app.get("/health")
def health_check():
    return {"status": "Active", "agent": "Deep Dive Ready"}
