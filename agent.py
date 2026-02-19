import os
from typing import TypedDict, Annotated, List
from dotenv import load_dotenv

# LangGraph imports
from langgraph.graph import StateGraph, END

# LangChain imports
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

# Import our tools
try:
    from langchain_tavily import TavilySearchResults
except ImportError:
    from langchain_community.tools import TavilySearchResults

# 1. Load Environment Variables
load_dotenv()

# 2. Define the Agent's "State" (Memory)
class AgentState(TypedDict):
    task: str                   # The user's original request
    plan: str                   # The research plan
    draft: str                  # The raw gathered info
    critique: str               # The Critic's feedback
    content: List[str]          # Final search results
    revision_number: int        # How many times have we rewritten?
    max_revisions: int          # Limit to prevent infinite loops

# 3. Setup the LLM and Tools
# Using Llama 3.3 for high intelligence
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
search_tool = TavilySearchResults(max_results=5) # Increased to 5 for better depth

# --- NODE 1: THE PLANNER (Updated for Depth) ---
def planner_node(state: AgentState):
    print("--- 🧠 PLANNER: Breaking down the task ---")
    messages = [
        SystemMessage(content="""You are a Senior Research Planner. 
        Your goal is to break a user request into 3 distinct search queries that will yield HARD DATA.
        
        Rules:
        1. Focus on finding STATISTICS, PERCENTAGES, and DOLLAR AMOUNTS.
        2. Identify key entities (companies, laws, technologies).
        3. Return ONLY the 3 search queries, separated by newlines.
        """),
        HumanMessage(content=state['task'])
    ]
    response = llm.invoke(messages)
    return {"plan": response.content}

# --- NODE 2: THE RESEARCHER (Updated to parse Plan) ---
def researcher_node(state: AgentState):
    print("--- 🕵️ RESEARCHER: Searching the web ---")
    
    # Parse the plan (splitting by newlines to get queries)
    queries = state['plan'].split('\n')
    
    # Clean up queries (remove numbers like "1.")
    queries = [q.strip() for q in queries if q.strip()]
    
    combined_content = []
    
    # Search for each query in the plan
    for q in queries[:3]: # Limit to top 3 to save time/tokens
        print(f"  -> Searching for: {q}")
        try:
            results = search_tool.invoke(q)
            # Append results with Source URLs
            for res in results:
                combined_content.append(f"Source: {res['url']}\nContent: {res['content']}\n")
        except Exception as e:
            print(f"    Error searching for {q}: {e}")
            
    return {"content": combined_content}

# --- NODE 3: THE WRITER (Updated for Citations) ---
def writer_node(state: AgentState):
    print("--- ✍️ WRITER: Drafting the report ---")
    prompt = f"""
    You are a Data-Driven Technical Writer. Write a professional report based ONLY on the provided research.
    
    STRICT RULES:
    1. You MUST cite your sources using Markdown hyperlinks: [Source Name](URL).
    2. Every statistic (%%, $$) must be cited immediately.
    3. Do not invent information. If the research is missing, state "Data not found."
    4. Format with H2 Headers (##) and Bullet points.
    
    USER REQUEST: {state['task']}
    
    RESEARCH DATA:
    {state['content']}
    """
    messages = [HumanMessage(content=prompt)]
    response = llm.invoke(messages)
    return {"draft": response.content}

# 4. Build the Graph
builder = StateGraph(AgentState)

builder.add_node("planner", planner_node)
builder.add_node("researcher", researcher_node)
builder.add_node("writer", writer_node)

builder.set_entry_point("planner")

builder.add_edge("planner", "researcher")
builder.add_edge("researcher", "writer")
builder.add_edge("writer", END)

graph = builder.compile()

# --- RUN THE AGENT (Testing) ---
if __name__ == "__main__":
    initial_state = {
        "task": "What is the projected global market size of Generative AI in healthcare by 2026? Include top 3 companies.",
        "plan": "",
        "draft": "",
        "critique": "",
        "content": [],
        "revision_number": 0,
        "max_revisions": 2
    }
    
    print("🚀 Starting DeepDive Agent (Data Mode)...")
    result = graph.invoke(initial_state)
    
    print("\n\n✅ FINAL REPORT:")
    print(result['draft'])