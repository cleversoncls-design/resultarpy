import { Tabs } from 'expo-router';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { NAV_COLORS } from '@/components/nav-theme';
import { useVisibleModules } from '@/hooks/use-app-navigation';

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactWeb = Platform.OS === 'web' && width < 900;
  const { visibleModules, canApprove, canAdmin } = useVisibleModules();
  const bottomPadding = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);

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
    <View style={{ flex: 1 }}>
      <View style={{ height: 4, backgroundColor: NAV_COLORS.topAccent }} />
      <View style={{ backgroundColor: colors.background, flex: 1 }} className="flex-row">
        <AppSidebar visibleModules={visibleModules} />
        <View className="flex-1">
          <AppHeader visibleModules={visibleModules} />
          <View className="flex-1">{tabs}</View>
        </View>
      </View>
    </View>
  );
}
