import { Alert, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { MetricCard, SectionHeader } from '@/components/app-ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { formatCurrency, type Currency } from '@/lib/currency';
import { ReportExportActions } from '@/components/report-export-actions';
import type { ReportInfoLine, ReportRow } from '@/lib/report-export';
import { trpc } from '@/lib/trpc';

function validCurrency(value: string): Currency {
  return value === 'USD' || value === 'PYG' ? value : 'BRL';
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function periodRange(period: 'Período atual' | 'Mês anterior') {
  const now = new Date();
  const firstCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'Período atual') return { from: dateOnly(firstCurrent), to: dateOnly(now) };
  const firstPrevious = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastPrevious = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: dateOnly(firstPrevious), to: dateOnly(lastPrevious) };
}

type BillingRow = {
  id: number;
  tripId: number;
  tripCode: string;
  clientId: number | null;
  clientName: string;
  date: string;
  city: string;
  expenseTypeName: string;
  quantity: string;
  sourceAmount: string;
  sourceCurrency: string;
  currency: string;
  rate: number | null;
  spent: number;
  limit: number | null;
  difference: number;
  billable: number;
  rateDate: string | null;
  conversionAvailable: boolean;
};

type BillableFilter = 'all' | 'billable' | 'non-billable';

// Soma por moeda — junta valores de moedas diferentes lado a lado
// (ex.: "G$ 100.000 · US$ 50,00"), em vez de somar números de moedas
// diferentes como se fossem a mesma coisa.
function totalsByCurrency(rows: BillingRow[], field: 'spent' | 'limit' | 'difference' | 'billable', currencyField: 'currency' | 'sourceCurrency' = 'currency') {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    if (field === 'limit' && row.limit === null) return;
    const code = currencyField === 'sourceCurrency' ? row.sourceCurrency : row.currency;
    const value = currencyField === 'sourceCurrency' ? Number(row.sourceAmount) : Number(row[field] ?? 0);
    totals.set(code, (totals.get(code) ?? 0) + value);
  });
  return Array.from(totals.entries()).map(([code, value]) => formatCurrency(value, validCurrency(code))).join(' · ') || formatCurrency(0);
}

