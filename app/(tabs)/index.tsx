import { ScrollView, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { KpiCard, SectionHeader, StatusPill } from '@/components/app-ui';
import { formatCurrency } from '@/lib/currency';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useCurrency } from '@/lib/currency-provider';
import { useLanguage } from '@/lib/language-provider';

type ChartDatum = { label: string; value: number; color: string };

function BarChart({ data, emptyLabel }: { data: ChartDatum[]; emptyLabel: string }) {
  const colors = useColors();
  const { t } = useLanguage();
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  if (maxValue === 0) return <View className="rounded-2xl border border-dashed border-border bg-surface p-5"><Text className="text-sm font-semibold text-foreground">{emptyLabel}</Text></View>;
  return <View className="rounded-2xl border border-border bg-surface p-5">{data.map((item) => <View key={item.label} className="mb-4 last:mb-0"><View className="mb-2 flex-row items-center justify-between"><Text className="text-sm text-foreground">{t(item.label)}</Text><Text className="text-sm font-bold text-foreground">{item.value}</Text></View><View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: `${colors.border}80` }}><View className="h-2 rounded-full" style={{ width: `${Math.max(5, (item.value / maxValue) * 100)}%`, backgroundColor: item.color }} /></View></View>)}</View>;
}

const actionCards = [
  { title: 'Minhas viagens', detail: 'Acompanhar e criar solicitações', icon: 'airplane' as const, path: '/trips' },
  { title: 'Nova solicitação', detail: 'Solicitar uma viagem', icon: 'plus' as const, path: '/new-trip' },
  { title: 'Aprovações', detail: 'Aprovar ou rejeitar viagens', icon: 'checkmark.seal.fill' as const, path: '/approvals' },
  { title: 'Relatório analítico', detail: 'Despesas detalhadas', icon: 'chart.bar.fill' as const, path: '/reports' },
  { title: 'Resumo por cliente', detail: 'Agrupado por cliente e conceito', icon: 'chart.bar.fill' as const, path: '/reports' },
  { title: 'Preparação', detail: 'Adiantamento, veículo e hotel', icon: 'briefcase.fill' as const, path: '/operations' },
  { title: 'Revisão de fechamento', detail: 'Conferir despesas e finalizar', icon: 'doc.text.fill' as const, path: '/expenses' },
  { title: 'Cadastros', detail: 'Gestão das tabelas-base', icon: 'gearshape.fill' as const, path: '/administrativo' },
  { title: 'Usuários locais', detail: 'Criar e administrar acessos', icon: 'person.crop.circle.fill' as const, path: '/admin-users' },
];

