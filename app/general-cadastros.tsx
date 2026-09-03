import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';
import { prepareClientBillingProfile } from '@/lib/client-billing-profile';
const catalogQueryInput = {
  page: 1,
  pageSize: 100,
  includeInactive: false,
  direction: 'asc' as const,
};

type CatalogKind = 'units' | 'clients' | 'travelers' | 'expenseTypes' | 'reimbursementLimits' | 'clientBillingLimits' | 'maintenanceReasons';
type DisplayUnit = { id: string; name: string; city: string; code?: string };
type DisplayClient = { id: string; name: string; billingCurrency?: string };
type DisplayTraveler = { id: string; name: string; meta?: string; userId?: number | null; unitId?: number | null; documentNumber?: string | null; canDrive?: boolean };
type DisplayExpenseType = { id: string; name: string; meta?: string; description?: string | null };
type BillingItemDraft = { id?: string; expenseTypeId: string; limitAmount: string };
type DisplayLimit = { id: string; name: string; meta?: string; expenseTypeId?: number; clientId?: number; city?: string; limitAmount?: string; currency?: string; items?: { id: number; expenseTypeId: number; expenseTypeName: string; limitAmount: string }[] };
type CatalogRecord = DisplayUnit | DisplayClient | DisplayTraveler | DisplayExpenseType | DisplayLimit;
type CatalogDraft = {
  code: string;
  name: string;
  city: string;
  billingCurrency: string;
  userId: string;
  unitId: string;
  documentNumber: string;
  canDrive: boolean;
  description: string;
  expenseTypeId: string;
  clientId: string;
  limitAmount: string;
  currency: string;
  clientBillingItems: BillingItemDraft[];
  reimbursementItems: BillingItemDraft[];
  category: 'Preventiva' | 'Corretiva';
};

const emptyDraft: CatalogDraft = {
  code: '',
  name: '',
  city: '',
  billingCurrency: 'BRL',
  userId: '',
  unitId: '',
  documentNumber: '',
  canDrive: false,
  description: '',
  expenseTypeId: '',
  clientId: '',
  limitAmount: '',
  currency: 'BRL',
  clientBillingItems: [{ expenseTypeId: '', limitAmount: '' }],
  reimbursementItems: [{ expenseTypeId: '', limitAmount: '' }],
  category: 'Preventiva',
};

