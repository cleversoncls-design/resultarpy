import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useDemoRole } from '@/lib/demo-role';
import { useCurrency } from '@/lib/currency-provider';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';

export default function ProfileScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { role } = useDemoRole();
  const { currency, setCurrency, options: currencyOptions } = useCurrency();
  const { user, logout } = useAuth();
  const currentName = user?.name || t('Usuário autenticado');
  const currentEmail = user?.email || '';
  const initials = currentName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-sm font-medium text-muted">{t('Conta e preferências')}</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">{t('Perfil')}</Text>
        <View className="mt-6 flex-row items-center rounded-3xl border border-border bg-surface p-5">
          <View style={{ backgroundColor: `${colors.primary}18` }} className="h-14 w-14 items-center justify-center rounded-2xl"><Text className="text-xl font-bold text-primary">{initials}</Text></View>
          <View className="ml-4 flex-1"><Text className="text-lg font-bold text-foreground">{currentName}</Text><Text className="mt-1 text-sm text-muted">{currentEmail}</Text><Text className="mt-1 text-xs font-semibold text-primary">{t('Perfil autenticado')}: {t(role)}</Text></View>
        </View>

        <Text className="mb-3 mt-8 text-base font-bold text-foreground">{t('Preferências')}</Text>
        {role === 'Administrativo' ? <>
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t('Moeda global')}</Text>
          <View className="mb-5 rounded-2xl border border-border bg-surface p-2">
            {currencyOptions.map((option) => <SettingChoice key={option.key} icon="gearshape.fill" label={option.label} description={t('Aplicada a todos os usuários e relatórios')} selected={currency === option.key} onPress={() => setCurrency(option.key)} />)}
          </View>
        </> : null}
        <View className="mt-3 flex-row items-center rounded-xl px-3 py-2"><IconSymbol name="bell.fill" size={19} color={colors.primary} /><Text className="ml-3 flex-1 font-semibold text-foreground">{t('Notificações')}</Text><Text className="text-sm text-muted">{t('Ativadas')}</Text></View>

        <View className="mt-8 rounded-2xl border border-border bg-surface p-4"><Text className="font-bold text-foreground">{t('Permissões administradas pelo servidor')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('O papel desta conta é definido no PostgreSQL e não pode ser alterado pelo navegador.')}</Text></View>
        <Pressable onPress={handleLogout} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="mt-6 items-center rounded-2xl border border-error px-5 py-4"><Text className="font-bold text-error">{t('Encerrar sessão')}</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingChoice({ icon, label, description, selected, onPress }: { icon: 'globe' | 'moon.fill' | 'sun.max.fill' | 'gearshape.fill'; label: string; description: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: selected ? `${colors.primary}12` : 'transparent', opacity: pressed ? 0.7 : 1 }]} className="mb-1 flex-row items-center rounded-xl p-3"><IconSymbol name={icon} size={20} color={selected ? colors.primary : colors.muted} /><View className="ml-3 flex-1"><Text className="font-bold text-foreground">{label}</Text><Text className="mt-1 text-xs text-muted">{description}</Text></View>{selected ? <IconSymbol name="checkmark" size={19} color={colors.primary} /> : <IconSymbol name="chevron.right" size={18} color={colors.muted} />}</Pressable>;
}
