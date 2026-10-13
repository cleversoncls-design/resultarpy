import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { confirmAction, showMessage } from '@/lib/dialogs';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';
import { prepareClientBillingProfile } from '@/lib/client-billing-profile';
import * as Api from '@/lib/_core/api';

// Perfis que podem ser aprovador padrão de um viajante -- os mesmos que já
// enxergam a fila de aprovações (approvals.list) e podem decidir viagens
// (ver decideTripApproval em operations-repository.ts).
const APPROVER_PROFILES: Api.LocalProfile[] = ['admin', 'approver', 'traveler_approver'];

const catalogQueryInput = {
  page: 1,
  pageSize: 100,
  includeInactive: false,
  direction: 'asc' as const,
};

type CatalogKind = 'units' | 'cities' | 'clients' | 'travelers' | 'expenseTypes' | 'reimbursementLimits' | 'clientBillingLimits' | 'maintenanceReasons';
const VALID_KINDS: CatalogKind[] = ['units', 'cities', 'clients', 'travelers', 'expenseTypes', 'reimbursementLimits', 'clientBillingLimits', 'maintenanceReasons'];

const KIND_META: Record<CatalogKind, { title: string; singular: string; description: string; icon: 'building.2.fill' | 'briefcase.fill' | 'person.crop.circle.fill' | 'wallet.pass.fill' | 'wrench.and.screwdriver.fill' }> = {
  units: { title: 'Unidades', singular: 'Unidade', description: 'Filiais ou escritórios da própria empresa, usados para vincular viagens, veículos e equipes.', icon: 'building.2.fill' },
  cities: { title: 'Cidades', singular: 'Cidade', description: 'Qualquer cidade onde possa haver gasto de viagem — não precisa ter escritório da empresa lá.', icon: 'building.2.fill' },
  clients: { title: 'Clientes', singular: 'Cliente', description: 'Clientes utilizados nas solicitações e no faturamento das despesas.', icon: 'briefcase.fill' },
  travelers: { title: 'Viajantes e condutores', singular: 'Viajante', description: 'Pessoas que solicitam viagens ou conduzem veículos atribuídos.', icon: 'person.crop.circle.fill' },
  expenseTypes: { title: 'Tipos de gasto', singular: 'Tipo de gasto', description: 'Conceitos usados em reembolso e faturamento.', icon: 'wallet.pass.fill' },
  reimbursementLimits: { title: 'Limites de reembolso', singular: 'Limite de reembolso', description: 'Limites por tipo de gasto, cidade ou regra genérica.', icon: 'wallet.pass.fill' },
  clientBillingLimits: { title: 'Limites por cliente', singular: 'Limite por cliente', description: 'Vínculos de faturamento e teto por cliente.', icon: 'briefcase.fill' },
  maintenanceReasons: { title: 'Motivos de manutenção', singular: 'Motivo de manutenção', description: 'Tipos preventivos e corretivos para Ordens de Serviço.', icon: 'wrench.and.screwdriver.fill' },
};

type DisplayUnit = { id: string; name: string; city: string; code?: string };
type DisplayCity = { id: string; name: string };
type DisplayClient = { id: string; name: string; billingCurrency?: string; kmRate?: string | null; kmRateCurrency?: string };
type DisplayTraveler = { id: string; name: string; meta?: string; userId?: number | null; unitId?: number | null; documentNumber?: string | null; canDrive?: boolean; approverId?: number | null; approverName?: string | null };
type DisplayExpenseType = { id: string; name: string; meta?: string; description?: string | null };
type BillingItemDraft = { id?: string; expenseTypeId: string; limitAmount: string };
type DisplayLimit = { id: string; name: string; meta?: string; expenseTypeId?: number; clientId?: number; city?: string; limitAmount?: string; resetsCycle?: boolean; currency?: string; items?: { id: number; expenseTypeId: number; expenseTypeName: string; limitAmount: string }[] };
type CatalogRecord = DisplayUnit | DisplayCity | DisplayClient | DisplayTraveler | DisplayExpenseType | DisplayLimit;
type CatalogDraft = {
  code: string;
  name: string;
  city: string;
  billingCurrency: string;
  kmRate: string;
  kmRateCurrency: string;
  userId: string;
  unitId: string;
  documentNumber: string;
  canDrive: boolean;
  approverId: string;
  description: string;
  expenseTypeId: string;
  clientId: string;
  limitAmount: string;
  currency: string;
  clientBillingItems: BillingItemDraft[];
  reimbursementItems: BillingItemDraft[];
  category: 'Preventiva' | 'Corretiva';
  resetsMaintenanceCycle: boolean;
};

const emptyDraft: CatalogDraft = {
  code: '',
  name: '',
  city: '',
  billingCurrency: 'BRL',
  kmRate: '',
  kmRateCurrency: 'USD',
  userId: '',
  unitId: '',
  documentNumber: '',
  canDrive: false,
  approverId: '',
  description: '',
  expenseTypeId: '',
  clientId: '',
  limitAmount: '',
  currency: 'BRL',
  clientBillingItems: [],
  reimbursementItems: [],
  category: 'Preventiva',
  resetsMaintenanceCycle: false,
};

