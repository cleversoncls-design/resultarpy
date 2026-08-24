import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useDemoRole } from '@/lib/demo-role';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';
import {
  approvalQueue,
  expenses,
  fleetReservations,
  reimbursementLimits,
  trips,
  units as demoUnits,
  demoUser,
} from '@/lib/demo-data';

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));
const catalogQueryInput = {
  page: 1,
  pageSize: 100,
  includeInactive: false,
  direction: 'asc' as const,
};

type CatalogKind = 'units' | 'clients' | 'travelers' | 'expenseTypes';
type DisplayUnit = { id: string; name: string; city: string; code?: string };
type DisplayClient = { id: string; name: string; billingCurrency?: string };
type DisplayTraveler = { id: string; name: string; meta?: string; userId?: number | null; unitId?: number | null; documentNumber?: string | null; canDrive?: boolean };
type DisplayExpenseType = { id: string; name: string; meta?: string; description?: string | null };
type CatalogRecord = DisplayUnit | DisplayClient | DisplayTraveler | DisplayExpenseType;
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
};

export default function GeneralRegistrationsScreen() {
  const colors = useColors();
  const { role } = useDemoRole();
  const { t } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const isAdmin = role === 'Administrativo';
  const liveEnabled = isAdmin && isAuthenticated;
  const [modalKind, setModalKind] = useState<CatalogKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CatalogDraft>(emptyDraft);
  const [formError, setFormError] = useState('');

  const unitsQuery = trpc.catalogs.units.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const clientsQuery = trpc.catalogs.clients.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const travelersQuery = trpc.catalogs.travelers.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const expenseTypesQuery = trpc.catalogs.expenseTypes.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
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

  const demoTravelers = useMemo(() => unique([
    demoUser.name,
    ...approvalQueue.map((item) => item.traveler),
    ...fleetReservations.map((reservation) => reservation.driver),
  ]).map((name, index) => ({ id: `demo-traveler-${index}`, name, meta: t('Viajante') })), [t]);
  const demoClients = useMemo(() => unique(
    trips.map((trip) => trip.client).concat(expenses.map((expense) => expense.client)),
  ).filter((client) => client !== 'Sem cliente').map((name, index) => ({ id: `demo-client-${index}`, name })), []);
  const demoExpenseTypes = useMemo(() => unique(reimbursementLimits.map((item) => item.concept)).map((name, index) => ({
    id: `demo-expense-${index}`,
    name,
    meta: `${reimbursementLimits.filter((limit) => limit.concept === name).length} ${t('limites por cidade')}`,
  })), [t]);

  const unitRows = useMemo<DisplayUnit[]>(
    () => liveEnabled && unitsQuery.data
      ? unitsQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, city: item.city, code: item.code }))
      : demoUnits.map((item) => ({ id: String(item.id), name: item.name, city: item.city })),
    [liveEnabled, unitsQuery.data],
  );
  const travelerRows = useMemo<DisplayTraveler[]>(
    () => liveEnabled && travelersQuery.data
      ? travelersQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, meta: item.canDrive ? t('Condutor') : t('Viajante'), userId: item.userId, unitId: item.unitId, documentNumber: item.documentNumber, canDrive: item.canDrive }))
      : demoTravelers,
    [demoTravelers, liveEnabled, t, travelersQuery.data],
  );
  const clientRows = useMemo<DisplayClient[]>(
    () => liveEnabled && clientsQuery.data
      ? clientsQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, billingCurrency: item.billingCurrency }))
      : demoClients,
    [clientsQuery.data, demoClients, liveEnabled],
  );
  const expenseTypeRows = useMemo<DisplayExpenseType[]>(
    () => liveEnabled && expenseTypesQuery.data
      ? expenseTypesQuery.data.items.map((item) => ({ id: String(item.id), name: item.name, meta: t('Cadastro ativo'), description: item.description }))
      : demoExpenseTypes,
    [demoExpenseTypes, expenseTypesQuery.data, liveEnabled, t],
  );

  const queries = [unitsQuery, clientsQuery, travelersQuery, expenseTypesQuery];
  const isLoadingCatalogs = liveEnabled && queries.some((query) => query.isLoading);
  const hasCatalogError = liveEnabled && queries.some((query) => query.isError);
  const isMutating = [createUnit, updateUnit, createClient, updateClient, createTraveler, updateTraveler, createExpenseType, updateExpenseType].some((mutation) => mutation.isPending);
  const retryCatalogs = () => queries.forEach((query) => void query.refetch());
  const refreshCatalogs = () => queries.forEach((query) => void query.refetch());

  const setField = <K extends keyof CatalogDraft>(field: K, value: CatalogDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError('');
  };

  const openCreate = (kind: CatalogKind) => {
    setModalKind(kind);
    setEditingId(null);
    setDraft(emptyDraft);
    setFormError('');
  };

  const openEdit = (kind: CatalogKind, item: CatalogRecord) => {
    const base = { ...emptyDraft, name: item.name };
    if (kind === 'units' && 'city' in item) Object.assign(base, { code: item.code ?? '', city: item.city });
    if (kind === 'clients' && 'billingCurrency' in item) Object.assign(base, { billingCurrency: item.billingCurrency ?? 'BRL' });
    if (kind === 'travelers' && 'canDrive' in item) Object.assign(base, { userId: item.userId ? String(item.userId) : '', unitId: item.unitId ? String(item.unitId) : '', documentNumber: item.documentNumber ?? '', canDrive: item.canDrive ?? false });
    if (kind === 'expenseTypes' && 'description' in item) Object.assign(base, { description: item.description ?? '' });
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
      } else {
        const input = { name: draft.name.trim(), description: draft.description.trim() || null };
        if (editingId) await updateExpenseType.mutateAsync({ id: Number(editingId), ...input }); else await createExpenseType.mutateAsync(input);
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
    { title: 'Tipos de gasto', description: 'Conceitos com limites de reembolso por cidade e evento.', count: expenseTypeRows.length, icon: 'wallet.pass.fill' as const, kind: 'expenseTypes' as CatalogKind },
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
            <CatalogPanel title={t('Tipos de gasto e limites')} count={expenseTypeRows.length} countLabel={t('registros')} icon="wallet.pass.fill" colors={colors} onAdd={liveEnabled ? () => openCreate('expenseTypes') : undefined} addLabel={t('Novo')}>
              {expenseTypeRows.map((expenseType) => <CatalogRow key={expenseType.id} icon="wallet.pass.fill" colors={colors} name={t(expenseType.name)} meta={expenseType.meta} live={liveEnabled} onEdit={() => openEdit('expenseTypes', expenseType)} onArchive={() => confirmArchive('expenseTypes', expenseType.id, expenseType.name)} t={t} />)}
            </CatalogPanel>
          </View>

          <View className="mt-6 rounded-2xl border border-border bg-surface p-5"><Text className="text-lg font-bold text-foreground">{t('Cadastros específicos da Frota')}</Text><Text className="mt-1 text-sm leading-5 text-muted">{t('Veículos e motivos de manutenção continuam no cadastro da Frota, vinculados aos registros gerais acima.')}</Text><View className="mt-4 flex-row flex-wrap gap-3"><Pressable onPress={() => router.push('/fleet-cadastros')} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Abrir Cadastros de Frota')}</Text></Pressable><Pressable onPress={() => router.push('/new-trip')} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 10, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-foreground">{t('Nova solicitação')}</Text></Pressable></View></View>
        </ScrollView>
      </View>
      <CatalogModal kind={modalKind} editingId={editingId} draft={draft} error={formError} colors={colors} t={t} isMutating={isMutating} onChange={setField} onClose={closeModal} onSubmit={() => void submitCatalog()} />
    </ScreenContainer>
  );
}

