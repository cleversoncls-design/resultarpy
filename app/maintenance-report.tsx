import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { formatCurrency } from '@/lib/currency';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { ReportExportActions } from '@/components/report-export-actions';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

// A tela antiga usava lib/demo-data.ts (fleetWorkOrders, maintenanceReasons,
// vehicles), que são listas fixas e permanentemente vazias — o relatório
// nunca mostrava nada de verdade. Reconectada aos mesmos endpoints tRPC já
// usados em Frota (fleet.tsx) e Cadastros de Frota.
function periodRange(period: 'year' | '90') {
  const now = new Date();
  if (period === 'year') return { from: `${now.getFullYear()}-01-01`, to: dateOnly(now) };
  const past = new Date(now);
  past.setDate(past.getDate() - 90);
  return { from: dateOnly(past), to: dateOnly(now) };
}

export default function MaintenanceReportScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [vehicleId, setVehicleId] = useState<number | 'Todos'>('Todos');
  const [period, setPeriod] = useState<'year' | '90'>('year');
  const [kind, setKind] = useState<'Todos' | 'Preventiva' | 'Corretiva'>('Todos');
  const [reasonId, setReasonId] = useState<number | 'Todos'>('Todos');
  const range = periodRange(period);

  const vehiclesQuery = trpc.operations.fleet.vehicles.list.useQuery({ page: 1, pageSize: 100, direction: 'asc' }, { enabled: isAuthenticated });
  const reasonsQuery = trpc.catalogs.maintenanceReasons.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const workOrdersQuery = trpc.operations.fleet.workOrders.list.useQuery(
    { page: 1, pageSize: 100, direction: 'desc', ...range, ...(vehicleId !== 'Todos' ? { vehicleId } : {}), ...(kind !== 'Todos' ? { maintenanceType: kind } : {}) },
    { enabled: isAuthenticated },
  );

  const vehicleList = vehiclesQuery.data?.items ?? [];
  const reasonList = reasonsQuery.data?.items ?? [];
  // reasonId não tem filtro no backend — filtramos aqui, junto com os
  // demais itens já filtrados por vehicleId/maintenanceType/período.
  const filtered = useMemo(
    () => (workOrdersQuery.data?.items ?? []).filter((order) => reasonId === 'Todos' || order.reasonId === reasonId),
    [workOrdersQuery.data, reasonId],
  );

  const vehicleName = (id: number) => { const vehicle = vehicleList.find((item) => item.id === id); return vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : `#${id}`; };
  const reasonName = (id: number | null) => reasonList.find((item) => item.id === id)?.name ?? t('Sem motivo cadastrado');

  const total = filtered.reduce((sum, order) => sum + Number(order.costAmount), 0);
  const preventive = filtered.filter((order) => order.maintenanceType === 'Preventiva').reduce((sum, order) => sum + Number(order.costAmount), 0);
  const corrective = filtered.filter((order) => order.maintenanceType === 'Corretiva').reduce((sum, order) => sum + Number(order.costAmount), 0);

  const exportColumns = [{ key: 'id', label: t('O.S.') }, { key: 'vehicle', label: t('Veículo') }, { key: 'kind', label: t('Tipo') }, { key: 'reason', label: t('Motivo') }, { key: 'date', label: t('Data') }, { key: 'km', label: t('KM') }, { key: 'observation', label: t('Observação') }, { key: 'cost', label: t('Custo') }];
  const exportRows = filtered.map((order) => ({
    id: `OS-${order.id}`,
    vehicle: vehicleName(order.vehicleId),
    kind: t(order.maintenanceType),
    reason: reasonName(order.reasonId),
    date: order.maintenanceDate,
    km: order.vehicleKm.toLocaleString('pt-BR'),
    observation: order.observation ?? '',
    cost: formatCurrency(Number(order.costAmount)),
  }));

  const isLoading = vehiclesQuery.isLoading || reasonsQuery.isLoading || workOrdersQuery.isLoading;

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4">
      <View className="w-full max-w-6xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Pressable onPress={() => router.back()}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar para Frota')}</Text></Pressable>
          <Text className="text-sm font-medium text-muted">{t('Administrativo · Análise financeira')}</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">{t('Relatório de manutenções')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('Avalie gastos realizados por veículo, período e tipo de manutenção.')}</Text>

          <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t('Filtros do relatório')}</Text>
            <Text className="mb-2 mt-2 text-xs font-semibold text-muted">{t('Veículo')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <FilterChip label={t('Todos')} selected={vehicleId === 'Todos'} onPress={() => setVehicleId('Todos')} />
              {vehicleList.map((vehicle) => (
                <FilterChip key={vehicle.id} label={vehicle.plate} selected={vehicleId === vehicle.id} onPress={() => setVehicleId(vehicle.id)} />
              ))}
            </ScrollView>
            <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Tipo de manutenção')}</Text>
            <View className="flex-row gap-2">
              <FilterChip label={t('Todos')} selected={kind === 'Todos'} onPress={() => setKind('Todos')} />
              <FilterChip label={t('Preventiva')} selected={kind === 'Preventiva'} onPress={() => setKind('Preventiva')} />
              <FilterChip label={t('Corretiva')} selected={kind === 'Corretiva'} onPress={() => setKind('Corretiva')} />
            </View>
            <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Motivo')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <FilterChip label={t('Todos')} selected={reasonId === 'Todos'} onPress={() => setReasonId('Todos')} />
              {reasonList.map((reason) => (
                <FilterChip key={reason.id} label={reason.name} selected={reasonId === reason.id} onPress={() => setReasonId(reason.id)} />
              ))}
            </ScrollView>
            <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Período')}</Text>
            <View className="flex-row gap-2">
              <FilterChip label={t('Ano atual')} selected={period === 'year'} onPress={() => setPeriod('year')} />
              <FilterChip label={t('Últimos 90 dias')} selected={period === '90'} onPress={() => setPeriod('90')} />
            </View>
          </View>

          {isLoading ? <View className="mt-6 flex-row items-center"><ActivityIndicator color={colors.primary} /><Text className="ml-2 text-sm text-muted">{t('Carregando...')}</Text></View> : null}

          <View className="mt-6 flex-row gap-3">
            <Summary label={t('Total')} value={formatCurrency(total)} color={colors.primary} />
            <Summary label={t('Preventiva')} value={formatCurrency(preventive)} color={colors.success} />
            <Summary label={t('Corretiva')} value={formatCurrency(corrective)} color={colors.warning} />
          </View>

          <Text className="mb-3 mt-8 text-base font-bold text-foreground">{t('Manutenções realizadas')} · {period === 'year' ? t('Ano atual') : t('Últimos 90 dias')}</Text>
          {!isLoading && filtered.length === 0 ? (
            <View className="rounded-2xl border border-dashed border-border bg-surface p-6"><Text className="text-sm text-muted">{t('Nenhuma manutenção encontrada para os filtros selecionados.')}</Text></View>
          ) : (
            <View style={{ borderTopWidth: 3, borderTopColor: colors.primary }} className="rounded-2xl border border-border bg-surface p-2">
              {filtered.map((order) => (
                <View key={order.id} className="border-b border-border p-4 last:border-b-0">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-xs font-bold tracking-wider text-muted">OS-{order.id} · {order.maintenanceDate}</Text>
                      <Text className="mt-1 font-bold text-foreground">{vehicleName(order.vehicleId)}</Text>
                      <Text className="mt-1 text-sm text-muted">{t(order.maintenanceType)} · {reasonName(order.reasonId)}</Text>
                    </View>
                    <Text className="font-bold text-foreground">{formatCurrency(Number(order.costAmount))}</Text>
                  </View>
                  <Text className="mt-2 text-xs text-muted">{t('KM')}: {order.vehicleKm.toLocaleString('pt-BR')} · {order.observation ?? ''}</Text>
                </View>
              ))}
            </View>
          )}

          <ReportExportActions title={t('Relatório de manutenções')} filename={`relatorio-manutencoes-${vehicleId}-${period}`} columns={exportColumns} rows={exportRows} />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={{ backgroundColor: selected ? colors.primary : colors.background, borderColor: selected ? colors.primary : colors.border }} className="rounded-xl border px-3 py-2"><Text style={{ color: selected ? '#fff' : colors.foreground }} className="text-xs font-bold">{label}</Text></Pressable>;
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
  return <View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs text-muted">{label}</Text><Text style={{ color }} className="mt-2 text-lg font-bold">{value}</Text></View>;
}