export default function GeneralRegistrationsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const profile = user?.profile ?? (user?.role === 'admin' ? 'admin' : 'traveler');
  const isAdmin = profile === 'admin';
  const liveEnabled = isAdmin && isAuthenticated;
  const [modalKind, setModalKind] = useState<CatalogKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CatalogDraft>(emptyDraft);
  const [formError, setFormError] = useState('');

  const unitsQuery = trpc.catalogs.units.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const clientsQuery = trpc.catalogs.clients.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const travelersQuery = trpc.catalogs.travelers.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const expenseTypesQuery = trpc.catalogs.expenseTypes.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const reimbursementLimitsQuery = trpc.catalogs.reimbursementLimits.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const clientBillingLimitsQuery = trpc.catalogs.clientBillingLimits.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const maintenanceReasonsQuery = trpc.catalogs.maintenanceReasons.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const createUnit = trpc.catalogs.units.create.useMutation();
  const updateUnit = trpc.catalogs.units.update.useMutation();
  const archiveUnit = trpc.catalogs.units.archive.useMutation();
  const createClient = trpc.catalogs.clients.create.useMutation();
  const updateClient = trpc.catalogs.clients.update.useMutation();
  const archiveClient = trpc.catalogs.clients.archive.useMutation();
  const createTraveler = trpc.catalogs.travelers.create.useMutation();
  const updateTraveler = trpc.catalogs.travelers.update.useMutation();
  const archiveTraveler = trpc.catalogs.travelers.archive.useMutation();
  const createExpenseType = trpc.catalogs.expenseTypes.create.useMutation();
  const updateExpenseType = trpc.catalogs.expenseTypes.update.useMutation();
  const archiveExpenseType = trpc.catalogs.expenseTypes.archive.useMutation();
  const createReimbursementLimit = trpc.catalogs.reimbursementLimits.create.useMutation();
  const updateReimbursementLimit = trpc.catalogs.reimbursementLimits.update.useMutation();
  const deleteReimbursementLimit = trpc.catalogs.reimbursementLimits.delete.useMutation();
  const createClientBillingLimit = trpc.catalogs.clientBillingLimits.create.useMutation();
  const updateClientBillingLimit = trpc.catalogs.clientBillingLimits.update.useMutation();
  const deleteClientBillingLimit = trpc.catalogs.clientBillingLimits.delete.useMutation();
  const createMaintenanceReason = trpc.catalogs.maintenanceReasons.create.useMutation();
  const updateMaintenanceReason = trpc.catalogs.maintenanceReasons.update.useMutation();
  const archiveMaintenanceReason = trpc.catalogs.maintenanceReasons.archive.useMutation();


  const unitRows = useMemo<DisplayUnit[]>(
    () => liveEnabled && unitsQuery.data
      ? unitsQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, city: item.city, code: item.code }))
      : [],
    [liveEnabled, unitsQuery.data],
  );
  const travelerRows = useMemo<DisplayTraveler[]>(
    () => liveEnabled && travelersQuery.data
      ? travelersQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, meta: item.canDrive ? t('Condutor') : t('Viajante'), userId: item.userId, unitId: item.unitId, documentNumber: item.documentNumber, canDrive: item.canDrive }))
      : [],
    [liveEnabled, t, travelersQuery.data],
  );
  const clientRows = useMemo<DisplayClient[]>(
    () => liveEnabled && clientsQuery.data
      ? clientsQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, billingCurrency: item.billingCurrency }))
      : [],
    [clientsQuery.data, liveEnabled],
  );
  const expenseTypeRows = useMemo<DisplayExpenseType[]>(
    () => liveEnabled && expenseTypesQuery.data
      ? expenseTypesQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, meta: t('Cadastro ativo'), description: item.description }))
      : [],
    [expenseTypesQuery.data, liveEnabled, t],
  );

  const reimbursementLimitRows = useMemo<DisplayLimit[]>(() => liveEnabled && reimbursementLimitsQuery.data ? reimbursementLimitsQuery.data.items.map((item) => ({ id: String(item.id), name: item.city || 'Genérico', meta: `${item.currency} · ${item.items.length} tipos de gasto`, city: item.city, currency: item.currency, items: item.items })) : [], [liveEnabled, reimbursementLimitsQuery.data]);
  const clientBillingLimitRows = useMemo<DisplayLimit[]>(() => liveEnabled && clientBillingLimitsQuery.data ? clientBillingLimitsQuery.data.items.map((item) => ({ id: String(item.id), name: item.clientName, meta: `${item.currency} · ${item.items.length} tipos de gasto`, clientId: item.clientId, currency: item.currency, items: item.items })) : [], [clientBillingLimitsQuery.data, liveEnabled]);
  const availableBillingClients = useMemo(() => { const configured = new Set(clientBillingLimitRows.map((item) => item.clientId)); return clientRows.filter((item) => !configured.has(Number(item.id))); }, [clientBillingLimitRows, clientRows]);
  const maintenanceReasonRows = useMemo<DisplayLimit[]>(() => liveEnabled && maintenanceReasonsQuery.data ? maintenanceReasonsQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, meta: item.category, limitAmount: item.description ?? '' })) : [], [liveEnabled, maintenanceReasonsQuery.data]);
  const queries = [unitsQuery, clientsQuery, travelersQuery, expenseTypesQuery, reimbursementLimitsQuery, clientBillingLimitsQuery, maintenanceReasonsQuery];
  const isLoadingCatalogs = liveEnabled && queries.some((query) => query.isLoading);
  const hasCatalogError = liveEnabled && queries.some((query) => query.isError);
  const isMutating = [createUnit, updateUnit, createClient, updateClient, createTraveler, updateTraveler, createExpenseType, updateExpenseType, createReimbursementLimit, updateReimbursementLimit, deleteReimbursementLimit, createClientBillingLimit, updateClientBillingLimit, deleteClientBillingLimit, createMaintenanceReason, updateMaintenanceReason, archiveMaintenanceReason].some((mutation) => mutation.isPending);
  const retryCatalogs = () => queries.forEach((query) => void query.refetch());
  const refreshCatalogs = () => queries.forEach((query) => void query.refetch());

  const setField = <K extends keyof CatalogDraft>(field: K, value: CatalogDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError('');
  };

  const updateBillingItem = (index: number, field: keyof BillingItemDraft, value: string) => setDraft((current) => ({ ...current, clientBillingItems: current.clientBillingItems.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  const addBillingItem = () => setDraft((current) => ({ ...current, clientBillingItems: [...current.clientBillingItems, { expenseTypeId: '', limitAmount: '' }] }));
  const removeBillingItem = (index: number) => setDraft((current) => ({ ...current, clientBillingItems: current.clientBillingItems.length > 1 ? current.clientBillingItems.filter((_, itemIndex) => itemIndex !== index) : current.clientBillingItems }));
  const updateReimbursementItem = (index: number, field: keyof BillingItemDraft, value: string) => setDraft((current) => ({ ...current, reimbursementItems: current.reimbursementItems.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
  const addReimbursementItem = () => setDraft((current) => ({ ...current, reimbursementItems: [...current.reimbursementItems, { expenseTypeId: '', limitAmount: '' }] }));
  const removeReimbursementItem = (index: number) => setDraft((current) => ({ ...current, reimbursementItems: current.reimbursementItems.length > 1 ? current.reimbursementItems.filter((_, itemIndex) => itemIndex !== index) : current.reimbursementItems }));

  const openCreate = (kind: CatalogKind) => {
    setModalKind(kind);
    setEditingId(null);
    setDraft(emptyDraft);
    setFormError('');
  };

  const openEdit = (kind: CatalogKind, item: CatalogRecord) => {
    const base = { ...emptyDraft, name: item.name };
    if (kind === 'units' && 'city' in item && 'code' in item) Object.assign(base, { code: item.code ?? '', city: item.city });
    if (kind === 'clients' && 'billingCurrency' in item) Object.assign(base, { billingCurrency: item.billingCurrency ?? 'BRL' });
    if (kind === 'travelers' && 'canDrive' in item) Object.assign(base, { userId: item.userId ? String(item.userId) : '', unitId: item.unitId ? String(item.unitId) : '', documentNumber: item.documentNumber ?? '', canDrive: item.canDrive ?? false });
    if (kind === 'expenseTypes' && 'description' in item) Object.assign(base, { description: item.description ?? '' });
    if (kind === 'reimbursementLimits' && 'items' in item) Object.assign(base, { city: item.city ?? '', currency: item.currency ?? 'BRL', reimbursementItems: (item.items ?? []).map((entry) => ({ id: String(entry.id), expenseTypeId: String(entry.expenseTypeId), limitAmount: entry.limitAmount })), name: item.name });
    if (kind === 'clientBillingLimits' && 'items' in item) Object.assign(base, { clientId: item.clientId ? String(item.clientId) : '', currency: item.currency ?? 'BRL', clientBillingItems: (item.items ?? []).map((entry) => ({ id: String(entry.id), expenseTypeId: String(entry.expenseTypeId), limitAmount: entry.limitAmount })), name: item.name });
    if (kind === 'maintenanceReasons' && 'limitAmount' in item && 'meta' in item) Object.assign(base, { description: item.limitAmount ?? '', category: item.meta === 'Corretiva' ? 'Corretiva' : 'Preventiva' });
    setModalKind(kind);
    setEditingId(item.id);
    setDraft(base);
    setFormError('');
  };

  const closeModal = () => {
    if (isMutating) return;
    setModalKind(null);
    setEditingId(null);
  };

  const submitCatalog = async () => {
    if (!modalKind || !draft.name.trim()) {
      setFormError(t('Informe um nome válido.'));
      return;
    }
    if (modalKind === 'units' && (!draft.code.trim() || !draft.city.trim())) {
      setFormError(t('Informe código e cidade da unidade.'));
      return;
    }
    try {
      if (modalKind === 'units') {
        const input = { code: draft.code.trim(), name: draft.name.trim(), city: draft.city.trim() };
        if (editingId) await updateUnit.mutateAsync({ id: Number(editingId), ...input }); else await createUnit.mutateAsync(input);
      } else if (modalKind === 'clients') {
        const input = { name: draft.name.trim(), billingCurrency: draft.billingCurrency.trim().toUpperCase() };
        if (editingId) await updateClient.mutateAsync({ id: Number(editingId), ...input }); else await createClient.mutateAsync(input);
      } else if (modalKind === 'travelers') {
        const input = { name: draft.name.trim(), userId: draft.userId ? Number(draft.userId) : null, unitId: draft.unitId ? Number(draft.unitId) : null, documentNumber: draft.documentNumber.trim() || null, canDrive: draft.canDrive };
        if (editingId) await updateTraveler.mutateAsync({ id: Number(editingId), ...input }); else await createTraveler.mutateAsync(input);
      } else if (modalKind === 'expenseTypes') {
        const input = { name: draft.name.trim(), description: draft.description.trim() || null };
        if (editingId) await updateExpenseType.mutateAsync({ id: Number(editingId), ...input }); else await createExpenseType.mutateAsync(input);
      } else if (modalKind === 'reimbursementLimits') {
        const items = draft.reimbursementItems.filter((item) => item.expenseTypeId && item.limitAmount.trim()).map((item) => ({ expenseTypeId: Number(item.expenseTypeId), limitAmount: item.limitAmount.trim() }));
        if (!draft.currency.trim() || items.length === 0) throw new Error('Informe moeda e ao menos um tipo de gasto com seu valor.');
        if (new Set(items.map((item) => item.expenseTypeId)).size !== items.length) throw new Error('Não repita o mesmo tipo de gasto no perfil de reembolso.');
        const input = { city: draft.city.trim(), currency: draft.currency.trim().toUpperCase() as 'BRL' | 'USD' | 'PYG', items };
        if (editingId) await updateReimbursementLimit.mutateAsync({ id: Number(editingId), ...input }); else await createReimbursementLimit.mutateAsync(input);
      } else if (modalKind === 'clientBillingLimits') {
        const input = prepareClientBillingProfile({ clientId: draft.clientId, currency: draft.currency, items: draft.clientBillingItems });
        if (editingId) await updateClientBillingLimit.mutateAsync({ id: Number(editingId), ...input }); else await createClientBillingLimit.mutateAsync(input);
      } else {
        const input = { name: draft.name.trim(), description: draft.description.trim() || null, category: draft.category };
        if (editingId) await updateMaintenanceReason.mutateAsync({ id: Number(editingId), ...input }); else await createMaintenanceReason.mutateAsync(input);
      }
      closeModal();
      refreshCatalogs();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('Não foi possível salvar o cadastro.'));
    }
  };

  const confirmArchive = (kind: CatalogKind, id: string, name: string) => {
    if (!liveEnabled) return;
    Alert.alert(t('Arquivar cadastro'), `${t('Deseja arquivar')} ${name}?`, [
      { text: t('Cancelar'), style: 'cancel' },
      { text: t('Arquivar'), style: 'destructive', onPress: () => void (async () => {
        try {
          if (kind === 'units') await archiveUnit.mutateAsync({ id: Number(id) });
          if (kind === 'clients') await archiveClient.mutateAsync({ id: Number(id) });
          if (kind === 'travelers') await archiveTraveler.mutateAsync({ id: Number(id) });
          if (kind === 'expenseTypes') await archiveExpenseType.mutateAsync({ id: Number(id) });
          if (kind === 'reimbursementLimits') await deleteReimbursementLimit.mutateAsync({ id: Number(id) });
          if (kind === 'clientBillingLimits') await deleteClientBillingLimit.mutateAsync({ id: Number(id) });
          if (kind === 'maintenanceReasons') await archiveMaintenanceReason.mutateAsync({ id: Number(id) });
          refreshCatalogs();
        } catch (error) {
          Alert.alert(t('Não foi possível arquivar o cadastro.'), error instanceof Error ? error.message : '');
        }
      })() },
    ]);
  };

  const cards = [
    { title: 'Unidades', description: 'Unidades usadas para vincular viagens, veículos e equipes.', count: unitRows.length, icon: 'building.2.fill' as const, kind: 'units' as CatalogKind },
    { title: 'Viajantes e condutores', description: 'Pessoas que solicitam viagens ou conduzem veículos atribuídos.', count: travelerRows.length, icon: 'person.crop.circle.fill' as const, kind: 'travelers' as CatalogKind },
    { title: 'Clientes', description: 'Clientes utilizados nas solicitações e no faturamento das despesas.', count: clientRows.length, icon: 'briefcase.fill' as const, kind: 'clients' as CatalogKind },
    { title: 'Tipos de gasto', description: 'Conceitos usados em reembolso e faturamento.', count: expenseTypeRows.length, icon: 'wallet.pass.fill' as const, kind: 'expenseTypes' as CatalogKind },
    { title: 'Limites de reembolso', description: 'Limites por tipo de gasto, cidade ou regra genérica.', count: reimbursementLimitRows.length, icon: 'wallet.pass.fill' as const, kind: 'reimbursementLimits' as CatalogKind },
    { title: 'Limites por cliente', description: 'Vínculos de faturamento e teto por cliente.', count: clientBillingLimitRows.length, icon: 'briefcase.fill' as const, kind: 'clientBillingLimits' as CatalogKind },
    { title: 'Motivos de manutenção', description: 'Tipos preventivos e corretivos para Ordens de Serviço.', count: maintenanceReasonRows.length, icon: 'wrench.and.screwdriver.fill' as const, kind: 'maintenanceReasons' as CatalogKind },
  ];

  if (!isAdmin) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6">
        <View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
          <IconSymbol name="exclamationmark.triangle.fill" size={28} color={colors.warning} />
          <Text className="mt-4 text-xl font-bold text-foreground">{t('Acesso restrito')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('Os cadastros gerais estão disponíveis somente para o perfil Administrativo.')}</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 42, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4">
      <View className="w-full max-w-6xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar')}</Text></Pressable>
          <Text className="text-sm font-medium text-muted">{t('Administrativo · Cadastros compartilhados')}</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">{t('Cadastros gerais')}</Text>
          <Text className="mt-2 max-w-3xl text-sm leading-5 text-muted">{t('Consulte os registros que alimentam simultaneamente as solicitações de viagem, a operação da frota e os relatórios administrativos.')}</Text>
          <View className="mt-4 flex-row items-center"><View className="h-2 w-2 rounded-full" style={{ backgroundColor: liveEnabled ? colors.success : colors.warning }} /><Text className="ml-2 text-xs font-semibold text-muted">{liveEnabled ? t('Dados PostgreSQL') : t('Modo demonstração local')}</Text>{authLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}</View>

          {liveEnabled && <View className="mt-5 flex-row flex-wrap gap-2"><Text className="mr-2 self-center text-xs font-semibold text-muted">{t('Novo cadastro')}:</Text>{cards.map((card) => <Pressable key={card.kind} onPress={() => openCreate(card.kind)} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 9, minHeight: 34, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}><Text className="text-xs font-bold text-foreground">{t(card.title)}</Text></Pressable>)}</View>}

          {hasCatalogError && <View className="mt-4 rounded-xl border border-error bg-surface p-4"><Text className="font-semibold text-error">{t('Não foi possível carregar os cadastros persistidos.')}</Text><Text className="mt-1 text-sm text-muted">{t('Verifique a API e tente novamente. Os dados demonstrativos não foram usados para ocultar o erro.')}</Text><Pressable onPress={retryCatalogs} style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: 10, opacity: pressed ? 0.65 : 1 })}><Text className="font-bold text-primary">{t('Tentar novamente')}</Text></Pressable></View>}
          {isLoadingCatalogs && <View className="mt-6 flex-row items-center rounded-xl border border-border bg-surface p-4"><ActivityIndicator color={colors.primary} /><Text className="ml-3 text-sm text-muted">{t('Carregando cadastros...')}</Text></View>}

          <View className="mt-7 flex-row flex-wrap gap-3">{cards.map((card) => <View key={card.title} className="min-w-[250px] flex-1 rounded-2xl border border-border bg-surface p-5"><View className="flex-row items-start justify-between"><View style={{ backgroundColor: `${colors.primary}16` }} className="h-11 w-11 items-center justify-center rounded-xl"><IconSymbol name={card.icon} size={22} color={colors.primary} /></View><Text className="text-2xl font-bold text-foreground">{card.count}</Text></View><Text className="mt-5 text-base font-bold text-foreground">{t(card.title)}</Text><Text className="mt-1 min-h-[42px] text-sm leading-5 text-muted">{t(card.description)}</Text></View>)}</View>

          <View className="mt-8 flex-row flex-wrap gap-4">
            <CatalogPanel title={t('Unidades compartilhadas')} count={unitRows.length} countLabel={t('registros')} icon="building.2.fill" colors={colors} onAdd={liveEnabled ? () => openCreate('units') : undefined} addLabel={t('Novo')}>
              {unitRows.map((unit) => <CatalogRow key={unit.id} icon="building.2.fill" colors={colors} name={unit.name} meta={`${unit.city} · ${unit.code ?? unit.id}`} live={liveEnabled} onEdit={() => openEdit('units', unit)} onArchive={() => confirmArchive('units', unit.id, unit.name)} t={t} />)}
            </CatalogPanel>
            <CatalogPanel title={t('Clientes ativos')} count={clientRows.length} countLabel={t('registros')} icon="briefcase.fill" colors={colors} onAdd={liveEnabled ? () => openCreate('clients') : undefined} addLabel={t('Novo')}>
              {clientRows.map((client) => <CatalogRow key={client.id} icon="briefcase.fill" colors={colors} name={client.name} meta={client.billingCurrency} live={liveEnabled} onEdit={() => openEdit('clients', client)} onArchive={() => confirmArchive('clients', client.id, client.name)} t={t} />)}
            </CatalogPanel>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-4">
            <CatalogPanel title={t('Viajantes e condutores')} count={travelerRows.length} countLabel={t('registros')} icon="person.crop.circle.fill" colors={colors} onAdd={liveEnabled ? () => openCreate('travelers') : undefined} addLabel={t('Novo')}>
              {travelerRows.map((traveler) => <CatalogRow key={traveler.id} icon="person.crop.circle.fill" colors={colors} name={traveler.name} meta={traveler.meta} live={liveEnabled} onEdit={() => openEdit('travelers', traveler)} onArchive={() => confirmArchive('travelers', traveler.id, traveler.name)} t={t} />)}
            </CatalogPanel>
            <CatalogPanel title={t('Tipos de gasto')} count={expenseTypeRows.length} countLabel={t('registros')} icon="wallet.pass.fill" colors={colors} onAdd={liveEnabled ? () => openCreate('expenseTypes') : undefined} addLabel={t('Novo')}>
              {expenseTypeRows.map((expenseType) => <CatalogRow key={expenseType.id} icon="wallet.pass.fill" colors={colors} name={t(expenseType.name)} meta={expenseType.meta} live={liveEnabled} onEdit={() => openEdit('expenseTypes', expenseType)} onArchive={() => confirmArchive('expenseTypes', expenseType.id, expenseType.name)} t={t} />)}
            </CatalogPanel>
            <CatalogPanel title={t('Limites de reembolso')} count={reimbursementLimitRows.length} countLabel={t('registros')} icon="wallet.pass.fill" colors={colors} onAdd={liveEnabled ? () => openCreate('reimbursementLimits') : undefined} addLabel={t('Novo')}>
              {reimbursementLimitRows.map((row) => <CatalogRow key={row.id} icon="wallet.pass.fill" colors={colors} name={row.name} meta={row.meta} live={liveEnabled} onEdit={() => openEdit('reimbursementLimits', row)} onArchive={() => confirmArchive('reimbursementLimits', row.id, row.name)} t={t} />)}
            </CatalogPanel>
          </View>
          <View className="mt-4 flex-row flex-wrap gap-4">
            <CatalogPanel title={t('Limites por cliente')} count={clientBillingLimitRows.length} countLabel={t('registros')} icon="briefcase.fill" colors={colors} onAdd={liveEnabled ? () => openCreate('clientBillingLimits') : undefined} addLabel={t('Novo')}>
              {clientBillingLimitRows.map((row) => <CatalogRow key={row.id} icon="briefcase.fill" colors={colors} name={row.name} meta={row.meta} live={liveEnabled} onEdit={() => openEdit('clientBillingLimits', row)} onArchive={() => confirmArchive('clientBillingLimits', row.id, row.name)} t={t} />)}
            </CatalogPanel>
            <CatalogPanel title={t('Motivos de manutenção')} count={maintenanceReasonRows.length} countLabel={t('motivos')} icon="wallet.pass.fill" colors={colors} onAdd={liveEnabled ? () => openCreate('maintenanceReasons') : undefined} addLabel={t('Novo')}>
              {maintenanceReasonRows.map((row) => <CatalogRow key={row.id} icon="wallet.pass.fill" colors={colors} name={row.name} meta={row.meta} live={liveEnabled} onEdit={() => openEdit('maintenanceReasons', row)} onArchive={() => confirmArchive('maintenanceReasons', row.id, row.name)} t={t} />)}
            </CatalogPanel>
          </View>

          <View className="mt-6 rounded-2xl border border-border bg-surface p-5"><Text className="text-lg font-bold text-foreground">{t('Cadastros específicos da Frota')}</Text><Text className="mt-1 text-sm leading-5 text-muted">{t('Veículos e motivos de manutenção continuam no cadastro da Frota, vinculados aos registros gerais acima.')}</Text><View className="mt-4 flex-row flex-wrap gap-3"><Pressable onPress={() => router.push('/fleet-cadastros')} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Abrir Cadastros de Frota')}</Text></Pressable><Pressable onPress={() => router.push('/new-trip')} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 10, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-foreground">{t('Nova solicitação')}</Text></Pressable></View></View>
          <CurrencyRatesPanel enabled={liveEnabled} colors={colors} t={t} />
        </ScrollView>
      </View>
      <CatalogModal kind={modalKind} editingId={editingId} draft={draft} error={formError} colors={colors} t={t} isMutating={isMutating} expenseTypes={expenseTypeRows} clients={modalKind === 'clientBillingLimits' && !editingId ? availableBillingClients : clientRows} billingItems={draft.clientBillingItems} reimbursementItems={draft.reimbursementItems} onBillingItemChange={updateBillingItem} onAddBillingItem={addBillingItem} onRemoveBillingItem={removeBillingItem} onReimbursementItemChange={updateReimbursementItem} onAddReimbursementItem={addReimbursementItem} onRemoveReimbursementItem={removeReimbursementItem} onChange={setField} onClose={closeModal} onSubmit={() => void submitCatalog()} />
    </ScreenContainer>
  );
}

