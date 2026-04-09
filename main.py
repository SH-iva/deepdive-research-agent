from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import run_research  # Importing your clean function from agent.py

# Initialize the FastAPI app
app = FastAPI(title="Deep Dive API", version="1.0")

# Setup CORS (CRITICAL: This allows your frontend to talk to your backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, change this to your Vercel/Netlify URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the data structure we expect from the frontend
class ResearchRequest(BaseModel):
    query: str

class ResearchResponse(BaseModel):
    report: str

# Create the API Endpoint
@app.post("/api/research", response_model=ResearchResponse)
async def generate_research_report(request: ResearchRequest):
    try:
        # Call the DeepSeek-refactored logic
        markdown_report = run_research(request.query)
        return ResearchResponse(report=markdown_report)
    except Exception as e:
        # If something goes wrong, send a 500 error to the frontend
        raise HTTPException(status_code=500, detail=str(e))

# Simple health check endpoint to make sure the server is awake
@app.get("/health")
async def health_check():
    return {"status": "Active", "agent": "Deep Dive Ready"}