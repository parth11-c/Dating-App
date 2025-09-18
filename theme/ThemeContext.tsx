import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  effective: Exclude<ThemeMode, 'system'>; // resolved mode
  toggle: () => void; // toggles light/dark
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const effective: Exclude<ThemeMode, 'system'> = (mode === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : mode);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    effective,
    toggle: () => setMode(prev => (prev === 'dark' ? 'light' : 'dark')),
    setMode,
  }), [mode, effective]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  // Fallback: derive from system to avoid crashes if provider isn't mounted yet
  const systemScheme = useColorScheme();
  const effective = systemScheme === 'dark' ? 'dark' : 'light';
  return {
    mode: 'system' as const,
    effective,
    toggle: () => {},
    setMode: () => {},
  };
}
