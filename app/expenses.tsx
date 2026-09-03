import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton, SecondaryButton, StatusPill } from '@/components/app-ui';
import { CURRENCY_OPTIONS, formatCurrency, type Currency } from '@/lib/currency';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { useCurrency } from '@/lib/currency-provider';
import { trpc } from '@/lib/trpc';
import { isValidExpenseForm } from '@/lib/expense-form';

function validExpenseCurrency(value: string): Currency {
  return value === 'USD' || value === 'PYG' ? value : 'BRL';
}

type ExpenseDraft = {
  tripId: number;
  expenseTypeId: number;
  occurredOn: string;
  city: string;
  quantity: string;
  unitValue: string;
  currency: Currency;
  expenseGroup: string;
  prepaid: boolean;
  billable: boolean;
};

const defaultDraft: ExpenseDraft = {
  tripId: 0,
  expenseTypeId: 0,
  occurredOn: '',
  city: '',
  quantity: '1',
  unitValue: '',
  currency: 'BRL',
  expenseGroup: 'Viáticos',
  prepaid: true,
  billable: true,
};

export default function ExpensesScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ expenseId?: string; tripId?: string }>();
  const editId = typeof params.expenseId === 'string' && /^\d+$/.test(params.expenseId) ? Number(params.expenseId) : undefined;
  const routeTripId = typeof params.tripId === 'string' && /^\d+$/.test(params.tripId) ? Number(params.tripId) : undefined;
  const [showForm, setShowForm] = useState(editId !== undefined);
  const [draft, setDraft] = useState<ExpenseDraft>({ ...defaultDraft, ...(routeTripId ? { tripId: routeTripId } : {}) });
  const query = trpc.operations.expenses.list.useQuery({ page: 1, pageSize: 50, direction: 'desc' }, { enabled: isAuthenticated });
  const expenseTypesQuery = trpc.catalogs.expenseTypes.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const tripsQuery = trpc.operations.trips.list.useQuery({ page: 1, pageSize: 100, direction: 'asc' }, { enabled: isAuthenticated });
  const unitsQuery = trpc.catalogs.units.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const cities = Array.from(new Set((unitsQuery.data?.items ?? []).map((unit) => unit.city.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const expenseQuery = trpc.operations.expenses.get.useQuery({ id: editId as number }, { enabled: isAuthenticated && editId !== undefined });
  const createExpense = trpc.operations.expenses.create.useMutation();
  const updateExpense = trpc.operations.expenses.update.useMutation();
  const persistedExpenses = query.data?.items.map((expense) => ({
    id: String(expense.id),
    tripId: String(expense.tripId),
    date: expense.occurredOn,
    city: expense.city,
    client: 'Cliente vinculado',
    concept: 'Gasto registrado',
    group: expense.expenseGroup ?? 'Despesas',
    quantity: Number(expense.quantity),
    unitValue: Number(expense.unitValue),
    prepaid: expense.prepaid,
    billable: expense.billable,
    limit: Number(expense.amount),
    reviewNote: expense.reviewNote ?? undefined,
    currency: expense.currency,
  }));
  const rows = persistedExpenses ?? [];

  useEffect(() => {
    const expense = expenseQuery.data;
    if (!expense) return;
    setDraft({ tripId: expense.tripId, expenseTypeId: expense.expenseTypeId, occurredOn: expense.occurredOn, city: expense.city, quantity: expense.quantity, unitValue: expense.unitValue, currency: expense.currency === 'USD' || expense.currency === 'PYG' ? expense.currency : 'BRL', expenseGroup: expense.expenseGroup ?? 'Despesas', prepaid: expense.prepaid, billable: expense.billable });
  }, [expenseQuery.data]);

  const finishForm = () => {
    setShowForm(false);
    void query.refetch();
    router.replace('/expenses');
  };

  if (showForm || editId !== undefined) return <NewExpense draft={draft} setDraft={setDraft} expenseTypes={expenseTypesQuery.data?.items ?? []} trips={tripsQuery.data?.items ?? []} cities={cities} editing={editId !== undefined} isAuthenticated={isAuthenticated} saving={createExpense.isPending || updateExpense.isPending} onCancel={() => { setShowForm(false); router.replace('/expenses'); }} onSave={async () => {
    const payload = { tripId: draft.tripId, expenseTypeId: draft.expenseTypeId, occurredOn: draft.occurredOn, city: draft.city.trim(), quantity: draft.quantity, unitValue: draft.unitValue.replace(',', '.'), currency: draft.currency, expenseGroup: draft.expenseGroup.trim() || null, prepaid: draft.prepaid, billable: draft.billable, notes: null, reviewNote: null };
    try {
      if (editId !== undefined) await updateExpense.mutateAsync({ id: editId, ...payload }); else await createExpense.mutateAsync(payload);
      Alert.alert(editId !== undefined ? t('Despesa atualizada') : t('Despesa adicionada'), t('O lançamento foi salvo na prestação.'));
      finishForm();
    } catch (error) {
      Alert.alert(t('Não foi possível salvar'), error instanceof Error ? error.message : t('Tente novamente.'));
    }
  }} />;

  const totalsByCurrency = new Map<string, number>();
  rows.forEach((expense) => totalsByCurrency.set(expense.currency, (totalsByCurrency.get(expense.currency) ?? 0) + expense.quantity * expense.unitValue));
  const total = Array.from(totalsByCurrency.entries()).map(([code, value]) => formatCurrency(value, validExpenseCurrency(code))).join(' · ') || formatCurrency(0, currency);
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-5"><Text className="font-semibold text-primary">‹ Voltar</Text></Pressable><View className="flex-row items-end justify-between"><View><Text className="text-sm font-medium text-muted">{t('Lançamentos persistidos')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{t('Despesas')}</Text></View><Pressable onPress={() => setShowForm(true)} style={({ pressed }) => [{ backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]} className="h-11 w-11 items-center justify-center rounded-2xl"><IconSymbol name="plus" size={22} color="white" /></Pressable></View><View className="mt-6 flex-row gap-3"><View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs text-muted">{t('Total lançado')}</Text><Text className="mt-2 text-xl font-bold text-foreground">{total}</Text></View><View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs text-muted">{t('Itens pendentes')}</Text><Text className="mt-2 text-xl font-bold text-warning">{String(rows.filter((expense) => expense.quantity * expense.unitValue > expense.limit).length).padStart(2, '0')}</Text></View></View><Text className="mb-3 mt-8 text-base font-bold text-foreground">{t('Lançamentos recentes')}</Text><View className="gap-3">{rows.map((expense) => { const lineTotal = expense.quantity * expense.unitValue; const overLimit = lineTotal > expense.limit; const canEdit = /^\d+$/.test(expense.id); return <View key={expense.id} className="rounded-2xl border border-border bg-surface p-4"><View className="flex-row items-start"><View className="flex-1"><Text className="text-xs text-muted">{expense.date} · {expense.city}</Text><Text className="mt-1 font-bold text-foreground">{expense.concept}</Text><Text className="mt-1 text-xs text-muted">{expense.client} · {expense.quantity} × {formatCurrency(expense.unitValue, validExpenseCurrency(expense.currency))}</Text></View><View className="items-end"><Text className="font-bold text-foreground">{formatCurrency(lineTotal, validExpenseCurrency(expense.currency))}</Text>{canEdit ? <Pressable onPress={() => router.push({ pathname: '/expenses', params: { expenseId: expense.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} className="mt-2"><Text className="text-xs font-bold text-primary">{t('Editar')}</Text></Pressable> : null}</View></View><View className="mt-3 flex-row items-center"><StatusPill status={overLimit ? 'Revisão necessária' : 'Pronto para envio'} /><Text className="ml-auto text-xs text-muted">{expense.prepaid ? 'Adiantado' : 'Administrativo'}</Text></View>{expense.reviewNote ? <Text className="mt-3 rounded-xl bg-warning/10 p-3 text-xs leading-4 text-warning">Observação: {expense.reviewNote}</Text> : null}</View>; })}</View><View className="mt-6"><PrimaryButton label={t('Enviar fechamento')} onPress={() => Alert.alert(t('Fechamento enviado'), t('O administrativo foi notificado para revisar os lançamentos.'))} /><View className="mt-2"><SecondaryButton label={t('Adicionar outro lançamento')} onPress={() => setShowForm(true)} /></View></View></ScreenContainer>;
}

function NewExpense({ draft, setDraft, expenseTypes, trips, cities, editing, isAuthenticated, saving, onCancel, onSave }: { draft: ExpenseDraft; setDraft: (draft: ExpenseDraft) => void; expenseTypes: { id: number; name: string }[]; trips: { id: number; tripCode: string; destination: string; startsOn: string; endsOn: string; status: string }[]; cities: string[]; editing: boolean; isAuthenticated: boolean; saving: boolean; onCancel: () => void; onSave: () => Promise<void> }) {
  const colors = useColors();
  const { t } = useLanguage();
  const setField = <K extends keyof ExpenseDraft>(field: K, value: ExpenseDraft[K]) => setDraft({ ...draft, [field]: value });
  const submit = async () => {
    if (!isValidExpenseForm(draft)) {
      Alert.alert(t('Confira os dados da despesa'), t('Informe viagem, cidade, data, quantidade e valor válidos.'));
      return;
    }
    if (!isAuthenticated) {
      Alert.alert(editing ? t('Alteração simulada') : t('Despesa adicionada'), t('A alteração exige uma sessão local autenticada.'), [{ text: t('Voltar para despesas'), onPress: onCancel }]);
      return;
    }
    await onSave();
  };
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}><Pressable onPress={onCancel} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-5"><Text className="font-semibold text-primary">‹ {t('Voltar para despesas')}</Text></Pressable><Text className="text-3xl font-bold text-foreground">{editing ? t('Editar despesa') : t('Nova despesa')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Anexe o comprovante para manter a prestação pronta para revisão.')}</Text><Label text="Viagem vinculada" /><CatalogChoice value={draft.tripId} options={trips.map((trip) => ({ id: trip.id, label: `${trip.tripCode} · ${trip.destination}` }))} emptyLabel={t('Nenhuma viagem criada')} onChange={(value) => setField('tripId', Number(value))} /><Text className="mt-1 text-xs text-muted">{t('Selecione uma viagem previamente criada para lançar o gasto.')}</Text><Label text="Conceito do gasto" /><CatalogChoice value={draft.expenseTypeId} options={expenseTypes.map((item) => ({ id: item.id, label: item.name }))} emptyLabel={t('Nenhum tipo de gasto cadastrado')} onChange={(value) => setField('expenseTypeId', Number(value))} /><Label text="Cidade do atendimento" /><CatalogChoice value={draft.city} options={cities.map((city) => ({ id: city, label: city }))} emptyLabel={t('Nenhuma cidade cadastrada')} onChange={(value) => setField('city', String(value))} /><Text className="mt-1 text-xs text-muted">{t('As cidades são carregadas do cadastro persistido de unidades.')}</Text><Label text="Data do gasto" /><CalendarField value={draft.occurredOn} onChange={(value) => setField('occurredOn', value)} /><View className="flex-row gap-3"><View className="flex-1"><Label text="Quantidade" /><TextInput value={draft.quantity} onChangeText={(value) => setField('quantity', value)} keyboardType="numeric" placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /></View><View className="flex-1"><Label text="Valor unitário" /><TextInput value={draft.unitValue} onChangeText={(value) => setField('unitValue', value)} keyboardType="decimal-pad" placeholder={t('0,00')} placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /></View></View><Label text="Moeda do gasto" /><View className="flex-row gap-2">{CURRENCY_OPTIONS.map((option) => <Choice key={option.key} label={`${option.symbol} ${option.key}`} selected={draft.currency === option.key} onPress={() => setField('currency', option.key)} />)}</View><Label text="Comprovante" /><Pressable onPress={() => Alert.alert(t('Selecionar comprovante'), t('Na integração nativa, este botão abrirá câmera/galeria e comprimirá imagens, incluindo HEIC, antes do upload.'))} style={({ pressed }) => [{ borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]} className="flex-row items-center rounded-2xl border border-dashed bg-surface p-5"><View style={{ backgroundColor: `${colors.primary}18` }} className="h-11 w-11 items-center justify-center rounded-xl"><IconSymbol name="camera.fill" size={22} color={colors.primary} /></View><View className="ml-3"><Text className="font-bold text-foreground">{t('Adicionar foto ou fatura')}</Text><Text className="mt-1 text-xs text-muted">JPG, PNG, PDF ou HEIC</Text></View></Pressable><Label text="Pagamento" /><View className="flex-row gap-2"><Choice label={t('Pago com adiantamento')} selected={draft.prepaid} onPress={() => setField('prepaid', true)} /><Choice label={t('Administrativo')} selected={!draft.prepaid} onPress={() => setField('prepaid', false)} /></View><View className="mt-6"><PrimaryButton label={saving ? t('Salvando...') : editing ? t('Salvar alterações') : t('Salvar despesa')} onPress={() => void submit()} /></View></ScrollView></ScreenContainer>;
}
function CalendarField({ value, onChange }: { value: string; onChange: (value: string) => void }) { const colors = useColors(); const { t } = useLanguage(); const [open, setOpen] = useState(false); const parse = (input: string) => /^\\d{4}-\\d{2}-\\d{2}$/.test(input) ? new Date(`${input}T12:00:00`) : new Date(); const [month, setMonth] = useState(() => { const date = parse(value); return new Date(date.getFullYear(), date.getMonth(), 1); }); const year = month.getFullYear(); const monthIndex = month.getMonth(); const daysInMonth = new Date(year, monthIndex + 1, 0).getDate(); const firstDay = new Date(year, monthIndex, 1).getDay(); const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1); const iso = (day: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; return <><Pressable onPress={() => setOpen(true)} style={({ pressed }) => ({ borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 })} className="flex-row items-center justify-between rounded-2xl border px-4 py-4"><Text className={value ? 'text-foreground' : 'text-muted'}>{value || t('Selecionar data')}</Text><IconSymbol name="calendar" size={20} color={colors.primary} /></Pressable><Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}><View className="flex-1 items-center justify-center bg-black/40 px-5"><View className="w-full max-w-md rounded-2xl bg-background p-5"><View className="flex-row items-center justify-between"><Pressable onPress={() => setMonth(new Date(year, monthIndex - 1, 1))} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="px-3 py-2 text-2xl text-primary">‹</Text></Pressable><Text className="text-base font-bold text-foreground">{year}-{String(monthIndex + 1).padStart(2, '0')}</Text><Pressable onPress={() => setMonth(new Date(year, monthIndex + 1, 1))} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="px-3 py-2 text-2xl text-primary">›</Text></Pressable></View><View className="mt-4 flex-row flex-wrap">{days.map((day, index) => day === null ? <View key={`blank-${index}`} className="w-[14.28%] p-1" /> : <Pressable key={day} onPress={() => { onChange(iso(day)); setOpen(false); }} style={({ pressed }) => ({ backgroundColor: value === iso(day) ? colors.primary : colors.surface, opacity: pressed ? 0.65 : 1 })} className="m-1 w-[12.28%] items-center rounded-lg p-2"><Text style={{ color: value === iso(day) ? 'white' : colors.foreground }} className="text-sm font-semibold">{day}</Text></Pressable>)}</View><Pressable onPress={() => setOpen(false)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mt-4 items-center rounded-xl border border-border p-3"><Text className="font-bold text-primary">{t('Cancelar')}</Text></Pressable></View></View></Modal></>; }
function Label({ text }: { text: string }) { const { t } = useLanguage(); return <Text className="mb-2 mt-5 text-sm font-bold text-foreground">{t(text)}</Text>; }
function CatalogChoice({ value, options, emptyLabel, onChange }: { value: number | string; options: { id: number | string; label: string }[]; emptyLabel: string; onChange: (value: number | string) => void }) { const colors = useColors(); return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{options.length ? options.map((option) => <Pressable key={option.id} onPress={() => onChange(option.id)} style={({ pressed }) => ({ borderColor: value === option.id ? colors.primary : colors.border, backgroundColor: value === option.id ? `${colors.primary}14` : colors.surface, opacity: pressed ? 0.72 : 1 })} className="rounded-xl border px-3 py-3"><Text style={{ color: value === option.id ? colors.primary : colors.foreground }} className="text-sm font-semibold">{option.label}</Text></Pressable>) : <Text className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">{emptyLabel}</Text>}</ScrollView>; }
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { const colors = useColors(); return <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}14` : colors.surface, opacity: pressed ? 0.72 : 1 })} className="rounded-xl border p-3"><Text style={{ color: selected ? colors.primary : colors.foreground }} className="text-center text-xs font-bold">{label}</Text></Pressable>; }