export default function CatalogDetailScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const profile = user?.profile ?? (user?.role === 'admin' ? 'admin' : 'traveler');
  const isAdmin = profile === 'admin';
  const liveEnabled = isAdmin && isAuthenticated;

  const params = useLocalSearchParams<{ tipo?: string }>();
  const kind: CatalogKind | null = VALID_KINDS.includes(params.tipo as CatalogKind) ? (params.tipo as CatalogKind) : null;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CatalogDraft>(emptyDraft);
  const [formError, setFormError] = useState('');
  const [listSearch, setListSearch] = useState('');

  // Só a consulta do tipo de cadastro atual é habilitada — diferente da
  // tela antiga, que buscava os 8 cadastros de uma vez na mesma página.
  const unitsQuery = trpc.catalogs.units.list.useQuery(catalogQueryInput, { enabled: liveEnabled && kind === 'units' });
  const citiesQuery = trpc.catalogs.cities.list.useQuery(catalogQueryInput, { enabled: liveEnabled && kind === 'cities' });
  const clientsQuery = trpc.catalogs.clients.list.useQuery(catalogQueryInput, { enabled: liveEnabled && (kind === 'clients' || kind === 'clientBillingLimits') });
  const travelersQuery = trpc.catalogs.travelers.list.useQuery(catalogQueryInput, { enabled: liveEnabled && kind === 'travelers' });
  const expenseTypesQuery = trpc.catalogs.expenseTypes.list.useQuery(catalogQueryInput, { enabled: liveEnabled && (kind === 'expenseTypes' || kind === 'reimbursementLimits' || kind === 'clientBillingLimits') });
  const reimbursementLimitsQuery = trpc.catalogs.reimbursementLimits.list.useQuery(catalogQueryInput, { enabled: liveEnabled && kind === 'reimbursementLimits' });
  const clientBillingLimitsQuery = trpc.catalogs.clientBillingLimits.list.useQuery(catalogQueryInput, { enabled: liveEnabled && kind === 'clientBillingLimits' });
  const maintenanceReasonsQuery = trpc.catalogs.maintenanceReasons.list.useQuery(catalogQueryInput, { enabled: liveEnabled && kind === 'maintenanceReasons' });

  // Lista de usuários locais só pra montar as opções de "Aprovador padrão"
  // do viajante (admin, aprovador ou viajante+aprovador) -- não existe
  // ainda um endpoint tRPC pra isso, reaproveita o mesmo usado em
  // Usuários locais (app/admin-users.tsx).
  const [approverCandidates, setApproverCandidates] = useState<Api.LocalUser[]>([]);
  useEffect(() => {
    if (!liveEnabled || kind !== 'travelers') return;
    let cancelled = false;
    Api.listLocalUsers().then((list) => { if (!cancelled) setApproverCandidates(list); }).catch(() => { if (!cancelled) setApproverCandidates([]); });
    return () => { cancelled = true; };
  }, [liveEnabled, kind]);

  const createUnit = trpc.catalogs.units.create.useMutation();
  const updateUnit = trpc.catalogs.units.update.useMutation();
  const archiveUnit = trpc.catalogs.units.archive.useMutation();
  const createCity = trpc.catalogs.cities.create.useMutation();
  const updateCity = trpc.catalogs.cities.update.useMutation();
  const archiveCity = trpc.catalogs.cities.archive.useMutation();
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
    () => unitsQuery.data ? unitsQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, city: item.city, code: item.code })) : [],
    [unitsQuery.data],
  );
  const cityRows = useMemo<DisplayCity[]>(
    () => citiesQuery.data ? citiesQuery.data.items.map((item) => ({ id: String(item.id), name: item.name })) : [],
    [citiesQuery.data],
  );
  const travelerRows = useMemo<DisplayTraveler[]>(
    () => travelersQuery.data ? travelersQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, meta: `${item.canDrive ? t('Condutor') : t('Viajante')} · ${t('Aprovador')}: ${item.approverName ?? t('não definido')}`, userId: item.userId, unitId: item.unitId, documentNumber: item.documentNumber, canDrive: item.canDrive, approverId: item.approverId, approverName: item.approverName })) : [],
    [t, travelersQuery.data],
  );
  // Só quem tem perfil admin/aprovador/viajante+aprovador pode ser
  // aprovador padrão -- e nunca o próprio usuário vinculado ao viajante em
  // edição (ver ApproverCannotBeSelfError no servidor).
  const approverOptions = useMemo(
    () => approverCandidates
      .filter((candidate) => APPROVER_PROFILES.includes(candidate.profile) && String(candidate.id) !== draft.userId)
      .map((candidate) => ({ id: String(candidate.id), label: candidate.name?.trim() || candidate.email || `Usuário ${candidate.id}` })),
    [approverCandidates, draft.userId],
  );
  const clientRows = useMemo<DisplayClient[]>(
    () => clientsQuery.data ? clientsQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, billingCurrency: item.billingCurrency, kmRate: item.kmRate, kmRateCurrency: item.kmRateCurrency })) : [],
    [clientsQuery.data],
  );
  const expenseTypeRows = useMemo<DisplayExpenseType[]>(
    () => expenseTypesQuery.data ? expenseTypesQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, meta: t('Cadastro ativo'), description: item.description })) : [],
    [expenseTypesQuery.data, t],
  );
  const reimbursementLimitRows = useMemo<DisplayLimit[]>(() => reimbursementLimitsQuery.data ? reimbursementLimitsQuery.data.items.map((item) => ({ id: String(item.id), name: item.city || 'Genérico', meta: `${item.currency} · ${item.items.length} tipos de gasto`, city: item.city, currency: item.currency, items: item.items })) : [], [reimbursementLimitsQuery.data]);
  const clientBillingLimitRows = useMemo<DisplayLimit[]>(() => clientBillingLimitsQuery.data ? clientBillingLimitsQuery.data.items.map((item) => ({ id: String(item.id), name: item.clientName, meta: `${item.currency} · ${item.items.length} tipos de gasto`, clientId: item.clientId, currency: item.currency, items: item.items })) : [], [clientBillingLimitsQuery.data]);
  const availableBillingClients = useMemo(() => { const configured = new Set(clientBillingLimitRows.map((item) => item.clientId)); return clientRows.filter((item) => !configured.has(Number(item.id))); }, [clientBillingLimitRows, clientRows]);
  const maintenanceReasonRows = useMemo<DisplayLimit[]>(() => maintenanceReasonsQuery.data ? maintenanceReasonsQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, meta: item.category, limitAmount: item.description ?? '', resetsCycle: item.resetsMaintenanceCycle })) : [], [maintenanceReasonsQuery.data]);

  const rowsByKind: Record<CatalogKind, CatalogRecord[]> = {
    units: unitRows,
    cities: cityRows,
    clients: clientRows,
    travelers: travelerRows,
    expenseTypes: expenseTypeRows,
    reimbursementLimits: reimbursementLimitRows,
    clientBillingLimits: clientBillingLimitRows,
    maintenanceReasons: maintenanceReasonRows,
  };
  const currentRows = kind ? rowsByKind[kind] : [];
  // Busca local por nome, no mesmo padrão de filtro em memória já usado em
  // Minhas viagens — não substitui a busca de vínculo (CatalogSearch), que
  // é usada só dentro do modal de criar/editar.
  const filteredRows = useMemo(() => {
    const query = listSearch.trim().toLocaleLowerCase();
    if (!query) return currentRows;
    return currentRows.filter((row) => ('name' in row ? row.name : '').toLocaleLowerCase().includes(query));
  }, [currentRows, listSearch]);

  const activeQuery = kind === 'units' ? unitsQuery
    : kind === 'cities' ? citiesQuery
    : kind === 'clients' ? clientsQuery
    : kind === 'travelers' ? travelersQuery
    : kind === 'expenseTypes' ? expenseTypesQuery
    : kind === 'reimbursementLimits' ? reimbursementLimitsQuery
    : kind === 'clientBillingLimits' ? clientBillingLimitsQuery
    : kind === 'maintenanceReasons' ? maintenanceReasonsQuery
    : null;
  const isLoading = liveEnabled && Boolean(activeQuery?.isLoading);
  const hasError = liveEnabled && Boolean(activeQuery?.isError);

  const isMutating = [createUnit, updateUnit, createCity, updateCity, createClient, updateClient, createTraveler, updateTraveler, createExpenseType, updateExpenseType, createReimbursementLimit, updateReimbursementLimit, deleteReimbursementLimit, createClientBillingLimit, updateClientBillingLimit, deleteClientBillingLimit, createMaintenanceReason, updateMaintenanceReason, archiveMaintenanceReason].some((mutation) => mutation.isPending);
  const refresh = () => activeQuery?.refetch();

  const setField = <K extends keyof CatalogDraft>(field: K, value: CatalogDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError('');
  };

  const setBillingItems = (items: BillingItemDraft[]) => setDraft((current) => ({ ...current, clientBillingItems: items }));
  const setReimbursementItems = (items: BillingItemDraft[]) => setDraft((current) => ({ ...current, reimbursementItems: items }));

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (item: CatalogRecord) => {
    const base = { ...emptyDraft, name: item.name };
    if (kind === 'units' && 'city' in item && 'code' in item) Object.assign(base, { code: item.code ?? '', city: item.city });
    if (kind === 'clients' && 'billingCurrency' in item) Object.assign(base, { billingCurrency: item.billingCurrency ?? 'BRL', kmRate: item.kmRate ? String(Number(item.kmRate)) : '', kmRateCurrency: item.kmRateCurrency ?? 'USD' });
    if (kind === 'travelers' && 'canDrive' in item) Object.assign(base, { userId: item.userId ? String(item.userId) : '', unitId: item.unitId ? String(item.unitId) : '', documentNumber: item.documentNumber ?? '', canDrive: item.canDrive ?? false, approverId: item.approverId ? String(item.approverId) : '' });
    if (kind === 'expenseTypes' && 'description' in item) Object.assign(base, { description: item.description ?? '' });
    if (kind === 'reimbursementLimits' && 'items' in item) Object.assign(base, { city: item.city ?? '', currency: item.currency ?? 'BRL', reimbursementItems: (item.items ?? []).map((entry) => ({ id: String(entry.id), expenseTypeId: String(entry.expenseTypeId), limitAmount: entry.limitAmount })), name: item.name });
    if (kind === 'clientBillingLimits' && 'items' in item) Object.assign(base, { clientId: item.clientId ? String(item.clientId) : '', currency: item.currency ?? 'BRL', clientBillingItems: (item.items ?? []).map((entry) => ({ id: String(entry.id), expenseTypeId: String(entry.expenseTypeId), limitAmount: entry.limitAmount })), name: item.name });
    if (kind === 'maintenanceReasons' && 'limitAmount' in item && 'meta' in item) Object.assign(base, { description: item.limitAmount ?? '', category: item.meta === 'Corretiva' ? 'Corretiva' : 'Preventiva', resetsMaintenanceCycle: 'resetsCycle' in item ? Boolean(item.resetsCycle) : false });
    setEditingId(item.id);
    setDraft(base);
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isMutating) return;
    setModalOpen(false);
    setEditingId(null);
  };

  const submitCatalog = async () => {
    const kindsWithoutNameField: CatalogKind[] = ['reimbursementLimits', 'clientBillingLimits'];
    if (!kind || (!kindsWithoutNameField.includes(kind) && !draft.name.trim())) {
      setFormError(t('Informe um nome válido.'));
      return;
    }
    if (kind === 'units' && (!draft.code.trim() || !draft.city.trim())) {
      setFormError(t('Informe código e cidade da unidade.'));
      return;
    }
    try {
      if (kind === 'units') {
        const input = { code: draft.code.trim(), name: draft.name.trim(), city: draft.city.trim() };
        if (editingId) await updateUnit.mutateAsync({ id: Number(editingId), ...input }); else await createUnit.mutateAsync(input);
      } else if (kind === 'cities') {
        const input = { name: draft.name.trim() };
        if (editingId) await updateCity.mutateAsync({ id: Number(editingId), ...input }); else await createCity.mutateAsync(input);
      } else if (kind === 'clients') {
        const input = { name: draft.name.trim(), billingCurrency: draft.billingCurrency.trim().toUpperCase(), kmRate: draft.kmRate.trim() || null, kmRateCurrency: (draft.kmRateCurrency.trim() || 'USD').toUpperCase() };
        if (editingId) await updateClient.mutateAsync({ id: Number(editingId), ...input }); else await createClient.mutateAsync(input);
      } else if (kind === 'travelers') {
        const input = { name: draft.name.trim(), userId: draft.userId ? Number(draft.userId) : null, unitId: draft.unitId ? Number(draft.unitId) : null, documentNumber: draft.documentNumber.trim() || null, canDrive: draft.canDrive, approverId: draft.approverId ? Number(draft.approverId) : null };
        if (editingId) await updateTraveler.mutateAsync({ id: Number(editingId), ...input }); else await createTraveler.mutateAsync(input);
      } else if (kind === 'expenseTypes') {
        const input = { name: draft.name.trim(), description: draft.description.trim() || null };
        if (editingId) await updateExpenseType.mutateAsync({ id: Number(editingId), ...input }); else await createExpenseType.mutateAsync(input);
      } else if (kind === 'reimbursementLimits') {
        const items = draft.reimbursementItems.filter((item) => item.expenseTypeId && item.limitAmount.trim()).map((item) => ({ expenseTypeId: Number(item.expenseTypeId), limitAmount: item.limitAmount.trim() }));
        if (!draft.currency.trim() || items.length === 0) throw new Error('Informe moeda e ao menos um tipo de gasto com seu valor.');
        if (new Set(items.map((item) => item.expenseTypeId)).size !== items.length) throw new Error('Não repita o mesmo tipo de gasto no perfil de reembolso.');
        const input = { city: draft.city.trim(), currency: draft.currency.trim().toUpperCase() as 'BRL' | 'USD' | 'PYG', items };
        if (editingId) await updateReimbursementLimit.mutateAsync({ id: Number(editingId), ...input }); else await createReimbursementLimit.mutateAsync(input);
      } else if (kind === 'clientBillingLimits') {
        const input = prepareClientBillingProfile({ clientId: draft.clientId, currency: draft.currency, items: draft.clientBillingItems });
        if (editingId) await updateClientBillingLimit.mutateAsync({ id: Number(editingId), ...input }); else await createClientBillingLimit.mutateAsync(input);
      } else {
        const input = { name: draft.name.trim(), description: draft.description.trim() || null, category: draft.category, resetsMaintenanceCycle: draft.resetsMaintenanceCycle };
        if (editingId) await updateMaintenanceReason.mutateAsync({ id: Number(editingId), ...input }); else await createMaintenanceReason.mutateAsync(input);
      }
      closeModal();
      refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('Não foi possível salvar o cadastro.'));
    }
  };

  const confirmArchive = (id: string, name: string) => {
    if (!liveEnabled || !kind) return;
    void (async () => {
      const confirmed = await confirmAction({ title: t('Arquivar cadastro'), message: `${t('Deseja arquivar')} ${name}?`, confirmLabel: t('Arquivar'), cancelLabel: t('Cancelar'), destructive: true });
      if (!confirmed) return;
      try {
        if (kind === 'units') await archiveUnit.mutateAsync({ id: Number(id) });
        if (kind === 'cities') await archiveCity.mutateAsync({ id: Number(id) });
        if (kind === 'clients') await archiveClient.mutateAsync({ id: Number(id) });
        if (kind === 'travelers') await archiveTraveler.mutateAsync({ id: Number(id) });
        if (kind === 'expenseTypes') await archiveExpenseType.mutateAsync({ id: Number(id) });
        if (kind === 'reimbursementLimits') await deleteReimbursementLimit.mutateAsync({ id: Number(id) });
        if (kind === 'clientBillingLimits') await deleteClientBillingLimit.mutateAsync({ id: Number(id) });
        if (kind === 'maintenanceReasons') await archiveMaintenanceReason.mutateAsync({ id: Number(id) });
        refresh();
      } catch (error) {
        showMessage(t('Não foi possível arquivar o cadastro.'), error instanceof Error ? error.message : '');
      }
    })();
  };

  if (!kind) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6">
        <View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
          <IconSymbol name="exclamationmark.triangle.fill" size={28} color={colors.warning} />
          <Text className="mt-4 text-xl font-bold text-foreground">{t('Cadastro não encontrado')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('O tipo de cadastro informado na URL não é válido.')}</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 42, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable>
        </View>
      </ScreenContainer>
    );
  }

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

  const meta = KIND_META[kind];

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4">
      <View className="w-full max-w-4xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar aos cadastros')}</Text></Pressable>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-medium text-muted">{t('Administrativo · Cadastros')}</Text>
              <Text className="mt-1 text-3xl font-bold text-foreground">{t(meta.title)}</Text>
              <Text className="mt-2 text-sm leading-5 text-muted">{t(meta.description)}</Text>
              <Text className="mt-2 text-xs font-bold text-muted">{currentRows.length} {t('registros cadastrados')}</Text>
            </View>
            <Pressable onPress={openCreate} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">+ {t('Novo')}</Text></Pressable>
          </View>

          {authLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />}
          {hasError && <View className="mt-4 rounded-xl border border-error bg-surface p-4"><Text className="font-semibold text-error">{t('Não foi possível carregar este cadastro.')}</Text><Pressable onPress={refresh} style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: 10, opacity: pressed ? 0.65 : 1 })}><Text className="font-bold text-primary">{t('Tentar novamente')}</Text></Pressable></View>}
          {isLoading && <View className="mt-6 flex-row items-center rounded-xl border border-border bg-surface p-4"><ActivityIndicator color={colors.primary} /><Text className="ml-3 text-sm text-muted">{t('Carregando cadastros...')}</Text></View>}

          {currentRows.length > 6 ? (
            <View className="mt-5 flex-row items-center rounded-2xl border border-border bg-surface px-4">
              <TextInput value={listSearch} onChangeText={setListSearch} placeholder={t('Buscar por nome...')} placeholderTextColor={colors.muted} className="flex-1 py-3 text-foreground" />
              <Text className="text-lg text-muted">⌕</Text>
            </View>
          ) : null}

          <View style={{ borderTopWidth: 3, borderTopColor: colors.primary }} className="mt-6 rounded-2xl border border-border bg-surface p-2">
            {!isLoading && filteredRows.length === 0 ? (
              <Text className="p-4 text-sm text-muted">{listSearch.trim() ? t('Nenhum registro encontrado para a busca.') : t('Nenhum registro cadastrado ainda.')}</Text>
            ) : (
              filteredRows.map((row, index) => {
                const name = 'name' in row ? row.name : '';
                const meta2 = 'meta' in row ? `${row.meta}${'resetsCycle' in row && row.resetsCycle ? ` · ${t('Reinicia o ciclo de revisão')}` : ''}` : 'city' in row ? `${row.city}${'code' in row && row.code ? ` · ${row.code}` : ''}` : undefined;
                return (
                  <View key={row.id} className={`flex-row flex-wrap items-center p-4 ${index > 0 ? 'border-t border-border' : ''}`}>
                    <View style={{ backgroundColor: `${colors.primary}16` }} className="h-9 w-9 items-center justify-center rounded-lg"><IconSymbol name={meta.icon} size={18} color={colors.primary} /></View>
                    <View className="ml-3 min-w-[140px] flex-1">
                      <Text className="font-bold text-foreground">{name}</Text>
                      {meta2 ? <Text className="mt-1 text-xs text-muted">{meta2}</Text> : null}
                    </View>
                    <View className="ml-auto flex-row gap-2">
                      <Pressable onPress={() => openEdit(row)} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, opacity: pressed ? 0.65 : 1 })}><Text className="text-xs font-bold text-foreground">{t('Editar')}</Text></Pressable>
                      <Pressable onPress={() => confirmArchive(row.id, name)} style={({ pressed }) => ({ borderColor: colors.error, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, opacity: pressed ? 0.65 : 1 })}><Text className="text-xs font-bold text-error">{t('Arquivar')}</Text></Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>

      <CatalogModal
        visible={modalOpen}
        kind={kind}
        editingId={editingId}
        draft={draft}
        error={formError}
        colors={colors}
        t={t}
        isMutating={isMutating}
        expenseTypes={expenseTypeRows}
        cities={cityRows}
        clients={kind === 'clientBillingLimits' && !editingId ? availableBillingClients : clientRows}
        approverOptions={approverOptions}
        billingItems={draft.clientBillingItems}
        reimbursementItems={draft.reimbursementItems}
        onBillingItemsChange={setBillingItems}
        onReimbursementItemsChange={setReimbursementItems}
        onChange={setField}
        onClose={closeModal}
        onSubmit={() => void submitCatalog()}
      />
    </ScreenContainer>
  );
}

