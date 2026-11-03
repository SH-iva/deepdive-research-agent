import os
from typing import List, Dict, Any, Optional, TypedDict
from dotenv import load_dotenv

# LangGraph imports
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

# LangChain imports
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

# Tool imports with fallback
try:
    from langchain_tavily import TavilySearchResults
except ImportError:
    from langchain_community.tools import TavilySearchResults

load_dotenv()

# ----------------------------------------------------------------------
# 1. Define Agent State (TypedDict is crucial for LangGraph memory)
# ----------------------------------------------------------------------
class AgentState(TypedDict, total=False):
    """State schema for the LangGraph agent."""
    task: str
    plan: str
    draft: str
    critique: str
    content: List[str]
    revision_number: int
    max_revisions: int

# ----------------------------------------------------------------------
# 2. Global Agent Initialization with Memory
# ----------------------------------------------------------------------
_AGENT_GRAPH = None
_MEMORY = MemorySaver() # Initializes the local checkpointer

def _build_agent_graph() -> StateGraph:
    llm = ChatGroq(
        model="openai/gpt-oss-120b",
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY")
    )
    # Keep search volume bounded so the writer stays within Groq's TPM limit.
    search_tool = TavilySearchResults(
        max_results=3,
        api_key=os.getenv("TAVILY_API_KEY")
    )

    MAX_SOURCES = 6
    MAX_SOURCE_CHARS = 900
    MAX_TOTAL_RESEARCH_CHARS = 6000

    def _compact_research(results: List[Dict[str, Any]], remaining_chars: int) -> List[str]:
        """Keep source URLs and concise excerpts while bounding prompt size."""
        compacted = []
        for res in results:
            if len(compacted) >= MAX_SOURCES or remaining_chars <= 0:
                break
            url = str(res.get("url", "")).strip()
            body = str(res.get("content", "")).strip()
            if not body:
                continue
            excerpt_budget = min(MAX_SOURCE_CHARS, max(0, remaining_chars - len(url) - 30))
            if excerpt_budget <= 0:
                break
            excerpt = body[:excerpt_budget]
            if len(body) > excerpt_budget:
                excerpt = excerpt.rsplit(" ", 1)[0] + "…"
            item = f"Source: {url}\\nContent: {excerpt}"
            compacted.append(item)
            remaining_chars -= len(item)
        return compacted

    # ---- Node: Planner ----
    def planner_node(state: AgentState) -> Dict[str, Any]:
        messages = [
            SystemMessage(content="""You are a Senior Research Planner. 
            Your goal is to break a user request into 3 distinct search queries that will yield HARD DATA.
            
            Rules:
            1. Focus on finding STATISTICS, PERCENTAGES, and DOLLAR AMOUNTS.
            2. Identify key entities (companies, laws, technologies).
            3. Return ONLY the 3 search queries, separated by newlines.
            """),
            HumanMessage(content=state.get('task', ''))
        ]
        response = llm.invoke(messages)
        return {"plan": response.content}

    # ---- Node: Researcher ----
    def researcher_node(state: AgentState) -> Dict[str, Any]:
        queries = [q.strip() for q in state.get('plan', '').split('\n') if q.strip()]
        combined_content = []
        remaining_chars = MAX_TOTAL_RESEARCH_CHARS

        for q in queries[:3]:
            if len(combined_content) >= MAX_SOURCES or remaining_chars <= 0:
                break
            try:
                results = search_tool.invoke(q)
                compacted = _compact_research(results[:MAX_SOURCES - len(combined_content)], remaining_chars)
                combined_content.extend(compacted)
                remaining_chars -= sum(len(item) for item in compacted)
            except Exception:
                # Continue with other queries if one search fails.
                continue

        return {"content": combined_content}

    # ---- Node: Writer ----
    def writer_node(state: AgentState) -> Dict[str, Any]:
        prompt = f"""
        You are a Data-Driven Technical Writer. Write a professional report based ONLY on the provided research.
        
        STRICT RULES:
        1. You MUST cite your sources using Markdown hyperlinks: [Source Name](URL).
        2. Every statistic (%, $) must be cited immediately.
        3. Do not invent information. If the research is missing, state "Data not found."
        4. Format with H2 Headers (##) and Bullet points.
        
        USER REQUEST: {state.get('task', '')}
        
        RESEARCH DATA (concise excerpts; cite only these URLs):
        {chr(10).join(state.get('content', []))}
        """
        response = llm.invoke([HumanMessage(content=prompt)])
        return {"draft": response.content}

    # ---- NEW Node: Refiner (For Iterative Chat) ----
    def refiner_node(state: AgentState) -> Dict[str, Any]:
        prompt = f"""
        You are a Data-Driven Technical Writer and Research Assistant.
        
        ORIGINAL REPORT YOU JUST WROTE:
        {state.get('draft', '')}
        
        USER FOLLOW-UP REQUEST:
        {state.get('task', '')}
        
        Instructions:
        1. If the user asks to rewrite, adjust, or expand a specific part of the report, rewrite the report accommodating their request while maintaining the professional Markdown formatting.
        2. If the user asks a specific question about the data in the report, answer it directly below the report or adjust the report to clarify.
        3. Do not lose any crucial citations from the original report.
        """
        response = llm.invoke([HumanMessage(content=prompt)])
        return {"draft": response.content}

    # ---- Conditional Router ----
    def route_node(state: AgentState) -> str:
        # If a draft already exists in memory, route to the refiner instead of researching again
        if state.get("draft"):
            return "refiner"
        return "planner"

    # ---- Build graph ----
    builder = StateGraph(AgentState)
    builder.add_node("planner", planner_node)
    builder.add_node("researcher", researcher_node)
    builder.add_node("writer", writer_node)
    builder.add_node("refiner", refiner_node)

    # Use the conditional edge at the start
    builder.add_conditional_edges(START, route_node)
    builder.add_edge("planner", "researcher")
    builder.add_edge("researcher", "writer")
    builder.add_edge("writer", END)
    builder.add_edge("refiner", END)

    # Attach the Memory Checkpointer here!
    return builder.compile(checkpointer=_MEMORY)


def get_agent():
    global _AGENT_GRAPH
    if _AGENT_GRAPH is None:
        _AGENT_GRAPH = _build_agent_graph()
    return _AGENT_GRAPH

# ----------------------------------------------------------------------
# 3. Public API Function for Backend
# ----------------------------------------------------------------------
def run_research(task: str, thread_id: str = "default_thread", max_revisions: int = 2) -> str:
    """
    Executes the research agent. Now supports thread_id for conversation memory.
    """
    if not isinstance(task, str) or not task.strip():
        raise ValueError("Task must be a non-empty string.")

    try:
        agent = get_agent()
        
        # This config tells LangGraph which memory compartment to open
        config = {"configurable": {"thread_id": thread_id}}
        
        # We only pass the updated task. LangGraph automatically merges this with the saved state!
        final_state = agent.invoke({"task": task}, config=config)
        return final_state.get("draft", "Error: No draft generated.")
    except Exception as e:
        raise RuntimeError(f"Research agent failed: {str(e)}") from e