import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, usePathname } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useThemeContext } from '@/lib/theme-provider';
import { useLanguage } from '@/lib/language-provider';
import { useAuth } from '@/hooks/use-auth';
import { PreferenceDropdowns } from '@/components/preference-dropdown';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';

// Esta lista precisa ficar IGUAL à de app/(tabs)/_layout.tsx — são duas
// cópias separadas do mesmo menu (uma pras telas com abas, outra pras
// telas "avulsas" como esta). Se editar uma, edite a outra também.
const moduleGroups = [
  { key: 'travel', label: 'Viagens', icon: 'airplane' as const, items: [
    { label: 'Visão geral', path: '/', icon: 'house.fill' as const },
    { label: 'Minhas viagens', path: '/trips', icon: 'airplane' as const },
    { label: 'Minhas viagens', path: '/trips?mine=1', icon: 'airplane' as const },
    { label: 'Nova solicitação', path: '/new-trip', icon: 'plus' as const },
    { label: 'Cadastros gerais', path: '/general-cadastros', icon: 'building.2.fill' as const },
    { label: 'Aprovações', path: '/approvals', icon: 'checkmark.seal.fill' as const },
    { label: 'Prestações pendentes', path: '/closure-queue', icon: 'checkmark.seal.fill' as const },
    { label: 'Operação', path: '/operations', icon: 'briefcase.fill' as const },
    { label: 'Relatório de reembolso', path: '/reimbursements', icon: 'wallet.pass.fill' as const },
    { label: 'Relatório de Faturamento', path: '/reports', icon: 'chart.bar.fill' as const },
  ] },
  { key: 'fleet', label: 'Frota', icon: 'car.fill' as const, items: [
    { label: 'Painel da frota', path: '/fleet', icon: 'car.fill' as const },
    { label: 'Cadastros de Frota', path: '/fleet-cadastros', icon: 'building.2.fill' as const },
    { label: 'Ordens de Serviço', path: '/new-work-order', icon: 'wrench.and.screwdriver.fill' as const },
    { label: 'Histórico de manutenção', path: '/maintenance-report', icon: 'chart.bar.fill' as const },
  ] },
  { key: 'settings', label: 'Configurações Gerais', icon: 'gearshape.fill' as const, items: [
    { label: 'Usuários', path: '/admin-users', icon: 'person.2.fill' as const },
    { label: 'Moedas', path: '/currency-settings', icon: 'wallet.pass.fill' as const },
  ] },
];

