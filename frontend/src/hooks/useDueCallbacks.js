import { useEffect, useState } from 'react';
import { countDueCallbacks } from '../api/telesalesLeads.api';

// Fired after a call is logged, so the sidebar badge refreshes right away
export const CALLBACKS_CHANGED = 'telesales:callbacks-changed';
export const notifyCallbacksChanged = () => window.dispatchEvent(new Event(CALLBACKS_CHANGED));

// End of the user's local day: "due" = overdue + due today
export const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };

const POLL_MS = 60 * 1000;

/** Count of open callbacks that are overdue or due today, for the sidebar badge. */
export default function useDueCallbacks(deps = []) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = () => countDueCallbacks(endOfToday().toISOString())
      .then(res => { if (!cancelled) setCount(res.data.data.count); })
      .catch(() => { /* badge is best-effort */ });
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener(CALLBACKS_CHANGED, load);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener(CALLBACKS_CHANGED, load); };
  }, deps);
  return count;
}
