import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton } from '@/components/app-ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useDemoRole } from '@/lib/demo-role';
import { useCurrency } from '@/lib/currency-provider';
import { useAuth } from '@/hooks/use-auth';
import { languageOptions, useLanguage } from '@/lib/language-provider';
import { useThemeContext, type ThemePreference } from '@/lib/theme-provider';
import * as Api from '@/lib/_core/api';

const themeOptions: { key: ThemePreference; label: string; icon: 'gearshape.fill' | 'sun.max.fill' | 'moon.fill' }[] = [
  { key: 'system', label: 'Sistema', icon: 'gearshape.fill' },
  { key: 'light', label: 'Claro', icon: 'sun.max.fill' },
  { key: 'dark', label: 'Escuro', icon: 'moon.fill' },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { t, language, setLanguage } = useLanguage();
  const { preference, setPreference } = useThemeContext();
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

  // Autoatendimento de troca de senha — antes só o Administrativo podia
  // trocar a senha de alguém, sem opção da própria pessoa fazer sozinha.
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('Preencha a senha atual e a nova senha (duas vezes).'));
      return;
    }
    if (newPassword.length < 10) {
      setPasswordError(t('A nova senha precisa ter pelo menos 10 caracteres.'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('A confirmação não coincide com a nova senha.'));
      return;
    }
    try {
      setChangingPassword(true);
      await Api.changeOwnPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
    } catch (changeError) {
      setPasswordError(changeError instanceof Error ? changeError.message : t('Não foi possível trocar a senha.'));
    } finally {
      setChangingPassword(false);
    }
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

        {/* No celular o menu lateral (onde ficam Idioma e Tema no desktop)
            nunca aparece — esta tela de Perfil é o único lugar alcançável
            para ajustar essas preferências fora do desktop. */}
        <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t('Idioma')}</Text>
        <View className="mb-5 rounded-2xl border border-border bg-surface p-2">
          {languageOptions.map((option) => (
            <SettingChoice
              key={option.key}
              icon="globe"
              label={`${option.flag} ${t(option.label)}`}
              description={t('Idioma dos textos do sistema')}
              selected={language === option.key}
              onPress={() => setLanguage(option.key)}
            />
          ))}
        </View>

        <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t('Aparência')}</Text>
        <View className="mb-5 rounded-2xl border border-border bg-surface p-2">
          {themeOptions.map((option) => (
            <SettingChoice
              key={option.key}
              icon={option.icon}
              label={t(option.label)}
              description={t('Tema visual do aplicativo')}
              selected={preference === option.key}
              onPress={() => setPreference(option.key)}
            />
          ))}
        </View>

        {role === 'Administrativo' ? <>
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t('Moeda global')}</Text>
          <View className="mb-5 rounded-2xl border border-border bg-surface p-2">
            {currencyOptions.map((option) => <SettingChoice key={option.key} icon="gearshape.fill" label={option.label} description={t('Aplicada a todos os usuários e relatórios')} selected={currency === option.key} onPress={() => setCurrency(option.key)} />)}
          </View>
        </> : null}
        <View className="mt-3 flex-row items-center rounded-xl px-3 py-2"><IconSymbol name="bell.fill" size={19} color={colors.primary} /><Text className="ml-3 flex-1 font-semibold text-foreground">{t('Notificações')}</Text><Text className="text-sm text-muted">{t('Ativadas')}</Text></View>

        <Text className="mb-2 mt-8 text-xs font-bold uppercase tracking-widest text-muted">{t('Segurança')}</Text>
        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-base font-bold text-foreground">{t('Trocar minha senha')}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">{t('Confirme a senha atual para definir uma nova.')}</Text>

          <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Senha atual')}</Text>
          <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" placeholder={t('Digite sua senha atual')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="rounded-xl border px-4 py-3" />

          <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Nova senha')}</Text>
          <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" placeholder={t('Mínimo de 10 caracteres')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="rounded-xl border px-4 py-3" />

          <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Confirmar nova senha')}</Text>
          <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" placeholder={t('Repita a nova senha')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="rounded-xl border px-4 py-3" />

          {passwordError ? <Text className="mt-3 text-sm font-semibold text-error">{passwordError}</Text> : null}
          {passwordSuccess ? <Text className="mt-3 text-sm font-semibold text-success">{t('Senha alterada com sucesso.')}</Text> : null}

          <View className="mt-5">
            {changingPassword ? <View className="h-[48px] items-center justify-center"><ActivityIndicator color={colors.primary} /></View> : <PrimaryButton label={t('Salvar nova senha')} onPress={() => void handleChangePassword()} />}
          </View>
        </View>

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
