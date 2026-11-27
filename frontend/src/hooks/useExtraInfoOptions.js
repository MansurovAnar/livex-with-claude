import { useEffect, useState } from 'react';
import { listExtraInfoOptions } from '../api/telesalesLeads.api';

/**
 * All telesales extra-info options (active and inactive, in admin order).
 * Returns { options, error } — error is the axios error if loading failed.
 */
export default function useExtraInfoOptions() {
  const [options, setOptions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listExtraInfoOptions()
      .then(res => { if (!cancelled) setOptions(res.data.data); })
      .catch(err => { if (!cancelled) setError(err); });
    return () => { cancelled = true; };
  }, []);

  return { options, error };
}