function CatalogModal({ visible, kind, editingId, draft, error, colors, t, isMutating, expenseTypes, cities, clients, approverOptions, billingItems, reimbursementItems, onBillingItemsChange, onReimbursementItemsChange, onChange, onClose, onSubmit }: { visible: boolean; kind: CatalogKind; editingId: string | null; draft: CatalogDraft; error: string; colors: ReturnType<typeof useColors>; t: (key: string) => string; isMutating: boolean; expenseTypes: DisplayExpenseType[]; cities: DisplayCity[]; clients: DisplayClient[]; approverOptions: { id: string; label: string }[]; billingItems: BillingItemDraft[]; reimbursementItems: BillingItemDraft[]; onBillingItemsChange: (items: BillingItemDraft[]) => void; onReimbursementItemsChange: (items: BillingItemDraft[]) => void; onChange: <K extends keyof CatalogDraft>(field: K, value: CatalogDraft[K]) => void; onClose: () => void; onSubmit: () => void }) {
  if (!visible) return null;
  const title = `${editingId ? t('Editar') : t('Novo')} ${t(KIND_META[kind].singular)}`;
  const currencies = ['BRL', 'USD', 'PYG'];
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 items-center justify-center bg-black/40 px-5"><View className="max-h-[90%] w-full max-w-2xl rounded-2xl bg-background p-5"><ScrollView keyboardShouldPersistTaps="handled"><View className="flex-row items-center justify-between"><Text className="text-xl font-bold text-foreground">{title}</Text><Pressable onPress={onClose} disabled={isMutating} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-2xl text-muted">×</Text></Pressable></View><Text className="mt-1 text-sm text-muted">{t('Os dados serão persistidos no PostgreSQL.')}</Text>{kind === 'units' && <><FormField label={t('Código')} value={draft.code} onChangeText={(value) => onChange('code', value)} colors={colors} /><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('Cidade')} value={draft.city} onChangeText={(value) => onChange('city', value)} colors={colors} /></>}{kind === 'cities' && <><FormField label={t('Nome da cidade')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /></>}{kind === 'clients' && <><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('Moeda de faturamento')} value={draft.billingCurrency} onChangeText={(value) => onChange('billingCurrency', value)} autoCapitalize="characters" maxLength={3} colors={colors} /><FormField label={t('Tarifa por KM (opcional)')} value={draft.kmRate} onChangeText={(value) => onChange('kmRate', value)} keyboardType="decimal-pad" colors={colors} /><FormField label={t('Moeda da tarifa por KM')} value={draft.kmRateCurrency} onChangeText={(value) => onChange('kmRateCurrency', value)} autoCapitalize="characters" maxLength={3} colors={colors} /><Text className="mt-2 text-xs text-muted">{t('O KM rodado com veículo da frota (KM final − KM inicial) entra sozinho no relatório de faturamento, multiplicado por esta tarifa. Deixe vazio para não cobrar KM deste cliente.')}</Text></>}{kind === 'travelers' && <><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('ID da unidade (opcional)')} value={draft.unitId} onChangeText={(value) => onChange('unitId', value)} keyboardType="numeric" colors={colors} /><FormField label={t('Documento (opcional)')} value={draft.documentNumber} onChangeText={(value) => onChange('documentNumber', value)} colors={colors} /><Pressable onPress={() => onChange('canDrive', !draft.canDrive)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', marginTop: 12, opacity: pressed ? 0.65 : 1 })}><View style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 5, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: draft.canDrive ? colors.primary : colors.background }}>{draft.canDrive && <Text className="font-bold text-white">✓</Text>}</View><Text className="ml-2 text-sm text-foreground">{t('Também pode conduzir veículos')}</Text></Pressable><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Aprovador padrão')}</Text><CatalogSearch value={draft.approverId || null} options={approverOptions} placeholder={t('Pesquisar aprovador')} emptyLabel={t('Nenhum usuário admin/aprovador disponível')} onChange={(value) => onChange('approverId', value ?? '')} /><Text className="mt-1 text-xs text-muted">{t('Quem decide as viagens deste viajante. Sem isso definido, ele não conseguirá criar viagens.')}</Text></>}{kind === 'expenseTypes' && <><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('Descrição (opcional)')} value={draft.description} onChangeText={(value) => onChange('description', value)} multiline colors={colors} /></>}{kind === 'reimbursementLimits' && <><Text className="mb-1 mt-4 text-xs font-semibold text-muted">{t('Cidade (vazio = genérico)')}</Text><CatalogSearch value={draft.city || null} options={cities.map((item) => ({ id: item.name, label: item.name }))} placeholder={t('Pesquisar cidade')} emptyLabel={t('Nenhuma cidade cadastrada')} onChange={(value) => onChange('city', value ?? '')} /><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Moeda do limite')}</Text><View className="flex-row flex-wrap gap-2">{currencies.map((currency) => <Pressable key={currency} onPress={() => onChange('currency', currency)} style={({ pressed }) => ({ backgroundColor: draft.currency === currency ? colors.primary : colors.surface, borderColor: draft.currency === currency ? colors.primary : colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: draft.currency === currency ? 'white' : colors.foreground }} className="font-bold">{currency}</Text></Pressable>)}</View><LimitItemsEditor title={t('Tipos de gasto e valores por evento')} helper={t('A cidade específica tem prioridade; o cadastro vazio atende as demais cidades.')} valueLabel={t('Valor por evento')} currency={draft.currency} items={reimbursementItems} expenseTypes={expenseTypes} colors={colors} t={t} disabled={isMutating} onChange={onReimbursementItemsChange} /></>}{kind === 'clientBillingLimits'  && <><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Cliente')}</Text><CatalogSearch value={draft.clientId || null} options={clients.map((item) => ({ id: item.id, label: item.name }))} placeholder={t('Pesquisar cliente')} emptyLabel={t('Cadastre um cliente antes de criar o limite.')} onChange={(value) => { const selectedId = value ? String(value) : ''; onChange('clientId', selectedId); const found = clients.find((entry) => entry.id === selectedId); onChange('currency', found?.billingCurrency ?? 'BRL'); }} /><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Moeda de faturamento')}</Text><View className="flex-row flex-wrap gap-2">{currencies.map((currency) => <Pressable key={currency} onPress={() => onChange('currency', currency)} style={({ pressed }) => ({ backgroundColor: draft.currency === currency ? colors.primary : colors.surface, borderColor: draft.currency === currency ? colors.primary : colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: draft.currency === currency ? 'white' : colors.foreground }} className="font-bold">{currency}</Text></Pressable>)}</View><LimitItemsEditor title={t('Tipos de gasto e valores unitários')} helper={t('Inclua quantos tipos forem necessários para este cliente.')} valueLabel={t('Valor unitário')} currency={draft.currency} items={billingItems} expenseTypes={expenseTypes} colors={colors} t={t} disabled={isMutating} onChange={onBillingItemsChange} /></>}{kind === 'maintenanceReasons' && <><FormField label={t('Nome do motivo')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Categoria')}</Text><View className="flex-row gap-2"><Pressable onPress={() => onChange('category', 'Preventiva')} style={({ pressed }) => ({ flex: 1, backgroundColor: draft.category === 'Preventiva' ? colors.primary : colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, opacity: pressed ? 0.7 : 1 })}><Text className="text-center font-bold text-foreground">{t('Preventiva')}</Text></Pressable><Pressable onPress={() => onChange('category', 'Corretiva')} style={({ pressed }) => ({ flex: 1, backgroundColor: draft.category === 'Corretiva' ? colors.primary : colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, opacity: pressed ? 0.7 : 1 })}><Text className="text-center font-bold text-foreground">{t('Corretiva')}</Text></Pressable></View><FormField label={t('Descrição (opcional)')} value={draft.description} onChangeText={(value) => onChange('description', value)} multiline colors={colors} /><Pressable onPress={() => onChange('resetsMaintenanceCycle', !draft.resetsMaintenanceCycle)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, opacity: pressed ? 0.65 : 1 })}><View style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 5, width: 20, height: 20, marginTop: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: draft.resetsMaintenanceCycle ? colors.primary : colors.background }}>{draft.resetsMaintenanceCycle && <Text className="font-bold text-white">✓</Text>}</View><View className="ml-2 flex-1"><Text className="text-sm font-semibold text-foreground">{t('Reinicia o ciclo de revisão')}</Text><Text className="mt-0.5 text-xs text-muted">{t('Ao concluir uma OS com este motivo, o KM da última manutenção do veículo é atualizado (ex.: revisão periódica, troca de óleo). Deixe desmarcado para avarias, pneus e outros reparos.')}</Text></View></Pressable></>}{error && <Text className="mt-3 text-sm font-semibold text-error">{error}</Text>}<Pressable onPress={onSubmit} disabled={isMutating} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 44, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed || isMutating ? 0.65 : 1 })}>{isMutating ? <ActivityIndicator color="#ffffff" /> : <Text className="font-bold text-white">{t('Salvar cadastro')}</Text>}</Pressable></ScrollView></View></KeyboardAvoidingView></Modal>;
}

