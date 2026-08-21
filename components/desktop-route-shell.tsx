import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { router, usePathname } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useDemoRole } from '@/lib/demo-role';
import { useThemeContext, type ThemePreference } from '@/lib/theme-provider';
import { useLanguage, languageOptions, type AppLanguage } from '@/lib/language-provider';
import { IconSymbol } from '@/components/ui/icon-symbol';

const themeChoices: { key: ThemePreference; icon: 'sun.max.fill' | 'moon.fill' | 'gearshape.fill'; label: string }[] = [
  { key: 'light', icon: 'sun.max.fill', label: 'Claro' },
  { key: 'dark', icon: 'moon.fill', label: 'Escuro' },
  { key: 'system', icon: 'gearshape.fill', label: 'Sistema' },
];

const items = [
  { label: 'Painel', path: '/', icon: 'house.fill' as const },
  { label: 'Minhas viagens', path: '/trips', icon: 'airplane' as const },
  { label: 'Nova solicitação', path: '/new-trip', icon: 'plus' as const },
  { label: 'Aprovações', path: '/approvals', icon: 'checkmark.seal.fill' as const },
  { label: 'Preparação', path: '/operations', icon: 'briefcase.fill' as const },
  { label: 'Frota', path: '/fleet', icon: 'car.fill' as const },
  { label: 'Relatório de reembolso', path: '/reimbursements', icon: 'wallet.pass.fill' as const },
  { label: 'Relatórios', path: '/reports', icon: 'chart.bar.fill' as const },
];

export function DesktopRouteShell({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { role } = useDemoRole();
  const { preference, setPreference } = useThemeContext();
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const isDesktop = width >= 900;
  if (!isDesktop) return <>{children}</>;
  const canApprove = role === 'Aprovador' || role === 'Administrativo';
  const canAdmin = role === 'Administrativo';
  const visibleItems = items.filter((item) => item.path !== '/approvals' || canApprove).filter((item) => !['/operations', '/fleet', '/reports'].includes(item.path) || canAdmin);
  return <View style={{ backgroundColor: colors.background }} className="flex-1 flex-row">
    <View style={{ borderRightColor: colors.border, backgroundColor: colors.surface }} className="w-[252px] border-r px-5 py-6">
      <View className="mb-7 flex-row items-center px-1"><View style={{ backgroundColor: colors.primary }} className="h-9 w-9 items-center justify-center rounded-xl"><IconSymbol name="airplane" size={18} color="white" /></View><Text className="ml-3 text-base font-bold text-foreground">Controle de Viagens</Text></View>
      <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [{ paddingHorizontal: 4, marginBottom: 24, opacity: pressed ? 0.72 : 1 }]} ><Text className="text-[10px] font-bold uppercase tracking-widest text-muted">Perfil de teste</Text><Text className="mt-1 text-sm font-bold text-primary">{role}</Text><Text className="mt-1 text-xs text-muted">Clique para trocar a visão</Text></Pressable>
      <Text className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-muted">Workspace</Text>
      {visibleItems.map((item) => { const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path); return <Pressable key={item.path} onPress={() => router.push(item.path as never)} onHoverIn={() => setHoveredPath(item.path)} onHoverOut={() => setHoveredPath(null)} style={({ pressed }) => [{ backgroundColor: active ? colors.primary : hoveredPath === item.path ? `${colors.primary}12` : 'transparent', borderRadius: 10, flexDirection: 'row', alignItems: 'center', minHeight: 42, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4, opacity: pressed ? 0.72 : 1 }]}><IconSymbol name={item.icon} size={19} color={active ? 'white' : hoveredPath === item.path ? colors.primary : colors.muted} /><Text style={{ color: active ? 'white' : hoveredPath === item.path ? colors.primary : colors.foreground, marginLeft: 12, fontSize: 14, fontWeight: '600' }}>{item.label}</Text>{item.label === 'Aprovações' ? <View style={{ backgroundColor: colors.warning }} className="ml-auto h-5 min-w-5 items-center justify-center rounded-full px-1"><Text className="text-[10px] font-bold text-white">2</Text></View> : null}</Pressable>; })}
      <View className="mt-auto border-t border-border pt-4"><Text className="px-1 text-xs font-semibold text-foreground">{role === 'Administrativo' ? 'Perfil Administrativo' : role === 'Aprovador' ? 'Perfil Aprovador' : 'Perfil Viajante'}</Text><Text className="mt-1 px-1 text-xs text-muted">Configurações e preferências</Text><Text className="mb-2 mt-4 px-1 text-[10px] font-bold uppercase tracking-widest text-muted">Idioma</Text><View style={{ flexDirection: 'row', gap: 5 }}>{languageOptions.map((option) => { const selected = language === option.key; return <Pressable key={option.key} accessibilityLabel={`Idioma ${option.label}`} onPress={() => setLanguage(option.key as AppLanguage)} style={({ pressed }) => [{ flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: selected ? colors.primary : `${colors.primary}0D`, opacity: pressed ? 0.7 : 1 }]}><Text style={{ fontSize: 15 }}>{option.flag}</Text><Text style={{ marginTop: 2, color: selected ? 'white' : colors.muted, fontSize: 9, fontWeight: '700' }}>{option.label}</Text></Pressable>; })}</View><Text className="mb-2 mt-4 px-1 text-[10px] font-bold uppercase tracking-widest text-muted">Tema</Text><View style={{ flexDirection: 'row', gap: 5 }}>{themeChoices.map((choice) => { const selected = preference === choice.key; return <Pressable key={choice.key} accessibilityLabel={`Tema ${choice.label}`} onPress={() => setPreference(choice.key)} style={({ pressed }) => [{ flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: selected ? colors.primary : `${colors.primary}0D`, opacity: pressed ? 0.7 : 1 }]}><IconSymbol name={choice.icon} size={16} color={selected ? 'white' : colors.muted} /><Text style={{ marginTop: 2, color: selected ? 'white' : colors.muted, fontSize: 9, fontWeight: '700' }}>{choice.label}</Text></Pressable>; })}</View></View>
    </View>
    <View className="flex-1">{children}</View>
  </View>;
}
