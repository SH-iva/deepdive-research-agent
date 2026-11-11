import { useCallback, useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignIn, UserButton, useAuth } from '@clerk/clerk-react';
import { Menu } from 'lucide-react';
import { research } from './api.js';
import { useSupabase } from './supabase.js';
import { deleteReport, deriveTitle, extractSources, getReport, listHistory, normalizeCitations, saveReport, setPinned } from './history.js';
import LiveBackground from './components/LiveBackground.jsx';
import Sidebar from './components/Sidebar.jsx';
import Composer from './components/Composer.jsx';
import RunPanel from './components/RunPanel.jsx';
import SampleReport from './components/SampleReport.jsx';
import Report from './components/Report.jsx';
import { DEPTHS } from './lib/depth';
import './styles/deepdive.css';

const STEPS = ['Planning searches', 'Reading sources', 'Writing the report'];
const EXAMPLES = [
  { q: 'How are EU and US AI regulations different in 2026?', m: 'Policy, about 15 sources' },
  { q: 'What is the global EV market share by region?', m: 'Market data, about 12 sources' },
  { q: 'Which React Server Components patterns are production-ready?', m: 'Engineering, about 10 sources' },
];
const isNarrow = () => window.matchMedia('(max-width:860px)').matches;

function Workspace() {
  const { getToken } = useAuth();
  const sb = useSupabase();

  const [threadId, setThreadId] = useState(() => crypto.randomUUID());
  const [text, setText] = useState('');
  const [followUp, setFollowUp] = useState(true);
  const [current, setCurrent] = useState(null); // { id?, title, query, report, sources }
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [warn, setWarn] = useState('');

  const [items, setItems] = useState([]);
  const [hLoading, setHLoading] = useState(true);
  const [hError, setHError] = useState('');
  const [search, setSearch] = useState('');

  const [collapsed, setCollapsed] = useState(isNarrow);
  const [depthIndex, setDepthIndex] = useState(1);
  const [theme, setTheme] = useState(null); // null follows the system setting
  const depth = DEPTHS[depthIndex];

  useEffect(() => { document.documentElement.dataset.depth = depth.id; }, [depth.id]);
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme; }, [theme]);
  const toggleTheme = () => {
    const dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme:dark)').matches;
    setTheme(dark ? 'light' : 'dark');
  };
  const closeOnMobile = () => { if (isNarrow()) setCollapsed(true); };

  const refresh = useCallback(async (q = '') => {
    try { setHError(''); setItems(await listHistory(sb, q)); }
    catch (e) { setHError(e.message); }
    finally { setHLoading(false); }
  }, [sb]);

  useEffect(() => { const t = setTimeout(() => refresh(search), 250); return () => clearTimeout(t); }, [search, refresh]);

  // Progress is time-based: the API returns one response, not a stream.
  useEffect(() => {
    if (status !== 'loading') { setStep(0); return; }
    const t = [setTimeout(() => setStep(1), 3500), setTimeout(() => setStep(2), 9000)];
    return () => t.forEach(clearTimeout);
  }, [status]);

  const hasReport = !!current;
  const loading = status === 'loading';

  async function submit(question = text) {
    const q = question.trim(); if (!q) return;
    const mode = hasReport && followUp ? 'followup' : 'new';
    const tid = mode === 'new' && hasReport ? crypto.randomUUID() : threadId;
    setThreadId(tid); setStatus('loading'); setError(''); setWarn('');
    let report;
    try { ({ report } = await research(q, tid, mode, getToken, depth.id)); report = normalizeCitations(report); }
    catch (e) { setStatus('error'); setError(e.message); return; }

    const next = { title: deriveTitle(report, q), query: q, report, sources: extractSources(report) };
    try {
      const row = await saveReport(sb, { thread_id: tid, mode, query: q, title: next.title, report, sources: next.sources });
      next.id = row.id; refresh(search);
    } catch (e) {
      setWarn(`Your report is ready, but saving it to History failed: ${e.message}`);
    }
    setCurrent(next); setText(''); setStatus('idle'); setFollowUp(true);
  }

  async function openItem(id) {
    closeOnMobile(); setWarn(''); setError('');
    try {
      const r = await getReport(sb, id);
      setCurrent({ id: r.id, title: r.title, query: r.query, report: r.report, sources: r.sources });
      setThreadId(r.thread_id); setFollowUp(true); setStatus('idle');
    } catch (e) { setError(e.message); setStatus('error'); }
  }

  function newResearch() {
    setCurrent(null); setThreadId(crypto.randomUUID()); setText(''); setStatus('idle'); setError(''); setWarn(''); closeOnMobile();
  }

  async function pin(it) {
    try { await setPinned(sb, it.id, !it.is_pinned); refresh(search); } catch (e) { setHError(e.message); }
  }
  async function remove(it) {
    if (!window.confirm(`Delete “${it.title}”? This can’t be undone.`)) return;
    try { await deleteReport(sb, it.id); if (current?.id === it.id) newResearch(); refresh(search); } catch (e) { setHError(e.message); }
  }

  return (
    <>
      <LiveBackground />
      <div className={`app ${collapsed ? 'collapsed' : ''}`}>
        <Sidebar items={items} loading={hLoading} error={hError} search={search} onSearch={setSearch}
          activeId={current?.id} onOpen={openItem} onNew={newResearch} onPin={pin} onDelete={remove} />

        <main>
          <div className="top no-print">
            <button className="ico" aria-label="Toggle history" onClick={() => setCollapsed((c) => !c)}><Menu size={18} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="ico" aria-label="Switch light or dark theme" onClick={toggleTheme}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.6" /><path d="M9 2.8a6.2 6.2 0 0 0 0 12.4z" fill="currentColor" /></svg>
              </button>
              <UserButton />
            </div>
          </div>

          <div className="wrap">
            {!hasReport && !loading && (
              <>
                <h1>What do you want researched?</h1>
                <p className="lede">DeepDive searches the live web and writes a report where every figure links to its source.</p>
              </>
            )}

            <Composer value={text} onChange={setText} onSubmit={() => submit()} busy={loading}
              hasReport={hasReport} followUp={followUp} onFollowUp={setFollowUp}
              depthIndex={depthIndex} onDepth={setDepthIndex} />

            <RunPanel steps={STEPS} open={loading} active={step} />

            {status === 'error' && (
              <div className="banner err" role="alert">
                <span><strong>Research didn’t finish.</strong> {error}</span>
                <button className="btn" onClick={() => submit(text || current?.query || '')} disabled={!text && !current}>Try again</button>
              </div>
            )}
            {warn && <div className="banner warn" role="status">{warn}</div>}

            {!hasReport && !loading && (
              <div className="grid">
                <section>
                  <h2>Start from a question</h2>
                  <ul className="ask">
                    {EXAMPLES.map((ex) => (
                      <li key={ex.q}>
                        <button onClick={() => submit(ex.q)}>
                          <span className="q">{ex.q}</span>
                          <span className="s">{ex.m}</span>
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
            )}

            {current && !loading && (
              <div className="answer">
                <Report title={current.title} query={current.query} markdown={current.report} sources={current.sources} />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <>
      <SignedOut><div className="auth"><SignIn routing="hash" /></div></SignedOut>
      <SignedIn><Workspace /></SignedIn>
    </>
  );
}
