import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'carbonex.data-source';

const DataSourceContext = createContext(null);

function readInitialMode() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'test';
  } catch {
    return false;
  }
}

/**
 * Chooses whether the live monitor, analytics, and event replay read from the
 * backend or from the deterministic synthetic generator in lib/testData.js.
 * The choice persists across reloads.
 */
export function DataSourceProvider({ children }) {
  const [isTest, setIsTest] = useState(readInitialMode);

  const toggle = useCallback(() => {
    setIsTest(prev => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'test' : 'live');
      } catch {
        // Storage unavailable (private mode) — the toggle still works for this session.
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isTest, setIsTest, toggle, label: isTest ? 'TEST DATA' : 'LIVE FEED' }),
    [isTest, toggle]
  );

  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
}

export function useDataSource() {
  const ctx = useContext(DataSourceContext);
  if (!ctx) throw new Error('useDataSource must be used inside a DataSourceProvider');
  return ctx;
}