export default function HomeScreen() {
  const colors = useColors();
  const { user, isAuthenticated } = useAuth();
  const role = user?.role === 'admin' ? 'Administrativo' : 'Viajante';
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const isTraveler = role === 'Viajante';
  const isAdmin = role === 'Administrativo';
  // "role" acima só distingue admin de todo o resto — não bastava para
  // decidir quem vê o cartão de Aprovações, já que "Viajante + Aprovador"
  // também precisa vê-lo. Usamos o perfil de verdade aqui, do mesmo jeito
  // que o menu lateral já faz.
  const profile = user?.profile ?? (user?.role === 'admin' ? 'admin' : 'traveler');
  const canApprove = profile === 'admin' || profile === 'approver' || profile === 'traveler_approver';
  const { width } = useWindowDimensions();
  const isNarrow = width < 760;
  const tripsQuery = trpc.operations.trips.list.useQuery({ page: 1, pageSize: 50, direction: 'asc' }, { enabled: isAuthenticated });
  const fleetQuery = trpc.operations.fleet.vehicles.list.useQuery({ page: 1, pageSize: 50, direction: 'asc' }, { enabled: isAuthenticated && isAdmin });
  const liveTrips = tripsQuery.data?.items ?? [];
  const liveVehicles = fleetQuery.data?.items ?? [];
  const fleetAvailable = liveVehicles.filter((vehicle) => vehicle.status === 'Disponível').length;
  const fleetMaintenance = liveVehicles.filter((vehicle) => vehicle.status === 'Realizar Manutenção' || vehicle.status === 'Em manutenção').length;
  const fleetAlerts = liveVehicles.filter((vehicle) => ['Realizar Manutenção', 'Em manutenção', 'Avaria registrada', 'Extintor próximo do vencimento'].includes(vehicle.status)).length;
  const tripStatusData = Array.from(liveTrips.reduce((counts, trip) => counts.set(trip.status, (counts.get(trip.status) ?? 0) + 1), new Map<string, number>())).map(([label, value]) => ({ label, value, color: label === 'Aguardando aprovação' ? colors.warning : colors.primary }));
  const vehicleStatusData = Array.from(liveVehicles.reduce((counts, vehicle) => counts.set(vehicle.status, (counts.get(vehicle.status) ?? 0) + 1), new Map<string, number>())).map(([label, value]) => ({ label, value, color: label === 'Disponível' ? colors.success : colors.primary }));
  const maintenanceData = Array.from(liveVehicles.filter((vehicle) => ['Realizar Manutenção', 'Em manutenção', 'Avaria registrada', 'Extintor próximo do vencimento'].includes(vehicle.status)).reduce((counts, vehicle) => counts.set(vehicle.status, (counts.get(vehicle.status) ?? 0) + 1), new Map<string, number>())).map(([label, value]) => ({ label, value, color: colors.warning }));
  const activeTrip = liveTrips[0];
  const visibleActions = actionCards.filter((card) => {
    if (['Aprovações'].includes(card.title)) return canApprove;
    if (['Relatório analítico', 'Resumo por cliente', 'Preparação', 'Cadastros', 'Usuários locais'].includes(card.title)) return isAdmin;
    return true;
  });
  return <ScreenContainer className="px-5 pt-5"><View className="w-full max-w-6xl flex-1 self-center"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
    <View className="mb-6 flex-row items-start justify-between"><View className="flex-1 pr-3"><Text className="text-sm text-muted">{t('Bom dia,')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{user?.name || t('Usuário autenticado')}.</Text><Text className="mt-1 text-sm text-muted">{t(`Perfil: ${role}`)}</Text></View><View style={{ backgroundColor: colors.primary, flexShrink: 0 }} className="h-11 w-11 items-center justify-center rounded-xl"><IconSymbol name="airplane" size={22} color="white" /></View></View>
    <View className={isNarrow ? 'mb-6 flex-col gap-3' : 'mb-8 flex-row gap-3'}><KpiCard label={t('Total de viagens')} value={String(liveTrips.length).padStart(2, '0')} color={colors.foreground} /><KpiCard label={t('Aguardando aprovação')} value={String(liveTrips.filter((trip) => trip.status === 'Aguardando aprovação').length).padStart(2, '0')} color={colors.warning} /><KpiCard label={t('Em preparação')} value={String(liveTrips.filter((trip) => trip.status === 'Em preparação').length).padStart(2, '0')} color={colors.primary} /><KpiCard label={t('Fechamento enviado')} value={isTraveler ? '00' : formatCurrency(0, currency)} color={colors.success} /></View>
    <View className="mb-3 flex-row items-center justify-between"><Text className="text-lg font-bold text-foreground">{t('Próxima atividade')}</Text><Text className="text-sm font-semibold text-primary">{t('Ver tudo')}</Text></View>
    {activeTrip ? <Pressable onPress={() => router.push({ pathname: '/trip-detail', params: { tripId: String(activeTrip.id) } })} style={({ pressed }) => [{ borderColor: colors.border, borderWidth: 1, borderRadius: 16, backgroundColor: colors.surface, padding: 20, marginBottom: 32, opacity: pressed ? 0.75 : 1 }]}><View className="flex-row items-start justify-between"><View className="flex-1"><Text className="text-xs font-bold uppercase tracking-widest text-muted">{t(activeTrip.status)}</Text><Text className="mt-2 text-xl font-bold text-foreground">{activeTrip.destination}</Text><Text className="mt-1 text-sm text-muted">{activeTrip.startsOn} — {activeTrip.endsOn}</Text></View><StatusPill status={activeTrip.status} /></View><View className="mt-5 flex-row items-end justify-between"><View><Text className="text-xs text-muted">{t('Adiantamento')}</Text><Text className="mt-1 text-base font-bold text-foreground">{activeTrip.hasAdvance ? formatCurrency(Number(activeTrip.advanceAmount), currency) : t('Não solicitado')}</Text></View><Text className="text-sm font-bold text-primary">{t('Abrir detalhes ›')}</Text></View></Pressable> : <View className="mb-8 rounded-2xl border border-dashed border-border bg-surface p-5"><Text className="font-bold text-foreground">{t('Nenhuma viagem persistida')}</Text><Text className="mt-1 text-sm text-muted">{t('Crie uma solicitação para visualizar atividades reais neste painel.')}</Text></View>}
    {isAdmin ? <>
      <View className="mb-3 flex-row items-center justify-between"><Text className="text-lg font-bold text-foreground">{t('Painel da frota')}</Text><Pressable onPress={() => router.push('/fleet')}><Text className="text-sm font-semibold text-primary">{t('Abrir frota ›')}</Text></Pressable></View>
      <View className={isNarrow ? 'mb-8 flex-col gap-3' : 'mb-8 flex-row gap-3'}><KpiCard label={t('Veículos cadastrados')} value={String(liveVehicles.length).padStart(2, '0')} color={colors.primary} /><KpiCard label={t('Disponíveis')} value={String(fleetAvailable).padStart(2, '0')} color={colors.success} /><KpiCard label={t('Alertas de ação')} value={String(fleetAlerts).padStart(2, '0')} color={colors.warning} /><KpiCard label={t('Em manutenção')} value={String(fleetMaintenance).padStart(2, '0')} color={colors.error} /></View>
      {liveVehicles.length === 0 ? <View className="mb-8 rounded-2xl border border-dashed border-border bg-surface p-5"><Text className="font-bold text-foreground">{t('Nenhum veículo persistido')}</Text><Text className="mt-1 text-sm text-muted">{t('Cadastre um veículo para acompanhar disponibilidade e manutenção neste painel.')}</Text></View> : <View className="mb-8 rounded-2xl border border-border bg-surface p-5"><Text className="text-sm font-bold text-foreground">{t('Resumo operacional')}</Text><Text className="mt-2 text-sm text-muted">{fleetAvailable} {t('veículo(s) disponíveis')} · {fleetMaintenance} {t('em manutenção')} · {fleetAlerts} {t('alerta(s) de ação')}</Text></View>}
      <View className={isNarrow ? 'mb-8 flex-col gap-4' : 'mb-8 flex-row gap-4'}><View className="flex-1"><Text className="mb-3 text-sm font-bold text-foreground">{t('Viagens por etapa')}</Text><BarChart data={tripStatusData} emptyLabel={t('Nenhuma viagem persistida para analisar')} /></View><View className="flex-1"><Text className="mb-3 text-sm font-bold text-foreground">{t('Disponibilidade da frota')}</Text><BarChart data={vehicleStatusData} emptyLabel={t('Nenhum veículo persistido para analisar')} /></View></View>
      <View className="mb-8"><Text className="mb-3 text-sm font-bold text-foreground">{t('Manutenção e alertas')}</Text><BarChart data={maintenanceData} emptyLabel={t('Nenhum alerta ou manutenção pendente')} /></View>
    </> : null}
    <SectionHeader title={t('Acesso rápido')} />
    <View style={{ flexDirection: isNarrow ? 'column' : 'row', flexWrap: isNarrow ? 'nowrap' : 'wrap', gap: 14 }}>{visibleActions.map((card) => <Pressable key={card.title} onPress={() => router.push(card.path as never)} style={({ pressed }) => [{ width: isNarrow ? '100%' : '48.7%', borderColor: colors.border, borderWidth: 1, borderRadius: 16, backgroundColor: colors.surface, padding: 20, opacity: pressed ? 0.72 : 1 }]}><View style={{ backgroundColor: `${colors.primary}10` }} className="mb-5 h-10 w-10 items-center justify-center rounded-xl"><IconSymbol name={card.icon} size={20} color={colors.primary} /></View><Text className="text-base font-bold text-foreground">{t(card.title)}</Text><Text className="mt-1 text-sm text-muted">{t(card.detail)}</Text></Pressable>)}</View>
    {!isTraveler ? <View className="mt-8 rounded-2xl border border-border bg-surface p-5"><Text className="text-xs font-bold uppercase tracking-widest text-muted">{t('Pendências do ambiente')}</Text><Text className="mt-2 text-base font-bold text-foreground">{liveTrips.filter((trip) => trip.status === 'Aguardando aprovação').length} {t('aprovações aguardando')}</Text><Text className="mt-1 text-sm text-muted">{t('Solicitações persistidas no PostgreSQL.')}</Text></View> : null}
  </ScrollView></View></ScreenContainer>;
}
