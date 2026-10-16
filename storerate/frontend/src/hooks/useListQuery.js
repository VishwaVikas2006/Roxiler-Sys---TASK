import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Manages table state (filters, sorting, pagination) and keeps it in the URL
 * query string so lists are bookmarkable and survive refreshes.
 *
 * @param {{ defaultSort: string, defaultOrder?: 'asc'|'desc', filterKeys: string[], defaultLimit?: number }} options
 */
export function useListQuery({ defaultSort, defaultOrder = 'asc', filterKeys, defaultLimit = 10 }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const sortBy = searchParams.get('sortBy') || defaultSort;
  const order =
    searchParams.get('order') === 'desc'
      ? 'desc'
      : searchParams.get('order') === 'asc'
        ? 'asc'
        : defaultOrder;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Number(searchParams.get('limit')) || defaultLimit;

  const filters = useMemo(() => {
    const result = {};
    for (const key of filterKeys) result[key] = searchParams.get(key) || '';
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, filterKeys.join('|')]);

  const update = useCallback(
    (changes) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(changes)) {
            if (value === '' || value === null || value === undefined) next.delete(key);
            else next.set(key, String(value));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const toggleSort = useCallback(
    (field) => {
      const nextOrder = sortBy === field && order === 'asc' ? 'desc' : 'asc';
      update({ sortBy: field, order: nextOrder, page: 1 });
    },
    [sortBy, order, update],
  );

  const setFilters = useCallback((changes) => update({ ...changes, page: 1 }), [update]);
  const clearFilters = useCallback(() => {
    const cleared = Object.fromEntries(filterKeys.map((key) => [key, '']));
    update({ ...cleared, page: 1 });
  }, [filterKeys, update]);
  const setPage = useCallback((nextPage) => update({ page: nextPage }), [update]);
  const setLimit = useCallback((nextLimit) => update({ limit: nextLimit, page: 1 }), [update]);

  /** Everything the API needs for this listing. */
  const params = useMemo(() => {
    const active = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    return { ...active, sortBy, order, page, limit };
  }, [filters, sortBy, order, page, limit]);

  return {
    filters,
    sortBy,
    order,
    page,
    limit,
    params,
    toggleSort,
    setFilters,
    clearFilters,
    setPage,
    setLimit,
  };
}

/**
 * Debounced local state for text inputs that drive URL filters.
 * Keeps typing responsive while only pushing to the URL/API every `delay` ms.
 */
export function useDebouncedFilters(filters, setFilters, delay = 350) {
  const [draft, setDraft] = useState(filters);
  const lastPushed = useRef(filters);

  // Sync draft when URL changes externally (e.g. "Clear" or back navigation).
  useEffect(() => {
    const changedExternally = Object.keys(filters).some((key) => filters[key] !== lastPushed.current[key]);
    if (changedExternally) {
      setDraft(filters);
      lastPushed.current = filters;
    }
  }, [filters]);

  useEffect(() => {
    const dirty = Object.keys(draft).some((key) => draft[key] !== lastPushed.current[key]);
    if (!dirty) return undefined;
    const timer = setTimeout(() => {
      lastPushed.current = draft;
      setFilters(draft);
    }, delay);
    return () => clearTimeout(timer);
  }, [draft, delay, setFilters]);

  const setDraftField = useCallback(
    (key, value) => setDraft((current) => ({ ...current, [key]: value })),
    [],
  );

  return [draft, setDraftField, setDraft];
}
