import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton, SecondaryButton } from '@/components/app-ui';
import { useColors } from '@/hooks/use-colors';
import { formatCurrency } from '@/lib/currency';
import { advancePlaceholder, formatMoneyInput, parseMoneyInput } from '@/lib/money-input';
import { useCurrency } from '@/lib/currency-provider';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/lib/language-provider';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';
import { formatDateDisplay, isIsoDate, normalizeDateValue } from '@/lib/date-utils';

type TripDraft = {
  tripCode: string;
  travelerId: number;
  approverId: number | null;
  clientId: number | null;
  unitId: number | null;
  origin: string;
  destination: string;
  country: string;
  area: string;
  transport: string;
  startsOn: string;
  endsOn: string;
  status: 'Rascunho' | 'Aguardando aprovação' | 'Aprovada' | 'Em preparação' | 'Liberada para viagem' | 'Em prestação' | 'Finalizada' | 'Rejeitada' | 'Devolvida';
  requiresFleetVehicle: boolean;
  hasAdvance: boolean;
  needsHotel: boolean;
  advanceAmount: string;
  flightDetails: { passengerName: string; passengerDocument: string; passengerBirthDate: string; airline: string; flightNumber: string; departureAirport: string; arrivalAirport: string };
  notes: string;
};

const defaultDraft: TripDraft = {
  tripCode: `TR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  travelerId: 0,
  approverId: null as number | null,
  clientId: null,
  unitId: null,
  origin: '',
  destination: '',
  country: '',
  area: '',
  transport: 'Veículo da frota',
  startsOn: '',
  endsOn: '',
  status: 'Aguardando aprovação' as const,
  requiresFleetVehicle: true,
  hasAdvance: false,
  needsHotel: false,
  advanceAmount: '0',
  flightDetails: { passengerName: '', passengerDocument: '', passengerBirthDate: '', airline: '', flightNumber: '', departureAirport: '', arrivalAirport: '' },
  notes: '',
};

export default function NewTripScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.profile === 'admin';
  const authenticatedTravelerName = user?.name?.trim() || user?.email?.trim() || '';
  const params = useLocalSearchParams<{ tripId?: string }>();
  const editId = typeof params.tripId === 'string' && /^\d+$/.test(params.tripId) ? Number(params.tripId) : undefined;
  const [draft, setDraft] = useState(defaultDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const tripQuery = trpc.operations.trips.get.useQuery({ id: editId as number }, { enabled: isAuthenticated && editId !== undefined });
  const clientsQuery = trpc.catalogs.clients.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const unitsQuery = trpc.catalogs.units.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const travelersQuery = trpc.catalogs.travelers.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const createTrip = trpc.operations.trips.create.useMutation();
  const updateTrip = trpc.operations.trips.update.useMutation();
  const isEditing = editId !== undefined;

  useEffect(() => {
    const trip = tripQuery.data;
    if (!trip) return;
    setDraft({
      tripCode: trip.tripCode,
      travelerId: trip.travelerId,
      approverId: trip.approverId,
      clientId: trip.clientId,
      unitId: trip.unitId,
      origin: trip.origin,
      destination: trip.destination,
      country: trip.country ?? '',
      area: trip.area ?? '',
      transport: trip.transport ?? 'Veículo da frota',
      startsOn: trip.startsOn,
      endsOn: trip.endsOn,
      status: trip.status,
      requiresFleetVehicle: trip.requiresFleetVehicle,
      hasAdvance: trip.hasAdvance,
      needsHotel: trip.needsHotel,
      advanceAmount: formatMoneyInput(trip.advanceAmount, currency),
      flightDetails: { passengerName: trip.flightDetails?.passengerName ?? '', passengerDocument: trip.flightDetails?.passengerDocument ?? '', passengerBirthDate: trip.flightDetails?.passengerBirthDate ?? '', airline: trip.flightDetails?.airline ?? '', flightNumber: trip.flightDetails?.flightNumber ?? '', departureAirport: trip.flightDetails?.departureAirport ?? '', arrivalAirport: trip.flightDetails?.arrivalAirport ?? '' },
      notes: trip.notes ?? '',
    });
  }, [currency, tripQuery.data]);

  useEffect(() => {
    const selectedTraveler = travelersQuery.data?.items.find((item) => item.id === draft.travelerId);
    if (!selectedTraveler?.birthDate || draft.flightDetails.passengerBirthDate) return;
    setDraft((current) => current.flightDetails.passengerBirthDate ? current : { ...current, flightDetails: { ...current.flightDetails, passengerBirthDate: normalizeDateValue(selectedTraveler.birthDate) ?? '' } });
  }, [draft.travelerId, draft.flightDetails.passengerBirthDate, travelersQuery.data?.items]);

  const setField = <K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const setFlightField = <K extends keyof TripDraft['flightDetails']>(field: K, value: TripDraft['flightDetails'][K]) => setDraft((current) => ({ ...current, flightDetails: { ...current.flightDetails, [field]: value } }));

  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [showBirthCalendar, setShowBirthCalendar] = useState(false);

  const submit = async () => {
    setSubmitError('');
    const failValidation = (title: string, message: string) => {
      setSubmitError(message);
      Alert.alert(title, message);
    };
    if (!draft.destination.trim()) {
      failValidation(t('Destino obrigatório'), t('Informe a cidade de destino para continuar.'));
      return;
    }
    if (draft.clientId === null || draft.unitId === null) {
      failValidation(t('Cadastro obrigatório'), t('Selecione um cliente e uma unidade cadastrados.'));
      return;
    }
    if (isAdmin && (!draft.travelerId || draft.travelerId <= 0)) {
      failValidation(t('Viajante obrigatório'), t('Selecione o viajante da solicitação.'));
      return;
    }
    if (!isIsoDate(draft.startsOn) || !isIsoDate(draft.endsOn) || draft.startsOn > draft.endsOn) {
      failValidation(t('Data inválida'), t('Use o formato AAAA-MM-DD para início e fim da viagem.'));
      return;
    }
    const selectedTraveler = travelersQuery.data?.items.find((item) => item.id === draft.travelerId);
    const passengerName = selectedTraveler?.name?.trim() || authenticatedTravelerName || draft.flightDetails.passengerName.trim();
    const normalizedPassengerBirthDate = normalizeDateValue(draft.flightDetails.passengerBirthDate || user?.birthDate || '');
    if (draft.transport === 'Passagem aérea' && (!passengerName || !draft.flightDetails.passengerDocument.trim() || !normalizedPassengerBirthDate)) {
      failValidation(t('Dados do passageiro obrigatórios'), t('Informe nome, documento e data de nascimento do passageiro usando o calendário.'));
      return;
    }
    const payload = {
      ...draft,
      origin: '',
      travelerId: draft.travelerId || undefined,
      advanceAmount: parseMoneyInput(draft.advanceAmount, currency),
      flightDetails: draft.transport === 'Passagem aérea' ? { ...draft.flightDetails, passengerName, passengerBirthDate: normalizedPassengerBirthDate ?? '', departureAirport: '', arrivalAirport: '' } : undefined,
    };
    if (!isAuthenticated) {
      Alert.alert(isEditing ? t('Alteração simulada') : t('Solicitação enviada'), isEditing ? t('No modo demonstrativo, a alteração será aplicada após conectar uma sessão.') : t('A viagem foi encaminhada ao aprovador da área.'), [{ text: t('Ver minhas viagens'), onPress: () => router.replace('/(tabs)/trips') }]);
      return;
    }
    setIsSaving(true);
    console.log('[new-trip] sending trip mutation', { isEditing, isAdmin, travelerId: draft.travelerId, clientId: draft.clientId, unitId: draft.unitId });
    try {
      if (isEditing) {
        await updateTrip.mutateAsync({ id: editId, ...payload });
        Alert.alert(t('Viagem atualizada'), t('As alterações foram salvas na solicitação.'), [{ text: t('Ver minhas viagens'), onPress: () => router.replace('/(tabs)/trips') }]);
      } else {
        await createTrip.mutateAsync(payload);
        Alert.alert(t('Solicitação enviada'), t('A viagem foi encaminhada ao aprovador da área.'), [{ text: t('Ver minhas viagens'), onPress: () => router.replace('/(tabs)/trips') }]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('Tente novamente.');
      setSubmitError(message);
      Alert.alert(t('Não foi possível salvar'), message);
    } finally {
      setIsSaving(false);
    }
  };

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-5"><Text className="font-semibold text-primary">‹ {t('Voltar')}</Text></Pressable><Text className="text-3xl font-bold text-foreground">{isEditing ? t('Editar viagem') : t('Nova solicitação')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{isEditing ? t('Atualize os dados da solicitação antes de reenviar para o fluxo operacional.') : t('Preencha os dados essenciais. Você poderá complementar a prestação depois.')}</Text><FormLabel text="Cidade de destino" /><TextInput value={draft.destination} onChangeText={(value) => setField('destination', value)} placeholder={t('Ex.: Asunción')} placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /><FormLabel text="Observações" /><TextInput value={draft.notes} onChangeText={(value) => setField('notes', value)} placeholder={t('Digite observações ou detalhes adicionais')} placeholderTextColor={colors.muted} multiline numberOfLines={4} textAlignVertical="top" className="min-h-[110px] rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /><View className="mt-5 flex-row gap-3"><View className="flex-1"><FormLabel text="Início" /><Pressable onPress={() => setShowStartCalendar(true)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className="flex-row items-center rounded-2xl border border-border bg-surface px-4 py-4"><Text className={draft.startsOn ? 'flex-1 text-foreground' : 'flex-1 text-muted'}>{formatDateDisplay(draft.startsOn) || 'dd/mm/aaaa'}</Text><Text className="text-lg text-primary">▣</Text></Pressable></View><View className="flex-1"><FormLabel text="Fim" /><Pressable onPress={() => setShowEndCalendar(true)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className="flex-row items-center rounded-2xl border border-border bg-surface px-4 py-4"><Text className={draft.endsOn ? 'flex-1 text-foreground' : 'flex-1 text-muted'}>{formatDateDisplay(draft.endsOn) || 'dd/mm/aaaa'}</Text><Text className="text-lg text-primary">▣</Text></Pressable></View></View><FormLabel text="Área responsável" /><TextInput value={draft.area} onChangeText={(value) => setField('area', value)} placeholder={t('Digite a área responsável')} placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" />{isAdmin && <><FormLabel text="Viajante" /><CatalogSearch value={draft.travelerId || null} options={(travelersQuery.data?.items ?? []).map((item) => ({ id: item.id, label: item.name }))} placeholder={t('Pesquisar viajante')} emptyLabel={t('Nenhum viajante cadastrado')} onChange={(value) => setField('travelerId', value ?? 0)} /></>}{!isAdmin && user && <><FormLabel text="Solicitante" /><View className="rounded-2xl border border-border bg-surface px-4 py-4"><Text className="text-foreground">{authenticatedTravelerName}</Text><Text className="mt-1 text-xs text-muted">{t('Usuário autenticado; não pode ser alterado nesta solicitação.')}</Text></View></>}<FormLabel text="Unidade de atendimento" /><CatalogSearch value={draft.unitId} options={(unitsQuery.data?.items ?? []).map((item) => ({ id: item.id, label: item.name }))} placeholder={t('Pesquisar unidade')} emptyLabel={t('Nenhuma unidade cadastrada')} onChange={(value) => setField('unitId', value)} /><FormLabel text="Cliente" /><CatalogSearch value={draft.clientId} options={(clientsQuery.data?.items ?? []).map((item) => ({ id: item.id, label: item.name }))} placeholder={t('Pesquisar cliente')} emptyLabel={t('Nenhum cliente cadastrado')} onChange={(value) => setField('clientId', value)} /><FormLabel text="Meio de transporte" /><CatalogChoice value={draft.transport} options={['Veículo da frota', 'Veículo próprio', 'Ônibus', 'Passagem aérea'].map((opt) => ({ id: opt, label: t(opt) }))} emptyLabel="" onChange={(value) => setDraft((current) => ({ ...current, transport: String(value), requiresFleetVehicle: value === 'Veículo da frota' }))} /><FormLabel text="Precisa hotel?" /><CatalogChoice value={draft.needsHotel ? 'Sim' : 'Não'} options={['Sim', 'Não'].map((opt) => ({ id: opt, label: t(opt) }))} emptyLabel="" onChange={(value) => setField('needsHotel', value === 'Sim')} />{draft.transport === 'Passagem aérea' && <View className="mt-5 rounded-3xl border border-border bg-surface p-5"><Text className="mb-4 text-lg font-bold text-foreground">{t('Dados do passageiro')}</Text><TextInput value={draft.flightDetails.passengerDocument} onChangeText={(v) => setFlightField('passengerDocument', v)} placeholder={t('Documento / Passaporte')} placeholderTextColor={colors.muted} className="mb-3 rounded-xl border border-border bg-background px-4 py-3 text-foreground" /><Pressable onPress={() => setShowBirthCalendar(true)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className="flex-row items-center rounded-xl border border-border bg-background px-4 py-3"><Text className={draft.flightDetails.passengerBirthDate ? 'flex-1 text-foreground' : 'flex-1 text-muted'}>{formatDateDisplay(draft.flightDetails.passengerBirthDate) || 'dd/mm/aaaa'}</Text><Text className="text-lg text-primary">▣</Text></Pressable></View>}<FormLabel text="Adiantamento" /><View className="flex-row gap-3"><Pressable onPress={() => setDraft((current) => ({ ...current, hasAdvance: true }))} style={({ pressed }) => ({ backgroundColor: draft.hasAdvance ? `${colors.primary}14` : colors.surface, borderColor: draft.hasAdvance ? colors.primary : colors.border, opacity: pressed ? 0.72 : 1 })} className="flex-1 rounded-2xl border p-4"><Text className="font-bold text-foreground">{t('Sim')}</Text><View className="mt-2 flex-row items-center"><Text className="mr-1 text-sm font-medium text-muted">{currency}</Text><TextInput value={draft.advanceAmount} onChangeText={(v) => setField('advanceAmount', formatMoneyInput(v, currency))} keyboardType="numeric" placeholder={advancePlaceholder(currency)} placeholderTextColor={colors.muted} className="flex-1 text-sm font-bold text-foreground" /></View></Pressable><Pressable onPress={() => setDraft((current) => ({ ...current, hasAdvance: false }))} style={({ pressed }) => ({ backgroundColor: !draft.hasAdvance ? `${colors.primary}14` : colors.surface, borderColor: !draft.hasAdvance ? colors.primary : colors.border, opacity: pressed ? 0.72 : 1 })} className="flex-1 rounded-2xl border p-4"><Text className="font-bold text-foreground">{t('Não')}</Text><Text className="mt-1 text-xs text-muted">{t('Sem adiantamento')}</Text></Pressable></View>{submitError ? <View className="mt-4 rounded-2xl border border-error bg-error/10 px-4 py-3"><Text className="text-sm font-semibold text-error">{submitError}</Text></View> : null}<View className="mt-5 flex-row gap-3"><View className="flex-1"><SecondaryButton label={t('Salvar rascunho')} onPress={() => Alert.alert(t('Rascunho salvo'), t('A solicitação ficará disponível para continuar depois.'))} /></View><View className="flex-1"><PrimaryButton label={isSaving ? t('Salvando...') : isEditing ? t('Salvar alterações') : t('Enviar para aprovação')} onPress={() => void submit()} /></View></View></ScrollView><CalendarModal visible={showStartCalendar} onClose={() => setShowStartCalendar(false)} onSelect={(date) => { setField('startsOn', date); setShowStartCalendar(false); }} title={t('Data de início')} /><CalendarModal visible={showEndCalendar} onClose={() => setShowEndCalendar(false)} onSelect={(date) => { setField('endsOn', date); setShowEndCalendar(false); }} title={t('Data de fim')} /><CalendarModal visible={showBirthCalendar} onClose={() => setShowBirthCalendar(false)} onSelect={(date) => { setFlightField('passengerBirthDate', date); setShowBirthCalendar(false); }} title={t('Data de nascimento')} /></ScreenContainer>;
}

function FormLabel({ text }: { text: string }) { const { t } = useLanguage(); return <Text className="mb-2 mt-5 text-sm font-bold text-foreground">{t(text)}</Text>; }
function Select({ value }: { value: string }) { const colors = useColors(); const { t } = useLanguage(); return <View className="flex-row items-center rounded-2xl border border-border bg-surface px-4 py-4"><Text className="flex-1 text-foreground">{t(value)}</Text><Text style={{ color: colors.primary }} className="text-lg">⌄</Text></View>; }
function CatalogSearch({ value, options, placeholder, emptyLabel, onChange }: { value: any; options: { id: any; label: string }[]; placeholder: string; emptyLabel: string; onChange: (value: any) => void }) { const colors = useColors(); const selected = options.find((option) => option.id === value); const [query, setQuery] = useState(''); const normalized = query.trim().toLocaleLowerCase(); const filtered = options.filter((option) => option.label.toLocaleLowerCase().includes(normalized)).slice(0, 8); return <View className="gap-2"><View className="flex-row items-center rounded-2xl border border-border bg-surface px-4"><TextInput value={query} onChangeText={setQuery} placeholder={selected && !query ? selected.label : placeholder} placeholderTextColor={colors.muted} className="flex-1 py-4 text-foreground" /><Text className="text-lg text-muted">⌕</Text></View>{query.trim() ? (filtered.length ? filtered.map((option) => <Pressable key={option.id} onPress={() => { onChange(option.id); setQuery(''); }} style={({ pressed }) => ({ borderColor: value === option.id ? colors.primary : colors.border, backgroundColor: value === option.id ? `${colors.primary}14` : colors.surface, opacity: pressed ? 0.72 : 1 })} className="w-full rounded-xl border px-4 py-3"><Text style={{ color: value === option.id ? colors.primary : colors.foreground }} className="text-sm font-semibold">{option.label}</Text></Pressable>) : <Text className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">{emptyLabel}</Text>) : selected ? <View className="flex-row items-center rounded-xl border border-primary/40 bg-primary/5 px-4 py-3"><Text className="flex-1 text-sm font-semibold text-primary">{selected.label}</Text><Pressable onPress={() => { onChange(null); setQuery(''); }}><Text className="text-sm font-bold text-primary">×</Text></Pressable></View> : null}</View>; }

function CatalogChoice({ value, options, emptyLabel, onChange }: { value: any; options: { id: any; label: string }[]; emptyLabel: string; onChange: (value: any) => void }) { const colors = useColors(); return <View className="gap-2">{options.length ? options.map((option) => <Pressable key={option.id} onPress={() => onChange(option.id)} style={({ pressed }) => ({ borderColor: value === option.id ? colors.primary : colors.border, backgroundColor: value === option.id ? `${colors.primary}14` : colors.surface, opacity: pressed ? 0.72 : 1 })} className="w-full rounded-xl border px-4 py-3"><View className="flex-row items-center"><View style={{ borderColor: value === option.id ? colors.primary : colors.border, backgroundColor: value === option.id ? colors.primary : 'transparent' }} className="mr-3 h-5 w-5 items-center justify-center rounded-full border">{value === option.id ? <IconSymbol name="checkmark" size={13} color="white" /> : null}</View><Text style={{ color: value === option.id ? colors.primary : colors.foreground }} className="text-sm font-semibold">{option.label}</Text></View></Pressable>) : <Text className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">{emptyLabel}</Text>}</View>; }

function CalendarModal({ visible, onClose, onSelect, title }: { visible: boolean; onClose: () => void; onSelect: (date: string) => void; title: string }) {
  const colors = useColors();
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const changeMonth = (offset: number) => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <View className="w-full max-w-sm rounded-3xl bg-background p-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">{title}</Text>
            <Pressable onPress={onClose}><IconSymbol name="xmark" size={20} color={colors.muted} /></Pressable>
          </View>
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable onPress={() => changeMonth(-1)} className="p-2"><Text style={{ color: colors.primary }} className="text-xl font-bold">‹</Text></Pressable>
            <Text className="font-bold text-foreground">{t(monthNames[currentMonth.getMonth()])} {currentMonth.getFullYear()}</Text>
            <Pressable onPress={() => changeMonth(1)} className="p-2"><Text style={{ color: colors.primary }} className="text-xl font-bold">›</Text></Pressable>
          </View>
          <View className="flex-row flex-wrap">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <View key={i} className="w-[14.28%] items-center py-2"><Text className="text-xs font-bold text-muted">{d}</Text></View>)}
            {blanks.map((i) => <View key={`b-${i}`} className="w-[14.28%] py-2" />)}
            {days.map((d) => {
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              return (
                <Pressable key={d} onPress={() => onSelect(dateStr)} className="w-[14.28%] items-center py-2">
                  <View className="h-8 w-8 items-center justify-center rounded-full border border-transparent active:bg-primary/10">
                    <Text className="text-sm text-foreground">{d}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
