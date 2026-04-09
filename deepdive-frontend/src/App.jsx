import { useState, useEffect, useRef } from "react";
import html2pdf from "html2pdf.js";

const MOCK_REPORT = `## Executive Summary

Deep Dive has analyzed your query using multi-step autonomous reasoning across 14 verified sources. The following report synthesizes the most relevant findings.

## Key Findings

- **Primary insight:** The landscape has shifted significantly over the past 18 months, driven by compounding factors in both supply chain dynamics and consumer behavior patterns.
- **Secondary insight:** Three dominant players control roughly 60% of the market, yet niche entrants are eroding market share through specialization.
- **Emerging trend:** Regulatory frameworks in the EU and Asia-Pacific are converging, which will homogenize compliance requirements by Q3 2026.

## Deep Analysis

The research agent traversed academic databases, financial filings, and real-time news aggregators. Cross-referencing these sources reveals a consistent narrative: early-mover advantage is diminishing as technological barriers to entry collapse.

Competitive moats are now primarily data-driven rather than capital-driven — organizations with proprietary data pipelines are outperforming those relying on public datasets by a factor of 2.4x.

## Recommendations

1. Prioritize first-party data acquisition strategies before regulatory windows close.
2. Audit existing supply chain dependencies for single points of failure.
3. Engage with emerging markets in Southeast Asia — adoption curves suggest a 3–5 year window of outsized returns.

## Sources Consulted

- McKinsey Global Institute (2024)
- MIT Sloan Management Review
- Bloomberg Terminal Data (live)
- 11 additional peer-reviewed sources`;

function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "1.25rem",
          fontWeight: 400,
          color: "#F5F0E8",
          marginTop: i === 0 ? 0 : "2rem",
          marginBottom: "0.75rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          letterSpacing: "0.01em",
        }}>
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("- ")) {
      const content = line.replace("- ", "");
      const parts = content.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <li key={key++} style={{
          fontSize: "0.9rem",
          color: "rgba(245,240,232,0.7)",
          lineHeight: 1.8,
          marginBottom: "0.4rem",
          paddingLeft: "0.25rem",
        }}>
          {parts.map((p, idx) =>
            idx % 2 === 1
              ? <strong key={idx} style={{ color: "#F5F0E8", fontWeight: 500 }}>{p}</strong>
              : p
          )}
        </li>
      );
    } else if (/^\d+\./.test(line)) {
      elements.push(
        <li key={key++} style={{
          fontSize: "0.9rem",
          color: "rgba(245,240,232,0.7)",
          lineHeight: 1.8,
          marginBottom: "0.4rem",
          paddingLeft: "0.25rem",
          listStyleType: "decimal",
        }}>
          {line.replace(/^\d+\.\s/, "")}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: "0.5rem" }} />);
    } else {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={key++} style={{
          fontSize: "0.9rem",
          color: "rgba(245,240,232,0.7)",
          lineHeight: 1.85,
          marginBottom: "0.25rem",
        }}>
          {parts.map((p, idx) =>
            idx % 2 === 1
              ? <strong key={idx} style={{ color: "#F5F0E8", fontWeight: 500 }}>{p}</strong>
              : p
          )}
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
        grouped.push(
          listType === "ol"
            ? <ol key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem" }}>{listBuffer}</ol>
            : <ul key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem", listStyleType: "disc" }}>{listBuffer}</ul>
        );
        listBuffer = [];
      }
      listType = currentType;
      listBuffer.push(el);
    } else {
      if (listBuffer.length > 0) {
        grouped.push(
          listType === "ol"
            ? <ol key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem" }}>{listBuffer}</ol>
            : <ul key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem", listStyleType: "disc" }}>{listBuffer}</ul>
        );
        listBuffer = [];
        listType = null;
      }
      grouped.push(el);
    }
  }
  if (listBuffer.length > 0) {
    grouped.push(
      listType === "ol"
        ? <ol key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem" }}>{listBuffer}</ol>
        : <ul key={key++} style={{ paddingLeft: "1.25rem", margin: "0.25rem 0 0.75rem", listStyleType: "disc" }}>{listBuffer}</ul>
    );
  }

  return grouped;
}