// Lista compacta de "tipo de gasto + valor": cada item vira uma linha; o
// formulário de inclusão/edição só aparece quando se clica em Adicionar/Editar.
function LimitItemsEditor({ title, helper, valueLabel, currency, items, expenseTypes, colors, t, disabled, onChange }: { title: string; helper: string; valueLabel: string; currency: string; items: BillingItemDraft[]; expenseTypes: DisplayExpenseType[]; colors: ReturnType<typeof useColors>; t: (key: string) => string; disabled: boolean; onChange: (items: BillingItemDraft[]) => void }) {
  const [form, setForm] = useState<{ index: number | null; expenseTypeId: string; limitAmount: string } | null>(null);
  const [formError, setFormError] = useState('');
  const nameOf = (id: string) => expenseTypes.find((expenseType) => expenseType.id === id)?.name ?? id;
  const usedIds = new Set(items.filter((_, index) => index !== form?.index).map((item) => item.expenseTypeId));
  const options = expenseTypes.filter((expenseType) => !usedIds.has(expenseType.id)).map((expenseType) => ({ id: expenseType.id, label: expenseType.name }));
  const confirm = () => {
    if (!form) return;
    const amount = form.limitAmount.trim().replace(',', '.');
    if (!form.expenseTypeId) return setFormError(t('Selecione o tipo de gasto.'));
    if (!/^\d{1,12}(\.\d{1,4})?$/.test(amount) || Number(amount) <= 0) return setFormError(t('Informe um valor maior que zero (ex.: 0,50).'));
    const entry: BillingItemDraft = { ...(form.index !== null && items[form.index]?.id ? { id: items[form.index]!.id } : {}), expenseTypeId: form.expenseTypeId, limitAmount: form.limitAmount.trim() };
    onChange(form.index === null ? [...items, entry] : items.map((item, index) => (index === form.index ? entry : item)));
    setForm(null);
    setFormError('');
  };
  const cancel = () => { setForm(null); setFormError(''); };
  return (
    <View className="mt-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-foreground">{title}</Text>
          <Text className="mt-1 text-xs text-muted">{helper}</Text>
        </View>
        {!form ? (
          <Pressable onPress={() => { setFormError(''); setForm({ index: null, expenseTypeId: '', limitAmount: '' }); }} disabled={disabled} style={({ pressed }) => ({ borderColor: colors.primary, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}>
            <Text className="text-xs font-bold text-primary">+ {t('Adicionar')}</Text>
          </Pressable>
        ) : null}
      </View>
      {form ? (
        <View className="mt-3 gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <View>
            <Text className="mb-2 text-xs font-semibold text-muted">{t('Tipo de gasto')}</Text>
            <CatalogSearch value={form.expenseTypeId || null} options={options} placeholder={t('Pesquisar tipo de gasto')} emptyLabel={t('Cadastre um tipo de gasto antes de criar o limite.')} onChange={(value) => { setFormError(''); setForm({ ...form, expenseTypeId: value ? String(value) : '' }); }} />
          </View>
          <FormField label={valueLabel} value={form.limitAmount} onChangeText={(value) => { setFormError(''); setForm({ ...form, limitAmount: value }); }} keyboardType="decimal-pad" colors={colors} />
          {formError ? <Text style={{ color: colors.error }} className="text-xs font-semibold">{formError}</Text> : null}
          <View className="flex-row gap-2">
            <Pressable onPress={confirm} style={({ pressed }) => ({ flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', opacity: pressed ? 0.75 : 1 })}>
              <Text className="text-sm font-bold text-white">{t('Confirmar')}</Text>
            </Pressable>
            <Pressable onPress={cancel} style={({ pressed }) => ({ flex: 1, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', opacity: pressed ? 0.75 : 1 })}>
              <Text className="text-sm font-bold text-foreground">{t('Cancelar')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <View className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
        {items.length === 0 ? <Text className="px-3 py-3 text-xs text-muted">{t('Nenhum tipo de gasto incluído.')}</Text> : null}
        {items.map((item, index) => (
          <View key={item.id ?? `${item.expenseTypeId}-${index}`} style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }} className="flex-row items-center gap-3 px-3 py-2.5">
            <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>{nameOf(item.expenseTypeId)}</Text>
            <Text className="text-sm text-foreground">{item.limitAmount} {currency}</Text>
            <Pressable accessibilityLabel={t('Editar')} disabled={disabled || Boolean(form)} onPress={() => { setFormError(''); setForm({ index, expenseTypeId: item.expenseTypeId, limitAmount: item.limitAmount }); }} style={{ opacity: disabled || form ? 0.4 : 1 }}>
              <Text className="text-xs font-bold text-primary">{t('Editar')}</Text>
            </Pressable>
            <Pressable accessibilityLabel={t('Remover item')} disabled={disabled || Boolean(form)} onPress={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} style={{ opacity: disabled || form ? 0.4 : 1 }}>
              <Text className="text-base font-bold text-error">×</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function FormField({ label, value, onChangeText, colors, ...props }: { label: string; value: string; onChangeText: (value: string) => void; colors: ReturnType<typeof useColors>; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; maxLength?: number; keyboardType?: 'default' | 'numeric' | 'decimal-pad'; multiline?: boolean }) {
  return <View className="mt-4"><Text className="mb-1 text-xs font-semibold text-muted">{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={label} placeholderTextColor={colors.muted} className="rounded-xl border border-border bg-surface px-3 py-3 text-foreground" {...props} /></View>;
}

// Padrão de "digitar e buscar" usado em todos os campos de cadastro
// vinculado do sistema.
function CatalogSearch({ value, options, placeholder, emptyLabel, onChange }: { value: string | null; options: { id: string; label: string }[]; placeholder: string; emptyLabel: string; onChange: (value: string | null) => void }) {
  const colors = useColors();
  const selected = options.find((option) => option.id === value);
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = options.filter((option) => option.label.toLocaleLowerCase().includes(normalized)).slice(0, 8);
  return (
    <View className="mt-2 gap-2">
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
