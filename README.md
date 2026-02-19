# 🕵️‍♂️ DeepDive: Autonomous AI Research Agent

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![LangGraph](https://img.shields.io/badge/LangGraph-Agentic_AI-orange.svg)
![Groq](https://img.shields.io/badge/Groq-Llama_3-black.svg)
![Streamlit](https://img.shields.io/badge/Streamlit-UI-red.svg)

**DeepDive** is an autonomous, multi-agent research system that moves beyond simple LLM wrappers. It actively plans research strategies, browses the live internet for up-to-date data, fact-checks its findings, and generates fully cited, data-driven reports.

*Built to solve LLM hallucinations and the "knowledge cutoff" problem.*

---

## 🚀 See it in Action
*(Insert a link to your LinkedIn video or a GIF of the Streamlit UI working here)*

## 🧠 System Architecture

Unlike traditional linear chains (DAGs), DeepDive uses a **Stateful Multi-Agent Architecture** powered by LangGraph. 

1. **The Planner Node:** Breaks down complex user queries into specific, data-focused search tasks.
2. **The Researcher Node:** Uses the Tavily API to execute live web searches, bypassing standard LLM knowledge cutoffs to fetch real-time market data, statistics, and news.
3. **The Writer/Critic Node:** Synthesizes the retrieved data enforcing strict constraints: it *must* cite sources using Markdown hyperlinks and is forbidden from hallucinating data it cannot verify.

## ⚡ Key Features

- **Agentic Workflow:** Employs LangGraph to pass state between specialized LLM personas.
- **Live Web Browsing:** Integrates with Tavily Search API for real-time data retrieval.
- **Strict Fact-Checking:** Engineered prompts force the LLM to provide inline citations `[Source](URL)` for every statistic or claim.
- **Modern UI:** A clean, "Glassmorphism" dark-mode dashboard built with Streamlit, featuring real-time execution tracking and downloadable Markdown reports.

## 🛠️ Tech Stack

- **Orchestration:** LangGraph, LangChain
- **LLM / Inference:** Groq API (Llama-3.3-70b-versatile) for ultra-low latency reasoning.
- **Search Tooling:** Tavily API
- **Frontend / UI:** Streamlit (with custom CSS)
- **Language:** Python 

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone [https://github.com/yourusername/deepdive-agent.git](https://github.com/yourusername/deepdive-agent.git)
cd deepdive-agent