import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton, SectionHeader, StatusPill } from '@/components/app-ui';
import { formatCurrency, trips as demoTrips } from '@/lib/demo-data';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';

export default function TripsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const query = trpc.operations.trips.list.useQuery({ page: 1, pageSize: 50, direction: 'asc' }, { enabled: isAuthenticated });
  const data = query.data?.items.map((trip) => ({
    id: trip.tripCode,
    destination: trip.destination,
    startDate: trip.startsOn,
    endDate: trip.endsOn,
    status: trip.status,
    client: trip.clientId ? t('Cliente vinculado') : t('Sem cliente'),
    amount: Number(trip.advanceAmount),
    hasAdvance: trip.hasAdvance,
    transport: trip.transport ?? t('Transporte não informado'),
  }));
  const rows = data && !query.isError ? data : demoTrips;
  return <ScreenContainer className="px-5 pt-4"><View className="w-full max-w-6xl flex-1 self-center"><View className="mb-5 flex-row items-end justify-between"><View><Text className="text-sm font-medium text-muted">{t('Controle operacional')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{t('Minhas viagens')}</Text></View><Pressable onPress={() => router.push('/new-trip')} style={({ pressed }) => [{ backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]} className="h-11 w-11 items-center justify-center rounded-2xl"><IconSymbol name="plus" size={22} color="white" /></Pressable></View><View className="mb-6 flex-row gap-2"><View className="rounded-full bg-primary px-4 py-2"><Text className="text-xs font-bold text-white">{t('Todas')} · {rows.length}</Text></View><View className="rounded-full border border-border bg-surface px-4 py-2"><Text className="text-xs font-semibold text-muted">{t('Em andamento')}</Text></View><View className="rounded-full border border-border bg-surface px-4 py-2"><Text className="text-xs font-semibold text-muted">{t('Finalizadas')}</Text></View></View><FlatList data={rows} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, gap: 12 }} renderItem={({ item }) => <Pressable onPress={() => router.push('/trip-detail')} style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]} className="rounded-3xl border border-border bg-surface p-5"><View className="flex-row items-start justify-between"><View className="flex-1 pr-3"><Text className="text-xs font-bold tracking-wider text-muted">{item.id}</Text><Text className="mt-2 text-xl font-bold text-foreground">{item.destination}</Text><Text className="mt-1 text-sm text-muted">{item.startDate} — {item.endDate}</Text></View><StatusPill status={item.status} /></View><View className="mt-5 flex-row border-t border-border pt-4"><View className="flex-1"><Text className="text-xs text-muted">{t('Cliente')}</Text><Text className="mt-1 text-sm font-semibold text-foreground">{item.client}</Text></View><View className="items-end"><Text className="text-xs text-muted">{t('Adiantamento')}</Text><Text className="mt-1 text-sm font-bold text-foreground">{item.hasAdvance ? formatCurrency(item.amount) : t('Não solicitado')}</Text></View></View><View className="mt-4 flex-row items-center"><IconSymbol name="airplane" size={16} color={colors.primary} /><Text className="ml-2 text-xs font-medium text-muted">{t(item.transport)}</Text><Text className="ml-auto text-xs font-semibold text-primary">{t('Abrir detalhes ›')}</Text></View></Pressable>} ListEmptyComponent={<View><SectionHeader title={t('Nenhuma viagem')} /><PrimaryButton label={t('Criar solicitação')} onPress={() => router.push('/new-trip')} /></View>} /></View></ScreenContainer>;
}
