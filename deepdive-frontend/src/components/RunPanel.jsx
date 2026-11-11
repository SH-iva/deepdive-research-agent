export default function RunPanel({ steps, open, active, finished }) {
  return (
    <div className={`run ${open ? 'open' : ''}`}>
      <div className="run-in">
        <div className={`runcard ${finished ? 'finished' : ''}`}>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s} className={i < active ? 'done' : i === active ? 'on' : ''}>
                <b />
                {s}
              </li>
            ))}
          </ol>
          <div className="swap">
            <div className="rskel" aria-hidden="true">
              <div className="sk" style={{ width: '48%', height: 20 }} />
              <div className="sk" style={{ width: '100%' }} />
              <div className="sk" style={{ width: '92%' }} />
              <div className="sk" style={{ width: '64%' }} />
            </div>
            <p className="rdone">
              Preview complete. In the live app, your report opens here with every figure linked to its source.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
