import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

# --- ROBUST IMPORT BLOCK ---
# We try the new way first, then fall back to the standard community way.
try:
    from langchain_tavily import TavilySearchResults
except ImportError:
    from langchain_community.tools import TavilySearchResults
# ---------------------------

# 1. Load Secrets
load_dotenv()

# 2. Setup Tools
# Tavily will search the web for us
search_tool = TavilySearchResults(max_results=3)

# 3. Setup LLM (The Brain)
# Using the latest Llama 3.3 model on Groq
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)

# 4. Simple Test Function
def run_simple_search(query):
    print(f"🔎 Searching for: {query}...")
    
    try:
        # Execute search
        results = search_tool.invoke(query)
        
        print("\n✅ Raw Search Results:")
        for result in results:
            print(f"- {result['url']}: {result['content'][:100]}...")

        # Ask LLM to summarize
        print("\n🤖 AI Summary:")
        # We pass the search results explicitly to the LLM
        response = llm.invoke(f"Summarize these search results for the user query '{query}': {results}")
        print(response.content)
        
    except Exception as e:
        print(f"\n❌ Error during execution: {e}")

if __name__ == "__main__":
    run_simple_search("What is the latest advancement in Solid State Batteries 2025?")