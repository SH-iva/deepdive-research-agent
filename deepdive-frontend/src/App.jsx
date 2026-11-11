import { useEffect, useState } from 'react';
import { UserButton, useUser } from '@clerk/clerk-react';
import LiveBackground from './components/LiveBackground';
import Sidebar from './components/Sidebar';
import Composer from './components/Composer';
import RunPanel from './components/RunPanel';
import SampleReport from './components/SampleReport';
import { useResearchRun } from './hooks/useResearchRun';
import { DEPTHS } from './lib/depth';
import './styles/deepdive.css';

// Replace with real history from your backend (Supabase).
const HISTORY = [{ id: '1', title: 'Global top 10 companies by sales in 2025', meta: '11 Nov, 12 sources' }];

const SUGGESTIONS = [
  { q: 'How are EU and US AI regulations different in 2026?', m: 'Policy, about 15 sources' },
  { q: 'What is the global EV market share by region?', m: 'Market data, about 12 sources' },
  { q: 'Which React Server Components patterns are production-ready?', m: 'Engineering, about 10 sources' },
];

export default function App() {
  const { user } = useUser();
  const [collapsed, setCollapsed] = useState(() => window.matchMedia('(max-width:860px)').matches);
  const [query, setQuery] = useState('');
  const [depthIndex, setDepthIndex] = useState(1);
  const [theme, setTheme] = useState(null); // null follows the system setting
  const depth = DEPTHS[depthIndex];
  const run = useResearchRun();

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
        </main>
      </div>
    </>
  );
}
