import { useState, useEffect, useRef } from "react";
import html2pdf from "html2pdf.js";
import { SignedIn, SignedOut, SignIn, UserButton, useUser, useSession } from "@clerk/clerk-react";
import { supabaseClient } from "./supabase";
import { Analytics } from "@vercel/analytics/react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function getApiHeaders(session) {
  if (!session) throw new Error("Your session has expired. Please sign in again.");
  const token = await session.getToken();
  if (!token) throw new Error("Unable to obtain an API authentication token.");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

function renderMarkdown(text, isPrint = false) {
  const textColor = isPrint ? "#111111" : "#F5F0E8";
  const bodyColor = isPrint ? "#333333" : "rgba(245,240,232,0.7)";
  const borderColor = isPrint ? "#E2E8F0" : "rgba(255,255,255,0.08)";
  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} style={{
          fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.25rem",
          fontWeight: 400, color: textColor, marginTop: i === 0 ? 0 : "2rem",
          marginBottom: "0.75rem", paddingBottom: "0.5rem",
          borderBottom: `1px solid ${borderColor}`, letterSpacing: "0.01em",
        }}>
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("- ")) {
      const content = line.replace("- ", "");
      const parts = content.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <li key={key++} style={{ fontSize: "0.9rem", color: bodyColor, lineHeight: 1.8, marginBottom: "0.4rem", paddingLeft: "0.25rem" }}>
          {parts.map((p, idx) => idx % 2 === 1 ? <strong key={idx} style={{ color: textColor, fontWeight: 500 }}>{p}</strong> : p )}
        </li>
      );
    } else if (/^\d+\./.test(line)) {
      elements.push(
        <li key={key++} style={{ fontSize: "0.9rem", color: bodyColor, lineHeight: 1.8, marginBottom: "0.4rem", paddingLeft: "0.25rem", listStyleType: "decimal" }}>
          {line.replace(/^\d+\.\s/, "")}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: "0.5rem" }} />);
    } else {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={key++} style={{ fontSize: "0.9rem", color: bodyColor, lineHeight: 1.85, marginBottom: "0.25rem" }}>
          {parts.map((p, idx) => idx % 2 === 1 ? <strong key={idx} style={{ color: textColor, fontWeight: 500 }}>{p}</strong> : p )}
        </p>
      );
    }
  }

  const grouped = [];
  let listBuffer = [];
  let listType = null;

  for (const el of elements) {
    if (el.type === "li") {
      const isOrdered = el.props.style?.listStyleType === "decimal";
      const currentType = isOrdered ? "ol" : "ul";
      if (listType !== currentType && listBuffer.length > 0) {
        grouped.push(listType === "ol" ? <ol key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem", color: bodyColor }}>{listBuffer}</ol> : <ul key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem", listStyleType: "disc", color: bodyColor }}>{listBuffer}</ul>);
        listBuffer = [];
      }
      listType = currentType;
      listBuffer.push(el);
    } else {
      if (listBuffer.length > 0) {
        grouped.push(listType === "ol" ? <ol key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem", color: bodyColor }}>{listBuffer}</ol> : <ul key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem", listStyleType: "disc", color: bodyColor }}>{listBuffer}</ul>);
        listBuffer = [];
        listType = null;
      }
      grouped.push(el);
    }
  }
  if (listBuffer.length > 0) {
    grouped.push(listType === "ol" ? <ol key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem", color: bodyColor }}>{listBuffer}</ol> : <ul key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem", listStyleType: "disc", color: bodyColor }}>{listBuffer}</ul>);
  }
  return grouped;
}

function WaveLoader({ text = "Agent running · sourcing · synthesizing" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", padding: "3rem 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ width: "3px", height: "24px", borderRadius: "2px", background: "rgba(180,160,120,0.9)", animation: `waveBar 1.2s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", color: "rgba(245,240,232,0.35)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{text}</p>
    </div>
  );
}

export default function DeepDive() {
  const { user } = useUser(); 
  const { session } = useSession(); 

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  
  const [threadId, setThreadId] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const [history, setHistory] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const resultsRef = useRef(null);
  const pdfRef = useRef(null);

  // REGEX VALIDATION: Must contain at least one letter or number
  const isValidQuery = query.trim().length > 0 && /[a-zA-Z0-9]/.test(query);

  useEffect(() => {
    document.documentElement.dataset.depth = depth.id;
  }, [depth.id]);

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme:dark)').matches;
    setTheme(dark ? 'light' : 'dark');
  };

  const newResearch = () => {
    run.reset();
    setQuery('');
  };

  return (
    <>
      <LiveBackground />
      <div className={`app ${collapsed ? 'collapsed' : ''}`}>
        <Sidebar history={HISTORY} activeId="1" onNew={newResearch} userName={user?.fullName || user?.firstName || 'You'} />

        <main>
          <div className="top">
            <button className="ico" aria-label="Toggle history" onClick={() => setCollapsed((c) => !c)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="ico" aria-label="Switch light or dark theme" onClick={toggleTheme}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.6" /><path d="M9 2.8a6.2 6.2 0 0 0 0 12.4z" fill="currentColor" /></svg>
              </button>
              <UserButton />
            </div>
          </div>

          <div className="wrap">
            <h1>What do you want researched?</h1>
            <p className="lede">DeepDive reads the live web and writes a report where every figure links to the page it came from.</p>

            <Composer
              value={query}
              onChange={setQuery}
              depthIndex={depthIndex}
              onDepth={setDepthIndex}
              disabled={run.running}
              onSubmit={() => run.start({ query, depth })}
            />

            <RunPanel steps={run.steps} open={run.open} active={run.active} finished={run.finished} />

            <div className="grid">
              <section>
                <h2>Start from a question</h2>
                <ul className="ask">
                  {SUGGESTIONS.map((s) => (
                    <li key={s.q}>
                      <button onClick={() => setQuery(s.q)}>
                        <span className="q">{s.q}</span>
                        <span className="s">{s.m}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2>What a finished report looks like</h2>
                <SampleReport depth={depth} />
              </section>
            </div>
          </div>
        </div>
      </SignedIn>
      <Analytics />
    </div>
  );
}
