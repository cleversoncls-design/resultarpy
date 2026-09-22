import { View, useWindowDimensions } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { NAV_COLORS } from '@/components/nav-theme';
import { useVisibleModules } from '@/hooks/use-app-navigation';

// Shell para as telas "avulsas" (fora do grupo de abas), ex.: nova viagem,
// cadastros, detalhe de OS etc. app/(tabs)/_layout.tsx tem o equivalente
// para as telas com abas — ambos usam AppSidebar/AppHeader para não duplicar
// o menu duas vezes.
export function DesktopRouteShell({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { visibleModules } = useVisibleModules();
  const isDesktop = width >= 900;
  if (!isDesktop) return <>{children}</>;
  return <View style={{ flex: 1 }}>
    <View style={{ height: 4, backgroundColor: NAV_COLORS.topAccent }} />
    <View style={{ backgroundColor: colors.background, flex: 1 }} className="flex-row">
      <AppSidebar visibleModules={visibleModules} />
      <View className="flex-1">
        <AppHeader visibleModules={visibleModules} />
        <View className="flex-1">{children}</View>
      </View>
    </View>
  </View>;
}