export function DesktopRouteShell({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { user, logout } = useAuth();
  const profile = user?.profile ?? (user?.role === 'admin' ? 'admin' : 'traveler');
  const role = profile === 'admin' ? 'Administrativo' : profile === 'approver' ? 'Aprovador' : profile === 'traveler_approver' ? 'Viajante + Aprovador' : 'Viajante';
  const { preference, setPreference } = useThemeContext();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState('');
  const moduleKeys = useMemo(() => moduleGroups.map((module) => module.key), []);
  const [renderedModules, setRenderedModules] = useState<Record<string, boolean>>(() => Object.fromEntries(moduleKeys.map((key) => [key, false])));
  const moduleAnimations = useRef<Record<string, Animated.Value>>(Object.fromEntries(moduleKeys.map((key) => [key, new Animated.Value(0)]))).current;
  const isDesktop = width >= 900;
  const canApprove = profile === 'admin' || profile === 'approver' || profile === 'traveler_approver';
  const canAdmin = profile === 'admin';
  const hasOwnTripsQuery = trpc.operations.trips.hasOwnTrips.useQuery(undefined, { enabled: canAdmin });
  const visibleModules = useMemo(() => moduleGroups.map((module) => ({ ...module, items: module.items.filter((item) => {
    if ((module.key === 'fleet' || module.key === 'settings') && !canAdmin) return false;
    if (item.path === '/approvals') return canApprove;
    if (item.path === '/trips?mine=1') return canAdmin && Boolean(hasOwnTripsQuery.data);
    if (['/operations', '/reports', '/general-cadastros', '/admin-users', '/closure-queue'].includes(item.path)) return canAdmin;
    return true;
  }).map((item) => item.path === '/trips' && canAdmin ? { ...item, label: 'Todas as viagens' } : item) })).filter((module) => module.items.length > 0), [canAdmin, canApprove, hasOwnTripsQuery.data]);
  useEffect(() => { AsyncStorage.getItem('controle-viagens-expanded-module').then((saved) => { if (saved && visibleModules.some((module) => module.key === saved)) { setExpandedModule(saved); setRenderedModules(Object.fromEntries(moduleKeys.map((key) => [key, key === saved]))); moduleAnimations[saved]?.setValue(1); } }); }, [moduleAnimations, moduleKeys, visibleModules]);
  if (!isDesktop) return <>{children}</>;
  // Mesma lógica corrigida do (tabs)/_layout.tsx: sempre fecha qualquer
  // outro grupo aberto ao expandir um novo.
  const toggleModule = (key: string) => {
    const opening = expandedModule !== key;
    const nextKey = opening ? key : '';
    setRenderedModules(Object.fromEntries(moduleKeys.map((moduleKey) => [moduleKey, moduleKey === nextKey])));
    setExpandedModule(nextKey);
    moduleKeys.forEach((moduleKey) => {
      const animation = moduleAnimations[moduleKey];
      if (!animation) return;
      if (moduleKey === nextKey) {
        animation.setValue(0);
        Animated.timing(animation, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      } else {
        animation.stopAnimation();
        animation.setValue(0);
      }
    });
    if (nextKey) {
      AsyncStorage.setItem('controle-viagens-expanded-module', nextKey);
    } else {
      AsyncStorage.removeItem('controle-viagens-expanded-module');
    }
  };
  return <View style={{ backgroundColor: colors.background }} className="flex-1 flex-row">
    <View style={{ borderRightColor: colors.border, backgroundColor: colors.surface }} className="w-[252px] border-r px-5 py-6">
      <View className="mb-7 flex-row items-center px-1"><View style={{ backgroundColor: colors.primary }} className="h-9 w-9 items-center justify-center rounded-xl"><IconSymbol name="airplane" size={18} color="white" /></View><Text className="text-base font-bold text-foreground">{t('Controle de Viagens')}</Text></View>
      <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [{ paddingHorizontal: 4, marginBottom: 24, opacity: pressed ? 0.72 : 1 }]} ><Text className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('Conta autenticada')}</Text><Text className="mt-1 text-sm font-bold text-primary">{user?.name || 'Usuário autenticado'}</Text><Text className="mt-1 text-xs text-muted">{user?.email || t('Permissões administradas pelo servidor')}</Text></Pressable>
      <Text className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-muted">{t('Workspace')}</Text>
      {visibleModules.map((module) => { const moduleActive = module.items.some((item) => item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)); const open = expandedModule === module.key; return <View key={module.key} className="mb-2"><Pressable onPress={() => toggleModule(module.key)} onHoverIn={() => setHoveredPath(`module-${module.key}`)} onHoverOut={() => setHoveredPath(null)} style={({ pressed }) => [{ backgroundColor: moduleActive && !open ? `${colors.primary}12` : hoveredPath === `module-${module.key}` ? `${colors.primary}12` : 'transparent', borderRadius: 10, flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, opacity: pressed ? 0.72 : 1 }]}><IconSymbol name={module.icon} size={19} color={moduleActive || hoveredPath === `module-${module.key}` ? colors.primary : colors.muted} /><Text style={{ color: moduleActive || hoveredPath === `module-${module.key}` ? colors.primary : colors.foreground, marginLeft: 12, fontSize: 14, fontWeight: '700', flex: 1 }}>{t(module.label)}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{open ? '⌃' : '⌄'}</Text></Pressable>{renderedModules[module.key] ? <Animated.View style={{ opacity: moduleAnimations[module.key], transform: [{ scaleY: moduleAnimations[module.key] }] }} className="ml-3 border-l border-border pl-2">{module.items.map((item) => { const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path); return <Pressable key={item.path} onPress={() => router.push(item.path as never)} onHoverIn={() => setHoveredPath(item.path)} onHoverOut={() => setHoveredPath(null)} style={({ pressed }) => [{ backgroundColor: active ? colors.primary : hoveredPath === item.path ? `${colors.primary}12` : 'transparent', borderRadius: 9, flexDirection: 'row', alignItems: 'center', minHeight: 38, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 3, opacity: pressed ? 0.72 : 1 }]}><IconSymbol name={item.icon} size={16} color={active ? 'white' : hoveredPath === item.path ? colors.primary : colors.muted} /><Text style={{ color: active ? 'white' : hoveredPath === item.path ? colors.primary : colors.foreground, marginLeft: 10, fontSize: 13, fontWeight: '600', flex: 1 }}>{t(item.label)}</Text></Pressable>; })}</Animated.View> : null}</View>; })}
      <View className="mt-auto border-t border-border pt-4"><Text className="px-1 text-xs font-semibold text-foreground">{t(role === 'Administrativo' ? 'Perfil Administrativo' : role === 'Aprovador' ? 'Perfil Aprovador' : role === 'Viajante + Aprovador' ? 'Perfil Viajante + Aprovador' : 'Perfil Viajante')}</Text><Text className="mt-1 px-1 text-xs text-muted">{t('Configurações e preferências')}</Text><PreferenceDropdowns language={language} setLanguage={setLanguage} theme={preference} setTheme={setPreference} onLogout={() => void logout().then(() => router.replace('/login'))} /></View>
    </View>
    <View className="flex-1">{children}</View>
  </View>;
}
