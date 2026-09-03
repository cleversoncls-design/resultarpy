import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { MetricCard } from '@/components/app-ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';
import { formatCurrency, type Currency } from '@/lib/currency';
import { ReportExportActions } from '@/components/report-export-actions';

type ReportRow = {
  id: number;
  tripCode: string;
  clientName: string;
  date: string;
  city: string;
  expenseTypeName: string;
  quantity: string;
  sourceAmount: string;
  sourceCurrency: string;
  currency: string;
  spent: number;
  limit: number | null;
  reimbursable: number;
  excess: number;
  profileCity: string | null;
  rateDate: string | null;
  conversionAvailable: boolean;
};

function validCurrency(value: string): Currency {
  return value === 'USD' || value === 'PYG' ? value : 'BRL';
}

function totalsByCurrency(rows: ReportRow[], field: 'spent' | 'reimbursable' | 'excess') {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + Number(row[field]));
  });
  return Array.from(totals.entries())
    .map(([currency, value]) => formatCurrency(value, validCurrency(currency)))
    .join(' · ') || formatCurrency(0);
}

export default function ReimbursementsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, loading, isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const [tripId, setTripId] = useState<number | undefined>();
  const isNarrow = width < 640;

  const tripsQuery = trpc.operations.trips.list.useQuery(
    { page: 1, pageSize: 100, direction: 'asc' },
    { enabled: isAuthenticated },
  );
  const reportQuery = trpc.operations.reports.reimbursement.useQuery(
    { page: 1, pageSize: 100, direction: 'asc', ...(tripId ? { tripId } : {}) },
    { enabled: isAuthenticated },
  );

  const rows = useMemo(() => (reportQuery.data?.items ?? []) as ReportRow[], [reportQuery.data]);
  const trips = tripsQuery.data?.items ?? [];
  const exportColumns = [
    { key: 'trip', label: 'Viagem' },
    { key: 'date', label: 'Data' },
    { key: 'city', label: 'Cidade' },
    { key: 'concept', label: 'Tipo de gasto' },
    { key: 'spent', label: 'Gasto convertido' },
    { key: 'limit', label: 'Limite por evento' },
    { key: 'reimbursable', label: 'A reembolsar' },
    { key: 'excess', label: 'Excedente' },
  ];
  const exportRows = rows.map((row) => ({
    trip: `${row.tripCode} · ${row.clientName}`,
    date: row.date,
    city: row.city,
    concept: row.expenseTypeName,
    spent: `${formatCurrency(Number(row.sourceAmount), validCurrency(row.sourceCurrency))} → ${formatCurrency(row.spent, validCurrency(row.currency))}`,
    limit: row.limit === null ? 'Sem limite cadastrado' : formatCurrency(row.limit, validCurrency(row.currency)),
    reimbursable: formatCurrency(row.reimbursable, validCurrency(row.currency)),
    excess: formatCurrency(row.excess, validCurrency(row.currency)),
  }));
  const hasConversionWarning = rows.some((row) => !row.conversionAvailable);
  const spentTotal = totalsByCurrency(rows, 'spent');
  const reimbursableTotal = totalsByCurrency(rows, 'reimbursable');
  const excessTotal = totalsByCurrency(rows, 'excess');

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6">
        <View className="w-full max-w-md items-center rounded-3xl border border-border bg-surface p-8">
          <IconSymbol name="lock.fill" size={28} color={colors.warning} />
          <Text className="mt-4 text-xl font-bold text-foreground">{t('Sessão necessária')}</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted">{t('Entre com seu usuário para consultar o relatório de reembolso.')}</Text>
          <Pressable
            onPress={() => router.replace('/login')}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: 10,
              minHeight: 42,
              marginTop: 20,
              paddingHorizontal: 18,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text className="font-bold text-white">{t('Ir para login')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4">
      <View className="w-full max-w-7xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
            <Text className="mb-5 font-semibold text-primary">‹ {t('Voltar')}</Text>
          </Pressable>
          <Text className="text-sm font-medium text-muted">{t('Viajante · Prestação de contas')}</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">{t('Reembolso ao viajante')}</Text>
          <Text className="mt-2 max-w-3xl text-sm leading-5 text-muted">
            {t('O limite específico da cidade tem prioridade; quando não existe, o sistema aplica o perfil genérico. Valores em moedas diferentes são convertidos pela cotação diária registrada.')}
          </Text>

          <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t('Filtrar por viagem')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <FilterChip label={t('Todas')} selected={!tripId} onPress={() => setTripId(undefined)} colors={colors} />
              {trips.map((trip) => (
                <FilterChip
                  key={trip.id}
                  label={`${trip.tripCode} · ${trip.destination}`}
                  selected={tripId === trip.id}
                  onPress={() => setTripId(trip.id)}
                  colors={colors}
                />
              ))}
            </ScrollView>
          </View>

          {reportQuery.isLoading && (
            <View className="mt-6 flex-row items-center rounded-2xl border border-border bg-surface p-5">
              <ActivityIndicator color={colors.primary} />
              <Text className="ml-3 text-sm text-muted">{t('Carregando relatório...')}</Text>
            </View>
          )}

          {reportQuery.isError && (
            <View className="mt-6 rounded-2xl border border-error bg-surface p-5">
              <Text className="font-semibold text-error">{t('Não foi possível carregar o relatório.')}</Text>
              <Text className="mt-1 text-sm text-muted">{t('Verifique a API e tente novamente.')}</Text>
              <Pressable onPress={() => void reportQuery.refetch()} style={({ pressed }) => ({ marginTop: 12, alignSelf: 'flex-start', opacity: pressed ? 0.65 : 1 })}>
                <Text className="font-bold text-primary">{t('Tentar novamente')}</Text>
              </Pressable>
            </View>
          )}

          {!reportQuery.isLoading && !reportQuery.isError && (
            <>
              <View className={isNarrow ? 'mt-6 flex-row flex-wrap gap-3' : 'mt-6 flex-row gap-3'}>
                <View className={isNarrow ? 'w-[48%]' : 'flex-1'}>
                  <MetricCard label={t('Gasto informado')} value={spentTotal} accent={colors.primary} />
                </View>
                <View className={isNarrow ? 'w-[48%]' : 'flex-1'}>
                  <MetricCard label={t('A reembolsar')} value={reimbursableTotal} accent={colors.success} />
                </View>
                <View className={isNarrow ? 'w-[48%]' : 'flex-1'}>
                  <MetricCard label={t('Excedente')} value={excessTotal} accent={rows.some((row) => row.excess > 0) ? colors.warning : colors.success} />
                </View>
              </View>

              <Text className="mb-3 mt-8 text-base font-bold text-foreground">{t('Eventos de gasto')}</Text>
              {rows.length === 0 ? (
                <View className="rounded-2xl border border-border bg-surface p-6">
                  <Text className="text-sm text-muted">{t('Nenhum gasto persistido para os filtros selecionados.')}</Text>
                </View>
              ) : (
                <View className="rounded-2xl border border-border bg-surface p-2">
                  {rows.map((row) => (
                    <View key={row.id} className="border-b border-border p-4 last:border-b-0">
                      <View className="flex-row items-start justify-between">
                        <View className="min-w-0 flex-1">
                          <Text className="text-xs font-bold tracking-wider text-muted">{row.tripCode} · {row.date} · {row.city}</Text>
                          <Text className="mt-1 font-bold text-foreground">{row.expenseTypeName} · {t('quantidade')} {row.quantity}</Text>
                          <Text className="mt-1 text-xs text-muted">{t('Gasto informado')}: {formatCurrency(Number(row.sourceAmount), validCurrency(row.sourceCurrency))} · {t('Comparado em')}: {validCurrency(row.currency)}</Text>
                          <Text className="mt-1 text-xs text-muted">{t('Limite aplicado')}: {row.limit === null ? t('Não cadastrado') : formatCurrency(row.limit, validCurrency(row.currency))} · {row.profileCity ? `${t('Perfil')}: ${row.profileCity}` : t('Perfil genérico')}</Text>
                        </View>
                        <Text style={{ color: row.reimbursable > 0 ? colors.success : colors.muted }} className="font-bold">{formatCurrency(row.reimbursable, validCurrency(row.currency))}</Text>
                      </View>
                      <View className="mt-3 flex-row flex-wrap items-center justify-between gap-2">
                        <Text className="text-xs text-muted">{row.excess > 0 ? `${t('Excedente não reembolsável')}: ${formatCurrency(row.excess, validCurrency(row.currency))}` : t('Dentro do limite')}</Text>
                        <Text className="text-xs font-bold text-success">{row.conversionAvailable ? `${t('Cotação')}: ${row.rateDate ?? t('data não informada')}` : t('Cotação indisponível')}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <ReportExportActions title={t('Reembolso ao viajante')} filename={`relatorio-reembolso-${tripId ?? 'todas'}`} columns={exportColumns} rows={exportRows} />
              {hasConversionWarning && (
                <View className="mt-5 flex-row items-center rounded-2xl border border-warning/20 bg-warning/10 p-4">
                  <Text className="flex-1 text-sm leading-5 text-foreground">{t('Há eventos sem cotação histórica suficiente. Atualize o cadastro diário de moedas antes de concluir o fechamento.')}</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function FilterChip({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? colors.primary : colors.background,
        borderColor: selected ? colors.primary : colors.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: selected ? '#fff' : colors.foreground }} className="text-xs font-bold">{label}</Text>
    </Pressable>
  );
}
