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
