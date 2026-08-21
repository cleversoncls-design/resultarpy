import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { languageOptions, type AppLanguage } from '@/lib/language-provider';
import type { ThemePreference } from '@/lib/theme-provider';

type Props = {
  language: AppLanguage;
  setLanguage: (value: AppLanguage) => void;
  theme: ThemePreference;
  setTheme: (value: ThemePreference) => void;
};

const themeOptions: { key: ThemePreference; label: string; icon: 'gearshape.fill' | 'sun.max.fill' | 'moon.fill' }[] = [
  { key: 'system', label: 'Sistema', icon: 'gearshape.fill' },
  { key: 'light', label: 'Claro', icon: 'sun.max.fill' },
  { key: 'dark', label: 'Escuro', icon: 'moon.fill' },
];

export function PreferenceDropdowns({ language, setLanguage, theme, setTheme }: Props) {
  const colors = useColors();
  return <View style={{ gap: 8 }}>
    <Dropdown label="Idioma" trigger={<><Text style={{ fontSize: 15 }}>{languageOptions.find((option) => option.key === language)?.flag}</Text><Text style={{ color: colors.foreground, marginLeft: 9, fontSize: 13, fontWeight: '700' }}>{languageOptions.find((option) => option.key === language)?.label}</Text></>}>
      {languageOptions.map((option) => <Pressable key={option.key} onPress={() => setLanguage(option.key)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: pressed ? `${colors.primary}12` : 'transparent' }]}><Text style={{ fontSize: 18 }}>{option.flag}</Text><Text style={{ flex: 1, marginLeft: 12, color: colors.foreground, fontSize: 14 }}>{option.label}</Text>{language === option.key ? <IconSymbol name="checkmark" size={17} color={colors.primary} /> : null}</Pressable>)}
    </Dropdown>
    <Dropdown label="Aparência" trigger={<><IconSymbol name={themeOptions.find((option) => option.key === theme)?.icon ?? 'gearshape.fill'} size={17} color={colors.primary} /><Text style={{ color: colors.foreground, marginLeft: 9, fontSize: 13, fontWeight: '700' }}>{themeOptions.find((option) => option.key === theme)?.label}</Text></>}>
      {themeOptions.map((option) => <Pressable key={option.key} onPress={() => setTheme(option.key)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: pressed ? `${colors.primary}12` : 'transparent' }]}><IconSymbol name={option.icon} size={19} color={theme === option.key ? colors.primary : colors.muted} /><Text style={{ flex: 1, marginLeft: 12, color: colors.foreground, fontSize: 15 }}>{option.label}</Text>{theme === option.key ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }} /> : null}</Pressable>)}
    </Dropdown>
  </View>;
}

function Dropdown({ label, trigger, children }: { label: string; trigger: React.ReactNode; children: React.ReactNode }) {
  const colors = useColors();
  return <View style={{ position: 'relative', zIndex: 20 }}><DropdownButton label={label} trigger={trigger} colors={colors}><View style={{ paddingTop: 2 }}>{children}</View></DropdownButton></View>;
}

function DropdownButton({ label, trigger, colors, children }: { label: string; trigger: React.ReactNode; colors: ReturnType<typeof useColors>; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <View style={{ position: 'relative' }}><Pressable accessibilityLabel={`Abrir ${label}`} onPress={() => setOpen(!open)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8, backgroundColor: open ? `${colors.primary}12` : 'transparent', opacity: pressed ? 0.75 : 1 }]}>{trigger}<Text style={{ color: colors.muted, marginLeft: 'auto', fontSize: 13 }}>⌄</Text></Pressable>{open ? <View style={{ position: 'absolute', left: 0, bottom: '100%', width: 238, marginBottom: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 }}><Text style={{ marginBottom: 8, paddingHorizontal: 10, color: colors.foreground, fontSize: 16, fontWeight: '800' }}>{label}</Text>{children}</View> : null}</View>;
}
