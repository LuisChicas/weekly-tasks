// Feature flags context — provides flags to all components via useFlags() hook.
// Flags come from auth/sync API responses (for logged-in users) or GET /flags (anonymous).
// Cached in localStorage for offline fallback.
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { FeatureFlags } from './api';

const FLAGS_STORAGE_KEY = 'featureFlags';

const DEFAULT_FLAGS: FeatureFlags = {};

interface FlagsContextValue {
  flags: FeatureFlags;
  setFlags: (flags: FeatureFlags) => void;
  clearFlags: () => void;
}

const FlagsContext = createContext<FlagsContextValue>({
  flags: DEFAULT_FLAGS,
  setFlags: () => {},
  clearFlags: () => {},
});

// Hook to access feature flags from any component
export function useFlags(): FlagsContextValue {
  return useContext(FlagsContext);
}

interface FlagsProviderProps {
  children: ReactNode;
}

// Wraps the app to provide feature flags via context.
// Flags are set by page.tsx when it receives them from login/register/sync responses.
export function FlagsProvider({ children }: FlagsProviderProps) {
  const [flags, setFlagsState] = useState<FeatureFlags>(() => {
    if (typeof window === 'undefined') return DEFAULT_FLAGS;
    try {
      const stored = localStorage.getItem(FLAGS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return DEFAULT_FLAGS;
  });

  // Updates flags in state and persists to localStorage
  const setFlags = useCallback((newFlags: FeatureFlags) => {
    setFlagsState(newFlags);
    localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(newFlags));
  }, []);

  // Clears flags on logout
  const clearFlags = useCallback(() => {
    setFlagsState(DEFAULT_FLAGS);
    localStorage.removeItem(FLAGS_STORAGE_KEY);
  }, []);

  return (
    <FlagsContext.Provider value={{ flags, setFlags, clearFlags }}>
      {children}
    </FlagsContext.Provider>
  );
}

export { FLAGS_STORAGE_KEY };
