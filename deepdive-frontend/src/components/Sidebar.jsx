import { useUser } from '@clerk/clerk-react';
import { Pin, Trash2 } from 'lucide-react';

const fmt = (it) =>
  it.created_at ? new Date(it.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';

export default function Sidebar({ items, loading, error, search, onSearch, activeId, onOpen, onNew, onPin, onDelete }) {
  const { user } = useUser();
  const name = user?.fullName || user?.firstName || 'You';
  const pinned = items.filter((i) => i.is_pinned);
  const recent = items.filter((i) => !i.is_pinned);

  const group = (label, list) =>
    list.length > 0 && (
      <>
        <div className="group">{label}</div>
        <ul className="hist" style={{ marginBottom: 14 }}>
          {list.map((it) => (
            <li key={it.id} className={it.id === activeId ? 'on' : ''}>
              <button className="open-btn" onClick={() => onOpen(it.id)}>
                <span className="t">{it.title}</span>
                <span className="m">{fmt(it)}</span>
              </button>
              <div className="acts">
                <button aria-label={it.is_pinned ? 'Unpin' : 'Pin'} onClick={() => onPin(it)}><Pin size={14} /></button>
                <button aria-label="Delete" onClick={() => onDelete(it)}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <aside aria-label="History" className="no-print">
      <div className="side-in">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <rect width="26" height="26" rx="7" fill="var(--accent)" />
            <path d="M5 10c3 0 3 3 6 3s3-3 6-3 3 3 4 3M5 15c3 0 3 3 6 3s3-3 6-3 3 3 4 3" stroke="var(--accent-ink)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          DeepDive
        </div>

        <button className="new" onClick={onNew}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          New research
        </button>

        <label className="search">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" /><path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <input type="search" placeholder="Search your history" aria-label="Search your history" value={search} onChange={(e) => onSearch(e.target.value)} />
        </label>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {error && <p className="side-err">{error}</p>}
          {loading && (
            <div style={{ padding: '0 8px' }} aria-hidden="true">
              <div className="sk" style={{ width: '90%' }} /><div className="sk" style={{ width: '70%' }} /><div className="sk" style={{ width: '80%' }} />
            </div>
          )}
          {!loading && !error && items.length === 0 && <p className="empty-note">{search ? 'No matches.' : 'No research yet.'}</p>}
          {group('Pinned', pinned)}
          {group('Recent', recent)}
        </div>

        <div className="me">
          <span className="av">{name.charAt(0).toUpperCase()}</span>
          {name}
        </div>
      </div>
    </aside>
  );
}
