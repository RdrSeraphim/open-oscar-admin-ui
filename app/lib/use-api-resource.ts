"use client";

import { useCallback, useEffect, useState } from "react";

interface ApiResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface ApiResource<T> extends ApiResourceState<T> {
  refresh: () => void;
}

/**
 * Fetches on mount, exposing a manual `refresh()` for post-mutation
 * revalidation. No background polling. `fetcher` must be a stable
 * reference (a module-level function, or wrapped in `useCallback` at
 * the call site) so refetching only happens when its real inputs change.
 */
export function useApiResource<T>(fetcher: () => Promise<T>): ApiResource<T> {
  const [state, setState] = useState<ApiResourceState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // If the fetcher's identity changes (e.g. a route param it closes over),
  // reset synchronously during render rather than in an effect, so the
  // previous fetcher's stale data never renders alongside the new fetch.
  // This is React's documented "adjust state during render" pattern
  // (react.dev, "You Might Not Need an Effect"); it uses a second piece of
  // state rather than a ref because mutating a ref during render is itself
  // disallowed (react-hooks/refs).
  const [prevFetcher, setPrevFetcher] = useState(() => fetcher);
  if (prevFetcher !== fetcher) {
    setPrevFetcher(() => fetcher);
    setState({ data: null, loading: true, error: null });
  }

  // Only ever settles state from an async callback, never synchronously,
  // so it's safe to invoke directly from the mount effect below.
  const load = useCallback(() => {
    fetcher()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) =>
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        }),
      );
  }, [fetcher]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    load();
  }, [load]);

  return { ...state, refresh };
}
