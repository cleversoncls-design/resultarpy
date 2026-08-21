import { ScrollView, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { MetricCard, SectionHeader, StatusPill } from '@/components/app-ui';
import { adminQueue, approvalQueue, demoUser, formatCurrency, trips } from '@/lib/demo-data';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useDemoRole } from '@/lib/demo-role';

const actionCards = [
  { title: 'Minhas viagens', detail: 'Acompanhar e criar solicitações', icon: 'airplane' as const, path: '/trips' },
  { title: 'Nova solicitação', detail: 'Solicitar uma viagem', icon: 'plus' as const, path: '/new-trip' },
  { title: 'Aprovações', detail: 'Aprovar ou rejeitar viagens', icon: 'checkmark.seal.fill' as const, path: '/approvals' },
  { title: 'Relatório analítico', detail: 'Despesas detalhadas', icon: 'chart.bar.fill' as const, path: '/reports' },
  { title: 'Resumo por cliente', detail: 'Agrupado por cliente e conceito', icon: 'chart.bar.fill' as const, path: '/reports' },
  { title: 'Preparação', detail: 'Adiantamento, veículo e hotel', icon: 'briefcase.fill' as const, path: '/operations' },
  { title: 'Revisão de fechamento', detail: 'Conferir despesas e finalizar', icon: 'doc.text.fill' as const, path: '/expenses' },
  { title: 'Cadastros', detail: 'Gestão das tabelas-base', icon: 'gearshape.fill' as const, path: '/administrativo' },
];

export default function HomeScreen() {
  const colors = useColors();
  const { role } = useDemoRole();
  const isTraveler = role === 'Viajante';
  const isAdmin = role === 'Administrativo';
  const { width } = useWindowDimensions();
  const isNarrow = width < 760;
  const activeTrip = trips[0];
  const visibleActions = actionCards.filter((card) => {
    if (['Aprovações'].includes(card.title)) return role !== 'Viajante';
    if (['Relatório analítico', 'Resumo por cliente', 'Preparação', 'Cadastros'].includes(card.title)) return isAdmin;
    return true;
  });
  return <ScreenContainer className="px-5 pt-5"><View className="w-full max-w-6xl flex-1 self-center"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
    <View className="mb-6 flex-row items-start justify-between"><View><Text className="text-sm text-muted">Bom dia,</Text><Text className="mt-1 text-3xl font-bold text-foreground">{demoUser.name}.</Text><Text className="mt-1 text-sm text-muted">Perfil: {role}</Text></View><View style={{ backgroundColor: colors.primary }} className="h-11 w-11 items-center justify-center rounded-xl"><IconSymbol name="airplane" size={22} color="white" /></View></View>
    <View className={isNarrow ? 'mb-6 flex-col gap-3' : 'mb-8 flex-row gap-3'}><MetricCard label="Total de viagens" value="02" /><MetricCard label="Aguardando aprovação" value="02" accent={colors.warning} /><MetricCard label="Em preparação" value={isAdmin ? String(adminQueue.length) : '00'} accent={colors.primary} /><MetricCard label="Fechamento enviado" value={isTraveler ? '00' : formatCurrency(0)} accent={colors.success} /></View>
    <View className="mb-3 flex-row items-center justify-between"><Text className="text-lg font-bold text-foreground">Próxima atividade</Text><Text className="text-sm font-semibold text-primary">Ver tudo</Text></View>
    <Pressable onPress={() => router.push('/trip-detail')} style={({ pressed }) => [{ borderColor: colors.border, borderWidth: 1, borderRadius: 16, backgroundColor: colors.surface, padding: 20, marginBottom: 32, opacity: pressed ? 0.75 : 1 }]}><View className="flex-row items-start justify-between"><View className="flex-1"><Text className="text-xs font-bold uppercase tracking-widest text-muted">{activeTrip.status}</Text><Text className="mt-2 text-xl font-bold text-foreground">{activeTrip.destination}</Text><Text className="mt-1 text-sm text-muted">{activeTrip.startDate} — {activeTrip.endDate} · {activeTrip.client}</Text></View><StatusPill status={activeTrip.status} /></View><View className="mt-5 flex-row items-end justify-between"><View><Text className="text-xs text-muted">Adiantamento</Text><Text className="mt-1 text-base font-bold text-foreground">{formatCurrency(activeTrip.amount)}</Text></View><Text className="text-sm font-bold text-primary">Ver detalhes ›</Text></View></Pressable>
    <SectionHeader title="Acesso rápido" />
    <View style={{ flexDirection: isNarrow ? 'column' : 'row', flexWrap: isNarrow ? 'nowrap' : 'wrap', gap: 14 }}>{visibleActions.map((card) => <Pressable key={card.title} onPress={() => router.push(card.path as never)} style={({ pressed }) => [{ width: isNarrow ? '100%' : '48.7%', borderColor: colors.border, borderWidth: 1, borderRadius: 16, backgroundColor: colors.surface, padding: 20, opacity: pressed ? 0.72 : 1 }]}><View style={{ backgroundColor: `${colors.primary}10` }} className="mb-5 h-10 w-10 items-center justify-center rounded-xl"><IconSymbol name={card.icon} size={20} color={colors.primary} /></View><Text className="text-base font-bold text-foreground">{card.title}</Text><Text className="mt-1 text-sm text-muted">{card.detail}</Text></Pressable>)}</View>
    {!isTraveler ? <View className="mt-8 rounded-2xl border border-border bg-surface p-5"><Text className="text-xs font-bold uppercase tracking-widest text-muted">Pendências do ambiente</Text><Text className="mt-2 text-base font-bold text-foreground">{approvalQueue.length} aprovações aguardando</Text><Text className="mt-1 text-sm text-muted">Solicitações da sua equipe e preparações administrativas.</Text></View> : null}
  </ScrollView></View></ScreenContainer>;
}
