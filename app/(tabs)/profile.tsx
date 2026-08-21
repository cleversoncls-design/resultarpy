import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { demoUser, type Role } from '@/lib/demo-data';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useDemoRole } from '@/lib/demo-role';
import { useThemeContext, type ThemePreference } from '@/lib/theme-provider';
import { useCurrency } from '@/lib/currency-provider';

const themeOptions: { key: ThemePreference; label: string; description: string }[] = [
  { key: 'system', label: 'Sistema', description: 'Segue a aparência do dispositivo' },
  { key: 'light', label: 'Claro', description: 'Interface clara' },
  { key: 'dark', label: 'Escuro', description: 'Interface escura' },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { role, setRole } = useDemoRole();
  const { preference, setPreference } = useThemeContext();
  const { currency, setCurrency, options: currencyOptions } = useCurrency();
  const switchRole = (nextRole: Role) => { setRole(nextRole); Alert.alert('Perfil atualizado', `A interface agora está configurada para ${nextRole}.`); };
  return (
    <ScreenContainer className="px-5 pt-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-sm font-medium text-muted">Conta e preferências</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Perfil</Text>
        <View className="mt-6 flex-row items-center rounded-3xl border border-border bg-surface p-5">
          <View style={{ backgroundColor: `${colors.primary}18` }} className="h-14 w-14 items-center justify-center rounded-2xl"><Text className="text-xl font-bold text-primary">ML</Text></View>
          <View className="ml-4 flex-1"><Text className="text-lg font-bold text-foreground">{demoUser.name}</Text><Text className="mt-1 text-sm text-muted">{demoUser.email}</Text><Text className="mt-1 text-xs font-semibold text-primary">Perfil atual: {role}</Text></View>
        </View>

        <Text className="mb-3 mt-8 text-base font-bold text-foreground">Preferências</Text>
        <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Idioma</Text>
        <View className="mb-5 rounded-2xl border border-border bg-surface p-2">
          <SettingChoice icon="globe" label="Português (Brasil)" description="Idioma atual da interface" selected={true} onPress={() => Alert.alert('Idioma', 'Português (Brasil) está selecionado.')} />
          <SettingChoice icon="globe" label="Español" description="Preparado para a versão em espanhol" selected={false} onPress={() => Alert.alert('Idioma', 'A tradução para Espanhol será aplicada quando o pacote de idioma estiver conectado.')} />
        </View>
        {role === 'Administrativo' ? <>
          <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Moeda global</Text>
          <View className="mb-5 rounded-2xl border border-border bg-surface p-2">
            {currencyOptions.map((option) => <SettingChoice key={option.key} icon="gearshape.fill" label={option.label} description="Aplicada a todos os usuários e relatórios" selected={currency === option.key} onPress={() => setCurrency(option.key)} />)}
          </View>
        </> : null}
        <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Aparência</Text>
        <View className="rounded-2xl border border-border bg-surface p-2">
          {themeOptions.map((option) => <SettingChoice key={option.key} icon={option.key === 'dark' ? 'moon.fill' : option.key === 'light' ? 'sun.max.fill' : 'gearshape.fill'} label={option.label} description={option.description} selected={preference === option.key} onPress={() => setPreference(option.key)} />)}
        </View>
        <View className="mt-3 flex-row items-center rounded-xl px-3 py-2"><IconSymbol name="bell.fill" size={19} color={colors.primary} /><Text className="ml-3 flex-1 font-semibold text-foreground">Notificações</Text><Text className="text-sm text-muted">Ativadas</Text></View>

        <Text className="mb-3 mt-8 text-base font-bold text-foreground">Perfil demonstrativo</Text>
        <Text className="mb-3 text-sm leading-5 text-muted">Na aplicação real, estas permissões virão do usuário autenticado. Use os controles abaixo somente para testar as experiências separadas.</Text>
        <View className="rounded-2xl border border-border bg-surface p-2">{(['Viajante', 'Aprovador', 'Administrativo'] as Role[]).map((option) => <Pressable key={option} onPress={() => switchRole(option)} style={{ backgroundColor: role === option ? `${colors.primary}14` : 'transparent' }} className="flex-row items-center rounded-xl p-3"><IconSymbol name={option === 'Viajante' ? 'airplane' : option === 'Administrativo' ? 'briefcase.fill' : 'checkmark.seal.fill'} size={21} color={role === option ? colors.primary : colors.muted} /><View className="ml-3 flex-1"><Text className="font-bold text-foreground">{option}</Text><Text className="mt-1 text-xs text-muted">{option === 'Viajante' ? 'Somente suas viagens, despesas e operação do veículo atribuído.' : option === 'Administrativo' ? 'Frota, reservas, manutenção, O.S. e operações.' : 'Fila de solicitações para aprovar ou rejeitar.'}</Text></View>{role === option ? <IconSymbol name="checkmark" size={20} color={colors.primary} /> : null}</Pressable>)}</View>
        <Pressable onPress={() => Alert.alert('Sessão encerrada', 'Na integração final, o usuário será redirecionado para o acesso Supabase.')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="mt-6 items-center rounded-2xl border border-error px-5 py-4"><Text className="font-bold text-error">Encerrar sessão</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function SettingChoice({ icon, label, description, selected, onPress }: { icon: 'globe' | 'moon.fill' | 'sun.max.fill' | 'gearshape.fill'; label: string; description: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: selected ? `${colors.primary}12` : 'transparent', opacity: pressed ? 0.7 : 1 }]} className="mb-1 flex-row items-center rounded-xl p-3"><IconSymbol name={icon} size={20} color={selected ? colors.primary : colors.muted} /><View className="ml-3 flex-1"><Text className="font-bold text-foreground">{label}</Text><Text className="mt-1 text-xs text-muted">{description}</Text></View>{selected ? <IconSymbol name="checkmark" size={19} color={colors.primary} /> : <IconSymbol name="chevron.right" size={18} color={colors.muted} />}</Pressable>;
}
