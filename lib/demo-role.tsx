import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Role } from './demo-data';

const ROLE_KEY = '@controle-viagens/demo-role';
type RoleContextValue = { role: Role; setRole: (role: Role) => void };
const DemoRoleContext = createContext<RoleContextValue | null>(null);

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('Viajante');
  useEffect(() => { AsyncStorage.getItem(ROLE_KEY).then((saved) => { if (saved === 'Viajante' || saved === 'Aprovador' || saved === 'Administrativo') setRoleState(saved); }); }, []);
  const setRole = (nextRole: Role) => { setRoleState(nextRole); AsyncStorage.setItem(ROLE_KEY, nextRole); };
  return <DemoRoleContext.Provider value={{ role, setRole }}>{children}</DemoRoleContext.Provider>;
}
export function useDemoRole() { const context = useContext(DemoRoleContext); if (!context) throw new Error('useDemoRole must be used inside DemoRoleProvider'); return context; }
