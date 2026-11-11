import { useCallback, useEffect, useRef, useState } from 'react';
import { startResearch } from '../lib/api';

export const STEPS = ['Searching the web', 'Reading sources', 'Writing the report'];
const IDLE = { open: false, active: -1, finished: false };

export function useResearchRun() {
  const [state, setState] = useState(IDLE);
  const cancel = useRef(null);

  const start = useCallback(({ query, depth }) => {
    cancel.current?.();
    setState({ open: true, active: 0, finished: false });
    cancel.current = startResearch({
      query,
      depth,
      onStep: (active) => setState((s) => ({ ...s, active })),
      onDone: () => setState({ open: true, active: STEPS.length, finished: true }),
    });
  }, []);

  const reset = useCallback(() => {
    cancel.current?.();
    setState(IDLE);
  }, []);

  useEffect(() => () => cancel.current?.(), []);

  return { steps: STEPS, ...state, running: state.open && !state.finished, start, reset };
}
