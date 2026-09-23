import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { KpiCard, PrimaryButton, SectionHeader, StatusPill, statusTone } from '@/components/app-ui';
import { formatCurrency } from '@/lib/currency';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';
import { useCurrency } from '@/lib/currency-provider';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';

// Categorias reais do enum trip_status (drizzle/schema.ts) — o protótipo
// usava rótulos genéricos (Em andamento/Concluída/Cancelada) que não
// existem de verdade no app; os filtros e o painel de KPIs abaixo usam só
// os status que a viagem realmente pode ter.
const TRIP_STATUSES = ['Rascunho', 'Aguardando aprovação', 'Aprovada', 'Em preparação', 'Liberada para viagem', 'Em prestação', 'Finalizada', 'Rejeitada', 'Devolvida'] as const;
const IN_PROGRESS_STATUSES = ['Aprovada', 'Em preparação', 'Liberada para viagem', 'Em prestação'];

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: selected ? colors.primary : colors.background, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.75 : 1 })} className="rounded-xl border px-3 py-2"><Text style={{ color: selected ? '#fff' : colors.foreground }} className="text-xs font-bold">{label}</Text></Pressable>;
}

function CatalogSearch({ value, options, placeholder, emptyLabel, onChange }: { value: string | null; options: { id: string; label: string }[]; placeholder: string; emptyLabel: string; onChange: (value: string | null) => void }) {
  const colors = useColors();
  const selected = options.find((option) => option.id === value);
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = options.filter((option) => option.label.toLocaleLowerCase().includes(normalized)).slice(0, 8);
  return <View className="gap-2">
    <View className="flex-row items-center rounded-xl border border-border bg-surface px-3">
      <TextInput value={query} onChangeText={setQuery} placeholder={selected && !query ? selected.label : placeholder} placeholderTextColor={colors.muted} className="flex-1 py-2.5 text-sm text-foreground" />
      <Text className="text-base text-muted">⌕</Text>
    </View>
    {query.trim() ? (filtered.length ? <View className="gap-1">{filtered.map((option) => <Pressable key={option.id} onPress={() => { onChange(option.id); setQuery(''); }} style={({ pressed }) => ({ borderColor: value === option.id ? colors.primary : colors.border, backgroundColor: value === option.id ? `${colors.primary}14` : colors.surface, opacity: pressed ? 0.72 : 1 })} className="rounded-lg border px-3 py-2"><Text style={{ color: value === option.id ? colors.primary : colors.foreground }} className="text-xs font-semibold">{option.label}</Text></Pressable>)}</View> : <Text className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">{emptyLabel}</Text>) : selected ? <View className="flex-row items-center rounded-lg border border-primary/40 bg-primary/5 px-3 py-2"><Text className="flex-1 text-xs font-semibold text-primary">{selected.label}</Text><Pressable onPress={() => { onChange(null); setQuery(''); }}><Text className="text-sm font-bold text-primary">×</Text></Pressable></View> : null}
  </View>;
}

function Th({ label, width }: { label: string; width: string }) {
  const colors = useColors();
  return <Text style={{ color: colors.muted }} className={`${width} text-[10.5px] font-extrabold uppercase tracking-wide`}>{label}</Text>;
}

export default function TripsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const params = useLocalSearchParams<{ mine?: string }>();
  const mineOnly = params.mine === '1';
  const query = trpc.operations.trips.list.useQuery({ page: 1, pageSize: 50, direction: 'asc', mine: mineOnly }, { enabled: isAuthenticated });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const rows = useMemo(() => (query.data?.items ?? []).map((trip) => ({
    id: String(trip.id),
    code: trip.tripCode,
    destination: trip.destination,
    startDate: trip.startsOn,
    endDate: trip.endsOn,
    status: trip.status,
    clientName: trip.clientName,
    travelerName: trip.travelerName,
    amount: Number(trip.advanceAmount),
    hasAdvance: trip.hasAdvance,
    transport: trip.transport ?? t('Transporte não informado'),
  })), [query.data, t]);

  const clientOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.clientName).filter((name): name is string => Boolean(name)))).sort().map((name) => ({ id: name, label: name })), [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false;
    if (clientFilter && row.clientName !== clientFilter) return false;
    if (periodStart && row.startDate < periodStart) return false;
    if (periodEnd && row.endDate > periodEnd) return false;
    if (search.trim()) {
      const needle = search.trim().toLocaleLowerCase();
      const haystack = `${row.code} ${row.destination} ${row.clientName ?? ''} ${row.travelerName ?? ''}`.toLocaleLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }), [rows, statusFilter, clientFilter, periodStart, periodEnd, search]);

  const kpiAwaiting = rows.filter((row) => row.status === 'Aguardando aprovação').length;
  const kpiInProgress = rows.filter((row) => IN_PROGRESS_STATUSES.includes(row.status)).length;
  const kpiFinished = rows.filter((row) => row.status === 'Finalizada').length;
  const kpiReturnedRejected = rows.filter((row) => row.status === 'Rejeitada' || row.status === 'Devolvida').length;

  const openDetails = (id: string) => router.push({ pathname: '/trip-detail', params: { tripId: id } });

  return <ScreenContainer className="px-5 pt-4"><View className="w-full max-w-7xl flex-1 self-center"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
    <View className="mb-5 flex-row items-end justify-between"><View><Text className="text-sm font-medium text-muted">{t('Controle operacional')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{mineOnly ? t('Minhas viagens') : t('Todas as viagens')}</Text></View><Pressable onPress={() => router.push('/new-trip')} style={({ pressed }) => [{ backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]} className="h-11 w-11 items-center justify-center rounded-2xl"><IconSymbol name="plus" size={22} color="white" /></Pressable></View>

    <View className={width < 640 ? 'mb-6 flex-col gap-3' : 'mb-6 flex-row gap-3'}>
      <KpiCard label={t('Aguardando aprovação')} value={String(kpiAwaiting)} color={colors.warning} />
      <KpiCard label={t('Em andamento')} value={String(kpiInProgress)} color={colors.primary} />
      <KpiCard label={t('Finalizada')} value={String(kpiFinished)} color={colors.success} />
      <KpiCard label={t('Rejeitadas / Devolvidas')} value={String(kpiReturnedRejected)} color={colors.error} />
    </View>

    <View className="rounded-2xl border border-border bg-surface p-4">
      <Text style={{ color: colors.muted }} className="mb-3 text-xs font-bold uppercase tracking-widest">{t('Filtros')}</Text>
      <TextInput value={search} onChangeText={setSearch} placeholder={t('Buscar por código, destino, cliente ou responsável...')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="rounded-xl border px-4 py-3 text-sm" />
      <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Status')}</Text>
      <View className="flex-row flex-wrap gap-2"><FilterChip label={t('Todos os status')} selected={statusFilter === null} onPress={() => setStatusFilter(null)} />{TRIP_STATUSES.map((status) => <FilterChip key={status} label={t(status)} selected={statusFilter === status} onPress={() => setStatusFilter(status)} />)}</View>
      <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Cliente')}</Text>
      <CatalogSearch value={clientFilter} options={clientOptions} placeholder={t('Pesquisar cliente (vazio = todos)')} emptyLabel={t('Nenhum cliente encontrado nas viagens listadas')} onChange={setClientFilter} />
      <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Período')}</Text>
      <View className="flex-row gap-2"><TextInput value={periodStart} onChangeText={setPeriodStart} placeholder={t('Início (AAAA-MM-DD)')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="flex-1 rounded-xl border px-3 py-2.5 text-sm" /><TextInput value={periodEnd} onChangeText={setPeriodEnd} placeholder={t('Fim (AAAA-MM-DD)')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="flex-1 rounded-xl border px-3 py-2.5 text-sm" /></View>
    </View>

    {isDesktop ? (
      <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <View className="flex-row bg-background px-4 py-3"><Th label={t('Código')} width="w-[12%]" /><Th label={t('Destino')} width="w-[18%]" /><Th label={t('Status')} width="w-[15%]" /><Th label={t('Período')} width="w-[15%]" /><Th label={t('Cliente')} width="w-[16%]" /><Th label={t('Responsável')} width="w-[16%]" /><Th label="" width="w-[8%]" /></View>
        {filteredRows.map((row) => {
          const canEdit = /^\d+$/.test(row.id);
          const barColor = statusTone(row.status, colors).color;
          return <View key={row.id} className="flex-row items-center border-t border-border px-4 py-3.5" style={{ borderLeftWidth: 3, borderLeftColor: barColor }}>
            <Pressable onPress={() => openDetails(row.id)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="w-[12%]"><Text className="text-xs font-bold text-foreground" numberOfLines={1}>{row.code}</Text></Pressable>
            <Pressable onPress={() => openDetails(row.id)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="w-[18%] pr-2"><Text className="text-xs text-foreground" numberOfLines={1}>{row.destination}</Text></Pressable>
            <View className="w-[15%]"><StatusPill status={row.status} /></View>
            <View className="w-[15%]"><Text className="text-xs text-foreground">{row.startDate}</Text><Text className="mt-0.5 text-[11px] text-muted">{t('até')} {row.endDate}</Text></View>
            <Text className="w-[16%] pr-2 text-xs text-foreground" numberOfLines={1}>{row.clientName ?? t('Sem cliente')}</Text>
            <Text className="w-[16%] pr-2 text-xs text-foreground" numberOfLines={1}>{row.travelerName ?? t('Não informado')}</Text>
            <View className="w-[8%] items-end gap-1">
              <Pressable onPress={() => openDetails(row.id)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-xs font-bold text-primary">{t('Abrir')}</Text></Pressable>
              {canEdit ? <Pressable onPress={() => router.push({ pathname: '/new-trip', params: { tripId: row.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-[11px] font-semibold text-muted">{t('Editar')}</Text></Pressable> : null}
            </View>
          </View>;
        })}
        {filteredRows.length === 0 ? <View className="px-4 py-8"><Text className="text-sm text-muted">{t('Nenhuma viagem para os filtros selecionados.')}</Text></View> : null}
      </View>
    ) : (
      <View className="mt-4" style={{ gap: 12 }}>
        {filteredRows.map((item) => {
          const canEdit = /^\d+$/.test(item.id);
          const openItem = () => openDetails(item.id);
          return <View key={item.id} className="rounded-3xl border border-border bg-surface p-5"><View className="flex-row items-start justify-between"><Pressable onPress={openItem} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className="flex-1"><Text className="text-xs font-bold tracking-wider text-muted">{item.code}</Text><Text className="mt-2 text-xl font-bold text-foreground">{item.destination}</Text><Text className="mt-1 text-sm text-muted">{item.startDate} — {item.endDate}</Text></Pressable><View className="items-end"><StatusPill status={item.status} />{canEdit ? <Pressable onPress={() => router.push({ pathname: '/new-trip', params: { tripId: item.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} className="mt-3"><Text className="text-xs font-bold text-primary">{t('Editar')}</Text></Pressable> : null}</View></View><View className="mt-5 flex-row border-t border-border pt-4"><View className="flex-1"><Text className="text-xs text-muted">{t('Cliente')}</Text><Text className="mt-1 text-sm font-semibold text-foreground">{item.clientName ?? t('Sem cliente')}</Text></View><View className="items-end"><Text className="text-xs text-muted">{t('Adiantamento')}</Text><Text className="mt-1 text-sm font-bold text-foreground">{item.hasAdvance ? formatCurrency(item.amount, currency) : t('Não solicitado')}</Text></View></View><Pressable onPress={openItem} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} className="mt-4 flex-row items-center"><IconSymbol name="airplane" size={16} color={colors.primary} /><Text className="ml-2 text-xs font-medium text-muted">{t(item.transport)}</Text><Text className="ml-auto text-xs font-semibold text-primary">{t('Abrir detalhes ›')}</Text></Pressable></View>;
        })}
        {filteredRows.length === 0 ? <View><SectionHeader title={t('Nenhuma viagem')} /><PrimaryButton label={t('Criar solicitação')} onPress={() => router.push('/new-trip')} /></View> : null}
      </View>
    )}
  </ScrollView></View></ScreenContainer>;
}
