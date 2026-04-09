"""
DeepDive - Autonomous Research Agent
Refactored for backend deployment (FastAPI / production use).
Provides a clean interface: run_research(query) -> str
"""

import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# LangGraph imports
from langgraph.graph import StateGraph, END

# LangChain imports
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

# Tool imports with fallback
try:
    from langchain_tavily import TavilySearchResults
except ImportError:
    from langchain_community.tools import TavilySearchResults

# Load environment variables (API keys)
load_dotenv()

# ----------------------------------------------------------------------
# 1. Define Agent State (TypedDict)
# ----------------------------------------------------------------------
class AgentState(Dict[str, Any]):
    """State schema for the LangGraph agent."""
    task: str
    plan: str
    draft: str
    critique: str
    content: List[str]
    revision_number: int
    max_revisions: int

# ----------------------------------------------------------------------
# 2. Global Agent Initialization (cached for production)
# ----------------------------------------------------------------------
_AGENT_GRAPH = None

def _build_agent_graph() -> StateGraph:
    """
    Builds and compiles the LangGraph agent.
    Returns a compiled graph that can be invoked.
    """
    # Initialize LLM and search tool
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY")  # explicit for safety
    )
    search_tool = TavilySearchResults(
        max_results=5,
        api_key=os.getenv("TAVILY_API_KEY")
    )

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
            HumanMessage(content=state['task'])
        ]
        response = llm.invoke(messages)
        return {"plan": response.content}

    # ---- Node: Researcher ----
    def researcher_node(state: AgentState) -> Dict[str, Any]:
        # Parse plan into individual queries
        queries = [q.strip() for q in state['plan'].split('\n') if q.strip()]
        combined_content = []

        for q in queries[:3]:  # limit to first 3
            try:
                results = search_tool.invoke(q)
                for res in results:
                    combined_content.append(
                        f"Source: {res['url']}\nContent: {res['content']}\n"
                    )
            except Exception:
                # Silently skip failed searches in production
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
        
        USER REQUEST: {state['task']}
        
        RESEARCH DATA:
        {state['content']}
        """
        response = llm.invoke([HumanMessage(content=prompt)])
        return {"draft": response.content}

    # ---- Build graph ----
    builder = StateGraph(AgentState)
    builder.add_node("planner", planner_node)
    builder.add_node("researcher", researcher_node)
    builder.add_node("writer", writer_node)

    builder.set_entry_point("planner")
    builder.add_edge("planner", "researcher")
    builder.add_edge("researcher", "writer")
    builder.add_edge("writer", END)

    return builder.compile()


def get_agent():
    """
    Returns a singleton instance of the compiled LangGraph agent.
    Caches the graph to avoid rebuilding on every request.
    """
    global _AGENT_GRAPH
    if _AGENT_GRAPH is None:
        _AGENT_GRAPH = _build_agent_graph()
    return _AGENT_GRAPH


# ----------------------------------------------------------------------
# 3. Public API Function for Backend
# ----------------------------------------------------------------------
def run_research(task: str, max_revisions: int = 2) -> str:
    """
    Execute the DeepDive research agent on a given task.

    Parameters
    ----------
    task : str
        The research question or topic (e.g., "What is the projected global market size of Generative AI in healthcare by 2026?").
    max_revisions : int, optional
        Maximum number of revision cycles (currently not used in linear flow, but kept for API consistency).

    Returns
    -------
    str
        A fully cited, markdown-formatted research report.

    Raises
    ------
    ValueError
        If the input task is empty or not a string.
    RuntimeError
        If the agent execution fails unexpectedly.
    """
    # Input validation
    if not isinstance(task, str) or not task.strip():
        raise ValueError("Task must be a non-empty string.")

    # Prepare initial state
    initial_state: AgentState = {
        "task": task,
        "plan": "",
        "draft": "",
        "critique": "",
        "content": [],
        "revision_number": 0,
        "max_revisions": max_revisions
    }

    try:
        agent = get_agent()
        final_state = agent.invoke(initial_state)
        return final_state["draft"]
    except Exception as e:
        raise RuntimeError(f"Research agent failed: {str(e)}") from e


# ----------------------------------------------------------------------
# Optional: Simple test if script is run directly (not for production)
# ----------------------------------------------------------------------
if __name__ == "__main__":
    # Example usage (won't run when imported)
    test_query = "What is the projected global market size of Generative AI in healthcare by 2026? Include top 3 companies."
    try:
        report = run_research(test_query)
        print(report)
    except Exception as e:
        print(f"Error: {e}")