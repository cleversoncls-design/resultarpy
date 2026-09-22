import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton, SectionHeader } from '@/components/app-ui';
import type { MaintenanceKind } from '@/lib/demo-data';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/lib/language-provider';

export default function NewWorkOrderScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ workOrderId?: string }>();
  const editId = typeof params.workOrderId === 'string' && /^\d+$/.test(params.workOrderId) ? Number(params.workOrderId) : undefined;
  const vehiclesQuery = trpc.operations.fleet.vehicles.list.useQuery({ page: 1, pageSize: 100, direction: 'asc' }, { enabled: isAuthenticated });
  const reasonsQuery = trpc.catalogs.maintenanceReasons.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const vehicles = useMemo(() => vehiclesQuery.data?.items ?? [], [vehiclesQuery.data]);
  const maintenanceReasons = useMemo(() => reasonsQuery.data?.items ?? [], [reasonsQuery.data]);
  const [vehicleId, setVehicleId] = useState('');
  const [kind, setKind] = useState<MaintenanceKind>('Preventiva');
  const [reasonId, setReasonId] = useState<string | number>('');
  const [km, setKm] = useState('');
  const [date, setDate] = useState('');
  const [observation, setObservation] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState<'Em andamento' | 'Concluída' | 'Cancelada'>('Concluída');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const workOrderQuery = trpc.operations.fleet.workOrders.get.useQuery({ id: editId as number }, { enabled: isAuthenticated && editId !== undefined });
  const createWorkOrder = trpc.operations.fleet.workOrders.create.useMutation();
  const updateWorkOrder = trpc.operations.fleet.workOrders.update.useMutation();
  const isEditing = editId !== undefined;
  useEffect(() => { if (!vehicleId && vehicles[0]) setVehicleId(String(vehicles[0].id)); if (!reasonId && maintenanceReasons[0]) setReasonId(maintenanceReasons[0]?.id ?? ''); }, [maintenanceReasons, reasonId, vehicleId, vehicles]);
  useEffect(() => {
    const order = workOrderQuery.data;
    if (!order) return;
    setVehicleId(String(order.vehicleId));
    setKind(order.maintenanceType);
    setReasonId(order.reasonId ?? maintenanceReasons[0]?.id ?? '');
    setKm(String(order.vehicleKm));
    setDate(order.maintenanceDate);
    setObservation(order.observation ?? '');
    setCost(order.costAmount);
    setStatus(order.status);
  }, [maintenanceReasons, workOrderQuery.data]);

  const save = async () => {
    setFeedback(null);
    const normalizedCost = cost.replace(',', '.').trim();
    const numericKm = Number(km);
    if (!Number.isInteger(numericKm) || numericKm < 0 || !date || !observation.trim() || !normalizedCost || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setFeedback({ type: 'error', message: t('Informe KM, data, observação e custo válidos.') });
      return;
    }
    if (!vehicleId) {
      setFeedback({ type: 'error', message: t('Selecione um veículo.') });
      return;
    }
    if (!isAuthenticated) {
      setFeedback({ type: 'error', message: t('Sua sessão expirou. Entre novamente.') });
      return;
    }
    setIsSaving(true);
    try {
      if (isEditing) {
        await updateWorkOrder.mutateAsync({ id: editId, reasonId: typeof reasonId === 'number' ? reasonId : null, maintenanceType: kind, maintenanceDate: date, vehicleKm: numericKm, observation: observation.trim(), costAmount: normalizedCost, status });
      } else {
        await createWorkOrder.mutateAsync({ vehicleId: Number(vehicleId), reasonId: typeof reasonId === 'number' ? reasonId : null, maintenanceType: kind, maintenanceDate: date, vehicleKm: numericKm, observation: observation.trim(), costAmount: normalizedCost, status });
      }
      setFeedback({ type: 'success', message: isEditing ? t('Ordem de Serviço atualizada com sucesso.') : t('Ordem de Serviço registrada com sucesso.') });
      // Voltamos direto para a Frota — antes isso só acontecia dentro do
      // botão de um Alert.alert, que nunca aparece na web, então parecia
      // que o botão "não fazia nada" mesmo salvando corretamente.
      setTimeout(() => router.replace('/fleet-cadastros'), 700);
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : t('Não foi possível salvar. Tente novamente.') });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === vehicleId);

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><View className="w-full max-w-4xl flex-1 self-center"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-5"><Text className="font-semibold text-primary">‹ {t('Voltar para Frota')}</Text></Pressable><Text className="text-sm font-medium text-muted">{t('Administrativo · Manutenção')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{isEditing ? t('Editar Ordem de Serviço') : t('Nova Ordem de Serviço')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Registre uma manutenção preventiva prevista ou uma O.S. corretiva avulsa.')}</Text>

    <SectionHeader title={t('Classificação')} />
    <View className="rounded-2xl border border-border bg-surface p-4">
      <Text className="mb-2 text-xs font-semibold text-muted">{t('Tipo de manutenção')}</Text>
      <View className="flex-row gap-2"><Choice label="Preventiva" selected={kind === 'Preventiva'} onPress={() => setKind('Preventiva')} /><Choice label="Corretiva avulsa" selected={kind === 'Corretiva'} onPress={() => setKind('Corretiva')} /></View>
      <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{t('Tipo ou motivo')}</Text>
      <CatalogSearch
        value={reasonId || null}
        options={maintenanceReasons.map((reason) => ({ id: reason.id, label: reason.name }))}
        placeholder={t('Pesquisar motivo')}
        emptyLabel={t('Nenhum motivo cadastrado')}
        onChange={(value) => setReasonId(value ?? '')}
      />
    </View>

    <SectionHeader title={t('Veículo em manutenção')} />
    <View className="rounded-2xl border border-border bg-surface p-5">
      {isEditing ? (
        <View className="rounded-xl border border-primary bg-primary/10 p-3">
          <Text className="font-bold text-foreground">{t('Veículo vinculado')}: {selectedVehicle?.brand ?? 'Registro persistente'} {selectedVehicle?.model ?? ''}</Text>
          <Text className="mt-1 text-xs text-muted">{t('A edição preserva o veículo originalmente associado à O.S.')}</Text>
        </View>
      ) : (
        <CatalogSearch
          value={vehicleId || null}
          options={vehicles.map((vehicle) => ({ id: String(vehicle.id), label: `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` }))}
          placeholder={t('Pesquisar veículo')}
          emptyLabel={t('Nenhum veículo cadastrado')}
          onChange={(value) => setVehicleId(value ? String(value) : '')}
        />
      )}
    </View>

    <SectionHeader title={t('Dados da manutenção')} />
    <View className="rounded-2xl border border-border bg-surface p-5">
      <Field label="KM do veículo" value={km} onChangeText={setKm} placeholder="Ex.: 75000" keyboardType="numeric" />
      <Text className="mb-2 text-xs font-semibold text-muted">{t('Data da manutenção')}</Text>
      <CalendarField value={date} onChange={setDate} />
      <View className="mt-4">
        <Field label="Custo da manutenção" value={cost} onChangeText={setCost} placeholder="Ex.: 1850,00" keyboardType="decimal-pad" />
      </View>
      <Text className="mb-2 text-xs font-semibold text-muted">{t('Status')}</Text>
      <View className="mb-4 flex-row gap-2"><Choice label="Concluída" selected={status === 'Concluída'} onPress={() => setStatus('Concluída')} /><Choice label="Em andamento" selected={status === 'Em andamento'} onPress={() => setStatus('Em andamento')} /></View>
      <Text className="mb-2 text-xs font-semibold text-muted">{t('Observação')}</Text>
      <TextInput value={observation} onChangeText={setObservation} multiline placeholder={t("Descreva os serviços executados, peças trocadas ou recomendações...")} placeholderTextColor={colors.muted} className="min-h-[110px] rounded-xl border border-border bg-background px-4 py-3 text-foreground" />
    </View>

    {feedback ? (
      <View style={{ backgroundColor: feedback.type === 'success' ? `${colors.success}18` : `${colors.error}18` }} className="mt-4 rounded-xl p-3">
        <Text style={{ color: feedback.type === 'success' ? colors.success : colors.error }} className="text-sm font-semibold">{feedback.message}</Text>
      </View>
    ) : null}

    <View className="mt-4"><PrimaryButton label={isSaving ? t('Salvando...') : isEditing ? t('Salvar alterações') : t('Registrar Ordem de Serviço')} onPress={() => void save()} /></View>
  </ScrollView></View></ScreenContainer>;
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { const colors = useColors(); const { t } = useLanguage(); return <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: selected ? colors.primary : colors.background, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.72 : 1 })} className="flex-1 rounded-xl border px-3 py-3"><Text style={{ color: selected ? '#fff' : colors.foreground }} className="text-center text-sm font-bold">{t(label)}</Text></Pressable>; }

