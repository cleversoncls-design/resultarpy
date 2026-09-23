import { Animated, Image, Pressable, Text, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/lib/language-provider';
import { useAuth } from '@/hooks/use-auth';
import { NAV_COLORS, NAV_WIDTH_COLLAPSED, NAV_WIDTH_EXPANDED, APP_VERSION } from '@/components/nav-theme';
import { useVisibleModules } from '@/hooks/use-app-navigation';

const logo = require('@/assets/images/resultar-logo.png');

type VisibleModules = ReturnType<typeof useVisibleModules>['visibleModules'];

export function AppSidebar({ visibleModules }: { visibleModules: VisibleModules }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [expandedModule, setExpandedModule] = useState('');
  const moduleKeys = useMemo(() => visibleModules.map((module) => module.key), [visibleModules]);
  const [renderedModules, setRenderedModules] = useState<Record<string, boolean>>({});
  const moduleAnimations = useRef<Record<string, Animated.Value>>({}).current;
  moduleKeys.forEach((key) => { if (!moduleAnimations[key]) moduleAnimations[key] = new Animated.Value(0); });

  useEffect(() => {
    AsyncStorage.getItem('controle-viagens-expanded-module').then((saved) => {
      if (saved && visibleModules.some((module) => module.key === saved)) {
        setExpandedModule(saved);
        setRenderedModules(Object.fromEntries(moduleKeys.map((key) => [key, key === saved])));
        moduleAnimations[saved]?.setValue(1);
      }
    });
    AsyncStorage.getItem('controle-viagens-sidebar-collapsed').then((saved) => { if (saved === '1') setCollapsed(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (nextKey) AsyncStorage.setItem('controle-viagens-expanded-module', nextKey);
    else AsyncStorage.removeItem('controle-viagens-expanded-module');
  };

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    AsyncStorage.setItem('controle-viagens-sidebar-collapsed', next ? '1' : '0');
  };

  const showLabels = !collapsed;

  return <View style={{ width: collapsed ? NAV_WIDTH_COLLAPSED : NAV_WIDTH_EXPANDED, flexShrink: 0, backgroundColor: NAV_COLORS.bg, borderRightColor: NAV_COLORS.border, borderRightWidth: 1 }}>
    <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 18 }}>
      {showLabels ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingBottom: 18, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: NAV_COLORS.border }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, overflow: 'hidden', flexShrink: 0 }}>
            <Image source={logo} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
          <Text style={{ flex: 1, color: NAV_COLORS.fgStrong, fontSize: 11.5, fontWeight: '800' }} numberOfLines={1}>RESULTAR SERVICIOS</Text>
          <Pressable accessibilityLabel={t('Recolher menu')} onPress={toggleCollapse} style={({ pressed }) => [{ width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? NAV_COLORS.hoverBg : 'transparent' }]}>
            <IconSymbol name="sidebar.left" size={17} color={NAV_COLORS.fg} />
          </Pressable>
        </View>
      ) : (
        <Pressable accessibilityLabel={t('Expandir menu')} onPress={toggleCollapse} style={({ pressed }) => [{ alignItems: 'center', paddingBottom: 18, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: NAV_COLORS.border, opacity: pressed ? 0.75 : 1 }]}>
          <View style={{ width: 30, height: 30, borderRadius: 9, overflow: 'hidden' }}>
            <Image source={logo} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
        </Pressable>
      )}

      <View style={{ flex: 1 }}>
        {showLabels ? <Text style={{ color: NAV_COLORS.fgMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 10, paddingBottom: 6 }}>{t('Workspace')}</Text> : null}
        {visibleModules.map((module) => {
          const moduleActive = module.items.some((item) => item.path === '/' ? pathname === '/' : pathname.startsWith(item.path.split('?')[0]));
          const open = expandedModule === module.key && showLabels;
          return <View key={module.key} style={{ marginBottom: 6 }}>
            <Pressable
              onPress={() => toggleModule(module.key)}
              onHoverIn={() => setHoveredPath(`module-${module.key}`)}
              onHoverOut={() => setHoveredPath(null)}
              style={({ pressed }) => [{
                backgroundColor: expandedModule === module.key && showLabels ? NAV_COLORS.activeBg : hoveredPath === `module-${module.key}` ? NAV_COLORS.hoverBg : 'transparent',
                borderRadius: 9, flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingHorizontal: 10, paddingVertical: 9, opacity: pressed ? 0.72 : 1,
              }]}
            >
              <IconSymbol name={module.icon} size={18} color={moduleActive || hoveredPath === `module-${module.key}` ? NAV_COLORS.fgStrong : NAV_COLORS.fg} />
              {showLabels ? <>
                <Text style={{ color: NAV_COLORS.fg, marginLeft: 12, fontSize: 13, fontWeight: '700', flex: 1 }}>{t(module.label)}</Text>
                <IconSymbol name="chevron.right" size={13} color={NAV_COLORS.fgMuted} style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }} />
              </> : null}
            </Pressable>
            {renderedModules[module.key] && showLabels ? <Animated.View style={{ opacity: moduleAnimations[module.key], marginLeft: 13, paddingLeft: 11, borderLeftWidth: 1, borderLeftColor: NAV_COLORS.border, marginTop: 2, marginBottom: 6 }}>
              {module.items.map((item) => {
                const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path.split('?')[0]);
                return <Pressable key={item.path} onPress={() => router.push(item.path as never)} onHoverIn={() => setHoveredPath(item.path)} onHoverOut={() => setHoveredPath(null)} style={({ pressed }) => [{ backgroundColor: active ? NAV_COLORS.activeBg : hoveredPath === item.path ? NAV_COLORS.hoverBg : 'transparent', borderRadius: 8, flexDirection: 'row', alignItems: 'center', minHeight: 34, paddingHorizontal: 9, paddingVertical: 7, marginBottom: 2, opacity: pressed ? 0.72 : 1 }]}>
                  <IconSymbol name={item.icon} size={16} color={active ? NAV_COLORS.fgStrong : hoveredPath === item.path ? NAV_COLORS.fgStrong : NAV_COLORS.fg} />
                  <Text style={{ color: active ? NAV_COLORS.fgStrong : NAV_COLORS.fg, marginLeft: 10, fontSize: 12.5, fontWeight: active ? '700' : '600', flex: 1 }}>{t(item.label)}</Text>
                </Pressable>;
              })}
            </Animated.View> : null}
          </View>;
        })}
      </View>

      {showLabels ? <View style={{ borderTopWidth: 1, borderTopColor: NAV_COLORS.border, paddingTop: 12, marginTop: 4 }}>
        <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [{ paddingHorizontal: 2, opacity: pressed ? 0.72 : 1 }]}>
          <Text style={{ color: NAV_COLORS.fgStrong, fontSize: 12.5, fontWeight: '700' }} numberOfLines={1}>{user?.name || t('Usuário autenticado')}</Text>
          <Text style={{ color: NAV_COLORS.fgMuted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>{user?.email || ''}</Text>
        </Pressable>
        <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: NAV_COLORS.border }}>
          <Text style={{ color: NAV_COLORS.fgMuted, fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5 }}>CONTROL DE VIAJES Y FLOTA</Text>
          <Text style={{ color: NAV_COLORS.fgMuted, fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5, marginTop: 5 }}>{APP_VERSION}</Text>
        </View>
      </View> : null}
    </View>
  </View>;
}
