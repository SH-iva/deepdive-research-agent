// Progress steps plus a shimmering skeleton while a report is being written.
export default function RunPanel({ steps, open, active }) {
  return (
    <div className={`run ${open ? 'open' : ''}`} aria-live="polite">
      <div className="run-in">
        <div className="runcard">
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s} className={i < active ? 'done' : i === active ? 'on' : ''}>
                <b />
                {s}
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 18 }} aria-hidden="true">
            <div className="sk" style={{ width: '48%', height: 20 }} />
            <div className="sk" style={{ width: '100%' }} />
            <div className="sk" style={{ width: '92%' }} />
            <div className="sk" style={{ width: '64%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
