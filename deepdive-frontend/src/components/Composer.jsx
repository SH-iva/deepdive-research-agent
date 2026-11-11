import { useEffect, useState } from 'react';
import { DEPTHS, depthInfo } from '../lib/depth';

export default function Composer({ value, onChange, depthIndex, onDepth, onSubmit, disabled }) {
  const [info, setInfo] = useState(depthInfo(DEPTHS[depthIndex]));
  const [out, setOut] = useState(false);

  // Fade the estimate out, swap the text, fade it back in.
  useEffect(() => {
    setOut(true);
    const t = setTimeout(() => {
      setInfo(depthInfo(DEPTHS[depthIndex]));
      setOut(false);
    }, 180);
    return () => clearTimeout(t);
  }, [depthIndex]);

  const canSend = value.trim() && !disabled;

  return (
    <div className="composer">
      <div className="meter" aria-hidden="true">
        <i style={{ width: `${(DEPTHS.length - 1 - depthIndex) * 33.333}%` }} />
      </div>
      <textarea
        placeholder="Ask a question or describe a topic"
        aria-label="Research question"
        value={value}
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
            <button key={d.id} aria-pressed={i === depthIndex} onClick={() => onDepth(i)}>
              {d.id}
            </button>
          ))}
        </div>
        <span className={`depthinfo ${out ? 'out' : ''}`} aria-live="polite">{info}</span>
        <span className="hint">Ctrl + Enter to start</span>
        <button className="go" disabled={!canSend} onClick={onSubmit}>
          Start research
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 12V2M2.5 6.5 7 2l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
