import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export type AppTheme = 'light' | 'dark' | 'system';

type ThemeContextType = {
  preference: AppTheme;
  effective: Exclude<ColorSchemeName, null>;
  setPreference: (t: AppTheme) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<AppTheme>('system');
  const [system, setSystem] = useState<Exclude<ColorSchemeName, null>>(Appearance.getColorScheme() ?? 'light');

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(colorScheme ?? 'light');
    });
    return () => sub.remove();
  }, []);

  const effective: Exclude<ColorSchemeName, null> = preference === 'system' ? system : preference;

  const value = useMemo(() => ({ preference, effective, setPreference }), [preference, effective]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}
