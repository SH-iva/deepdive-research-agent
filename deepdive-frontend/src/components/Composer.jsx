import { useEffect, useState } from 'react';
import { DEPTHS, depthInfo } from '../lib/depth';

export default function Composer({ value, onChange, onSubmit, busy, hasReport, followUp, onFollowUp, depthIndex, onDepth }) {
  const [info, setInfo] = useState(depthInfo(DEPTHS[depthIndex]));
  const [out, setOut] = useState(false);

  useEffect(() => {
    setOut(true);
    const t = setTimeout(() => {
      setInfo(depthInfo(DEPTHS[depthIndex]));
      setOut(false);
    }, 180);
    return () => clearTimeout(t);
  }, [depthIndex]);

  const canSend = value.trim() && !busy;

  return (
    <div className="composer no-print">
      <div className="meter" aria-hidden="true">
        <i style={{ width: `${(DEPTHS.length - 1 - depthIndex) * 33.333}%` }} />
      </div>
      <textarea
        placeholder={hasReport ? 'Ask a follow-up, or start something new' : 'Ask a question or describe a topic'}
        aria-label="Research question"
        value={value}
        readOnly={busy}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
      />
      <div className="bar">
        <div className="seg" role="group" aria-label="Research depth" style={{ '--i': depthIndex }}>
          <i className="thumb" />
          {DEPTHS.map((d, i) => (
            <button key={d.id} aria-pressed={i === depthIndex} onClick={() => onDepth(i)}>{d.id}</button>
          ))}
        </div>
        <span className={`depthinfo ${out ? 'out' : ''}`} aria-live="polite">{info}</span>
        {hasReport && (
          <label className="follow">
            <input type="checkbox" checked={followUp} onChange={(e) => onFollowUp(e.target.checked)} />
            Continue this thread
          </label>
        )}
        {!hasReport && <span className="hint">Ctrl + Enter to start</span>}
        <button className="go" disabled={!canSend} onClick={onSubmit} style={hasReport ? { marginLeft: 'auto' } : undefined}>
          {busy ? 'Researching' : 'Start research'}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 12V2M2.5 6.5 7 2l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}
