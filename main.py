from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import run_research 

# Initialize the FastAPI app
app = FastAPI(title="Deep Dive API", version="1.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Added thread_id so the frontend can track conversations
class ResearchRequest(BaseModel):
    query: str
    thread_id: str = "default_thread"

class ResearchResponse(BaseModel):
    report: str
    thread_id: str

# Create the API Endpoint
@app.post("/api/research", response_model=ResearchResponse)
async def generate_research_report(request: ResearchRequest):
    try:
        # Pass the thread_id securely down to the agent
        markdown_report = run_research(request.query, thread_id=request.thread_id)
        return ResearchResponse(report=markdown_report, thread_id=request.thread_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Simple health check
@app.get("/health")
async def health_check():
    return {"status": "Active", "agent": "Deep Dive Ready"}