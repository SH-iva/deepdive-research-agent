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
        model="llama-3.3-70b-versatile",
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY")
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
            HumanMessage(content=state.get('task', ''))
        ]
        response = llm.invoke(messages)
        return {"plan": response.content}

    # ---- Node: Researcher ----
    def researcher_node(state: AgentState) -> Dict[str, Any]:
        queries = [q.strip() for q in state.get('plan', '').split('\n') if q.strip()]
        combined_content = []

        for q in queries[:3]:  
            try:
                results = search_tool.invoke(q)
                for res in results:
                    combined_content.append(
                        f"Source: {res['url']}\nContent: {res['content']}\n"
                    )
            except Exception:
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
        
        RESEARCH DATA:
        {state.get('content', [])}
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