export default function ReportsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, loading, isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const isNarrow = width < 600;
  const [tripId, setTripId] = useState<number | undefined>();
  const [clientId, setClientId] = useState<number | undefined>();
  const [period, setPeriod] = useState<'Período atual' | 'Mês anterior'>('Período atual');
  const [billableFilter, setBillableFilter] = useState<BillableFilter>('all');
  const range = periodRange(period);
  const enabled = isAuthenticated && user?.role === 'admin';
  const tripsQuery = trpc.operations.trips.list.useQuery({ page: 1, pageSize: 100, direction: 'asc' }, { enabled });
  const clientsQuery = trpc.catalogs.clients.list.useQuery({ page: 1, pageSize: 100, direction: 'asc', includeInactive: false }, { enabled });
  // Só usado para preencher o bloco de dados da viagem no topo do
  // relatório (nome do viajante), quando o filtro está numa viagem só.
  const travelersQuery = trpc.catalogs.travelers.list.useQuery({ page: 1, pageSize: 100, direction: 'asc', includeInactive: false }, { enabled: enabled && Boolean(tripId) });
  const reportQuery = trpc.operations.reports.billing.useQuery({ page: 1, pageSize: 100, direction: 'asc', ...range, ...(tripId ? { tripId } : {}), ...(clientId ? { clientId } : {}) }, { enabled });
  const allRows = (reportQuery.data?.items ?? []) as BillingRow[];
  const rows = allRows.filter((row) => {
    if (billableFilter === 'billable') return row.billable > 0;
    if (billableFilter === 'non-billable') return row.billable <= 0;
    return true;
  });
  const trips = tripsQuery.data?.items ?? [];
  const clients = clientsQuery.data?.items ?? [];
  const travelers = travelersQuery.data?.items ?? [];
  const selectedTrip = tripId ? trips.find((trip) => trip.id === tripId) : undefined;
  const selectedTraveler = selectedTrip ? travelers.find((traveler) => traveler.id === (selectedTrip as any).travelerId) : undefined;
  const hasConversionWarning = rows.some((row) => !row.conversionAvailable);
  const closingBlocked = hasConversionWarning || reportQuery.isLoading || rows.length === 0;
  const closeBilling = () => {
    if (closingBlocked) {
      Alert.alert(t('Fechamento bloqueado'), hasConversionWarning ? t('Corrija ou cadastre as cotações históricas pendentes antes de fechar o faturamento.') : t('Não há lançamentos prontos para fechar neste período.'));
      return;
    }
    Alert.alert(t('Fechamento validado'), t('O período foi validado com as cotações disponíveis e está pronto para a etapa de emissão.'));
  };
  const totalSourceSpent = totalsByCurrency(rows, 'spent', 'sourceCurrency');
  const totalSpent = totalsByCurrency(rows, 'spent');
  const totalLimit = totalsByCurrency(rows, 'limit');
  const totalBillable = totalsByCurrency(rows, 'billable');
  const totalDifference = totalsByCurrency(rows, 'difference');

  // Bloco de dados da viagem — só faz sentido quando o relatório está
  // filtrado por uma única viagem (senão seria uma mistura de várias
  // viagens diferentes no mesmo cabeçalho, o que não tem sentido).
  const infoLines: ReportInfoLine[] | undefined = selectedTrip ? [
    { label: t('Viagem'), value: `${selectedTrip.tripCode} · ${selectedTrip.destination}` },
    { label: t('Viajante'), value: selectedTraveler?.name ?? t('Não informado') },
    { label: t('Data Início Viagem'), value: selectedTrip.startsOn },
    { label: t('Data Fim Viagem'), value: selectedTrip.endsOn },
  ] : undefined;

  const exportColumns = [
    { key: 'trip', label: t('Viagem / Cliente') },
    { key: 'date', label: t('Data') },
    { key: 'concept', label: t('Conceito') },
    { key: 'quantity', label: t('Quantidade') },
    { key: 'sourceSpent', label: t('Gasto') },
    { key: 'rate', label: t('Taxa da Moeda no dia') },
    { key: 'spent', label: t('Gasto Convertido') },
    { key: 'limit', label: t('Limite faturável') },
    { key: 'difference', label: t('Diferença') },
    { key: 'billable', label: t('A faturar') },
  ];
  const exportRows: ReportRow[] = rows.map((row) => ({
    trip: `${row.tripCode} · ${row.clientName}`,
    date: row.date,
    concept: row.expenseTypeName,
    quantity: row.quantity,
    sourceSpent: formatCurrency(Number(row.sourceAmount), validCurrency(row.sourceCurrency)),
    rate: row.rate == null ? '—' : row.rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
    spent: formatCurrency(row.spent, validCurrency(row.currency)),
    limit: row.limit === null ? t('Sem limite cadastrado') : formatCurrency(row.limit, validCurrency(row.currency)),
    difference: formatCurrency(row.difference, validCurrency(row.currency)),
    billable: formatCurrency(row.billable, validCurrency(row.currency)),
  }));
  // Linha de somatório — pedida especificamente para Gasto, Gasto
  // Convertido, Diferença e A Faturar (as demais colunas ficam em branco).
  const summaryRow: ReportRow = {
    trip: t('TOTAL DO PERÍODO SELECIONADO'),
    date: '', concept: '', quantity: '', rate: '',
    sourceSpent: totalSourceSpent,
    spent: totalSpent,
    limit: '',
    difference: totalDifference,
    billable: totalBillable,
  };

  if (loading) return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center"><Text className="text-muted">{t('Carregando...')}</Text></ScreenContainer>;
  if (!isAuthenticated || !user) return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6"><View className="w-full max-w-md items-center rounded-3xl border border-border bg-surface p-8"><IconSymbol name="lock.fill" size={28} color={colors.warning} /><Text className="mt-4 text-xl font-bold text-foreground">{t('Sessão necessária')}</Text><Text className="mt-2 text-center text-sm leading-5 text-muted">{t('Entre com seu usuário para consultar o relatório.')}</Text><Pressable onPress={() => router.replace('/login')} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, marginTop: 20, paddingHorizontal: 18, paddingVertical: 12, opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Ir para login')}</Text></Pressable></View></ScreenContainer>;
  if (user.role !== 'admin') return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6"><View className="w-full max-w-md items-center rounded-3xl border border-border bg-surface p-8"><Text className="text-xl font-bold text-foreground">{t('Relatório restrito')}</Text><Text className="mt-2 text-center text-sm leading-5 text-muted">{t('Este relatório contém valores de faturamento ao cliente e está disponível somente para o perfil Administrativo.')}</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, marginTop: 20, paddingHorizontal: 18, paddingVertical: 12, opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable></View></ScreenContainer>;

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><View className="w-full max-w-7xl flex-1 self-center"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar')}</Text></Pressable><Text className="text-sm font-medium text-muted">{t('Administrativo · Relatório financeiro')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{t('Relatório de faturamento')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Valores persistidos por viagem e cliente, convertidos pela cotação registrada na data do gasto.')}</Text><View className="mt-6 rounded-2xl border border-border bg-surface p-4"><Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t('Filtros do relatório')}</Text><Text className="mb-2 mt-2 text-xs font-semibold text-muted">{t('Período')}</Text><View className="flex-row gap-2"><FilterChip label={t('Período atual')} selected={period === 'Período atual'} onPress={() => setPeriod('Período atual')} /><FilterChip label={t('Mês anterior')} selected={period === 'Mês anterior'} onPress={() => setPeriod('Mês anterior')} /></View><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Tipos de gasto')}</Text><View className="flex-row flex-wrap gap-2"><FilterChip label={t('Todos os gastos')} selected={billableFilter === 'all'} onPress={() => setBillableFilter('all')} /><FilterChip label={t('Faturáveis')} selected={billableFilter === 'billable'} onPress={() => setBillableFilter('billable')} /><FilterChip label={t('Não faturáveis')} selected={billableFilter === 'non-billable'} onPress={() => setBillableFilter('non-billable')} /></View><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Viagem')}</Text><CatalogSearch value={tripId ?? null} options={trips.map((trip) => ({ id: trip.id, label: `${trip.tripCode} · ${trip.destination}` }))} placeholder={t('Pesquisar viagem (vazio = todas)')} emptyLabel={t('Nenhuma viagem encontrada')} onChange={(value) => setTripId(value !== null ? Number(value) : undefined)} /><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Cliente')}</Text><CatalogSearch value={clientId ?? null} options={clients.map((client) => ({ id: client.id, label: client.name }))} placeholder={t('Pesquisar cliente (vazio = todos)')} emptyLabel={t('Nenhum cliente encontrado')} onChange={(value) => setClientId(value !== null ? Number(value) : undefined)} /></View>{selectedTrip ? <View className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4"><Text className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{t('Dados da viagem')}</Text><View className="flex-row flex-wrap gap-x-8 gap-y-2"><InfoField label={t('Viajante')} value={selectedTraveler?.name ?? t('Não informado')} /><InfoField label={t('Data Início Viagem')} value={selectedTrip.startsOn} /><InfoField label={t('Data Fim Viagem')} value={selectedTrip.endsOn} /></View></View> : null}<View className={isNarrow ? 'mt-6 flex-row flex-wrap gap-3' : 'mt-6 flex-row gap-3'}>{/* Mantém MetricCard (não KpiCard) aqui de propósito: quando o período tem
          lançamentos em mais de uma moeda, o total vira uma string longa tipo
          "R$ 15.230,50 · US$ 1.200,00", e o KpiCard trunca em 1 linha — o que
          cortaria um valor financeiro. MetricCard permite quebrar linha. */}
          <View className={isNarrow ? 'w-[48%]' : 'flex-1'}><MetricCard label={t('Total de gastos')} value={totalSpent} accent={colors.primary} /></View><View className={isNarrow ? 'w-[48%]' : 'flex-1'}><MetricCard label={t('Limite faturável')} value={totalLimit} accent={colors.success} /></View><View className={isNarrow ? 'w-[48%]' : 'flex-1'}><MetricCard label={t('Total a faturar')} value={totalBillable} accent={colors.success} /></View><View className={isNarrow ? 'w-[48%]' : 'flex-1'}><MetricCard label={t('Diferença')} value={totalDifference} accent={colors.error} /></View></View>{hasConversionWarning ? <View className="mt-5 flex-row items-center rounded-2xl border border-warning/30 bg-warning/10 p-4"><IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.warning} /><Text className="ml-3 flex-1 text-sm leading-5 text-foreground">{t('Há lançamentos sem cotação histórica disponível. Eles foram mantidos na moeda de origem e precisam de revisão antes do fechamento.')}</Text></View> : null}<SectionHeader title={`${t('Detalhamento do período')} · ${t(period)}`} /><ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: 6 }}><View style={{ borderTopWidth: 3, borderTopColor: colors.primary }} className="min-w-[1280px] overflow-hidden rounded-2xl border border-border bg-surface"><View className="flex-row bg-background px-4 py-3"><Header label={t('Viagem / Cliente')} width="w-[16%]" /><Header label={t('Data')} width="w-[8%]" /><Header label={t('Conceito')} width="w-[12%]" /><Header label={t('Qtd.')} width="w-[5%]" /><Header label={t('Gasto')} width="w-[11%]" /><Header label={t('Taxa da Moeda no dia')} width="w-[10%]" /><Header label={t('Gasto Convertido')} width="w-[11%]" /><Header label={t('Limite faturável')} width="w-[11%]" /><Header label={t('Diferença')} width="w-[8%]" /><Header label={t('A faturar')} width="w-[8%]" /></View>{rows.map((row) => <View key={row.id} className="flex-row border-t border-border px-4 py-4"><View className="w-[16%]"><Text className="text-xs font-bold text-foreground">{row.tripCode}</Text><Text className="mt-1 text-[10px] text-muted">{row.clientName}</Text></View><Text className="w-[8%] text-xs text-foreground">{row.date}</Text><Text className="w-[12%] text-xs text-foreground">{row.expenseTypeName}</Text><Text className="w-[5%] text-xs text-foreground">{row.quantity}</Text><Text className="w-[11%] text-xs text-foreground">{formatCurrency(Number(row.sourceAmount), validCurrency(row.sourceCurrency))}</Text><Text className="w-[10%] text-xs text-muted">{row.rate == null ? '—' : row.rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</Text><Text className="w-[11%] text-xs font-bold text-foreground">{formatCurrency(row.spent, validCurrency(row.currency))}</Text><Text className="w-[11%] text-xs text-foreground">{row.limit === null ? '—' : formatCurrency(row.limit, validCurrency(row.currency))}</Text><Text style={{ color: row.difference > 0 ? colors.error : colors.success }} className="w-[8%] text-xs font-semibold">{row.difference > 0 ? `+${formatCurrency(row.difference, validCurrency(row.currency))}` : formatCurrency(row.difference, validCurrency(row.currency))}</Text><Text style={{ color: row.billable > 0 ? colors.success : colors.muted }} className="w-[8%] text-xs font-bold">{formatCurrency(row.billable, validCurrency(row.currency))}</Text></View>)}{rows.length === 0 ? <View className="px-4 py-6"><Text className="text-sm text-muted">{t('Nenhum lançamento para os filtros selecionados.')}</Text></View> : null}<View className="flex-row border-t-2 border-primary bg-primary/10 px-4 py-4"><Text className="w-[41%] text-xs font-bold text-foreground">{t('TOTAL DO PERÍODO SELECIONADO')}</Text><Text className="w-[11%] text-xs font-bold text-foreground">{totalSourceSpent}</Text><Text className="w-[10%] text-xs text-foreground"> </Text><Text className="w-[11%] text-xs font-bold text-foreground">{totalSpent}</Text><Text className="w-[11%] text-xs font-bold text-foreground">{totalLimit}</Text><Text className="w-[8%] text-xs font-bold text-foreground">{totalDifference}</Text><Text className="w-[8%] text-xs font-bold text-primary">{totalBillable}</Text></View></View></ScrollView><View className="mt-5 flex-row items-center rounded-2xl border border-primary/20 bg-primary/10 p-4"><IconSymbol name="chart.bar.fill" size={20} color={colors.primary} /><Text className="ml-3 flex-1 text-sm leading-5 text-foreground">{t('O valor a faturar considera o menor valor entre o gasto convertido e o limite definido para o cliente. Se não houver limite cadastrado, o gasto convertido é mantido para revisão administrativa.')}</Text></View><Pressable onPress={closeBilling} style={({ pressed }) => ({ backgroundColor: closingBlocked ? colors.border : colors.primary, borderRadius: 14, minHeight: 48, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.72 : 1 })}><Text className="font-bold text-white">{closingBlocked ? t('Fechamento bloqueado') : t('Validar fechamento do período')}</Text></Pressable><ReportExportActions title={t('Relatório de faturamento')} filename={`relatorio-faturamento-${period}`} columns={exportColumns} rows={exportRows} infoLines={infoLines} summaryRow={summaryRow} /></ScrollView></View></ScreenContainer>;
}

