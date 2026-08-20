import { Tabs, router, usePathname } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';

const navItems = [
  { label: 'Visão geral', path: '/', icon: 'house.fill' as const },
  { label: 'Minhas viagens', path: '/trips', icon: 'airplane' as const },
  { label: 'Aprovações', path: '/approvals', icon: 'checkmark.seal.fill' as const },
  { label: 'Operação', path: '/operations', icon: 'briefcase.fill' as const },
  { label: 'Frota', path: '/fleet', icon: 'car.fill' as const },
  { label: 'Relatórios', path: '/reports', icon: 'chart.bar.fill' as const },
];

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const bottomPadding = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);
  const tabs = <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarButton: HapticTab, tabBarStyle: { display: Platform.OS === 'web' ? 'none' : 'flex', paddingTop: 8, paddingBottom: bottomPadding, height: 56 + bottomPadding, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 0.5 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={23} color={color} /> }} />
    <Tabs.Screen name="trips" options={{ title: 'Viagens', tabBarIcon: ({ color }) => <IconSymbol name="airplane" size={23} color={color} /> }} />
    <Tabs.Screen name="approvals" options={{ title: 'Aprovações', tabBarIcon: ({ color }) => <IconSymbol name="checkmark.seal.fill" size={23} color={color} /> }} />
    <Tabs.Screen name="operations" options={{ title: 'Operação', tabBarIcon: ({ color }) => <IconSymbol name="briefcase.fill" size={23} color={color} /> }} />
    <Tabs.Screen name="fleet" options={{ title: 'Frota', tabBarIcon: ({ color }) => <IconSymbol name="car.fill" size={23} color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <IconSymbol name="person.crop.circle.fill" size={23} color={color} /> }} />
  </Tabs>;

  if (Platform.OS !== 'web') return tabs;
  return <View style={{ backgroundColor: colors.background }} className="flex-1 flex-row"><View style={{ borderRightColor: colors.border, backgroundColor: colors.surface }} className="w-64 border-r px-5 py-8"><View className="mb-10 flex-row items-center"><View style={{ backgroundColor: colors.primary }} className="h-10 w-10 items-center justify-center rounded-xl"><Text className="font-bold text-white">CV</Text></View><View className="ml-3"><Text className="text-base font-bold text-foreground">Controle de</Text><Text className="text-base font-bold text-primary">Viagens</Text></View></View><Text className="mb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-muted">Workspace</Text>{navItems.map((item) => { const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path); return <Pressable key={item.path} onPress={() => router.push(item.path as never)} style={({ pressed }) => [{ backgroundColor: active ? `${colors.primary}16` : 'transparent', opacity: pressed ? 0.7 : 1 }]} className="mb-1 flex-row items-center rounded-xl px-3 py-3"><IconSymbol name={item.icon} size={20} color={active ? colors.primary : colors.muted} /><Text style={{ color: active ? colors.primary : colors.foreground }} className="ml-3 text-sm font-semibold">{item.label}</Text>{item.label === 'Aprovações' ? <View style={{ backgroundColor: colors.warning }} className="ml-auto h-5 min-w-5 items-center justify-center rounded-full px-1"><Text className="text-[10px] font-bold text-white">2</Text></View> : null}</Pressable>; })}<View className="mt-auto rounded-2xl p-4" style={{ backgroundColor: `${colors.primary}12` }}><Text className="text-xs font-bold text-primary">AMBIENTE CORPORATIVO</Text><Text className="mt-2 text-xs leading-4 text-muted">Operação centralizada para viagens, gastos e aprovações.</Text></View></View><View className="flex-1">{tabs}</View></View>;
}
