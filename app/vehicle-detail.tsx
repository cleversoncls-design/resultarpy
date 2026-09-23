import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusPill, statusTone } from '@/components/app-ui';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

export default function VehicleDetailScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.profile === 'admin';
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = typeof params.vehicleId === 'string' && /^\d+$/.test(params.vehicleId) ? Number(params.vehicleId) : undefined;
  const vehicleQuery = trpc.operations.fleet.vehicles.get.useQuery({ id: vehicleId as number }, { enabled: isAuthenticated && vehicleId !== undefined });
  // Historico de alocacoes deste veiculo -- ultimas 20 viagens, mais
  // recente primeiro.
  const reservationsQuery = trpc.operations.fleet.reservations.list.useQuery(
    { vehicleId: vehicleId as number, page: 1, pageSize: 20, direction: 'desc' },
    { enabled: isAuthenticated && vehicleId !== undefined },
  );
  const updateVehicleStatus = trpc.operations.fleet.vehicles.update.useMutation({
    onSuccess: () => { void vehicleQuery.refetch(); },
  });
  const vehicle = vehicleQuery.data;
  const reservations = reservationsQuery.data?.items ?? [];

  if (!isAuthenticated || !isAdmin) {
    return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6"><View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6"><Text className="text-xl font-bold text-foreground">{t('Acesso restrito')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Somente o Administrativo pode gerenciar veículos.')}</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 44, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable></View></ScreenContainer>;
  }

  if (vehicleQuery.isLoading) return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  if (!vehicle) return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6"><Text className="text-muted">{t('Veículo não encontrado.')}</Text></ScreenContainer>;

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4">
      <View className="w-full max-w-2xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar')}</Text></Pressable>

          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-medium text-muted">{t('Administrativo · Controle operacional')}</Text>
              <Text className="mt-1 text-3xl font-bold text-foreground">{vehicle.brand} {vehicle.model}</Text>
              <Text className="mt-1 text-sm text-muted">{vehicle.plate} · {vehicle.modelYear}{vehicle.color ? ` · ${vehicle.color}` : ''}</Text>
            </View>
            <StatusPill status={vehicle.status} />
          </View>

          <View style={{ borderTopWidth: 3, borderTopColor: colors.primary }} className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <Text className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">{t('Dados do veículo')}</Text>
            <View className="gap-3">
              <InfoRow label={t('KM atuais')} value={`${vehicle.currentKm.toLocaleString('pt-BR')} km`} />
              <InfoRow label={t('Última manutenção')} value={`${vehicle.lastMaintenanceKm.toLocaleString('pt-BR')} km`} />
              <InfoRow label={t('Intervalo de manutenção')} value={`${vehicle.maintenanceIntervalKm.toLocaleString('pt-BR')} km`} />
              <InfoRow label={t('Vencimento do extintor')} value={vehicle.fireExtinguisherExpiresOn ?? t('Não informado')} />
              {vehicle.notes ? <InfoRow label={t('Observações')} value={vehicle.notes} /> : null}
            </View>
          </View>

          <Text className="mb-3 mt-8 text-xs font-bold uppercase tracking-widest text-muted">{t('Ações')}</Text>
          <View className="gap-3">
            <Pressable onPress={() => router.push({ pathname: '/new-vehicle', params: { vehicleId: String(vehicle.id) } })} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.72 : 1 })}>
              <IconSymbol name="pencil" size={20} color={colors.primary} />
              <Text className="ml-3 font-bold text-foreground">{t('Editar cadastro')}</Text>
            </Pressable>
            <Pressable
              onPress={() => updateVehicleStatus.mutate({ id: vehicle.id, status: 'Em manutenção' })}
              disabled={updateVehicleStatus.isPending || vehicle.status === 'Em manutenção'}
              style={({ pressed }) => ({ borderColor: colors.warning, borderWidth: 1, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', opacity: pressed || updateVehicleStatus.isPending || vehicle.status === 'Em manutenção' ? 0.6 : 1 })}
            >
              <IconSymbol name="wrench.and.screwdriver.fill" size={20} color={colors.warning} />
              <Text style={{ color: colors.warning }} className="ml-3 font-bold">{vehicle.status === 'Em manutenção' ? t('Já está em manutenção') : updateVehicleStatus.isPending ? t('Salvando...') : t('Bloquear como Em manutenção')}</Text>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: '/new-work-order', params: { vehicleId: String(vehicle.id) } })} style={({ pressed }) => ({ borderColor: colors.success, borderWidth: 1, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.72 : 1 })}>
              <IconSymbol name="checkmark.seal.fill" size={20} color={colors.success} />
              <Text style={{ color: colors.success }} className="ml-3 font-bold">{t('Registrar manutenção concluída')}</Text>
            </Pressable>
          </View>

          <Text className="mb-3 mt-8 text-xs font-bold uppercase tracking-widest text-muted">{t('Histórico de viagens')}</Text>
          {reservations.length === 0 ? (
            <View className="rounded-2xl border border-border bg-surface p-5">
              <Text className="text-sm text-muted">{t('Nenhuma viagem registrada para este veículo ainda.')}</Text>
            </View>
          ) : (
            <View className="gap-3">
              {reservations.map((item: any) => (
                <View key={item.id} style={{ borderLeftWidth: 3, borderLeftColor: statusTone(item.status, colors).color }} className="rounded-2xl border border-border bg-surface p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-xs font-bold tracking-wider text-muted">{item.tripCode ?? `#${item.tripId}`}{item.destination ? ` · ${item.destination}` : ''}</Text>
                      <Text className="mt-1 text-sm font-semibold text-foreground">{item.plannedStartOn} — {item.plannedEndOn}</Text>
                      {item.driverName ? <Text className="mt-1 text-xs text-muted">{t('Solicitado por')}: {item.driverName}</Text> : null}
                      {item.departureKm ? (
                        <Text className="mt-1 text-xs text-muted">
                          {t('KM de saída')}: {item.departureKm.toLocaleString('pt-BR')}
                          {item.returnKm ? ` · ${t('KM de retorno')}: ${item.returnKm.toLocaleString('pt-BR')} · ${(item.returnKm - item.departureKm).toLocaleString('pt-BR')} km` : ''}
                        </Text>
                      ) : null}
                    </View>
                    <StatusPill status={item.status} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-bold text-foreground">{value}</Text>
    </View>
  );
}
