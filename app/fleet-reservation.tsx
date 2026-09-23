import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton, SectionHeader, StatusPill } from '@/components/app-ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

export default function FleetReservationScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ reservationId?: string }>();
  // fleet.tsx manda o id formatado como "RES-3" — extraímos só o número.
  const requestedId = params.reservationId ? Number(params.reservationId.replace(/\D/g, '')) : undefined;

  const reservationsQuery = trpc.operations.fleet.reservations.list.useQuery({ page: 1, pageSize: 100, direction: 'asc', status: 'Aguardando veículo' }, { enabled: isAuthenticated });
  const vehiclesQuery = trpc.operations.fleet.vehicles.list.useQuery({ page: 1, pageSize: 100, direction: 'asc', status: 'Disponível' }, { enabled: isAuthenticated });
  const unitsQuery = trpc.catalogs.units.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const updateReservation = trpc.operations.fleet.reservations.update.useMutation();

  const pendingReservations = reservationsQuery.data?.items ?? [];
  const reservation = pendingReservations.find((item) => item.id === requestedId) ?? pendingReservations[0];
  const availableVehicles = vehiclesQuery.data?.items ?? [];
  const units = unitsQuery.data?.items ?? [];
  const unitName = (id: number) => units.find((unit) => Number(unit.id) === id)?.name ?? `${t('Unidade')} ${id}`;

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>(undefined);

  const confirm = () => {
    if (!reservation || !selectedVehicleId) {
      Alert.alert(t('Selecione um veículo.'), t('Escolha um veículo disponível para vincular à viagem.'));
      return;
    }
    const vehicle = availableVehicles.find((item) => item.id === selectedVehicleId);
    updateReservation.mutate(
      { id: reservation.id, vehicleId: selectedVehicleId, status: 'Reservado' },
      {
        onSuccess: () => {
          void reservationsQuery.refetch();
          void vehiclesQuery.refetch();
          Alert.alert(t('Reserva confirmada'), `${vehicle?.plate ?? ''} ${t('foi reservado para')} ${reservation.destination}.`, [
            { text: t('Voltar para Frota'), onPress: () => router.replace('/fleet') },
          ]);
        },
        onError: (error) => Alert.alert(t('Não foi possível confirmar a reserva.'), error.message),
      },
    );
  };

  const isLoading = reservationsQuery.isLoading || vehiclesQuery.isLoading;

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4">
      <View className="w-full max-w-4xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
          <Pressable onPress={() => router.back()} className="mb-5"><Text className="font-semibold text-primary">‹ {t('Voltar para Frota')}</Text></Pressable>
          <Text className="text-sm font-medium text-muted">{t('Administrativo · Reserva de frota')}</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">{t('Associar veículo')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('Use os dados da viagem aberta para reservar um veículo disponível e confirmar o condutor.')}</Text>

          {isLoading ? <Text className="mt-6 text-sm text-muted">{t('Carregando...')}</Text> : null}

          {!isLoading && !reservation ? (
            <View className="mt-8 items-center rounded-2xl border border-dashed border-border bg-surface p-8">
              <IconSymbol name="checkmark.seal.fill" size={36} color={colors.success} />
              <Text className="mt-3 text-base font-bold text-foreground">{t('Nada pendente')}</Text>
              <Text className="mt-1 text-center text-sm text-muted">{t('Não há reservas aguardando veículo no momento.')}</Text>
            </View>
          ) : null}

          {reservation ? (
            <>
              <SectionHeader title={t('Viagem solicitante')} />
              <View className="rounded-2xl border border-border bg-surface p-5">
                <View className="flex-row items-start justify-between">
                  <View>
                    <Text className="text-xs font-bold tracking-wider text-muted">{reservation.tripCode} · RES-{reservation.id}</Text>
                    <Text className="mt-2 text-xl font-bold text-foreground">{reservation.destination}</Text>
                    <Text className="mt-1 text-sm text-muted">{reservation.plannedStartOn} — {reservation.plannedEndOn} · {t('Condutor')}: {reservation.driverName ?? t('Viajante vinculado')}</Text>
                  </View>
                  <StatusPill status="Aguardando veículo" />
                </View>
              </View>

              <SectionHeader title={t('Veículos disponíveis')} action={`${availableVehicles.length} ${t('opções')}`} />
              {availableVehicles.length === 0 ? (
                <Text className="mb-4 text-sm text-muted">{t('Nenhum veículo disponível no momento.')}</Text>
              ) : (
                availableVehicles.map((vehicle) => {
                  const selected = selectedVehicleId === vehicle.id;
                  return (
                    <Pressable key={vehicle.id} onPress={() => setSelectedVehicleId(vehicle.id)} style={{ borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}10` : colors.surface }} className="mb-3 rounded-2xl border p-5">
                      <View className="flex-row items-center">
                        <View style={{ backgroundColor: selected ? colors.primary : `${colors.primary}16` }} className="h-11 w-11 items-center justify-center rounded-xl">
                          <IconSymbol name="car.fill" size={22} color={selected ? 'white' : colors.primary} />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="font-bold text-foreground">{vehicle.brand} {vehicle.model}</Text>
                          <Text className="mt-1 text-sm text-muted">{vehicle.plate} · {vehicle.modelYear} · {unitName(vehicle.unitId)}</Text>
                          <Text className="mt-1 text-xs text-muted">{vehicle.currentKm.toLocaleString('pt-BR')} km · {t('Extintor')} {vehicle.fireExtinguisherExpiresOn ?? '-'}</Text>
                        </View>
                        <View style={{ borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' }} className="h-6 w-6 items-center justify-center rounded-full border">
                          {selected ? <IconSymbol name="checkmark" size={14} color="white" /> : null}
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
              <PrimaryButton label={updateReservation.isPending ? t('Confirmando...') : t('Confirmar reserva')} onPress={updateReservation.isPending ? undefined : confirm} />
            </>
          ) : null}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}
