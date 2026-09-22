import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton, SecondaryButton, StatusPill } from '@/components/app-ui';
import { CalendarField } from '@/components/calendar-field';
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
  receiptUri: string | null;
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
  receiptUri: null,
};

export default function ExpensesScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.profile === 'admin';
  const params = useLocalSearchParams<{ expenseId?: string; tripId?: string }>();
  const editId = typeof params.expenseId === 'string' && /^\d+$/.test(params.expenseId) ? Number(params.expenseId) : undefined;
  const routeTripId = typeof params.tripId === 'string' && /^\d+$/.test(params.tripId) ? Number(params.tripId) : undefined;
  const [showForm, setShowForm] = useState(editId !== undefined);
  const [draft, setDraft] = useState<ExpenseDraft>({ ...defaultDraft, ...(routeTripId ? { tripId: routeTripId } : {}) });
  const query = trpc.operations.expenses.list.useQuery({ page: 1, pageSize: 50, direction: 'desc', ...(routeTripId ? { tripId: routeTripId } : {}) }, { enabled: isAuthenticated });
  const expenseTypesQuery = trpc.catalogs.expenseTypes.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const tripsQuery = trpc.operations.trips.list.useQuery({ page: 1, pageSize: 100, direction: 'asc' }, { enabled: isAuthenticated });
  // Antes, as cidades disponíveis vinham só das Unidades cadastradas — mas
  // nem todo lugar onde há gasto tem uma Unidade (ex.: atendimentos com
  // gastos em várias cidades). Agora usamos o cadastro próprio de Cidades.
  const citiesQuery = trpc.catalogs.cities.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const cities = (citiesQuery.data?.items ?? []).map((item) => item.name);
  const expenseQuery = trpc.operations.expenses.get.useQuery({ id: editId as number }, { enabled: isAuthenticated && editId !== undefined });
  // Depois que o Administrativo valida os comprovantes, o viajante não
  // pode mais mexer nas despesas dessa viagem — escondemos os botões
  // aqui mesmo, além do bloqueio de verdade que já existe no backend.
  const tripInfoQuery = trpc.operations.trips.get.useQuery({ id: routeTripId as number }, { enabled: isAuthenticated && routeTripId !== undefined });
  const isLocked = !isAdmin && Boolean(tripInfoQuery.data?.receiptsValidatedAt);
  const createExpense = trpc.operations.expenses.create.useMutation();
  const updateExpense = trpc.operations.expenses.update.useMutation();
  const deleteExpense = trpc.operations.expenses.delete.useMutation({
    onSuccess: () => { void query.refetch(); },
  });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
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
    receiptUri: expense.receiptUri ?? null,
    reimbursementRejectedAt: (expense as any).reimbursementRejectedAt ?? null,
  }));
  const rows = persistedExpenses ?? [];

  useEffect(() => {
    const expense = expenseQuery.data;
    if (!expense) return;
    setDraft({ tripId: expense.tripId, expenseTypeId: expense.expenseTypeId, occurredOn: expense.occurredOn, city: expense.city, quantity: expense.quantity, unitValue: expense.unitValue, currency: expense.currency === 'USD' || expense.currency === 'PYG' ? expense.currency : 'BRL', expenseGroup: expense.expenseGroup ?? 'Despesas', prepaid: expense.prepaid, billable: expense.billable, receiptUri: expense.receiptUri ?? null });
  }, [expenseQuery.data]);

  const finishForm = () => {
    setShowForm(false);
    void query.refetch();
    router.replace('/expenses');
  };

  if (showForm || editId !== undefined) return <NewExpense draft={draft} setDraft={setDraft} expenseTypes={expenseTypesQuery.data?.items ?? []} trips={tripsQuery.data?.items ?? []} cities={cities} editing={editId !== undefined} isAuthenticated={isAuthenticated} saving={createExpense.isPending || updateExpense.isPending} onCancel={() => { setShowForm(false); router.replace('/expenses'); }} onSave={async () => {
    const payload = { tripId: draft.tripId, expenseTypeId: draft.expenseTypeId, occurredOn: draft.occurredOn, city: draft.city.trim(), quantity: draft.quantity, unitValue: draft.unitValue.replace(',', '.'), currency: draft.currency, expenseGroup: draft.expenseGroup.trim() || null, prepaid: draft.prepaid, billable: draft.billable, receiptUri: draft.receiptUri, notes: null, reviewNote: null };
    if (editId !== undefined) await updateExpense.mutateAsync({ id: editId, ...payload }); else await createExpense.mutateAsync(payload);
    finishForm();
  }} />;

  const totalsByCurrency = new Map<string, number>();
  rows.forEach((expense) => totalsByCurrency.set(expense.currency, (totalsByCurrency.get(expense.currency) ?? 0) + expense.quantity * expense.unitValue));
  const total = Array.from(totalsByCurrency.entries()).map(([code, value]) => formatCurrency(value, validExpenseCurrency(code))).join(' · ') || formatCurrency(0, currency);
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-5"><Text className="font-semibold text-primary">‹ Voltar</Text></Pressable><View className="flex-row items-end justify-between"><View><Text className="text-sm font-medium text-muted">{t('Lançamentos persistidos')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{t('Despesas')}</Text></View>{!isAdmin && !isLocked ? <Pressable onPress={() => setShowForm(true)} style={({ pressed }) => [{ backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]} className="h-11 w-11 items-center justify-center rounded-2xl"><IconSymbol name="plus" size={22} color="white" /></Pressable> : null}</View><View className="mt-6 flex-row gap-3"><View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs text-muted">{t('Total lançado')}</Text><Text className="mt-2 text-xl font-bold text-foreground">{total}</Text></View><View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs text-muted">{t('Itens pendentes')}</Text><Text className="mt-2 text-xl font-bold text-warning">{String(rows.filter((expense) => expense.quantity * expense.unitValue > expense.limit).length).padStart(2, '0')}</Text></View></View><Text className="mb-2 mt-8 text-base font-bold text-foreground">{t('Lançamentos recentes')}</Text>{routeTripId ? <Pressable onPress={() => router.replace('/expenses')} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-2 flex-row items-center"><Text className="text-xs text-muted">{t('Mostrando apenas esta viagem')}</Text><Text className="ml-2 text-xs font-bold text-primary">{t('Ver todas ×')}</Text></Pressable> : null}{deleteExpense.isError ? <Text style={{ color: colors.error }} className="mb-2 text-xs font-semibold">{deleteExpense.error?.message}</Text> : null}<View className="rounded-2xl border border-border overflow-hidden">{rows.map((expense, index) => { const lineTotal = expense.quantity * expense.unitValue; const overLimit = lineTotal > expense.limit; const canEdit = /^\d+$/.test(expense.id); const confirmingDelete = confirmingDeleteId === expense.id; return <View key={expense.id} className={`px-4 py-3 ${index > 0 ? 'border-t border-border' : ''}`}><View className="flex-row items-center justify-between"><View className="flex-1 pr-3"><Text className="text-xs text-muted" numberOfLines={1}>{expense.date} · {expense.city}</Text><Text className="mt-0.5 text-sm font-semibold text-foreground" numberOfLines={1}>{expense.quantity} × {formatCurrency(expense.unitValue, validExpenseCurrency(expense.currency))} · {expense.prepaid ? t('Adiantado') : t('Administrativo')}</Text></View><Text className="font-bold text-foreground">{formatCurrency(lineTotal, validExpenseCurrency(expense.currency))}</Text></View><View className="mt-1.5 flex-row items-center justify-between"><StatusPill status={overLimit ? 'Revisão necessária' : 'Pronto para envio'} />{canEdit && !isLocked ? <View className="flex-row items-center gap-3">{confirmingDelete ? <><Pressable onPress={() => deleteExpense.mutate({ id: Number(expense.id) })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text style={{ color: colors.error }} className="text-xs font-bold">{t('Confirmar exclusão')}</Text></Pressable><Pressable onPress={() => setConfirmingDeleteId(null)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-xs font-bold text-muted">{t('Cancelar')}</Text></Pressable></> : <>{!isAdmin ? <Pressable onPress={() => router.push({ pathname: '/expenses', params: { expenseId: expense.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-xs font-bold text-primary">{t('Editar')}</Text></Pressable> : null}<Pressable onPress={() => setConfirmingDeleteId(expense.id)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text style={{ color: colors.error }} className="text-xs font-bold">{t('Apagar')}</Text></Pressable></>}</View> : null}</View>{expense.receiptUri ? <Pressable onPress={() => setViewingReceipt(expense.receiptUri)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} className="mt-2 flex-row items-center"><IconSymbol name="doc.text.fill" size={13} color={colors.primary} /><Text className="ml-1.5 text-xs font-bold text-primary">{t('Ver comprovante')}</Text></Pressable> : null}{expense.reimbursementRejectedAt ? <View style={{ backgroundColor: `${colors.error}18` }} className="mt-2 rounded-xl p-2"><Text style={{ color: colors.error }} className="text-xs font-bold uppercase">{t('Rejeitado')}</Text>{expense.reviewNote ? <Text style={{ color: colors.error }} className="mt-1 text-xs leading-4">{t('Motivo')}: {expense.reviewNote}</Text> : null}</View> : expense.reviewNote ? <Text className="mt-2 rounded-xl bg-warning/10 p-2 text-xs leading-4 text-warning">{t('Observação')}: {expense.reviewNote}</Text> : null}</View>; })}{rows.length === 0 ? <Text className="p-4 text-sm text-muted">{t('Nenhum lançamento ainda.')}</Text> : null}</View><ReceiptViewerModal uri={viewingReceipt} onClose={() => setViewingReceipt(null)} colors={colors} t={t} /><View className="mt-6">{isLocked ? <View style={{ backgroundColor: `${colors.success}18` }} className="mb-3 rounded-xl p-3"><Text style={{ color: colors.success }} className="text-sm font-semibold">{t('Os comprovantes desta viagem já foram validados pelo Administrativo — não é mais possível alterar as despesas.')}</Text></View> : null}{!routeTripId && !isAdmin ? <Text className="mb-3 text-xs text-muted">{t('Abra as despesas a partir de uma viagem específica para enviar o fechamento — o botão "Enviar fechamento" está na tela de detalhes da viagem.')}</Text> : null}{!isAdmin && !isLocked ? <SecondaryButton label={t('Adicionar outro lançamento')} onPress={() => setShowForm(true)} /> : null}</View></ScrollView></ScreenContainer>;
}

function NewExpense({ draft, setDraft, expenseTypes, trips, cities, editing, isAuthenticated, saving, onCancel, onSave }: { draft: ExpenseDraft; setDraft: (draft: ExpenseDraft) => void; expenseTypes: { id: number; name: string }[]; trips: { id: number; tripCode: string; destination: string; startsOn: string; endsOn: string; status: string }[]; cities: string[]; editing: boolean; isAuthenticated: boolean; saving: boolean; onCancel: () => void; onSave: () => Promise<void> }) {
  const colors = useColors();
  const { t } = useLanguage();
  const [formError, setFormError] = useState<string | null>(null);
  // O botão de comprovante usava Alert.alert() (não funciona na web) e
  // nunca fazia nada de verdade. Agora ele abre o seletor de arquivo do
  // navegador. O envio/armazenamento do arquivo em si ainda não existe
  // no sistema — isso exigiria um espaço próprio de armazenamento no
  // servidor, que não temos hoje — mas pelo menos o botão já reage e
  // confirma visualmente qual arquivo foi escolhido.
  const [receiptFileName, setReceiptFileName] = useState<string | null>(draft.receiptUri ? t('Comprovante já anexado') : null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const pickReceipt = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert(t('Selecionar comprovante'), t('Este recurso está disponível apenas na versão web por enquanto.'));
      return;
    }
    setReceiptError(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      // Limite de ~4MB — arquivos maiores que isso ficam pesados demais
      // para guardar direto no banco de dados (sem um sistema de
      // armazenamento de arquivos dedicado, que este projeto ainda não tem).
      if (file.size > 4 * 1024 * 1024) {
        setReceiptError(t('Arquivo muito grande. Escolha uma foto de até 4MB.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setDraft({ ...draft, receiptUri: reader.result });
          setReceiptFileName(file.name);
        }
      };
      reader.onerror = () => setReceiptError(t('Não foi possível ler o arquivo selecionado.'));
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const setField = <K extends keyof ExpenseDraft>(field: K, value: ExpenseDraft[K]) => { setFormError(null); setDraft({ ...draft, [field]: value }); };
  const submit = async () => {
    if (!isValidExpenseForm(draft)) {
      setFormError(t('Confira os dados da despesa: informe viagem, conceito, cidade, data, quantidade e valor válidos.'));
      return;
    }
    if (!isAuthenticated) {
      setFormError(t('A alteração exige uma sessão local autenticada.'));
      return;
    }
    setFormError(null);
    try {
      await onSave();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('Não foi possível salvar. Tente novamente.'));
    }
  };
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}><Pressable onPress={onCancel} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-5"><Text className="font-semibold text-primary">‹ {t('Voltar para despesas')}</Text></Pressable><Text className="text-3xl font-bold text-foreground">{editing ? t('Editar despesa') : t('Nova despesa')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Anexe o comprovante para manter a prestação pronta para revisão.')}</Text><Label text="Viagem vinculada" /><CatalogSearch value={draft.tripId || null} options={trips.map((trip) => ({ id: trip.id, label: `${trip.tripCode} · ${trip.destination}` }))} placeholder={t('Pesquisar viagem')} emptyLabel={t('Nenhuma viagem criada')} onChange={(value) => setField('tripId', Number(value ?? 0))} /><Text className="mt-1 text-xs text-muted">{t('Selecione uma viagem previamente criada para lançar o gasto.')}</Text><Label text="Conceito do gasto" /><CatalogSearch value={draft.expenseTypeId || null} options={expenseTypes.map((item) => ({ id: item.id, label: item.name }))} placeholder={t('Pesquisar conceito')} emptyLabel={t('Nenhum tipo de gasto cadastrado')} onChange={(value) => setField('expenseTypeId', Number(value ?? 0))} /><Label text="Cidade do atendimento" /><CatalogSearch value={draft.city || null} options={cities.map((city) => ({ id: city, label: city }))} placeholder={t('Pesquisar cidade')} emptyLabel={t('Nenhuma cidade cadastrada')} onChange={(value) => setField('city', value ? String(value) : '')} /><Text className="mt-1 text-xs text-muted">{t('As cidades são carregadas do cadastro próprio de Cidades.')}</Text><Label text="Data do gasto" /><CalendarField value={draft.occurredOn} onChange={(value) => setField('occurredOn', value)} /><View className="flex-row gap-3"><View className="flex-1"><Label text="Quantidade" /><TextInput value={draft.quantity} onChangeText={(value) => setField('quantity', value)} keyboardType="numeric" placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /></View><View className="flex-1"><Label text="Valor unitário" /><TextInput value={draft.unitValue} onChangeText={(value) => setField('unitValue', value)} keyboardType="decimal-pad" placeholder={t('0,00')} placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /></View></View><Label text="Moeda do gasto" /><View className="flex-row gap-2">{CURRENCY_OPTIONS.map((option) => <Choice key={option.key} label={`${option.symbol} ${option.key}`} selected={draft.currency === option.key} onPress={() => setField('currency', option.key)} />)}</View><Label text="Comprovante" /><Pressable onPress={pickReceipt} style={({ pressed }) => [{ borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]} className="flex-row items-center rounded-2xl border border-dashed bg-surface p-5"><View style={{ backgroundColor: `${colors.primary}18` }} className="h-11 w-11 items-center justify-center rounded-xl"><IconSymbol name="camera.fill" size={22} color={colors.primary} /></View><View className="ml-3 flex-1"><Text className="font-bold text-foreground" numberOfLines={1}>{receiptFileName ?? t('Adicionar foto ou fatura')}</Text><Text className="mt-1 text-xs text-muted">{receiptFileName ? t('Arquivo selecionado — toque para trocar') : 'JPG, PNG, PDF ou HEIC'}</Text></View>{receiptFileName ? <IconSymbol name="checkmark.circle.fill" size={22} color={colors.success} /> : null}</Pressable>{draft.receiptUri && draft.receiptUri.startsWith('data:image') ? <Image source={{ uri: draft.receiptUri }} style={{ width: '100%', height: 160, borderRadius: 16, marginTop: 10 }} resizeMode="contain" /> : null}{receiptError ? <Text style={{ color: colors.error }} className="mt-2 text-xs font-semibold">{receiptError}</Text> : null}<Label text="Pagamento" /><View className="flex-row gap-2"><Choice label={t('Pago com adiantamento')} selected={draft.prepaid} onPress={() => setField('prepaid', true)} /><Choice label={t('Administrativo')} selected={!draft.prepaid} onPress={() => setField('prepaid', false)} /></View>{formError ? <View style={{ backgroundColor: `${colors.error}18` }} className="mt-5 rounded-xl p-3"><Text style={{ color: colors.error }} className="text-sm font-semibold">{formError}</Text></View> : null}<View className="mt-6"><PrimaryButton label={saving ? t('Salvando...') : editing ? t('Salvar alterações') : t('Salvar despesa')} onPress={() => void submit()} /></View></ScrollView></ScreenContainer>;
}function Label({ text }: { text: string }) { const { t } = useLanguage(); return <Text className="mb-2 mt-5 text-sm font-bold text-foreground">{t(text)}</Text>; }
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
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { const colors = useColors(); return <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}14` : colors.surface, opacity: pressed ? 0.72 : 1 })} className="rounded-xl border p-3"><Text style={{ color: selected ? colors.primary : colors.foreground }} className="text-center text-xs font-bold">{label}</Text></Pressable>; }

// Mostra o comprovante anexado a uma despesa — imagem em tela cheia, ou
// um link pra abrir em aba nova quando for PDF (a Image do React Native
// não sabe exibir PDF).
function ReceiptViewerModal({ uri, onClose, colors, t }: { uri: string | null; onClose: () => void; colors: ReturnType<typeof useColors>; t: (key: string) => string }) {
  if (!uri) return null;
  const isPdf = uri.startsWith('data:application/pdf');
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-black/70 px-5">
        <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.surface }} className="max-h-[85%] w-full max-w-2xl rounded-2xl p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">{t('Comprovante')}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-2xl text-muted">×</Text></Pressable>
          </View>
          {isPdf ? (
            Platform.OS === 'web' ? (
              <Pressable onPress={() => window.open(uri, '_blank')} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className="items-center rounded-xl border border-primary p-6">
                <Text className="font-bold text-primary">{t('Abrir PDF em nova aba')}</Text>
              </Pressable>
            ) : (
              <Text className="text-sm text-muted">{t('Este recurso está disponível apenas na versão web por enquanto.')}</Text>
            )
          ) : (
            <Image source={{ uri }} style={{ width: '100%', height: 420, borderRadius: 12 }} resizeMode="contain" />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
