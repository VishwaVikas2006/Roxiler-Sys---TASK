import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal data-fetching hook: runs `fetcher` whenever `deps` change,
 * ignores stale responses, and exposes { data, loading, error, reload }.
 */
export function useAsync(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const requestId = useRef(0);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const id = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    fetcher()
      .then((data) => {
        if (id === requestId.current) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (id === requestId.current) setState((current) => ({ ...current, loading: false, error }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);
  const setData = useCallback((updater) => {
    setState((current) => ({
      ...current,
      data: typeof updater === 'function' ? updater(current.data) : updater,
    }));
  }, []);

  return { ...state, reload, setData };
}