function CatalogPanel({ title, count, countLabel, icon, colors, children, onAdd, addLabel }: { title: string; count: number; countLabel: string; icon: 'building.2.fill' | 'briefcase.fill' | 'person.crop.circle.fill' | 'wallet.pass.fill'; colors: ReturnType<typeof useColors>; children: ReactNode; onAdd?: () => void; addLabel: string }) {
  return <View className="min-w-[300px] flex-1 rounded-2xl border border-border bg-surface p-5"><View className="flex-row items-center justify-between"><View className="flex-row items-center"><IconSymbol name={icon} size={18} color={colors.primary} /><Text className="ml-2 flex-1 text-lg font-bold text-foreground">{title}</Text></View><View className="flex-row items-center"><Text className="mr-3 text-xs font-semibold text-primary">{count} {countLabel}</Text>{onAdd && <Pressable onPress={onAdd} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, opacity: pressed ? 0.65 : 1 })}><Text className="text-xs font-bold text-foreground">+ {addLabel}</Text></Pressable>}</View></View>{children}</View>;
}

function CatalogRow({ icon, colors, name, meta, live, onEdit, onArchive, t }: { icon: 'building.2.fill' | 'briefcase.fill' | 'person.crop.circle.fill' | 'wallet.pass.fill'; colors: ReturnType<typeof useColors>; name: string; meta?: string; live: boolean; onEdit: () => void; onArchive: () => void; t: (key: string) => string }) {
  return <View className="mt-4 flex-row flex-wrap items-center border-b border-border pb-3"><View style={{ backgroundColor: `${colors.primary}16` }} className="h-9 w-9 items-center justify-center rounded-lg"><IconSymbol name={icon} size={18} color={colors.primary} /></View><View className="ml-3 min-w-[120px] flex-1"><Text className="font-bold text-foreground">{name}</Text>{meta && <Text className="mt-1 text-xs text-muted">{meta}</Text>}</View>{live && <View className="ml-auto flex-row gap-2"><Pressable onPress={onEdit} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, opacity: pressed ? 0.65 : 1 })}><Text className="text-[11px] font-bold text-foreground">{t('Editar')}</Text></Pressable><Pressable onPress={onArchive} style={({ pressed }) => ({ borderColor: colors.error, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, opacity: pressed ? 0.65 : 1 })}><Text className="text-[11px] font-bold text-error">{t('Arquivar')}</Text></Pressable></View>}</View>;
}