function Field({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'numeric' | 'decimal-pad' }) { const colors = useColors(); const { t } = useLanguage(); return <View className="mb-4"><Text className="mb-2 text-xs font-semibold text-muted">{t(label)}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={t(placeholder)} keyboardType={keyboardType} placeholderTextColor={colors.muted} className="rounded-xl border border-border bg-background px-4 py-3 text-foreground" /></View>; }

// Padrão de "digitar e buscar" usado em todos os campos de cadastro
// vinculado do sistema.
function CatalogSearch({ value, options, placeholder, emptyLabel, onChange }: { value: number | string | null; options: { id: number | string; label: string }[]; placeholder: string; emptyLabel: string; onChange: (value: number | string | null) => void }) {
  const colors = useColors();
  const selected = options.find((option) => option.id === value);
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = options.filter((option) => option.label.toLocaleLowerCase().includes(normalized)).slice(0, 8);
  return (
    <View className="gap-2">
      <View className="flex-row items-center rounded-2xl border border-border bg-background px-4">
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

// Calendário visual — substitui o campo de texto livre AAAA-MM-DD.
function CalendarField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const colors = useColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const parse = (input: string) => /^\d{4}-\d{2}-\d{2}$/.test(input) ? new Date(`${input}T12:00:00`) : new Date();
  const [month, setMonth] = useState(() => { const d = parse(value); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const days = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1);
  const iso = (day: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => ({ borderColor: colors.border, backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 })} className="mb-4 flex-row items-center justify-between rounded-xl border px-4 py-3">
        <Text className={value ? 'text-foreground' : 'text-muted'}>{value || t('Selecionar data')}</Text>
        <IconSymbol name="calendar" size={20} color={colors.primary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-5">
          <View className="w-full max-w-md rounded-2xl bg-background p-5">
            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => setMonth(new Date(year, monthIndex - 1, 1))} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="px-3 py-2 text-2xl text-primary">‹</Text></Pressable>
              <Text className="text-base font-bold text-foreground">{year}-{String(monthIndex + 1).padStart(2, '0')}</Text>
              <Pressable onPress={() => setMonth(new Date(year, monthIndex + 1, 1))} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="px-3 py-2 text-2xl text-primary">›</Text></Pressable>
            </View>
            <View className="mt-4 flex-row flex-wrap">
              {days.map((day, index) => day === null ? (
                <View key={`blank-${index}`} style={{ width: '14.2857%' }} className="p-1" />
              ) : (
                <Pressable key={day} onPress={() => { onChange(iso(day)); setOpen(false); }} style={({ pressed }) => ({ width: '14.2857%', backgroundColor: value === iso(day) ? colors.primary : 'transparent', opacity: pressed ? 0.65 : 1 })} className="items-center rounded-lg p-2">
                  <Text style={{ color: value === iso(day) ? 'white' : colors.foreground }} className="text-sm font-semibold">{day}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setOpen(false)} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mt-4 items-center rounded-xl border border-border p-3">
              <Text className="font-bold text-primary">{t('Cancelar')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
