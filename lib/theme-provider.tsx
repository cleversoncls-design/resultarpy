import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, View, useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nativewindColorScheme, vars } from 'nativewind';
import { SchemeColors, type ColorScheme } from '@/constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  colorScheme: ColorScheme;
  preference: ThemePreference;
  setColorScheme: (scheme: ColorScheme) => void;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = 'controle-viagens-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const colorScheme: ColorScheme = preference === 'system' ? systemScheme : preference;

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle('dark', scheme === 'dark');
      Object.entries(SchemeColors[scheme]).forEach(([token, value]) => root.style.setProperty(`--color-${token}`, value));
    }
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => setPreference(scheme), [setPreference]);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'system' || saved === 'light' || saved === 'dark') setPreferenceState(saved);
    });
  }, []);

  useEffect(() => { applyScheme(colorScheme); }, [applyScheme, colorScheme]);

  const themeVariables = useMemo(() => vars(Object.fromEntries(Object.entries(SchemeColors[colorScheme]).map(([token, value]) => [`color-${token}`, value]))), [colorScheme]);
  const value = useMemo(() => ({ colorScheme, preference, setColorScheme, setPreference }), [colorScheme, preference, setColorScheme, setPreference]);

  return <ThemeContext.Provider value={value}><View style={[{ flex: 1 }, themeVariables]}>{children}</View></ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
