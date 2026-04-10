import { useState, useEffect, useRef } from "react";
import html2pdf from "html2pdf.js";
import { SignedIn, SignedOut, SignIn, UserButton, useUser, useSession } from "@clerk/clerk-react";
import { supabaseClient } from "./supabase";

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
    if (user && session) {
      fetchHistory();
    }
  }, [user, session]);

  const fetchHistory = async () => {
    try {
      const token = await session.getToken({ template: "supabase" });
      const supabase = await supabaseClient(token);
      
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setHistory(data);
      if (error) console.error("Error fetching history:", error);
    } catch (err) {
      console.error("Auth error:", err);
    }
  };

  // NEW: Delete History Function
  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation(); // Prevents the report from loading when you click the 'X'
    
    // Optimistically remove it from the screen instantly
    setHistory(history.filter(item => item.id !== id));
    
    if (user && session) {
      try {
        const token = await session.getToken({ template: "supabase" });
        const supabase = await supabaseClient(token);
        
        const { error } = await supabase.from('reports').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to delete from DB:", err);
        fetchHistory(); // If it fails, refresh the list to bring it back
      }
    }
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes waveBar { 0%, 100% { transform: scaleY(0.3); opacity: 0.4; } 50% { transform: scaleY(1); opacity: 1; } }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      .deep-btn:hover { background: rgba(180,160,120,0.12) !important; }
      .deep-btn:active { transform: scale(0.98); }
      .deep-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .deep-textarea:focus { outline: none; border-color: rgba(180,160,120,0.5) !important; }
      .history-item:hover { background: rgba(255,255,255,0.05); }
      .delete-btn:hover { color: rgba(220,80,80,1) !important; }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (report && resultsRef.current && !isRefining) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [report, isRefining]);

  const handleSearch = async () => {
    if (!isValidQuery) return;
    setLoading(true); setReport(null); setError(null);

    const newThreadId = "thread_" + Date.now().toString();
    setThreadId(newThreadId);

    try {
      const res = await fetch("https://deepdive-api-b6ww.onrender.com/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), thread_id: newThreadId }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setReport(data.report);

      if (user && session) {
        const token = await session.getToken({ template: "supabase" });
        const supabase = await supabaseClient(token);
        
        await supabase.from('reports').insert([{
          user_id: user.id,
          thread_id: newThreadId,
          query: query.trim(),
          report_text: data.report
        }]);
        fetchHistory(); 
      }
    } catch (err) {
      setError(err.message || "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!followUp.trim()) return;
    setIsRefining(true); setError(null);

    try {
      const res = await fetch("https://deepdive-api-b6ww.onrender.com/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: followUp.trim(), thread_id: threadId }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setReport(data.report);
      setFollowUp("");

      if (user && session) {
        const token = await session.getToken({ template: "supabase" });
        const supabase = await supabaseClient(token);

        await supabase.from('reports')
          .update({ report_text: data.report })
          .eq('thread_id', threadId);
        fetchHistory();
      }
    } catch (err) {
      setError(err.message || "Refinement failed.");
    } finally {
      setIsRefining(false);
    }
  };

  const loadPastReport = (pastReport) => {
    setQuery(pastReport.query);
    setReport(pastReport.report_text);
    setThreadId(pastReport.thread_id);
    setIsSidebarOpen(false); 
  };

  const downloadPDF = () => {
    const element = pdfRef.current;
    const opt = { margin: [0.75, 0.75], filename: 'DeepDive_Report.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0C0B10", fontFamily: "'DM Sans', sans-serif", position: "relative", overflowX: "hidden" }}>
      
      <SignedOut>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <SignIn routing="hash" />
        </div>
      </SignedOut>

      <SignedIn>
        {/* --- SIDEBAR UI --- */}
        <div style={{
          position: "fixed", top: 0, left: isSidebarOpen ? 0 : "-300px", width: "300px", height: "100vh",
          background: "#121118", borderRight: "1px solid rgba(255,255,255,0.05)", zIndex: 50,
          transition: "left 0.3s ease", padding: "2rem 1.5rem", boxSizing: "border-box", overflowY: "auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", color: "rgba(180,160,120,0.8)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Research History</span>
            <button onClick={() => setIsSidebarOpen(false)} style={{ background: "none", border: "none", color: "#F5F0E8", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {history.length === 0 ? (
              <p style={{ color: "rgba(245,240,232,0.3)", fontSize: "0.85rem" }}>No history yet.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="history-item" onClick={() => loadPastReport(item)} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "1rem", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", cursor: "pointer", transition: "background 0.2s" }}>
                  <div style={{ flex: 1, paddingRight: "10px" }}>
                    <p style={{ margin: "0 0 0.5rem 0", color: "#F5F0E8", fontSize: "0.85rem", fontWeight: 500, lineHeight: 1.4 }}>
                      {item.query.length > 40 ? item.query.substring(0, 40) + "..." : item.query}
                    </p>
                    <span style={{ color: "rgba(245,240,232,0.4)", fontSize: "0.7rem", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {/* NEW: Delete Button */}
                  <button 
                    className="delete-btn"
                    onClick={(e) => handleDeleteHistory(e, item.id)} 
                    style={{ background: "none", border: "none", color: "rgba(220,80,80,0.6)", cursor: "pointer", fontSize: "1.2rem", padding: "0 5px", transition: "color 0.2s" }}
                    title="Delete Report"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div style={{ padding: "0 1.5rem", transition: "margin-left 0.3s ease", marginLeft: isSidebarOpen ? "300px" : "0" }}>
          
          <div style={{ position: "absolute", top: "1.5rem", left: "1.5rem", right: "2rem", display: "flex", justifyContent: "space-between", zIndex: 10 }}>
            <button onClick={() => setIsSidebarOpen(true)} style={{ background: "none", border: "none", color: "rgba(180,160,120,0.9)", cursor: "pointer", fontSize: "1.5rem", padding: "0" }}>
              ☰
            </button>
            <UserButton />
          </div>

          <div style={{ position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)", width: "600px", height: "400px", background: "radial-gradient(ellipse, rgba(60,50,100,0.25) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

          <div style={{ maxWidth: "720px", margin: "0 auto", position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            
            <div style={{ flex: 1 }}>
              <div style={{ paddingTop: "6rem", paddingBottom: "4rem", animation: "fadeUp 0.8s ease forwards" }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.68rem", color: "rgba(180,160,120,0.6)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "1.5rem" }}>Autonomous Research Agent</div>
                <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(3.5rem, 10vw, 5.5rem)", fontWeight: 400, color: "#F5F0E8", lineHeight: 1.0, margin: "0 0 1.5rem", letterSpacing: "-0.02em" }}>
                  Deep <span style={{ fontStyle: "italic", color: "rgba(180,160,120,0.85)" }}>Dive</span>
                </h1>
                <p style={{ fontSize: "1rem", color: "rgba(245,240,232,0.45)", lineHeight: 1.7, maxWidth: "480px", fontWeight: 300, margin: 0 }}>Ask anything. A LangGraph agent autonomously sources, reasons across, and synthesizes findings into a structured report — in under 20 seconds.</p>
              </div>

              <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(180,160,120,0.3) 0%, transparent 100%)", marginBottom: "3rem" }} />

              <div style={{ animation: "fadeUp 0.8s ease 0.15s both" }}>
                <textarea
                  className="deep-textarea" value={query} onChange={(e) => setQuery(e.target.value)}
                  // FIXED: Changed to listen for standard Ctrl + Enter or Cmd + Enter
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSearch(); }}
                  placeholder="What would you like to research?" rows={4}
                  style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "12px", padding: "1.25rem 1.5rem", fontSize: "0.95rem", color: "#F5F0E8", fontFamily: "'DM Sans', sans-serif", fontWeight: 300, lineHeight: 1.7, resize: "none", transition: "border-color 0.2s", boxSizing: "border-box" }}
                />
                
                {/* NEW: Conditional Button Rendering */}
                <div style={{ minHeight: "3rem" }}>
                  {isValidQuery && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", animation: "fadeUp 0.3s ease forwards" }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "rgba(245,240,232,0.2)", letterSpacing: "0.1em" }}>Ctrl + Enter to run</span>
                      <button className="deep-btn" onClick={handleSearch} disabled={loading}
                        style={{ background: "transparent", border: "1px solid rgba(180,160,120,0.4)", borderRadius: "8px", padding: "0.65rem 1.75rem", color: "rgba(180,160,120,0.9)", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", transition: "background 0.2s, transform 0.1s" }}
                      >{loading ? "Running..." : "Search →"}</button>
                    </div>
                  )}
                </div>
              </div>

              {loading && <div style={{ animation: "fadeUp 0.4s ease forwards" }}><WaveLoader /></div>}
              {error && !loading && (
                <div style={{ marginTop: "2rem", padding: "1.25rem 1.5rem", border: "1px solid rgba(200,80,80,0.3)", borderRadius: "12px", background: "rgba(200,80,80,0.05)", animation: "fadeUp 0.4s ease forwards" }}>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", color: "rgba(220,120,120,0.9)", margin: 0, letterSpacing: "0.05em" }}>⚠ {error}</p>
                </div>
              )}

              {report && !loading && (
                <div style={{ marginTop: "3rem", marginBottom: "3rem", animation: "fadeUp 0.6s ease forwards" }}>
                  <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
                    <div ref={pdfRef} style={{ width: "800px", padding: "20px", background: "#FFFFFF", fontFamily: "'DM Sans', sans-serif" }}>
                      <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.2rem", color: "#111111", borderBottom: "2px solid #111111", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>Deep Dive Research Report</h1>
                      {renderMarkdown(report, true)}
                    </div>
                  </div>

                  <div ref={resultsRef} style={{ background: "#0C0B10", padding: "1rem 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                      <div style={{ height: "1px", flex: 1, background: "linear-gradient(90deg, rgba(180,160,120,0.3), transparent)" }} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "rgba(180,160,120,0.5)", letterSpacing: "0.2em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Report</span>
                      <div style={{ height: "1px", flex: 1, background: "linear-gradient(270deg, rgba(180,160,120,0.3), transparent)" }} />
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "2.5rem" }}>
                      {renderMarkdown(report)}
                    </div>
                  </div>

                  <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.08)", animation: "fadeUp 0.6s ease forwards" }}>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "rgba(180,160,120,0.7)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1rem" }}>Refine this report</p>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      <input type="text" value={followUp} onChange={(e) => setFollowUp(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleFollowUp(); }} placeholder="e.g., Rewrite the second point to be shorter..." disabled={isRefining} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "8px", padding: "0.8rem 1rem", fontSize: "0.9rem", color: "#F5F0E8", fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" }} />
                      <button className="deep-btn" onClick={handleFollowUp} disabled={isRefining || !followUp.trim()} style={{ background: "rgba(180,160,120,0.1)", border: "1px solid rgba(180,160,120,0.4)", borderRadius: "8px", padding: "0.8rem 1.5rem", color: "rgba(180,160,120,0.9)", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}>{isRefining ? "Updating..." : "Submit"}</button>
                    </div>
                  </div>
                  {isRefining && <div style={{ marginTop: "1rem" }}><WaveLoader text="Refining content..." /></div>}

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2.5rem" }}>
                    <button className="deep-demo-btn" onClick={() => { setReport(null); setQuery(""); setFollowUp(""); setThreadId(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.68rem", color: "rgba(245,240,232,0.2)", letterSpacing: "0.15em", textTransform: "uppercase", transition: "color 0.2s" }}>← New query</button>
                    <button className="deep-btn" onClick={downloadPDF} style={{ background: "rgba(180,160,120,0.1)", border: "1px solid rgba(180,160,120,0.4)", borderRadius: "6px", padding: "0.4rem 1rem", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.68rem", color: "rgba(180,160,120,0.9)", letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.2s" }}>↓ Download PDF</button>
                  </div>
                </div>
              )}
            </div>

            {/* NEW: Signature Footer */}
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.65rem", color: "rgba(245,240,232,0.15)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Built by Shiva Pandula
              </span>
            </div>

          </div>
        </div>
      </SignedIn>
    </div>
  );
}