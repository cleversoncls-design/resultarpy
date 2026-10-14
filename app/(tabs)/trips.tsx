import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { DimensionValue } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { ActionButton, ActionButtonFace, ChoiceCheckboxes, KpiCard, PrimaryButton, SectionHeader, StatusPill, statusTone } from '@/components/app-ui';
import { CalendarModal } from '@/components/calendar-field';
import { formatCurrency } from '@/lib/currency';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';
import { useCurrency } from '@/lib/currency-provider';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';
import { formatDateLoose } from '@/lib/date-utils';

// Categorias reais do enum trip_status (drizzle/schema.ts) — o protótipo
// usava rótulos genéricos (Em andamento/Concluída/Cancelada) que não
// existem de verdade no app; os filtros e o painel de KPIs abaixo usam só
// os status que a viagem realmente pode ter.
const TRIP_STATUSES = ['Rascunho', 'Aguardando aprovação', 'Aprovada', 'Em preparação', 'Liberada para viagem', 'Em prestação', 'Finalizada', 'Rejeitada', 'Devolvida', 'Cancelada'] as const;
const IN_PROGRESS_STATUSES = ['Aprovada', 'Em preparação', 'Liberada para viagem', 'Em prestação'];

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
    {query.trim() ? (filtered.length ? <View className="gap-1">{filtered.map((option) => <Pressable key={option.id} onPress={() => { onChange(option.id); setQuery(''); }} style={({ pressed }) => ({ borderColor: value === option.id ? colors.primary : colors.border, backgroundColor: value === option.id ? `${colors.primary}14` : colors.surface, opacity: pressed ? 0.72 : 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 })}><Text style={{ color: value === option.id ? colors.primary : colors.foreground }} className="text-xs font-semibold">{option.label}</Text></Pressable>)}</View> : <Text className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">{emptyLabel}</Text>) : selected ? <View className="flex-row items-center rounded-lg border border-primary/40 bg-primary/5 px-3 py-2"><Text className="flex-1 text-xs font-semibold text-primary">{selected.label}</Text><Pressable onPress={() => { onChange(null); setQuery(''); }}><Text className="text-sm font-bold text-primary">×</Text></Pressable></View> : null}
  </View>;
}

type SortKey = 'code' | 'destination' | 'status' | 'startDate' | 'clientName' | 'travelerName';

// Larguras das colunas da tabela (cabeçalho e linhas usam as mesmas). Aplicadas
// via style em <View>: className em <Pressable> não aplica largura de forma
// confiável, o que desalinhava as colunas.
const COL = { code: '11%', destination: '17%', status: '14%', period: '14%', client: '15%', traveler: '15%', actions: '14%' } as const;

// Cabeçalho de coluna clicável: alterna crescente/decrescente e mostra a seta
// só na coluna ordenada.
function Th({ label, width, active, dir, onPress }: { label: string; width: DimensionValue; active?: boolean; dir?: 'asc' | 'desc'; onPress?: () => void }) {
  const colors = useColors();
  const text = <Text style={{ color: active ? colors.foreground : colors.muted }} className="text-[10.5px] font-extrabold uppercase tracking-wide" numberOfLines={1}>{label}{active ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</Text>;
  return <View style={{ width, paddingRight: 8 }}>{onPress ? <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>{text}</Pressable> : text}</View>;
}

// Campo de data que abre o calendário de apoio (mesmo CalendarModal usado nas
// outras telas); o valor é ISO (AAAA-MM-DD) e o ✕ limpa o filtro.
function DateFilterField({ value, placeholder, onOpen, onClear }: { value: string; placeholder: string; onOpen: () => void; onClear: () => void }) {
  const colors = useColors();
  return <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
    <Pressable onPress={onOpen} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, flex: 1, flexDirection: 'row', alignItems: 'center' })}><Text style={{ color: value ? colors.foreground : colors.muted, flex: 1 }} className="text-sm">{value ? formatDateLoose(value) : placeholder}</Text><Text className="text-lg text-primary">▣</Text></Pressable>
    {value ? <Pressable onPress={onClear} accessibilityLabel="Limpar" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginLeft: 12 })}><Text style={{ color: colors.muted }} className="text-sm font-bold">✕</Text></Pressable> : null}
  </View>;
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
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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

  const periodStartIso = periodStart;
  const periodEndIso = periodEnd;
  const unsortedRows = useMemo(() => rows.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false;
    if (clientFilter && row.clientName !== clientFilter) return false;
    if (periodStartIso && row.startDate < periodStartIso) return false;
    if (periodEndIso && row.endDate > periodEndIso) return false;
    if (search.trim()) {
      const needle = search.trim().toLocaleLowerCase();
      const haystack = `${row.code} ${row.destination} ${row.clientName ?? ''} ${row.travelerName ?? ''}`.toLocaleLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }), [rows, statusFilter, clientFilter, periodStartIso, periodEndIso, search]);

  // Ordenação pelos cabeçalhos da tabela. Status segue a ordem do fluxo da
  // viagem (não alfabética); os demais campos usam ordenação natural.
  const filteredRows = useMemo(() => {
    if (!sortKey) return unsortedRows;
    const factor = sortDir === 'asc' ? 1 : -1;
    const valueOf = (row: (typeof unsortedRows)[number]): string | number => sortKey === 'status' ? TRIP_STATUSES.indexOf(row.status as (typeof TRIP_STATUSES)[number]) : String(row[sortKey] ?? '');
    return [...unsortedRows].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * factor;
    });
  }, [unsortedRows, sortKey, sortDir]);
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

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
      <ChoiceCheckboxes value={statusFilter ?? ''} onChange={(value) => setStatusFilter(value || null)} options={[{ value: '', label: t('Todos os status') }, ...TRIP_STATUSES.map((status) => ({ value: status as string, label: t(status) }))]} />
      <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Cliente')}</Text>
      <CatalogSearch value={clientFilter} options={clientOptions} placeholder={t('Pesquisar cliente (vazio = todos)')} emptyLabel={t('Nenhum cliente encontrado nas viagens listadas')} onChange={setClientFilter} />
      <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Período')}</Text>
      <View className="flex-row gap-2"><DateFilterField value={periodStart} placeholder={t('Início (DD/MM/AAAA)')} onOpen={() => setShowStartCalendar(true)} onClear={() => setPeriodStart('')} /><DateFilterField value={periodEnd} placeholder={t('Fim (DD/MM/AAAA)')} onOpen={() => setShowEndCalendar(true)} onClear={() => setPeriodEnd('')} /></View>
      {!isDesktop ? <>
        <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Ordenar por')}</Text>
        <ChoiceCheckboxes value={sortKey ?? ''} onChange={(value) => { setSortKey(value ? (value as SortKey) : null); setSortDir('asc'); }} options={[{ value: '', label: t('Padrão') }, { value: 'code', label: t('Código') }, { value: 'destination', label: t('Destino') }, { value: 'status', label: t('Status') }, { value: 'startDate', label: t('Período') }, { value: 'clientName', label: t('Cliente') }, { value: 'travelerName', label: t('Responsável') }]} />
        {sortKey ? <View className="mt-3"><ActionButton label={sortDir === 'asc' ? `▲ ${t('Crescente')}` : `▼ ${t('Decrescente')}`} onPress={() => setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))} /></View> : null}
      </> : null}
    </View>

    {isDesktop ? (
      <View className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <View className="flex-row bg-background px-4 py-3" style={{ borderLeftWidth: 3, borderLeftColor: 'transparent' }}>
          <Th label={t('Código')} width={COL.code} active={sortKey === 'code'} dir={sortDir} onPress={() => toggleSort('code')} />
          <Th label={t('Destino')} width={COL.destination} active={sortKey === 'destination'} dir={sortDir} onPress={() => toggleSort('destination')} />
          <Th label={t('Status')} width={COL.status} active={sortKey === 'status'} dir={sortDir} onPress={() => toggleSort('status')} />
          <Th label={t('Período')} width={COL.period} active={sortKey === 'startDate'} dir={sortDir} onPress={() => toggleSort('startDate')} />
          <Th label={t('Cliente')} width={COL.client} active={sortKey === 'clientName'} dir={sortDir} onPress={() => toggleSort('clientName')} />
          <Th label={t('Responsável')} width={COL.traveler} active={sortKey === 'travelerName'} dir={sortDir} onPress={() => toggleSort('travelerName')} />
          <Th label="" width={COL.actions} />
        </View>
        {filteredRows.map((row) => {
          const canEdit = /^\d+$/.test(row.id) && row.status !== 'Cancelada';
          const barColor = statusTone(row.status, colors).color;
          return <View key={row.id} className="flex-row items-center border-t border-border px-4 py-3.5" style={{ borderLeftWidth: 3, borderLeftColor: barColor }}>
            <View style={{ width: COL.code, paddingRight: 8 }}><Pressable onPress={() => openDetails(row.id)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-xs font-bold text-foreground" numberOfLines={1}>{row.code}</Text></Pressable></View>
            <View style={{ width: COL.destination, paddingRight: 8 }}><Pressable onPress={() => openDetails(row.id)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-xs text-foreground" numberOfLines={1}>{row.destination}</Text></Pressable></View>
            <View style={{ width: COL.status, paddingRight: 8 }}><StatusPill status={row.status} /></View>
            <View style={{ width: COL.period, paddingRight: 8 }}><Text className="text-xs text-foreground">{formatDateLoose(row.startDate)}</Text><Text className="mt-0.5 text-[11px] text-muted">{t('até')} {formatDateLoose(row.endDate)}</Text></View>
            <View style={{ width: COL.client, paddingRight: 8 }}><Text className="text-xs text-foreground" numberOfLines={1}>{row.clientName ?? t('Sem cliente')}</Text></View>
            <View style={{ width: COL.traveler, paddingRight: 8 }}><Text className="text-xs text-foreground" numberOfLines={1}>{row.travelerName ?? t('Não informado')}</Text></View>
            <View style={{ width: COL.actions, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', columnGap: 8 }}>
              <ActionButton tone="neutral" label={t('Abrir')} onPress={() => openDetails(row.id)} />
              {canEdit ? <ActionButton label={t('Editar')} onPress={() => router.push({ pathname: '/new-trip', params: { tripId: row.id } })} /> : null}
            </View>
          </View>;
        })}
        {filteredRows.length === 0 ? <View className="px-4 py-8"><Text className="text-sm text-muted">{t('Nenhuma viagem para os filtros selecionados.')}</Text></View> : null}
      </View>
    ) : (
      <View className="mt-4" style={{ gap: 12 }}>
        {filteredRows.map((item) => {
          const canEdit = /^\d+$/.test(item.id) && item.status !== 'Cancelada';
          const openItem = () => openDetails(item.id);
          return <View key={item.id} className="rounded-3xl border border-border bg-surface p-5"><View className="flex-row items-start justify-between"><Pressable onPress={openItem} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, flex: 1 })}><Text className="text-xs font-bold tracking-wider text-muted">{item.code}</Text><Text className="mt-2 text-xl font-bold text-foreground">{item.destination}</Text><Text className="mt-1 text-sm text-muted">{formatDateLoose(item.startDate)} — {formatDateLoose(item.endDate)}</Text></Pressable><View className="items-end"><StatusPill status={item.status} />{canEdit ? <View className="mt-3"><ActionButton label={t('Editar')} onPress={() => router.push({ pathname: '/new-trip', params: { tripId: item.id } })} /></View> : null}</View></View><View className="mt-5 flex-row border-t border-border pt-4"><View className="flex-1"><Text className="text-xs text-muted">{t('Cliente')}</Text><Text className="mt-1 text-sm font-semibold text-foreground">{item.clientName ?? t('Sem cliente')}</Text></View><View className="items-end"><Text className="text-xs text-muted">{t('Adiantamento')}</Text><Text className="mt-1 text-sm font-bold text-foreground">{item.hasAdvance ? formatCurrency(item.amount, currency) : t('Não solicitado')}</Text></View></View><Pressable onPress={openItem} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginTop: 16, flexDirection: 'row', alignItems: 'center' })}><IconSymbol name="airplane" size={16} color={colors.primary} /><Text className="ml-2 text-xs font-medium text-muted">{t(item.transport)}</Text><View className="ml-auto"><ActionButtonFace tone="neutral" label={t('Abrir detalhes ›')} /></View></Pressable></View>;
        })}
        {filteredRows.length === 0 ? <View><SectionHeader title={t('Nenhuma viagem')} /><PrimaryButton label={t('Criar solicitação')} onPress={() => router.push('/new-trip')} /></View> : null}
      </View>
    )}
  </ScrollView></View>
  <CalendarModal visible={showStartCalendar} onClose={() => setShowStartCalendar(false)} onSelect={(date) => { setPeriodStart(date); setShowStartCalendar(false); }} title={t('Data inicial')} value={periodStart} />
  <CalendarModal visible={showEndCalendar} onClose={() => setShowEndCalendar(false)} onSelect={(date) => { setPeriodEnd(date); setShowEndCalendar(false); }} title={t('Data final')} value={periodEnd} />
  </ScreenContainer>;
}