function CatalogPanel({ title, count, countLabel, icon, colors, children, onAdd, addLabel }: { title: string; count: number; countLabel: string; icon: 'building.2.fill' | 'briefcase.fill' | 'person.crop.circle.fill' | 'wallet.pass.fill'; colors: ReturnType<typeof useColors>; children: ReactNode; onAdd?: () => void; addLabel: string }) {
  return <View className="min-w-[300px] flex-1 rounded-2xl border border-border bg-surface p-5"><View className="flex-row items-center justify-between"><View className="flex-row items-center"><IconSymbol name={icon} size={18} color={colors.primary} /><Text className="ml-2 flex-1 text-lg font-bold text-foreground">{title}</Text></View><View className="flex-row items-center"><Text className="mr-3 text-xs font-semibold text-primary">{count} {countLabel}</Text>{onAdd && <Pressable onPress={onAdd} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, opacity: pressed ? 0.65 : 1 })}><Text className="text-xs font-bold text-foreground">+ {addLabel}</Text></Pressable>}</View></View>{children}</View>;
}

function CatalogRow({ icon, colors, name, meta, live, onEdit, onArchive, t }: { icon: 'building.2.fill' | 'briefcase.fill' | 'person.crop.circle.fill' | 'wallet.pass.fill'; colors: ReturnType<typeof useColors>; name: string; meta?: string; live: boolean; onEdit: () => void; onArchive: () => void; t: (key: string) => string }) {
  return <View className="mt-4 flex-row flex-wrap items-center border-b border-border pb-3"><View style={{ backgroundColor: `${colors.primary}16` }} className="h-9 w-9 items-center justify-center rounded-lg"><IconSymbol name={icon} size={18} color={colors.primary} /></View><View className="ml-3 min-w-[120px] flex-1"><Text className="font-bold text-foreground">{name}</Text>{meta && <Text className="mt-1 text-xs text-muted">{meta}</Text>}</View>{live && <View className="ml-auto flex-row gap-2"><Pressable onPress={onEdit} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, opacity: pressed ? 0.65 : 1 })}><Text className="text-[11px] font-bold text-foreground">{t('Editar')}</Text></Pressable><Pressable onPress={onArchive} style={({ pressed }) => ({ borderColor: colors.error, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, opacity: pressed ? 0.65 : 1 })}><Text className="text-[11px] font-bold text-error">{t('Arquivar')}</Text></Pressable></View>}</View>;
}

