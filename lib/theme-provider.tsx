import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
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

// Na web, localStorage é síncrono — lemos por aqui na primeira
// renderização para já começar com o tema certo, sem esperar o
// AsyncStorage (assíncrono) responder depois de a tela já ter aparecido
// com o tema errado por um instante.
function readStoredPreferenceSync(): ThemePreference | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved;
  } catch {
    // localStorage pode não estar disponível (modo privado, etc.)
  }
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredPreferenceSync() ?? 'system');
  const colorScheme: ColorScheme = preference === 'system' ? systemScheme : preference;

  // O HTML estático (gerado no build) sempre "nasce" com as cores do
  // tema claro, porque não existe usuário/preferência nesse momento. Às
  // vezes o React, ao "hidratar" essa página no navegador, não força a
  // troca desse estilo específico — ele mantém o que já veio pronto do
  // servidor. Isso fazia a tela principal (a que envolve o app inteiro)
  // ficar presa no claro até um evento que forçasse um novo render.
  // `mounted` começa false (igual ao servidor) e vira true assim que o
  // navegador termina de montar a página — usamos isso como "key" do
  // elemento principal, forçando o React a descartar o nó antigo (com o
  // estilo do build) e criar um novo, já com a cor certa, sem meio-termo.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
    }
    AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => setPreference(scheme), [setPreference]);

  // Ainda mantemos o AsyncStorage como fonte de verdade "oficial" (funciona
  // em qualquer plataforma), mas como já lemos do localStorage de forma
  // síncrona acima, isso aqui normalmente não muda mais nada visualmente
  // na web — só serve de reforço/sincronização e cobre nativo (iOS/Android).
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if ((saved === 'system' || saved === 'light' || saved === 'dark') && saved !== preference) {
        setPreferenceState(saved);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useLayoutEffect (não useEffect) é essencial aqui: ele roda de forma
  // síncrona, antes do navegador pintar a tela — é isso que elimina o
  // "flash" de tema errado. useEffect roda depois da pintura, tarde
  // demais para evitar o pisca.
  useLayoutEffect(() => { applyScheme(colorScheme); }, [applyScheme, colorScheme]);

  const themeVariables = useMemo(() => vars(Object.fromEntries(Object.entries(SchemeColors[colorScheme]).map(([token, value]) => [`color-${token}`, value]))), [colorScheme]);
  const value = useMemo(() => ({ colorScheme, preference, setColorScheme, setPreference }), [colorScheme, preference, setColorScheme, setPreference]);

  return (
    <ThemeContext.Provider value={value}>
      <View key={mounted ? 'client' : 'server'} style={[{ flex: 1 }, themeVariables]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
