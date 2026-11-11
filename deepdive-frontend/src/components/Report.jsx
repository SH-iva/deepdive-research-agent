import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, Printer } from "lucide-react";

export default function Report({ title, query, markdown, sources }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${(title || "report").slice(0, 60).replace(/[^\w]+/g, "-")}.md` });
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <article className="report-wrap">
      <header className="report-head">
        <p className="asked">You asked: {query}</p>
        <h1>{title}</h1>
        <div className="tools no-print">
          <button className="btn" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy Markdown"}</button>
          <button className="btn" onClick={download}><Download size={15} /> Download .md</button>
          <button className="btn" onClick={() => window.print()}><Printer size={15} /> Save as PDF</button>
        </div>
      </header>

      <div className="report-grid">
        <div className="report">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{ a: ({ node, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer" /> }}
          >{markdown}</ReactMarkdown>
        </div>

        <aside className="sources" aria-label="Sources">
          <h2>Sources <span className="count">{sources.length}</span></h2>
          {sources.length === 0 && <p className="muted">This report cites no links.</p>}
          <ul>
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  <strong>{s.host}</strong>
                  <span>{s.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </article>
  );
}