function CatalogModal({ kind, editingId, draft, error, colors, t, isMutating, onChange, onClose, onSubmit }: { kind: CatalogKind | null; editingId: string | null; draft: CatalogDraft; error: string; colors: ReturnType<typeof useColors>; t: (key: string) => string; isMutating: boolean; onChange: <K extends keyof CatalogDraft>(field: K, value: CatalogDraft[K]) => void; onClose: () => void; onSubmit: () => void }) {
  if (!kind) return null;
  const title = `${editingId ? t('Editar') : t('Novo')} ${kind === 'units' ? t('Unidade') : kind === 'clients' ? t('Cliente') : kind === 'travelers' ? t('Viajante') : t('Tipo de gasto')}`;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 items-center justify-center bg-black/40 px-5"><View className="max-h-[90%] w-full max-w-xl rounded-2xl bg-background p-5"><ScrollView keyboardShouldPersistTaps="handled"><View className="flex-row items-center justify-between"><Text className="text-xl font-bold text-foreground">{title}</Text><Pressable onPress={onClose} disabled={isMutating} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-2xl text-muted">×</Text></Pressable></View><Text className="mt-1 text-sm text-muted">{t('Os dados serão persistidos no PostgreSQL.')}</Text>{kind === 'units' && <><FormField label={t('Código')} value={draft.code} onChangeText={(value) => onChange('code', value)} colors={colors} /><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('Cidade')} value={draft.city} onChangeText={(value) => onChange('city', value)} colors={colors} /></>}{kind === 'clients' && <><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('Moeda de faturamento')} value={draft.billingCurrency} onChangeText={(value) => onChange('billingCurrency', value)} autoCapitalize="characters" maxLength={3} colors={colors} /></>}{kind === 'travelers' && <><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('ID da unidade (opcional)')} value={draft.unitId} onChangeText={(value) => onChange('unitId', value)} keyboardType="numeric" colors={colors} /><FormField label={t('Documento (opcional)')} value={draft.documentNumber} onChangeText={(value) => onChange('documentNumber', value)} colors={colors} /><Pressable onPress={() => onChange('canDrive', !draft.canDrive)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', marginTop: 12, opacity: pressed ? 0.65 : 1 })}><View style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 5, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: draft.canDrive ? colors.primary : colors.background }}>{draft.canDrive && <Text className="font-bold text-white">✓</Text>}</View><Text className="ml-2 text-sm text-foreground">{t('Também pode conduzir veículos')}</Text></Pressable></>}{kind === 'expenseTypes' && <><FormField label={t('Nome')} value={draft.name} onChangeText={(value) => onChange('name', value)} colors={colors} /><FormField label={t('Descrição (opcional)')} value={draft.description} onChangeText={(value) => onChange('description', value)} multiline colors={colors} /></>}{error && <Text className="mt-3 text-sm font-semibold text-error">{error}</Text>}<Pressable onPress={onSubmit} disabled={isMutating} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 44, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed || isMutating ? 0.65 : 1 })}>{isMutating ? <ActivityIndicator color="#ffffff" /> : <Text className="font-bold text-white">{t('Salvar cadastro')}</Text>}</Pressable></ScrollView></View></KeyboardAvoidingView></Modal>;
}

function FormField({ label, value, onChangeText, colors, ...props }: { label: string; value: string; onChangeText: (value: string) => void; colors: ReturnType<typeof useColors>; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; maxLength?: number; keyboardType?: 'default' | 'numeric'; multiline?: boolean }) {
  return <View className="mt-4"><Text className="mb-1 text-xs font-semibold text-muted">{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={label} placeholderTextColor={colors.muted} className="rounded-xl border border-border bg-surface px-3 py-3 text-foreground" {...props} /></View>;
}
