import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { KpiCard } from '@/components/app-ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

// Viagens que já foram aprovadas mas ainda não têm status "Liberada para
// viagem" — a preparação (adiantamento, hotel, veículo) acontece nas
// próprias telas responsáveis por cada pendência (Detalhe da viagem e
// Frota). O status muda para "Liberada para viagem" sozinho, no backend,
// assim que todas as pendências aplicáveis àquela viagem são resolvidas
// (ver maybeReleaseTrip em server/operations-repository.ts) — por isso
// esta tela não tem (e não deveria ter) um botão de "liberar": ela é só
// um painel de acompanhamento das pendências.
const PREPARING_STATUSES = ['Aprovada', 'Em preparação'];

export default function OperationsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const isAdmin = user?.role === 'admin' || user?.profile === 'admin';
  const enabled = isAuthenticated && isAdmin;

  const tripsQuery = trpc.operations.trips.list.useQuery({ page: 1, pageSize: 100, direction: 'asc' }, { enabled });
  const reservationsQuery = trpc.operations.fleet.reservations.list.useQuery({ page: 1, pageSize: 100, direction: 'asc' }, { enabled });

  const reservedVehicleTripIds = useMemo(() => {
    const ids = new Set<number>();
    (reservationsQuery.data?.items ?? []).forEach((reservation) => {
      if (reservation.vehicleId != null) ids.add(reservation.tripId);
    });
    return ids;
  }, [reservationsQuery.data]);

  const rows = useMemo(() => {
    const trips = tripsQuery.data?.items ?? [];
    return trips
      .filter((trip) => PREPARING_STATUSES.includes(trip.status))
      .map((trip) => ({
        id: trip.id,
        tripCode: trip.tripCode,
        destination: trip.destination,
        travelerName: trip.travelerName ?? t('Viajante vinculado'),
        advancePending: Boolean(trip.hasAdvance) && !trip.advanceConfirmedAt,
        hotelPending: Boolean(trip.needsHotel) && !(trip.hotelNote && trip.hotelNote.trim() !== ''),
        vehiclePending: Boolean(trip.requiresFleetVehicle) && !reservedVehicleTripIds.has(trip.id),
      }));
  }, [tripsQuery.data, reservedVehicleTripIds, t]);

  const advancePendingCount = rows.filter((row) => row.advancePending).length;
  const hotelPendingCount = rows.filter((row) => row.hotelPending).length;
  const vehiclePendingCount = rows.filter((row) => row.vehiclePending).length;
  const isLoading = enabled && (tripsQuery.isLoading || reservationsQuery.isLoading);

  if (!isAdmin) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6">
        <View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
          <IconSymbol name="exclamationmark.triangle.fill" size={28} color={colors.warning} />
          <Text className="mt-4 text-xl font-bold text-foreground">{t('Acesso restrito')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('Esta fila está disponível somente para o perfil Administrativo.')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 pt-4">
      <View className="w-full max-w-5xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-sm font-medium text-muted">{t('Backoffice de viagens')}</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">{t('Operação')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('Viagens aprovadas que ainda aguardam alguma pendência antes de serem liberadas para viagem. A liberação acontece automaticamente ao resolver cada pendência.')}</Text>

          <View className={width < 640 ? 'mt-5 flex-col gap-3' : 'mt-5 flex-row gap-3'}>
            <KpiCard label={t('Em preparação')} value={String(rows.length)} color={colors.foreground} />
            <KpiCard label={t('Adiantamento pendente')} value={String(advancePendingCount)} color={colors.warning} />
            <KpiCard label={t('Hotel pendente')} value={String(hotelPendingCount)} color={colors.warning} />
            <KpiCard label={t('Veículo pendente')} value={String(vehiclePendingCount)} color={colors.warning} />
          </View>

          {isLoading ? <Text className="mt-6 text-sm text-muted">{t('Carregando...')}</Text> : null}

          {!isLoading && rows.length === 0 ? (
            <View className="mt-8 items-center rounded-2xl border border-dashed border-border bg-surface p-8">
              <IconSymbol name="checkmark.seal.fill" size={36} color={colors.success} />
              <Text className="mt-3 text-base font-bold text-foreground">{t('Nada pendente')}</Text>
              <Text className="mt-1 text-center text-sm text-muted">{t('Não há viagens aprovadas aguardando preparação no momento.')}</Text>
            </View>
          ) : null}

          <View className="mt-6 gap-3">
            {rows.map((item) => (
              <View key={item.id} style={{ borderLeftWidth: 3, borderLeftColor: colors.warning }} className="rounded-3xl border border-border bg-surface p-5">
                <View className="flex-row items-start">
                  <View className="flex-1">
                    <Text className="text-xs font-bold tracking-wider text-muted">{item.tripCode}</Text>
                    <Text className="mt-2 text-lg font-bold text-foreground">{item.destination}</Text>
                    <Text className="mt-1 text-sm text-muted">{item.travelerName}</Text>
                  </View>
                </View>
                <View className="mt-5 gap-3">
                  <CheckRow label={t('Adiantamento ao viajante')} done={!item.advancePending} />
                  <CheckRow label={t('Reserva de hotel')} done={!item.hotelPending} />
                  <CheckRow label={t('Alocação de veículo')} done={!item.vehiclePending} />
                </View>
                <Pressable
                  onPress={() => router.push({ pathname: '/trip-detail', params: { tripId: String(item.id) } })}
                  style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, minHeight: 44, marginTop: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}
                >
                  <Text className="font-bold text-foreground">{t('Ver viagem')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function CheckRow({ label, done }: { label: string; done: boolean }) {
  const colors = useColors();
  return (
    <View className="flex-row items-center">
      <View style={{ backgroundColor: done ? colors.success : colors.background, borderColor: done ? colors.success : colors.border }} className="h-5 w-5 items-center justify-center rounded-md border">
        {done ? <IconSymbol name="checkmark" size={14} color="white" /> : null}
      </View>
      <Text className="ml-3 text-sm text-foreground">{label}</Text>
    </View>
  );
}
