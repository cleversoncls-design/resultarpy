import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Estado de colapso do menu lateral, compartilhado entre o AppSidebar (que
// desenha o menu) e o AppHeader (que agora tem o botão de recolher/expandir,
// no mesmo lugar do protótipo de referência — antes esse botão só existia
// dentro do próprio menu, o que fazia parecer que a tela não tinha esse
// comportamento). Um Context simples é suficiente: só precisamos que os dois
// componentes leiam/alterem o mesmo valor.
const STORAGE_KEY = 'controle-viagens-sidebar-collapsed';

type SidebarContextValue = {
  collapsed: boolean;
  toggleCollapse: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === '1') setCollapsed(true);
    });
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const value = useMemo(() => ({ collapsed, toggleCollapse }), [collapsed, toggleCollapse]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebarCollapse() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebarCollapse precisa ser usado dentro de <SidebarProvider>.');
  return ctx;
}
