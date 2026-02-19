import streamlit as st
import time
from agent import graph  # Import your existing brain

# --- PAGE CONFIGURATION (Must be first) ---
st.set_page_config(
    page_title="DeepDive | Autonomous Research Agent",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CUSTOM CSS (The "Pro" Look) ---
st.markdown("""
<style>
    /* Import modern font */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    /* Remove standard streamlit padding */
    .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
    }
    
    /* Custom Card Style for Report */
    .stMarkdown {
        background-color: #0e1117; /* Dark background match */
    }
    
    /* Status Badge Style */
    .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        background-color: #262730;
        border: 1px solid #4a4a4a;
        color: #aeaeae;
        font-size: 0.8rem;
    }
    
    /* Hide Deploy Button & Footer */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
</style>
""", unsafe_allow_html=True)

# --- SIDEBAR: CONTROLS & CONTEXT ---
with st.sidebar:
    st.title("🧠 DeepDive Agent")
    st.markdown("---")
    
    st.markdown("### ⚙️ Research Settings")
    max_revisions = st.slider("Max Research Iterations", 1, 5, 2, help="Higher = deeper research but slower.")
    
    st.markdown("### 📊 System Status")
    st.markdown(
        """
        <div class="status-badge">🟢 System: Online</div>
        <div class="status-badge" style="margin-top:5px;">⚡ Model: Llama-3-70b</div>
        <div class="status-badge" style="margin-top:5px;">🔎 Search: Tavily API</div>
        """, 
        unsafe_allow_html=True
    )
    
    st.markdown("---")
    st.caption("Built by Shiva Pandula | 2026 Portfolio")

# --- MAIN STAGE ---

# Hero Section
col1, col2 = st.columns([3, 1])
with col1:
    st.title("Autonomous Market Researcher")
    st.markdown("Enter a topic below. The agent will **Plan**, **Search** live data, **Fact-Check**, and **Write** a cited report.")

# Input Section
query = st.text_input(
    "Research Topic",
    placeholder="e.g., The impact of Generative AI on Cybersecurity jobs in 2026...",
    label_visibility="collapsed"
)

# Action Button
if st.button("🚀 Start Deep Research", type="primary", use_container_width=True):
    if not query:
        st.warning("Please enter a topic to begin.")
    else:
        # Create a placeholder for the "Thinking Process"
        with st.status("🤖 **Agent Working...**", expanded=True) as status:
            
            # 1. Initialize State
            initial_state = {
                "task": query,
                "plan": "",
                "draft": "",
                "critique": "",
                "content": [],
                "revision_number": 0,
                "max_revisions": max_revisions
            }

            st.write("🧠 **Planner Node:** Deconstructing user request into search queries...")
            time.sleep(1) # Visual pacing
            
            # RUN THE GRAPH
            # We catch the output to display later
            try:
                result = graph.invoke(initial_state)
                
                st.write("🕵️ **Researcher Node:** Browsing the web for 2026 data...")
                # Show found sources in an expander for "Proof of Work"
                with st.expander("See Gathered Sources"):
                    for item in result.get('content', []):
                        st.markdown(f"- {item[:200]}...") # Show snippet
                
                st.write("✍️ **Writer Node:** Synthesizing facts and citing sources...")
                status.update(label="✅ **Research Complete!**", state="complete", expanded=False)
                
                # --- RESULTS DISPLAY ---
                st.divider()
                
                # Metrics Row
                m1, m2, m3 = st.columns(3)
                m1.metric("Sources Analyzed", len(result.get('content', [])))
                m2.metric("Report Length", f"{len(result['draft'].split())} words")
                m3.metric("Citation Method", "Strict Markdown")
                
                st.divider()
                
                # The Report Card
                st.markdown("### 📝 Executive Report")
                st.markdown(result['draft'])
                
                st.divider()
                
                # Download Options
                st.download_button(
                    label="📥 Download as PDF (Markdown)",
                    data=result['draft'],
                    file_name=f"DeepDive_Report_{int(time.time())}.md",
                    mime="text/markdown"
                )
                
            except Exception as e:
                st.error(f"❌ An error occurred: {e}")
                status.update(label="⚠️ **System Error**", state="error")

# --- EMPTY STATE / INSTRUCTIONS ---
if not query:
    st.markdown("---")
    st.markdown("#### 💡 Try these example prompts:")
    c1, c2, c3 = st.columns(3)
    with c1:
        st.info("Global EV Market trends 2026")
    with c2:
        st.info("AI regulation in EU vs US")
    with c3:
        st.info("Future of React Server Components")