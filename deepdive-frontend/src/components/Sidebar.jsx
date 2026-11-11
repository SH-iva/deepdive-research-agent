import { useMemo, useState } from 'react';

export default function Sidebar({ history, activeId, onNew, userName }) {
  const [filter, setFilter] = useState('');
  const items = useMemo(
    () => history.filter((h) => h.title.toLowerCase().includes(filter.trim().toLowerCase())),
    [history, filter]
  );

  return (
    <aside aria-label="History">
      <div className="side-in">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <rect width="26" height="26" rx="7" fill="var(--accent)" />
            <path d="M5 10c3 0 3 3 6 3s3-3 6-3 3 3 4 3M5 15c3 0 3 3 6 3s3-3 6-3 3 3 4 3" stroke="var(--accent-ink)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          DeepDive
        </div>

        <button className="new" onClick={onNew}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New research
        </button>

        <label className="search">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
            <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input type="search" placeholder="Search your history" aria-label="Search your history" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </label>

        <div className="group">Today</div>
        <ul className="hist">
          {items.map((h) => (
            <li key={h.id} className={h.id === activeId ? 'on' : ''}>
              <button>
                <span className="t">{h.title}</span>
                <span className="m">{h.meta}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="me">
          <span className="av">{(userName || 'U').charAt(0).toUpperCase()}</span>
          {userName}
        </div>
      </div>
    </aside>
  );
}
