import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton, SecondaryButton, StatusPill } from '@/components/app-ui';
import { expenses as demoExpenses, formatCurrency } from '@/lib/demo-data';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

type ExpenseDraft = {
  tripId: number;
  expenseTypeId: number;
  occurredOn: string;
  city: string;
  quantity: string;
  unitValue: string;
  expenseGroup: string;
  prepaid: boolean;
  billable: boolean;
};

const defaultDraft: ExpenseDraft = {
  tripId: 1,
  expenseTypeId: 1,
  occurredOn: '2026-09-02',
  city: 'Ciudad del Este',
  quantity: '1',
  unitValue: '',
  expenseGroup: 'Viáticos',
  prepaid: true,
  billable: true,
};

export default function ExpensesScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ expenseId?: string; tripId?: string }>();
  const editId = typeof params.expenseId === 'string' && /^\d+$/.test(params.expenseId) ? Number(params.expenseId) : undefined;
  const routeTripId = typeof params.tripId === 'string' && /^\d+$/.test(params.tripId) ? Number(params.tripId) : undefined;
  const [showForm, setShowForm] = useState(editId !== undefined);
  const [draft, setDraft] = useState<ExpenseDraft>({ ...defaultDraft, ...(routeTripId ? { tripId: routeTripId } : {}) });
  const query = trpc.operations.expenses.list.useQuery({ page: 1, pageSize: 50, direction: 'desc' }, { enabled: isAuthenticated });
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
  }));
  const rows = persistedExpenses && !query.isError ? persistedExpenses : demoExpenses;

  useEffect(() => {
    const expense = expenseQuery.data;
    if (!expense) return;
    setDraft({ tripId: expense.tripId, expenseTypeId: expense.expenseTypeId, occurredOn: expense.occurredOn, city: expense.city, quantity: expense.quantity, unitValue: expense.unitValue, expenseGroup: expense.expenseGroup ?? 'Despesas', prepaid: expense.prepaid, billable: expense.billable });
  }, [expenseQuery.data]);

  const finishForm = () => {
    setShowForm(false);
    void query.refetch();
    router.replace('/expenses');
  };

  if (showForm || editId !== undefined) return <NewExpense draft={draft} setDraft={setDraft} editing={editId !== undefined} isAuthenticated={isAuthenticated} saving={createExpense.isPending || updateExpense.isPending} onCancel={() => { setShowForm(false); router.replace('/expenses'); }} onSave={async () => {
    const payload = { tripId: draft.tripId, expenseTypeId: draft.expenseTypeId, occurredOn: draft.occurredOn, city: draft.city.trim(), quantity: draft.quantity, unitValue: draft.unitValue.replace(',', '.'), expenseGroup: draft.expenseGroup.trim() || null, prepaid: draft.prepaid, billable: draft.billable, notes: null, reviewNote: null };
    try {
      if (editId !== undefined) await updateExpense.mutateAsync({ id: editId, ...payload }); else await createExpense.mutateAsync(payload);
      Alert.alert(editId !== undefined ? t('Despesa atualizada') : t('Despesa adicionada'), t('O lançamento foi salvo na prestação.'));
      finishForm();
    } catch (error) {
      Alert.alert(t('Não foi possível salvar'), error instanceof Error ? error.message : t('Tente novamente.'));
    }
  }} />;

  const total = rows.reduce((sum, expense) => sum + expense.quantity * expense.unitValue, 0);
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-5"><Text className="font-semibold text-primary">‹ Voltar</Text></Pressable><View className="flex-row items-end justify-between"><View><Text className="text-sm font-medium text-muted">TR-2026-031 · Ciudad del Este</Text><Text className="mt-1 text-3xl font-bold text-foreground">Despesas</Text></View><Pressable onPress={() => setShowForm(true)} style={({ pressed }) => [{ backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]} className="h-11 w-11 items-center justify-center rounded-2xl"><IconSymbol name="plus" size={22} color="white" /></Pressable></View><View className="mt-6 flex-row gap-3"><View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs text-muted">Total lançado</Text><Text className="mt-2 text-xl font-bold text-foreground">{formatCurrency(total)}</Text></View><View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs text-muted">Itens pendentes</Text><Text className="mt-2 text-xl font-bold text-warning">{String(rows.filter((expense) => expense.quantity * expense.unitValue > expense.limit).length).padStart(2, '0')}</Text></View></View><Text className="mb-3 mt-8 text-base font-bold text-foreground">Lançamentos recentes</Text><View className="gap-3">{rows.map((expense) => { const lineTotal = expense.quantity * expense.unitValue; const overLimit = lineTotal > expense.limit; const canEdit = /^\d+$/.test(expense.id); return <View key={expense.id} className="rounded-2xl border border-border bg-surface p-4"><View className="flex-row items-start"><View className="flex-1"><Text className="text-xs text-muted">{expense.date} · {expense.city}</Text><Text className="mt-1 font-bold text-foreground">{expense.concept}</Text><Text className="mt-1 text-xs text-muted">{expense.client} · {expense.quantity} × {formatCurrency(expense.unitValue)}</Text></View><View className="items-end"><Text className="font-bold text-foreground">{formatCurrency(lineTotal)}</Text>{canEdit ? <Pressable onPress={() => router.push({ pathname: '/expenses', params: { expenseId: expense.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} className="mt-2"><Text className="text-xs font-bold text-primary">{t('Editar')}</Text></Pressable> : null}</View></View><View className="mt-3 flex-row items-center"><StatusPill status={overLimit ? 'Revisão necessária' : 'Pronto para envio'} /><Text className="ml-auto text-xs text-muted">{expense.prepaid ? 'Adiantado' : 'Administrativo'}</Text></View>{expense.reviewNote ? <Text className="mt-3 rounded-xl bg-warning/10 p-3 text-xs leading-4 text-warning">Observação: {expense.reviewNote}</Text> : null}</View>; })}</View><View className="mt-6"><PrimaryButton label="Enviar fechamento" onPress={() => Alert.alert('Fechamento enviado', 'O administrativo foi notificado para revisar os lançamentos.')} /><View className="mt-2"><SecondaryButton label="Adicionar outro lançamento" onPress={() => setShowForm(true)} /></View></View></ScreenContainer>;
}

