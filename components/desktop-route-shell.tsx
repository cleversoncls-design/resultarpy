import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { router, usePathname } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useDemoRole } from '@/lib/demo-role';
import { useThemeContext } from '@/lib/theme-provider';
import { useLanguage } from '@/lib/language-provider';
import { PreferenceDropdowns } from '@/components/preference-dropdown';
import { IconSymbol } from '@/components/ui/icon-symbol';

const moduleGroups = [
  { key: 'travel', label: 'Viagens', icon: 'airplane' as const, items: [
    { label: 'Painel', path: '/', icon: 'house.fill' as const },
    { label: 'Minhas viagens', path: '/trips', icon: 'airplane' as const },
    { label: 'Nova solicitação', path: '/new-trip', icon: 'plus' as const },
    { label: 'Aprovações', path: '/approvals', icon: 'checkmark.seal.fill' as const },
    { label: 'Preparação', path: '/operations', icon: 'briefcase.fill' as const },
    { label: 'Relatório de reembolso', path: '/reimbursements', icon: 'wallet.pass.fill' as const },
    { label: 'Relatórios', path: '/reports', icon: 'chart.bar.fill' as const },
  ] },
  { key: 'fleet', label: 'Frota', icon: 'car.fill' as const, items: [
    { label: 'Painel da frota', path: '/fleet', icon: 'car.fill' as const },
  ] },
];

export function DesktopRouteShell({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { role } = useDemoRole();
  const { preference, setPreference } = useThemeContext();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState('travel');
  const isDesktop = width >= 900;
  if (!isDesktop) return <>{children}</>;
  const canApprove = role === 'Aprovador' || role === 'Administrativo';
  const canAdmin = role === 'Administrativo';
  const visibleModules = moduleGroups.map((module) => ({ ...module, items: module.items.filter((item) => {
    if (module.key === 'fleet' && !canAdmin) return false;
    if (item.path === '/approvals') return canApprove;
    if (['/operations', '/reports'].includes(item.path)) return canAdmin;
    return true;
  }) })).filter((module) => module.items.length > 0);
  return <View style={{ backgroundColor: colors.background }} className="flex-1 flex-row">
    <View style={{ borderRightColor: colors.border, backgroundColor: colors.surface }} className="w-[252px] border-r px-5 py-6">
      <View className="mb-7 flex-row items-center px-1"><View style={{ backgroundColor: colors.primary }} className="h-9 w-9 items-center justify-center rounded-xl"><IconSymbol name="airplane" size={18} color="white" /></View><Text className="text-base font-bold text-foreground">{t('Controle de Viagens')}</Text></View>
      <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [{ paddingHorizontal: 4, marginBottom: 24, opacity: pressed ? 0.72 : 1 }]} ><Text className="text-[10px] font-bold uppercase tracking-widest text-muted">{t('Perfil de teste')}</Text><Text className="mt-1 text-sm font-bold text-primary">{role}</Text><Text className="mt-1 text-xs text-muted">{t('Clique para trocar a visão')}</Text></Pressable>
      <Text className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-muted">{t('Workspace')}</Text>
      {visibleModules.map((module) => { const moduleActive = module.items.some((item) => item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)); const open = expandedModule === module.key; return <View key={module.key} className="mb-2"><Pressable onPress={() => setExpandedModule(open ? '' : module.key)} onHoverIn={() => setHoveredPath(`module-${module.key}`)} onHoverOut={() => setHoveredPath(null)} style={({ pressed }) => [{ backgroundColor: moduleActive && !open ? `${colors.primary}12` : hoveredPath === `module-${module.key}` ? `${colors.primary}12` : 'transparent', borderRadius: 10, flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, opacity: pressed ? 0.72 : 1 }]}><IconSymbol name={module.icon} size={19} color={moduleActive || hoveredPath === `module-${module.key}` ? colors.primary : colors.muted} /><Text style={{ color: moduleActive || hoveredPath === `module-${module.key}` ? colors.primary : colors.foreground, marginLeft: 12, fontSize: 14, fontWeight: '700', flex: 1 }}>{t(module.label)}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{open ? '⌃' : '⌄'}</Text></Pressable>{open ? <View className="ml-3 border-l border-border pl-2">{module.items.map((item) => { const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path); return <Pressable key={item.path} onPress={() => router.push(item.path as never)} onHoverIn={() => setHoveredPath(item.path)} onHoverOut={() => setHoveredPath(null)} style={({ pressed }) => [{ backgroundColor: active ? colors.primary : hoveredPath === item.path ? `${colors.primary}12` : 'transparent', borderRadius: 9, flexDirection: 'row', alignItems: 'center', minHeight: 38, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 3, opacity: pressed ? 0.72 : 1 }]}><IconSymbol name={item.icon} size={16} color={active ? 'white' : hoveredPath === item.path ? colors.primary : colors.muted} /><Text style={{ color: active ? 'white' : hoveredPath === item.path ? colors.primary : colors.foreground, marginLeft: 10, fontSize: 13, fontWeight: '600', flex: 1 }}>{t(item.label)}</Text>{item.label === 'Aprovações' ? <View style={{ backgroundColor: colors.warning }} className="h-5 min-w-5 items-center justify-center rounded-full px-1"><Text className="text-[10px] font-bold text-white">2</Text></View> : null}</Pressable>; })}</View> : null}</View>; })}
      <View className="mt-auto border-t border-border pt-4"><Text className="px-1 text-xs font-semibold text-foreground">{t(role === 'Administrativo' ? 'Perfil Administrativo' : role === 'Aprovador' ? 'Perfil Aprovador' : 'Perfil Viajante')}</Text><Text className="mt-1 px-1 text-xs text-muted">{t('Configurações e preferências')}</Text><PreferenceDropdowns language={language} setLanguage={setLanguage} theme={preference} setTheme={setPreference} /></View>
    </View>
    <View className="flex-1">{children}</View>
  </View>;
}
