import { Tabs, router, usePathname } from 'expo-router';
import { Animated, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/lib/theme-provider';
import { useLanguage } from '@/lib/language-provider';
import { PreferenceDropdowns } from '@/components/preference-dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';

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
];

export default function TabLayout() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const profile = user?.profile ?? (user?.role === 'admin' ? 'admin' : 'traveler');
  const role = profile === 'admin' ? 'Administrativo' : profile === 'approver' ? 'Aprovador' : profile === 'traveler_approver' ? 'Viajante + Aprovador' : 'Viajante';
  const { preference, setPreference } = useThemeContext();
  const { language, setLanguage, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState('');
  const [renderedModules, setRenderedModules] = useState<Record<string, boolean>>({ travel: false, fleet: false });
  const moduleAnimations = useRef<Record<string, Animated.Value>>({ travel: new Animated.Value(1), fleet: new Animated.Value(0) }).current;
  const isCompactWeb = Platform.OS === 'web' && width < 900;
  const canApprove = profile === 'admin' || profile === 'approver' || profile === 'traveler_approver';
  const canAdmin = profile === 'admin';
  const hasOwnTripsQuery = trpc.operations.trips.hasOwnTrips.useQuery(undefined, { enabled: canAdmin });
  const visibleModules = useMemo(() => moduleGroups.map((module) => ({ ...module, items: module.items.filter((item) => {
    if (module.key === 'fleet' && !canAdmin) return false;
    if (item.path === '/approvals') return canApprove;
    if (item.path === '/trips?mine=1') return canAdmin && Boolean(hasOwnTripsQuery.data);
    if (['/operations', '/reports', '/general-cadastros', '/admin-users', '/closure-queue'].includes(item.path)) return canAdmin;
    return true;
  }).map((item) => item.path === '/trips' && canAdmin ? { ...item, label: 'Todas as viagens' } : item) })).filter((module) => module.items.length > 0), [canAdmin, canApprove, hasOwnTripsQuery.data]);
  const pathname = usePathname();
  const bottomPadding = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);
  useEffect(() => { AsyncStorage.getItem('controle-viagens-expanded-module').then((saved) => { if (saved && visibleModules.some((module) => module.key === saved)) { setExpandedModule(saved); setRenderedModules((current) => ({ ...current, [saved]: true })); moduleAnimations[saved]?.setValue(1); } }); }, [moduleAnimations, visibleModules]);
  const toggleModule = (key: string) => { const closing = expandedModule === key; if (closing) { Animated.timing(moduleAnimations[key], { toValue: 0, duration: 180, useNativeDriver: true }).start(() => { setExpandedModule(''); setRenderedModules((current) => ({ ...current, [key]: false })); }); AsyncStorage.removeItem('controle-viagens-expanded-module'); return; } const previous = expandedModule; if (previous && previous !== key) { moduleAnimations[previous]?.stopAnimation(); moduleAnimations[previous]?.setValue(0); } const next = key; setRenderedModules((current) => ({ ...current, travel: next === 'travel', fleet: next === 'fleet', [next]: true })); setExpandedModule(next); moduleAnimations[next]?.setValue(0); Animated.timing(moduleAnimations[next], { toValue: 1, duration: 180, useNativeDriver: true }).start(); AsyncStorage.setItem('controle-viagens-expanded-module', next); };

  const tabs = (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarButton: HapticTab, tabBarStyle: { display: isCompactWeb ? 'flex' : Platform.OS === 'web' ? 'none' : 'flex', paddingTop: 6, paddingBottom: bottomPadding, height: 56 + bottomPadding, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 0.5, overflow: isCompactWeb ? 'scroll' : 'hidden' }, tabBarLabelStyle: { fontSize: isCompactWeb ? 9 : 11, fontWeight: '600', maxWidth: isCompactWeb ? 82 : undefined }, tabBarItemStyle: { flex: isCompactWeb ? 0 : 1, minWidth: isCompactWeb ? 78 : 0, paddingHorizontal: 0 }, tabBarIconStyle: { marginTop: isCompactWeb ? 1 : 0 } }}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="trips" options={{ title: 'Viagens', tabBarIcon: ({ color }) => <IconSymbol name="airplane" size={23} color={color} /> }} />
      <Tabs.Screen name="approvals" options={{ title: 'Aprovações', href: canApprove ? undefined : null, tabBarIcon: ({ color }) => <IconSymbol name="checkmark.seal.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="operations" options={{ title: 'Operação', href: canAdmin ? undefined : null, tabBarIcon: ({ color }) => <IconSymbol name="briefcase.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="fleet" options={{ title: 'Frota', href: canAdmin ? undefined : null, tabBarIcon: ({ color }) => <IconSymbol name="car.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="reimbursements" options={{ title: 'Reembolso', tabBarIcon: ({ color }) => <IconSymbol name="wallet.pass.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Relatório de Faturamento', href: canAdmin ? undefined : null, tabBarIcon: ({ color }) => <IconSymbol name="chart.bar.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <IconSymbol name="person.crop.circle.fill" size={23} color={color} /> }} />
    </Tabs>
  );

  if (Platform.OS !== 'web' || isCompactWeb) return tabs;

  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1 flex-row">
      <View style={{ borderRightColor: colors.border, backgroundColor: colors.surface }} className="w-[252px] border-r px-5 py-6">
        <View className="mb-7 flex-row items-center px-1">
          <View style={{ backgroundColor: colors.primary }} className="h-9 w-9 items-center justify-center rounded-xl">
            <IconSymbol name="airplane" size={18} color="white" />
          </View>
          <Text className="ml-3 text-base font-bold text-foreground">{t('Controle de Viagens')}</Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="mb-6 px-1">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('Perfil autenticado')}</Text>
          <Text className="mt-1 text-sm font-bold text-primary">{t(`Perfil: ${role}`).replace('Perfil: ', '')}</Text>
          <Text className="mt-1 text-xs text-muted">{t('Permissões definidas pelo servidor')}</Text>
        </Pressable>
        <Text className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-muted">{t('Workspace')}</Text>
        {visibleModules.map((module) => {
          const moduleActive = module.items.some((item) => item.path === '/' ? pathname === '/' : pathname.startsWith(item.path));
          const open = expandedModule === module.key;
          return <View key={module.key} className="mb-2">
            <Pressable onPress={() => toggleModule(module.key)} onHoverIn={() => setHoveredPath(`module-${module.key}`)} onHoverOut={() => setHoveredPath(null)} style={({ pressed }) => [{ backgroundColor: moduleActive && !open ? `${colors.primary}12` : hoveredPath === `module-${module.key}` ? `${colors.primary}12` : 'transparent', borderRadius: 10, flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, opacity: pressed ? 0.72 : 1 }]}>
              <IconSymbol name={module.icon} size={19} color={moduleActive || hoveredPath === `module-${module.key}` ? colors.primary : colors.muted} />
              <Text style={{ color: moduleActive || hoveredPath === `module-${module.key}` ? colors.primary : colors.foreground, marginLeft: 12, fontSize: 14, fontWeight: '700', flex: 1 }}>{t(module.label)}</Text>
              <Text style={{ color: colors.muted, fontSize: 14 }}>{open ? '⌃' : '⌄'}</Text>
            </Pressable>
            {renderedModules[module.key] ? <Animated.View style={{ opacity: moduleAnimations[module.key], transform: [{ scaleY: moduleAnimations[module.key] }] }} className="ml-3 border-l border-border pl-2">{module.items.map((item) => {
              const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
              return <Pressable key={item.path} onPress={() => router.push(item.path as never)} onHoverIn={() => setHoveredPath(item.path)} onHoverOut={() => setHoveredPath(null)} style={({ pressed }) => [{ backgroundColor: active ? colors.primary : hoveredPath === item.path ? `${colors.primary}12` : 'transparent', borderRadius: 9, flexDirection: 'row', alignItems: 'center', minHeight: 38, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 3, opacity: pressed ? 0.72 : 1 }]}>
                <IconSymbol name={item.icon} size={16} color={active ? 'white' : hoveredPath === item.path ? colors.primary : colors.muted} />
                <Text style={{ color: active ? 'white' : hoveredPath === item.path ? colors.primary : colors.foreground, marginLeft: 10, fontSize: 13, fontWeight: '600', flex: 1 }}>{t(item.label)}</Text>
              </Pressable>;
            })}</Animated.View> : null}
          </View>;
        })}
        {canAdmin ? <Pressable onPress={() => router.push('/admin-users')} onHoverIn={() => setHoveredPath('/admin-users-direct')} onHoverOut={() => setHoveredPath(null)} style={({ pressed }) => [{ backgroundColor: pathname.startsWith('/admin-users') ? colors.primary : hoveredPath === '/admin-users-direct' ? `${colors.primary}12` : 'transparent', borderRadius: 9, flexDirection: 'row', alignItems: 'center', minHeight: 42, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12, opacity: pressed ? 0.72 : 1 }]}>
          <IconSymbol name="person.2.fill" size={18} color={pathname.startsWith('/admin-users') ? 'white' : colors.muted} />
          <Text style={{ color: pathname.startsWith('/admin-users') ? 'white' : colors.foreground, marginLeft: 12, fontSize: 14, fontWeight: '700' }}>{t('Usuários locais')}</Text>
        </Pressable> : null}
        <View className="mt-auto border-t border-border pt-4">
          <Text className="px-1 text-xs font-semibold text-foreground">{t(`Perfil: ${role}`)}</Text>
          <Text className="mt-1 px-1 text-xs text-muted">{t('Configurações e preferências')}</Text>
          <PreferenceDropdowns language={language} setLanguage={setLanguage} theme={preference} setTheme={setPreference} onLogout={() => void logout().then(() => router.replace('/login'))} />
        </View>
      </View>
      <View className="flex-1">{tabs}</View>
    </View>
  );
}
