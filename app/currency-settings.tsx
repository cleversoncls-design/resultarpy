import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { useCurrency } from '@/lib/currency-provider';
import type { Currency } from '@/lib/currency';

const currencyOptions: { key: Currency; label: string; description: string }[] = [
  { key: 'BRL', label: 'Real (BRL)', description: 'Real brasileiro' },
  { key: 'USD', label: 'Dólar (USD)', description: 'Dólar americano' },
  { key: 'PYG', label: 'Guaraní (PYG)', description: 'Guaraní paraguayo' },
];

export default function CurrencySettingsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.profile === 'admin';
  const { currency, setCurrency, error, isSaving } = useCurrency();

  if (!isAuthenticated || !isAdmin) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6">
        <View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
          <IconSymbol name="exclamationmark.triangle.fill" size={28} color={colors.warning} />
          <Text className="mt-4 text-xl font-bold text-foreground">{t('Acesso restrito')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('A moeda global só pode ser alterada pelo perfil Administrativo.')}</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 42, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4">
      <View className="w-full max-w-2xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar')}</Text></Pressable>
          <Text className="text-sm font-medium text-muted">{t('Administrativo · Configurações gerais')}</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">{t('Moeda')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('Define a moeda principal exibida em todo o sistema, para todos os perfis de usuário.')}</Text>

          <View className="mt-6 gap-3">
            {currencyOptions.map((option) => {
              const selected = currency === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setCurrency(option.key)}
                  disabled={isSaving}
                  style={({ pressed }) => ({
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? `${colors.primary}10` : colors.surface,
                    opacity: pressed || isSaving ? 0.75 : 1,
                  })}
                  className="flex-row items-center rounded-2xl border p-5"
                >
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">{option.label}</Text>
                    <Text className="mt-1 text-sm text-muted">{option.description}</Text>
                    {selected ? <Text style={{ color: colors.primary }} className="mt-2 text-xs font-bold uppercase tracking-wider">{t('Moeda atual do sistema')}</Text> : null}
                  </View>
                  {selected ? <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>

          {isSaving ? <Text className="mt-4 text-sm text-muted">{t('Salvando...')}</Text> : null}
          {error ? <Text style={{ color: colors.error }} className="mt-4 text-sm font-semibold">{error}</Text> : null}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}
