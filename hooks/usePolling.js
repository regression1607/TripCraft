import { useState, useEffect, useRef, useCallback } from 'react';

export default function usePolling(fetchFn, intervalMs = 3000, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      fetch();
      intervalRef.current = setInterval(fetch, intervalMs);
    } else {
      setLoading(false);
    }
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch, intervalMs, enabled]);

  return { data, loading, error, refresh: fetch };
}