function Header({ label, width }: { label: string; width: string }) { return <Text className={`${width} text-[10px] font-bold uppercase text-muted`}>{label}</Text>; }
function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { const colors = useColors(); return <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: selected ? colors.primary : colors.background, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.7 : 1 })} className="rounded-xl border px-3 py-2"><Text style={{ color: selected ? '#fff' : colors.foreground }} className="text-xs font-bold">{label}</Text></Pressable>; }
function InfoField({ label, value }: { label: string; value: string }) { const colors = useColors(); return <View><Text className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</Text><Text style={{ color: colors.foreground }} className="mt-0.5 text-sm font-bold">{value}</Text></View>; }

// Padrão de "digitar e buscar" usado em todos os campos de cadastro
// vinculado do sistema (mesma lógica de new-trip.tsx e expenses.tsx).
// value === null representa "todas/todos" (sem filtro selecionado).
function CatalogSearch({ value, options, placeholder, emptyLabel, onChange }: { value: number | string | null; options: { id: number | string; label: string }[]; placeholder: string; emptyLabel: string; onChange: (value: number | string | null) => void }) {
  const colors = useColors();
  const selected = options.find((option) => option.id === value);
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = options.filter((option) => option.label.toLocaleLowerCase().includes(normalized)).slice(0, 8);
  return (
    <View className="gap-2">
      <View className="flex-row items-center rounded-2xl border border-border bg-surface px-4">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={selected && !query ? selected.label : placeholder}
          placeholderTextColor={colors.muted}
          className="flex-1 py-4 text-foreground"
        />
        <Text className="text-lg text-muted">⌕</Text>
      </View>
      {query.trim() ? (
        filtered.length ? (
          filtered.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => { onChange(option.id); setQuery(''); }}
              style={({ pressed }) => ({
                borderColor: value === option.id ? colors.primary : colors.border,
                backgroundColor: value === option.id ? `${colors.primary}14` : colors.surface,
                opacity: pressed ? 0.72 : 1,
              })}
              className="w-full rounded-xl border px-4 py-3"
            >
              <Text style={{ color: value === option.id ? colors.primary : colors.foreground }} className="text-sm font-semibold">{option.label}</Text>
            </Pressable>
          ))
        ) : (
          <Text className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">{emptyLabel}</Text>
        )
      ) : selected ? (
        <View className="flex-row items-center rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
          <Text className="flex-1 text-sm font-semibold text-primary">{selected.label}</Text>
          <Pressable onPress={() => { onChange(null); setQuery(''); }}><Text className="text-sm font-bold text-primary">×</Text></Pressable>
        </View>
      ) : null}
    </View>
  );
}
