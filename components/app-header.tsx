import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/lib/language-provider';
import { useAuth } from '@/hooks/use-auth';
import { useThemeContext, type ThemePreference } from '@/lib/theme-provider';
import { useSidebarCollapse } from '@/lib/sidebar-provider';
import { useVisibleModules, usePageHeading } from '@/hooks/use-app-navigation';

const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark'];
const THEME_ICON: Record<ThemePreference, 'gearshape.fill' | 'sun.max.fill' | 'moon.fill'> = {
  system: 'gearshape.fill',
  light: 'sun.max.fill',
  dark: 'moon.fill',
};

function initialsOf(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function AppHeader({ visibleModules }: { visibleModules: ReturnType<typeof useVisibleModules>['visibleModules'] }) {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { preference, setPreference } = useThemeContext();
  const { crumb, title } = usePageHeading(visibleModules);
  const { collapsed, toggleCollapse } = useSidebarCollapse();
  const cycleTheme = () => setPreference(THEME_ORDER[(THEME_ORDER.indexOf(preference) + 1) % THEME_ORDER.length]);
  // Só este botão precisa de destaque ao passar o mouse (sem precisar
  // clicar) — os demais botões do cabeçalho seguem como já eram.
  const [collapseHovered, setCollapseHovered] = useState(false);

  return <View style={{ height: 64, flexShrink: 0, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Pressable
        accessibilityLabel={collapsed ? t('Expandir menu') : t('Recolher menu')}
        onPress={toggleCollapse}
        onHoverIn={() => setCollapseHovered(true)}
        onHoverOut={() => setCollapseHovered(false)}
        style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed || collapseHovered ? colors.background : colors.surface, alignItems: 'center', justifyContent: 'center' }]}
      >
        <IconSymbol name="sidebar.left" size={17} color={collapseHovered ? colors.foreground : colors.muted} />
      </Pressable>
      <View>
        <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t(crumb)}</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.foreground, marginTop: 2 }}>{t(title)}</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Pressable
        accessibilityLabel={t('Idioma')}
        onPress={() => setLanguage(language === 'pt-BR' ? 'es-ES' : 'pt-BR')}
        style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.background : colors.surface, alignItems: 'center', justifyContent: 'center' }]}
      >
        <IconSymbol name="globe" size={17} color={colors.muted} />
      </Pressable>
      <Pressable
        accessibilityLabel={t('Aparência')}
        onPress={cycleTheme}
        style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.background : colors.surface, alignItems: 'center', justifyContent: 'center' }]}
      >
        <IconSymbol name={THEME_ICON[preference]} size={17} color={colors.muted} />
      </Pressable>
      <Pressable
        accessibilityLabel={t('Notificações')}
        style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.background : colors.surface, alignItems: 'center', justifyContent: 'center' }]}
      >
        <IconSymbol name="bell.fill" size={17} color={colors.muted} />
      </Pressable>
      <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
      <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10, backgroundColor: pressed ? colors.background : 'transparent' }]}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.foreground, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.background, fontSize: 12, fontWeight: '800' }}>{initialsOf(user?.name)}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>{user?.name || t('Usuário autenticado')}</Text>
          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }} numberOfLines={1}>{user?.email || ''}</Text>
        </View>
      </Pressable>
      <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
      <Pressable
        accessibilityLabel={t('Encerrar sessão')}
        onPress={() => void logout().then(() => router.replace('/login'))}
        style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.background : colors.surface, alignItems: 'center', justifyContent: 'center' }]}
      >
        <IconSymbol name="rectangle.portrait.and.arrow.right" size={17} color={colors.muted} />
      </Pressable>
    </View>
  </View>;
}
