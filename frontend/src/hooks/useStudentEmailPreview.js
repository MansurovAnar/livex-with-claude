import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

// Debounced preview of the auto-generated student email. Preview only —
// the server generates the final unique email when the student is saved.
export default function useStudentEmailPreview(endpoint, firstName, lastName, refreshKey = 0) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) { setEmail(''); return undefined; }
    let cancelled = false;
    const timer = setTimeout(() => {
      apiClient.get(endpoint, { params: { first_name: first, last_name: last } })
        .then(res => { if (!cancelled) setEmail(res.data.data.email); })
        .catch(() => { if (!cancelled) setEmail(''); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [endpoint, firstName, lastName, refreshKey]);

  return email;
}
