import { ScrollView, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { MetricCard, PrimaryButton, SectionHeader, StatusPill } from '@/components/app-ui';
import { adminQueue, approvalQueue, demoUser, formatCurrency, trips } from '@/lib/demo-data';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useDemoRole } from '@/lib/demo-role';

export default function HomeScreen() {
  const colors = useColors();
  const { role } = useDemoRole();
  const isTraveler = role === 'Viajante';
  const isAdmin = role === 'Administrativo';
  const { width } = useWindowDimensions();
  const isNarrow = width < 600;
  const activeTrip = trips[0];
  return (
    <ScreenContainer className="px-5 pt-4"><View className="w-full max-w-6xl flex-1 self-center">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className={isNarrow ? 'mb-6 flex-col gap-4' : 'mb-6 flex-row items-start justify-between'}>
          <View className="flex-1 pr-4"><Text className="text-sm font-medium text-muted">Bom dia,</Text><Text className="mt-1 text-3xl font-bold tracking-tight text-foreground">{demoUser.name.split(' ')[0]}.</Text><Text className="mt-1 text-sm text-muted">{isTraveler ? 'Sua jornada corporativa' : 'Seu painel de viagens corporativas'}</Text></View>
          <View style={{ backgroundColor: `${colors.primary}18` }} className="h-12 w-12 items-center justify-center rounded-2xl"><IconSymbol name="airplane" size={24} color={colors.primary} /></View>
        </View>

        <View className="mb-6 rounded-3xl bg-primary p-5">
          <View className="flex-row items-center justify-between"><Text className="text-sm font-semibold text-white/80">PRÓXIMA ATIVIDADE</Text><StatusPill status={activeTrip.status} /></View>
          <Text className="mt-4 text-2xl font-bold text-white">{activeTrip.destination}</Text>
          <Text className="mt-1 text-sm text-white/75">{activeTrip.startDate} — {activeTrip.endDate} · {activeTrip.client}</Text>
          <View className={isNarrow ? 'mt-5 flex-col items-start gap-4' : 'mt-5 flex-row items-center justify-between'}><View><Text className="text-xs text-white/65">Adiantamento</Text><Text className="mt-1 text-base font-bold text-white">{formatCurrency(activeTrip.amount)}</Text></View><Pressable onPress={() => router.push('/trip-detail')} style={({ pressed }) => [{ backgroundColor: 'rgba(255,255,255,0.18)', opacity: pressed ? 0.7 : 1 }]} className="flex-row items-center rounded-xl px-3 py-2"><Text className="mr-1 text-sm font-bold text-white">Ver detalhes</Text><IconSymbol name="chevron.right" size={16} color="white" /></Pressable></View>
        </View>

        <SectionHeader title="Visão geral" />
        <View className={isNarrow ? 'mb-7 flex-col gap-3' : 'mb-7 flex-row gap-3'}><MetricCard label="Em andamento" value="01" accent={colors.primary} /><MetricCard label="Aguardando" value="02" accent={colors.warning} /><MetricCard label="Total no mês" value="R$ 2,8k" accent={colors.success} /></View>

        <SectionHeader title="Ações rápidas" />
        <View className={isNarrow ? 'mb-7 flex-col gap-3' : 'mb-7 flex-row gap-3'}><View className="flex-1"><PrimaryButton label="Nova viagem" onPress={() => router.push('/new-trip')} /></View><View className="flex-1"><Pressable onPress={() => router.push('/expenses')} style={({ pressed }) => [{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface, minHeight: 50, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 }]}><IconSymbol name="wallet.pass.fill" size={18} color={colors.primary} /><Text className="ml-2 font-bold text-foreground">Lançar despesa</Text></Pressable></View></View>

        {isTraveler ? <><SectionHeader title="Próximas ações" /><View className="flex-row items-center rounded-2xl border border-border bg-surface p-4"><View style={{ backgroundColor: `${colors.primary}18` }} className="h-10 w-10 items-center justify-center rounded-xl"><IconSymbol name="car.fill" size={20} color={colors.primary} /></View><View className="ml-3 flex-1"><Text className="font-bold text-foreground">Veículo atribuído à viagem</Text><Text className="mt-1 text-sm text-muted">Abra os detalhes para iniciar, finalizar ou registrar uma ocorrência.</Text></View><IconSymbol name="chevron.right" size={20} color={colors.muted} /></View></> : <><SectionHeader title="Pendências do ambiente" action="Ver tudo" /><Pressable onPress={() => router.push('/approvals')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="mb-3 flex-row items-center rounded-2xl border border-border bg-surface p-4"><View style={{ backgroundColor: `${colors.warning}22` }} className="h-10 w-10 items-center justify-center rounded-xl"><IconSymbol name="checkmark.seal.fill" size={20} color={colors.warning} /></View><View className="ml-3 flex-1"><Text className="font-bold text-foreground">{approvalQueue.length} aprovações aguardando</Text><Text className="mt-1 text-sm text-muted">Solicitações da sua equipe</Text></View><IconSymbol name="chevron.right" size={20} color={colors.muted} /></Pressable>{isAdmin ? <Pressable onPress={() => router.push('/operations')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="flex-row items-center rounded-2xl border border-border bg-surface p-4"><View style={{ backgroundColor: `${colors.primary}18` }} className="h-10 w-10 items-center justify-center rounded-xl"><IconSymbol name="briefcase.fill" size={20} color={colors.primary} /></View><View className="ml-3 flex-1"><Text className="font-bold text-foreground">{adminQueue.length} preparações administrativas</Text><Text className="mt-1 text-sm text-muted">Adiantamentos, hotéis e veículos</Text></View><IconSymbol name="chevron.right" size={20} color={colors.muted} /></Pressable> : null}</>}
      </ScrollView></View>
    </ScreenContainer>
  );
}