function WaveLoader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", padding: "3rem 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: "3px",
              height: "24px",
              borderRadius: "2px",
              background: "rgba(180,160,120,0.9)",
              animation: `waveBar 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "0.72rem",
        color: "rgba(245,240,232,0.35)",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
      }}>
        Agent running · sourcing · synthesizing
      </p>
    </div>
  );
}

export default function DeepDive() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const resultsRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes waveBar {
        0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
        50% { transform: scaleY(1); opacity: 1; }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes subtlePulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      .deep-btn:hover { background: rgba(180,160,120,0.12) !important; }
      .deep-btn:active { transform: scale(0.98); }
      .deep-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .deep-textarea:focus { outline: none; border-color: rgba(180,160,120,0.5) !important; }
      .deep-demo-btn:hover { color: rgba(245,240,232,0.6) !important; }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (report && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [report]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setReport(null);
    setError(null);

    if (demoMode) {
      await new Promise((r) => setTimeout(r, 2800));
      setReport(MOCK_REPORT);
      setLoading(false);
      return;
    }
  const downloadPDF = () => {
  const element = resultsRef.current;
  const opt = {
    margin:       0.5,
    filename:     'DeepDive_Report.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0C0B10' },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
};  

    try {
      const res = await fetch("https://deepdive-api-b6ww.onrender.com/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      setError(err.message || "Connection failed. Is your backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSearch();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0C0B10",
      fontFamily: "'DM Sans', sans-serif",
      padding: "0 1.5rem",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "400px",
        background: "radial-gradient(ellipse, rgba(60,50,100,0.25) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ maxWidth: "720px", margin: "0 auto", position: "relative", zIndex: 1 }}>

    

        {/* Hero */}
        <div style={{
          paddingTop: "5rem", paddingBottom: "4rem",
          animation: "fadeUp 0.8s ease forwards",
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.68rem",
            color: "rgba(180,160,120,0.6)",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
          }}>
            Autonomous Research Agent
          </div>

          <h1 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(3.5rem, 10vw, 5.5rem)",
            fontWeight: 400,
            color: "#F5F0E8",
            lineHeight: 1.0,
            margin: "0 0 1.5rem",
            letterSpacing: "-0.02em",
          }}>
            Deep{" "}
            <span style={{ fontStyle: "italic", color: "rgba(180,160,120,0.85)" }}>
              Dive
            </span>
          </h1>

          <p style={{
            fontSize: "1rem",
            color: "rgba(245,240,232,0.45)",
            lineHeight: 1.7,
            maxWidth: "480px",
            fontWeight: 300,
            margin: 0,
          }}>
            Ask anything. A LangGraph agent autonomously sources, reasons across,
            and synthesizes findings into a structured report — in under 20 seconds.
          </p>
        </div>

        {/* Divider */}
        <div style={{
          height: "1px",
          background: "linear-gradient(90deg, rgba(180,160,120,0.3) 0%, transparent 100%)",
          marginBottom: "3rem",
        }} />

        {/* Input */}
        <div style={{ animation: "fadeUp 0.8s ease 0.15s both" }}>
          <textarea
            className="deep-textarea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to research?"
            rows={4}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              fontSize: "0.95rem",
              color: "#F5F0E8",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 300,
              lineHeight: 1.7,
              resize: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
              caretColor: "rgba(180,160,120,0.9)",
            }}
          />

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "1rem",
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.65rem",
              color: "rgba(245,240,232,0.2)",
              letterSpacing: "0.1em",
            }}>
              ⌘ + Enter to run
            </span>

            <button
              className="deep-btn"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              style={{
                background: "transparent",
                border: "1px solid rgba(180,160,120,0.4)",
                borderRadius: "8px",
                padding: "0.65rem 1.75rem",
                color: "rgba(180,160,120,0.9)",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.78rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 0.2s, transform 0.1s",
              }}
            >
              {loading ? "Running..." : "Search →"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ animation: "fadeUp 0.4s ease forwards" }}>
            <WaveLoader />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            marginTop: "2rem",
            padding: "1.25rem 1.5rem",
            border: "1px solid rgba(200,80,80,0.3)",
            borderRadius: "12px",
            background: "rgba(200,80,80,0.05)",
            animation: "fadeUp 0.4s ease forwards",
          }}>
            <p style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.78rem",
              color: "rgba(220,120,120,0.9)",
              margin: 0,
              letterSpacing: "0.05em",
            }}>
              ⚠ {error}
            </p>
          </div>
        )}

        {/* Results */}
        {report && !loading && (
          <div
            ref={resultsRef}
            style={{
              marginTop: "3rem",
              marginBottom: "5rem",
              animation: "fadeUp 0.6s ease forwards",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem",
            }}>
              <div style={{
                height: "1px", flex: 1,
                background: "linear-gradient(90deg, rgba(180,160,120,0.3), transparent)",
              }} />
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.65rem",
                color: "rgba(180,160,120,0.5)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}>
                Report
              </span>
              <div style={{
                height: "1px", flex: 1,
                background: "linear-gradient(270deg, rgba(180,160,120,0.3), transparent)",
              }} />
            </div>

            <div style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "2.5rem",
            }}>
              {renderMarkdown(report)}
            </div>

            <div style={{
              display: "flex", justifyContent: "flex-end", marginTop: "1.25rem",
            }}>
              <button
                className="deep-demo-btn"
                onClick={() => { setReport(null); setQuery(""); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.68rem",
                  color: "rgba(245,240,232,0.2)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  transition: "color 0.2s",
                }}
              >
                ← New query <div style={{
  display: "flex", justifyContent: "space-between", marginTop: "1.25rem",
}}>
  <button
    className="deep-demo-btn"
    onClick={() => { setReport(null); setQuery(""); }}
    style={{
      background: "none", border: "none", cursor: "pointer",
      fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.68rem",
      color: "rgba(245,240,232,0.2)", letterSpacing: "0.15em",
      textTransform: "uppercase", transition: "color 0.2s",
    }}
  >
    ← New query
  </button>

  <button
    className="deep-btn"
    onClick={downloadPDF}
    style={{
      background: "rgba(180,160,120,0.1)", border: "1px solid rgba(180,160,120,0.4)",
      borderRadius: "6px", padding: "0.4rem 1rem", cursor: "pointer",
      fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.68rem",
      color: "rgba(180,160,120,0.9)", letterSpacing: "0.1em",
      textTransform: "uppercase", transition: "all 0.2s",
    }}
  >
    ↓ Download PDF
  </button>
</div>
                
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}