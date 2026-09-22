import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Role } from './demo-data';

const ROLE_KEY = '@controle-viagens/demo-role';
type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
  isDemo: boolean;
};
type DemoRoleProviderProps = {
  children: ReactNode;
  lockedRole?: Role;
};
const DemoRoleContext = createContext<RoleContextValue | null>(null);

export function DemoRoleProvider({ children, lockedRole }: DemoRoleProviderProps) {
  const [role, setRoleState] = useState<Role>(lockedRole ?? 'Viajante');
  const isDemo = !lockedRole;

  useEffect(() => {
    if (lockedRole) {
      setRoleState(lockedRole);
      return;
    }
    const queryRole = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('perfil') : null;
    const fromQuery = queryRole === 'viajante' ? 'Viajante' : queryRole === 'aprovador' ? 'Aprovador' : queryRole === 'administrativo' ? 'Administrativo' : null;
    if (fromQuery) {
      setRoleState(fromQuery);
      AsyncStorage.setItem(ROLE_KEY, fromQuery);
      return;
    }
    AsyncStorage.getItem(ROLE_KEY).then((saved) => {
      if (saved === 'Viajante' || saved === 'Aprovador' || saved === 'Administrativo') setRoleState(saved);
    });
  }, [lockedRole]);

  const setRole = (nextRole: Role) => {
    if (lockedRole) return;
    setRoleState(nextRole);
    AsyncStorage.setItem(ROLE_KEY, nextRole);
  };

  return <DemoRoleContext.Provider value={{ role, setRole, isDemo }}>{children}</DemoRoleContext.Provider>;
}

export function useDemoRole() {
  const context = useContext(DemoRoleContext);
  if (!context) throw new Error('useDemoRole must be used inside DemoRoleProvider');
  return context;
}
