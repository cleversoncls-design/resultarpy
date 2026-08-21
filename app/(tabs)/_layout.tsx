import { Tabs, router, usePathname } from 'expo-router';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useDemoRole } from '@/lib/demo-role';

function demoRoleLabel(role: string) { return role === 'Administrativo' ? 'Perfil Administrativo' : role === 'Aprovador' ? 'Perfil Aprovador' : 'Perfil Viajante'; }

const navItems = [
  { label: 'Visão geral', path: '/', icon: 'house.fill' as const },
  { label: 'Minhas viagens', path: '/trips', icon: 'airplane' as const },
  { label: 'Nova solicitação', path: '/new-trip', icon: 'plus' as const },
  { label: 'Aprovações', path: '/approvals', icon: 'checkmark.seal.fill' as const },
  { label: 'Operação', path: '/operations', icon: 'briefcase.fill' as const },
  { label: 'Frota', path: '/fleet', icon: 'car.fill' as const },
  { label: 'Relatório de reembolso', path: '/reimbursements', icon: 'wallet.pass.fill' as const },
  { label: 'Relatórios', path: '/reports', icon: 'chart.bar.fill' as const },
];

export default function TabLayout() {
  const colors = useColors();
  const { role } = useDemoRole();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const isCompactWeb = Platform.OS === 'web' && width < 900;
  const canApprove = role === 'Aprovador' || role === 'Administrativo';
  const canAdmin = role === 'Administrativo';
  const visibleNavItems = navItems.filter((item) => {
    if (item.path === '/approvals') return canApprove;
    if (['/operations', '/fleet', '/reports'].includes(item.path)) return canAdmin;
    return true;
  });
  const pathname = usePathname();
  const bottomPadding = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);

  const tabs = (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarButton: HapticTab, tabBarStyle: { display: isCompactWeb ? 'flex' : Platform.OS === 'web' ? 'none' : 'flex', paddingTop: 8, paddingBottom: bottomPadding, height: 56 + bottomPadding, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 0.5 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="trips" options={{ title: 'Viagens', tabBarIcon: ({ color }) => <IconSymbol name="airplane" size={23} color={color} /> }} />
      <Tabs.Screen name="approvals" options={{ title: 'Aprovações', href: canApprove ? undefined : null, tabBarIcon: ({ color }) => <IconSymbol name="checkmark.seal.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="operations" options={{ title: 'Operação', href: canAdmin ? undefined : null, tabBarIcon: ({ color }) => <IconSymbol name="briefcase.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="fleet" options={{ title: 'Frota', href: canAdmin ? undefined : null, tabBarIcon: ({ color }) => <IconSymbol name="car.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="reimbursements" options={{ title: 'Reembolso', tabBarIcon: ({ color }) => <IconSymbol name="wallet.pass.fill" size={23} color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Relatórios', href: canAdmin ? undefined : null, tabBarIcon: ({ color }) => <IconSymbol name="chart.bar.fill" size={23} color={color} /> }} />
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
          <Text className="ml-3 text-base font-bold text-foreground">Controle de Viagens</Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="mb-6 px-1">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-muted">Perfil de teste</Text>
          <Text className="mt-1 text-sm font-bold text-primary">{role}</Text>
          <Text className="mt-1 text-xs text-muted">Clique para trocar a visão</Text>
        </Pressable>
        <Text className="mb-3 px-2 text-[11px] font-bold uppercase tracking-widest text-muted">Workspace</Text>
        {visibleNavItems.map((item) => {
          const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
          return (
            <Pressable key={item.path} onPress={() => router.push(item.path as never)} onHoverIn={() => setHoveredPath(item.path)} onHoverOut={() => setHoveredPath(null)} style={({ pressed }) => [{ backgroundColor: active ? colors.primary : hoveredPath === item.path ? `${colors.primary}12` : 'transparent', borderRadius: 10, flexDirection: 'row', alignItems: 'center', minHeight: 42, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4, opacity: pressed ? 0.72 : 1 }]}>
              <IconSymbol name={item.icon} size={19} color={active ? 'white' : hoveredPath === item.path ? colors.primary : colors.muted} />
              <Text style={{ color: active ? 'white' : hoveredPath === item.path ? colors.primary : colors.foreground, marginLeft: 12, fontSize: 14, fontWeight: '600' }}>{item.label}</Text>
              {item.label === 'Aprovações' ? <View style={{ backgroundColor: colors.warning }} className="ml-auto h-5 min-w-5 items-center justify-center rounded-full px-1"><Text className="text-[10px] font-bold text-white">2</Text></View> : null}
            </Pressable>
          );
        })}
        <View className="mt-auto border-t border-border pt-4">
          <Text className="px-1 text-xs font-semibold text-foreground">{demoRoleLabel(role)}</Text>
          <Text className="mt-1 px-1 text-xs text-muted">Configurações, idioma e tema no Perfil</Text>
        </View>
      </View>
      <View className="flex-1">{tabs}</View>
    </View>
  );
}