function CatalogModal({ kind, editingId, draft, error, colors, t, isMutating, expenseTypes, clients, billingItems, reimbursementItems, onBillingItemChange, onAddBillingItem, onRemoveBillingItem, onReimbursementItemChange, onAddReimbursementItem, onRemoveReimbursementItem, onChange, onClose, onSubmit }: { kind: CatalogKind | null; editingId: string | null; draft: CatalogDraft; error: string; colors: ReturnType<typeof useColors>; t: (key: string) => string; isMutating: boolean; expenseTypes: DisplayExpenseType[]; clients: DisplayClient[]; billingItems: BillingItemDraft[]; reimbursementItems: BillingItemDraft[]; onBillingItemChange: (index: number, field: keyof BillingItemDraft, value: string) => void; onAddBillingItem: () => void; onRemoveBillingItem: (index: number) => void; onReimbursementItemChange: (index: number, field: keyof BillingItemDraft, value: string) => void; onAddReimbursementItem: () => void; onRemoveReimbursementItem: (index: number) => void; onChange: <K extends keyof CatalogDraft>(field: K, value: CatalogDraft[K]) => void; onClose: () => void; onSubmit: () => void }) {
  if (!kind) return null;
  const title = `${editingId ? t('Editar') : t('Novo')} ${kind === 'units' ? t('Unidade') : kind === 'clients' ? t('Cliente') : kind === 'travelers' ? t('Viajante') : kind === 'expenseTypes' ? t('Tipo de gasto') : kind === 'reimbursementLimits' ? t('Limite de reembolso') : kind === 'clientBillingLimits' ? t('Limites de faturamento por cliente') : t('Motivo de manutenção')}`;
  const currencies = ['BRL', 'USD', 'PYG'];
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 items-center justify-center bg-black/40 px-5"><View className="max-h-[90%] w-full max-w-2xl rounded-2xl bg-background p-5"><ScrollView keyboardShouldPersistTaps="handled"><View className="flex-row items-center justify-between"><Text className="text-xl font-bold text-foreground">{title}</Text><Pressable onPress={onClose} disabled={isMutating} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-2xl text-muted">×</Text></Pressable></View><Text className="mt-1 text-sm text-muted">{t('Os dados serão persistidos no PostgreSQL.')}</Text>{kind === 'units' && <><FormField label={t('Código')} value={draft.code} onChangeText={(value) => onChange('code', value)} colors={colors} /><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('Cidade')} value={draft.city} onChangeText={(value) => onChange('city', value)} colors={colors} /></>}{kind === 'clients' && <><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('Moeda de faturamento')} value={draft.billingCurrency} onChangeText={(value) => onChange('billingCurrency', value)} autoCapitalize="characters" maxLength={3} colors={colors} /></>}{kind === 'travelers' && <><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('ID da unidade (opcional)')} value={draft.unitId} onChangeText={(value) => onChange('unitId', value)} keyboardType="numeric" colors={colors} /><FormField label={t('Documento (opcional)')} value={draft.documentNumber} onChangeText={(value) => onChange('documentNumber', value)} colors={colors} /><Pressable onPress={() => onChange('canDrive', !draft.canDrive)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', marginTop: 12, opacity: pressed ? 0.65 : 1 })}><View style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 5, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: draft.canDrive ? colors.primary : colors.background }}>{draft.canDrive && <Text className="font-bold text-white">✓</Text>}</View><Text className="ml-2 text-sm text-foreground">{t('Também pode conduzir veículos')}</Text></Pressable></>}{kind === 'expenseTypes' && <><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('Descrição (opcional)')} value={draft.description} onChangeText={(value) => onChange('description', value)} multiline colors={colors} /></>}{kind === 'reimbursementLimits' && <><FormField label={t('Cidade (vazio = genérico)')} value={draft.city} onChangeText={(value) => onChange('city', value)} colors={colors} /><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Moeda do limite')}</Text><View className="flex-row flex-wrap gap-2">{currencies.map((currency) => <Pressable key={currency} onPress={() => onChange('currency', currency)} style={({ pressed }) => ({ backgroundColor: draft.currency === currency ? colors.primary : colors.surface, borderColor: draft.currency === currency ? colors.primary : colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: draft.currency === currency ? 'white' : colors.foreground }} className="font-bold">{currency}</Text></Pressable>)}</View><View className="mt-5 flex-row items-center justify-between"><View><Text className="text-base font-bold text-foreground">{t('Tipos de gasto e valores por evento')}</Text><Text className="mt-1 text-xs text-muted">{t('A cidade específica tem prioridade; o cadastro vazio atende as demais cidades.')}</Text></View><Pressable onPress={onAddReimbursementItem} disabled={isMutating} style={({ pressed }) => ({ borderColor: colors.primary, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}><Text className="text-xs font-bold text-primary">+ {t('Adicionar')}</Text></Pressable></View><View className="mt-3 gap-3">{reimbursementItems.map((item, index) => <View key={item.id ?? `reimbursement-new-${index}`} className="rounded-xl border border-border bg-surface p-3"><View className="flex-row items-end gap-2"><View className="min-w-0 flex-1"><Text className="mb-2 text-xs font-semibold text-muted">{t('Tipo de gasto')}</Text><View className="flex-row flex-wrap gap-2">{expenseTypes.length === 0 ? <Text className="text-sm text-warning">{t('Cadastre um tipo de gasto antes de criar o limite.')}</Text> : expenseTypes.map((expenseType) => <Pressable key={expenseType.id} onPress={() => onReimbursementItemChange(index, 'expenseTypeId', expenseType.id)} style={({ pressed }) => ({ backgroundColor: item.expenseTypeId === expenseType.id ? colors.primary : colors.background, borderColor: item.expenseTypeId === expenseType.id ? colors.primary : colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: item.expenseTypeId === expenseType.id ? 'white' : colors.foreground }} className="text-xs">{expenseType.name}</Text></Pressable>)}</View></View><View className="w-32"><FormField label={t('Valor por evento')} value={item.limitAmount} onChangeText={(value) => onReimbursementItemChange(index, 'limitAmount', value)} keyboardType="decimal-pad" colors={colors} /></View><Pressable accessibilityLabel={t('Remover item')} onPress={() => onRemoveReimbursementItem(index)} disabled={reimbursementItems.length <= 1 || isMutating} style={({ pressed }) => ({ paddingHorizontal: 8, paddingVertical: 12, opacity: reimbursementItems.length <= 1 || pressed ? 0.45 : 1 })}><Text className="text-lg font-bold text-error">×</Text></Pressable></View></View>)}</View></>}{kind === 'clientBillingLimits'  && <><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Cliente')}</Text><View className="flex-row flex-wrap gap-2">{clients.length === 0 ? <Text className="text-sm text-warning">{t('Cadastre um cliente antes de criar o limite.')}</Text> : clients.map((item) => <Pressable key={item.id} onPress={() => { onChange('clientId', item.id); onChange('currency', item.billingCurrency ?? 'BRL'); }} style={({ pressed }) => ({ backgroundColor: draft.clientId === item.id ? colors.primary : colors.surface, borderColor: draft.clientId === item.id ? colors.primary : colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: draft.clientId === item.id ? 'white' : colors.foreground }} className="text-xs font-bold">{item.name}</Text></Pressable>)}</View><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Moeda de faturamento')}</Text><View className="flex-row flex-wrap gap-2">{currencies.map((currency) => <Pressable key={currency} onPress={() => onChange('currency', currency)} style={({ pressed }) => ({ backgroundColor: draft.currency === currency ? colors.primary : colors.surface, borderColor: draft.currency === currency ? colors.primary : colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: draft.currency === currency ? 'white' : colors.foreground }} className="font-bold">{currency}</Text></Pressable>)}</View><View className="mt-5 flex-row items-center justify-between"><View><Text className="text-base font-bold text-foreground">{t('Tipos de gasto e valores unitários')}</Text><Text className="mt-1 text-xs text-muted">{t('Inclua quantos tipos forem necessários para este cliente.')}</Text></View><Pressable onPress={onAddBillingItem} disabled={isMutating} style={({ pressed }) => ({ borderColor: colors.primary, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}><Text className="text-xs font-bold text-primary">+ {t('Adicionar')}</Text></Pressable></View><View className="mt-3 gap-3">{billingItems.map((item, index) => <View key={item.id ?? `new-${index}`} className="rounded-xl border border-border bg-surface p-3"><View className="flex-row items-end gap-2"><View className="min-w-0 flex-1"><Text className="mb-2 text-xs font-semibold text-muted">{t('Tipo de gasto')}</Text><View className="flex-row flex-wrap gap-2">{expenseTypes.map((expenseType) => <Pressable key={expenseType.id} onPress={() => onBillingItemChange(index, 'expenseTypeId', expenseType.id)} style={({ pressed }) => ({ backgroundColor: item.expenseTypeId === expenseType.id ? colors.primary : colors.background, borderColor: item.expenseTypeId === expenseType.id ? colors.primary : colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: item.expenseTypeId === expenseType.id ? 'white' : colors.foreground }} className="text-xs">{expenseType.name}</Text></Pressable>)}</View></View><View className="w-32"><FormField label={t('Valor unitário')} value={item.limitAmount} onChangeText={(value) => onBillingItemChange(index, 'limitAmount', value)} keyboardType="decimal-pad" colors={colors} /></View><Pressable accessibilityLabel={t('Remover item')} onPress={() => onRemoveBillingItem(index)} disabled={billingItems.length <= 1 || isMutating} style={({ pressed }) => ({ paddingHorizontal: 8, paddingVertical: 12, opacity: billingItems.length <= 1 || pressed ? 0.45 : 1 })}><Text className="text-lg font-bold text-error">×</Text></Pressable></View></View>)}</View></>}{kind === 'maintenanceReasons' && <><FormField label={t('Nome do motivo')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><Text className="mb-2 mt-4 text-xs font-semibold text-muted">Categoria</Text><View className="flex-row gap-2"><Pressable onPress={() => onChange('category', 'Preventiva')} style={({ pressed }) => ({ flex: 1, backgroundColor: draft.category === 'Preventiva' ? colors.primary : colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, opacity: pressed ? 0.7 : 1 })}><Text className="text-center font-bold text-foreground">Preventiva</Text></Pressable><Pressable onPress={() => onChange('category', 'Corretiva')} style={({ pressed }) => ({ flex: 1, backgroundColor: draft.category === 'Corretiva' ? colors.primary : colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, opacity: pressed ? 0.7 : 1 })}><Text className="text-center font-bold text-foreground">Corretiva</Text></Pressable></View><FormField label={t('Descrição (opcional)')} value={draft.description} onChangeText={(value) => onChange('description', value)} multiline colors={colors} /></>}{error && <Text className="mt-3 text-sm font-semibold text-error">{error}</Text>}<Pressable onPress={onSubmit} disabled={isMutating} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 44, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed || isMutating ? 0.65 : 1 })}>{isMutating ? <ActivityIndicator color="#ffffff" /> : <Text className="font-bold text-white">{t('Salvar cadastro')}</Text>}</Pressable></ScrollView></View></KeyboardAvoidingView></Modal>;
}
function CurrencyRatesPanel({ enabled, colors, t }: { enabled: boolean; colors: ReturnType<typeof useColors>; t: (key: string) => string }) {
  const query = trpc.catalogs.currencyRates.latest.useQuery(undefined, { enabled });
  const sync = trpc.catalogs.currencyRates.sync.useMutation({ onSuccess: () => void query.refetch() });
  const rows = (query.data ?? []).filter((row) => row.fromCurrency !== row.toCurrency);
  const latestDate = rows[0]?.rateDate ?? t('Sem cotação registrada');
  return <View className="mt-4 rounded-2xl border border-border bg-surface p-5"><View className="flex-row flex-wrap items-start justify-between gap-3"><View className="min-w-0 flex-1"><Text className="text-lg font-bold text-foreground">{t('Cotações diárias')}</Text><Text className="mt-1 text-sm leading-5 text-muted">{t('Taxas oficiais em relação ao Guarani, registradas por data, fonte e tipo de cotação.')}</Text></View><Pressable onPress={() => sync.mutate()} disabled={!enabled || sync.isPending} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 9, minHeight: 38, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', opacity: pressed || sync.isPending ? 0.65 : 1 })}><Text className="text-xs font-bold text-white">{sync.isPending ? t('Atualizando...') : t('Atualizar agora')}</Text></Pressable></View>{query.isLoading ? <View className="mt-4 flex-row items-center"><ActivityIndicator color={colors.primary} /><Text className="ml-2 text-sm text-muted">{t('Carregando cotações...')}</Text></View> : rows.length === 0 ? <Text className="mt-4 text-sm text-muted">{t('A rotina automática ainda não registrou uma cotação.')}</Text> : <View className="mt-4 flex-row flex-wrap gap-3">{rows.map((row) => <View key={`${row.rateDate}-${row.fromCurrency}-${row.toCurrency}`} className="min-w-[180px] flex-1 rounded-xl border border-border bg-background p-3"><Text className="text-xs font-bold text-muted">{row.fromCurrency} → {row.toCurrency}</Text><Text className="mt-1 text-lg font-bold text-foreground">{row.rate}</Text><Text className="mt-1 text-xs text-muted">{latestDate} · {row.source} · {row.rateType}</Text></View>)}</View>}</View>;
}

function FormField({ label, value, onChangeText, colors, ...props }: { label: string; value: string; onChangeText: (value: string) => void; colors: ReturnType<typeof useColors>; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; maxLength?: number; keyboardType?: 'default' | 'numeric' | 'decimal-pad'; multiline?: boolean }) {
  return <View className="mt-4"><Text className="mb-1 text-xs font-semibold text-muted">{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={label} placeholderTextColor={colors.muted} className="rounded-xl border border-border bg-surface px-3 py-3 text-foreground" {...props} /></View>;
}
