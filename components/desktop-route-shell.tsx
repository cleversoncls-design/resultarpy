import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useDemoRole } from '@/lib/demo-role';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  if (!isDesktop) return <>{children}</>;
  const canApprove = role === 'Aprovador' || role === 'Administrativo';
  const canAdmin = role === 'Administrativo';
  const visibleItems = items.filter((item) => item.path !== '/approvals' || canApprove).filter((item) => !['/operations', '/fleet', '/reports'].includes(item.path) || canAdmin);
  return <View style={{ backgroundColor: colors.background }} className="flex-1 flex-row">
    <View style={{ borderRightColor: colors.border, backgroundColor: colors.surface }} className="w-[252px] border-r px-5 py-6">
      <View className="mb-7 flex-row items-center px-1"><View style={{ backgroundColor: colors.primary }} className="h-9 w-9 items-center justify-center rounded-xl"><IconSymbol name="airplane" size={18} color="white" /></View><Text className="ml-3 text-base font-bold text-foreground">Controle de Viagens</Text></View>
      <Pressable onPress={() => router.push('/profile')} className="mb-6 px-1"><Text className="text-[10px] font-bold uppercase tracking-widest text-muted">Perfil de teste</Text><Text className="mt-1 text-sm font-bold text-primary">{role}</Text><Text className="mt-1 text-xs text-muted">Clique para trocar a visão</Text></Pressable>
      <Text className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-muted">Workspace</Text>
      {visibleItems.map((item) => { const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path); return <Pressable key={item.path} onPress={() => router.push(item.path as never)} style={({ pressed }) => [{ backgroundColor: active ? colors.primary : 'transparent', opacity: pressed ? 0.7 : 1 }]} className="mb-1 flex-row items-center rounded-xl px-3 py-3"><IconSymbol name={item.icon} size={19} color={active ? 'white' : colors.muted} /><Text style={{ color: active ? 'white' : colors.foreground }} className="ml-3 text-sm font-semibold">{item.label}</Text>{item.label === 'Aprovações' ? <View style={{ backgroundColor: colors.warning }} className="ml-auto h-5 min-w-5 items-center justify-center rounded-full px-1"><Text className="text-[10px] font-bold text-white">2</Text></View> : null}</Pressable>; })}
      <View className="mt-auto border-t border-border pt-4"><Text className="px-1 text-xs font-semibold text-foreground">{role === 'Administrativo' ? 'Perfil Administrativo' : role === 'Aprovador' ? 'Perfil Aprovador' : 'Perfil Viajante'}</Text><Text className="mt-1 px-1 text-xs text-muted">Configurações, idioma e tema no Perfil</Text></View>
    </View>
    <View className="flex-1">{children}</View>
  </View>;
}