function NewExpense({ draft, setDraft, editing, isAuthenticated, saving, onCancel, onSave }: { draft: ExpenseDraft; setDraft: (draft: ExpenseDraft) => void; editing: boolean; isAuthenticated: boolean; saving: boolean; onCancel: () => void; onSave: () => Promise<void> }) {
  const colors = useColors();
  const { t } = useLanguage();
  const setField = <K extends keyof ExpenseDraft>(field: K, value: ExpenseDraft[K]) => setDraft({ ...draft, [field]: value });
  const submit = async () => {
    if (!draft.city.trim() || !draft.occurredOn || !/^\d{4}-\d{2}-\d{2}$/.test(draft.occurredOn) || Number(draft.quantity) <= 0 || Number(draft.unitValue.replace(',', '.')) < 0) {
      Alert.alert(t('Confira os dados da despesa'), t('Informe cidade, data AAAA-MM-DD, quantidade e valor válidos.'));
      return;
    }
    if (!isAuthenticated) {
      Alert.alert(editing ? t('Alteração simulada') : t('Despesa adicionada'), t('No modo demonstrativo, a alteração será aplicada após conectar uma sessão.'), [{ text: t('Voltar para despesas'), onPress: onCancel }]);
      return;
    }
    await onSave();
  };
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}><Pressable onPress={onCancel} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-5"><Text className="font-semibold text-primary">‹ Voltar para despesas</Text></Pressable><Text className="text-3xl font-bold text-foreground">{editing ? t('Editar despesa') : t('Nova despesa')}</Text><Text className="mt-2 text-sm leading-5 text-muted">Anexe o comprovante para manter a prestação pronta para revisão.</Text><Label text="Conceito do gasto" /><Select value="Alimentação" /><Label text="Cidade do atendimento" /><TextInput value={draft.city} onChangeText={(value) => setField('city', value)} placeholder="Ciudad del Este" placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /><Label text="Data do gasto" /><TextInput value={draft.occurredOn} onChangeText={(value) => setField('occurredOn', value)} placeholder="AAAA-MM-DD" placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /><View className="flex-row gap-3"><View className="flex-1"><Label text="Quantidade" /><TextInput value={draft.quantity} onChangeText={(value) => setField('quantity', value)} keyboardType="numeric" placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /></View><View className="flex-1"><Label text="Valor unitário" /><TextInput value={draft.unitValue} onChangeText={(value) => setField('unitValue', value)} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /></View></View><Label text="Comprovante" /><Pressable onPress={() => Alert.alert('Selecionar comprovante', 'Na integração nativa, este botão abrirá câmera/galeria e comprimirá imagens, incluindo HEIC, antes do upload.')} style={({ pressed }) => [{ borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]} className="flex-row items-center rounded-2xl border border-dashed bg-surface p-5"><View style={{ backgroundColor: `${colors.primary}18` }} className="h-11 w-11 items-center justify-center rounded-xl"><IconSymbol name="camera.fill" size={22} color={colors.primary} /></View><View className="ml-3"><Text className="font-bold text-foreground">Adicionar foto ou fatura</Text><Text className="mt-1 text-xs text-muted">JPG, PNG, PDF ou HEIC</Text></View></Pressable><Label text="Pagamento" /><View className="flex-row gap-2"><Choice label="Pago com adiantamento" selected={draft.prepaid} onPress={() => setField('prepaid', true)} /><Choice label="Administrativo" selected={!draft.prepaid} onPress={() => setField('prepaid', false)} /></View><View className="mt-6"><PrimaryButton label={saving ? t('Salvando...') : editing ? t('Salvar alterações') : t('Salvar despesa')} onPress={() => void submit()} /></View></ScrollView></ScreenContainer>;
}
function Label({ text }: { text: string }) { return <Text className="mb-2 mt-5 text-sm font-bold text-foreground">{text}</Text>; }
function Select({ value }: { value: string }) { const colors = useColors(); return <View className="flex-row items-center rounded-2xl border border-border bg-surface px-4 py-4"><Text className="flex-1 text-foreground">{value}</Text><Text style={{ color: colors.primary }} className="text-lg">⌄</Text></View>; }
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { const colors = useColors(); return <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}14` : colors.surface, opacity: pressed ? 0.72 : 1 })} className="rounded-xl border p-3"><Text style={{ color: selected ? colors.primary : colors.foreground }} className="text-center text-xs font-bold">{label}</Text></Pressable>; }
