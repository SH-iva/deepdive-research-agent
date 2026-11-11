// Starts a research run and reports progress. Returns a cancel function.
//
// This is a timed simulation so the UI works on its own. Replace the body
// with a call to your FastAPI backend, for example (endpoint is a placeholder):
//
//   const ctrl = new AbortController();
//   fetch(`${import.meta.env.VITE_API_URL}/research`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ query, depth: depth.id }),
//     signal: ctrl.signal,
//   }) // read the streamed events, call onStep(0|1|2) as stages begin, then onDone(report)
//   return () => ctrl.abort();

export function startResearch({ query, depth, onStep, onDone }) {
  let i = 0;
  let timer;
  const tick = () => {
    if (i < 3) {
      onStep(i++);
      timer = setTimeout(tick, depth.stepMs);
    } else {
      onDone({ query });
    }
  };
  tick();
  return () => clearTimeout(timer);
}
