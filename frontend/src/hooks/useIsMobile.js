import { useEffect, useState } from 'react';

const QUERY = '(max-width: 768px)';

export default function useIsMobile() {
  const get = () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
  const [isMobile, setIsMobile] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = e => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}
