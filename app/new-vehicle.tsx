import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton, SectionHeader } from '@/components/app-ui';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

export default function NewVehicleScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const editId = typeof params.vehicleId === 'string' && /^\d+$/.test(params.vehicleId) ? Number(params.vehicleId) : undefined;
  const isEditing = editId !== undefined;
  const unitsQuery = trpc.catalogs.units.list.useQuery({ page: 1, pageSize: 100, includeInactive: false, direction: 'asc' }, { enabled: isAuthenticated });
  const vehicleQuery = trpc.operations.fleet.vehicles.get.useQuery({ id: editId as number }, { enabled: isAuthenticated && isEditing });
  const createVehicle = trpc.operations.fleet.vehicles.create.useMutation();
  const updateVehicle = trpc.operations.fleet.vehicles.update.useMutation();
  const units = useMemo(() => unitsQuery.data?.items ?? [], [unitsQuery.data?.items]);
  const [unitId, setUnitId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState({ brand: '', model: '', year: '', color: '', plate: '', currentKm: '', lastMaintenanceKm: '', interval: '10000', extinguisherDue: '', observations: '' });
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => { if (!isEditing && !unitId && units[0]) setUnitId(String(units[0].id)); }, [isEditing, unitId, units]);
  // Ao editar, assim que os dados do veículo chegam, preenchemos o
  // formulário uma única vez (antes, essa tela só sabia criar veículos).
  useEffect(() => {
    const vehicle = vehicleQuery.data;
    if (!vehicle || prefilled) return;
    setForm({
      brand: vehicle.brand,
      model: vehicle.model,
      year: String(vehicle.modelYear),
      color: vehicle.color ?? '',
      plate: vehicle.plate,
      currentKm: String(vehicle.currentKm),
      lastMaintenanceKm: String(vehicle.lastMaintenanceKm),
      interval: String(vehicle.maintenanceIntervalKm),
      extinguisherDue: vehicle.fireExtinguisherExpiresOn ?? '',
      observations: vehicle.notes ?? '',
    });
    setUnitId(String(vehicle.unitId));
    setPrefilled(true);
  }, [prefilled, vehicleQuery.data]);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setFeedback('');
    if (!form.brand || !form.model || !form.plate || !form.currentKm || !form.year || !form.interval || !unitId) { setFeedback(t('Informe marca, modelo, ano, placa, unidade, KM atual e intervalo.')); return; }
    if (!isAuthenticated) { setFeedback(t('Sua sessão expirou. Entre novamente para cadastrar um veículo.')); return; }
    const payload = { plate: form.plate.trim().toUpperCase(), brand: form.brand.trim(), model: form.model.trim(), modelYear: Number(form.year), color: form.color.trim() || null, unitId: Number(unitId), currentKm: Number(form.currentKm), lastMaintenanceKm: Number(form.lastMaintenanceKm || 0), maintenanceIntervalKm: Number(form.interval), fireExtinguisherExpiresOn: form.extinguisherDue.trim() || null, notes: form.observations.trim() || null };
    try {
      if (isEditing) {
        await updateVehicle.mutateAsync({ id: editId, ...payload });
        setFeedback(t('Veículo atualizado com sucesso.'));
      } else {
        await createVehicle.mutateAsync({ ...payload, status: 'Disponível' });
        setFeedback(t('Veículo cadastrado com sucesso.'));
      }
      router.replace('/fleet-cadastros');
    } catch (error) { setFeedback(error instanceof Error ? error.message : t('Não foi possível salvar o veículo. Tente novamente.')); }
  };
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><View className="w-full max-w-4xl flex-1 self-center"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}><Pressable onPress={() => router.back()} className="mb-5"><Text className="font-semibold text-primary">‹ {t('Voltar para Frota')}</Text></Pressable><Text className="text-sm font-medium text-muted">{t('Administrativo · Cadastro')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{isEditing ? t('Editar veículo') : t('Novo veículo')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{isEditing ? t('Atualize os dados do veículo.') : t('Cadastre os dados do veículo para disponibilizá-lo nas reservas de viagens.')}</Text>{isEditing && vehicleQuery.isLoading ? <Text className="mt-4 text-sm text-muted">{t('Carregando dados do veículo...')}</Text> : null}<SectionHeader title={t('Identificação')} /><View className="rounded-2xl border border-border bg-surface p-5"><Field label={t('Marca')} value={form.brand} onChangeText={(value) => update('brand', value)} placeholder={t('Ex.: Toyota')} /><Field label={t('Modelo')} value={form.model} onChangeText={(value) => update('model', value)} placeholder={t('Ex.: Hilux SRX')} /><View className="flex-row gap-3"><View className="flex-1"><Field label={t('Ano')} value={form.year} onChangeText={(value) => update('year', value)} placeholder="2024" keyboardType="numeric" /></View><View className="flex-1"><Field label={t('Cor')} value={form.color} onChangeText={(value) => update('color', value)} placeholder={t('Prata')} /></View></View><Field label={t('Placa')} value={form.plate} onChangeText={(value) => update('plate', value.toUpperCase())} placeholder={t('ABC1D23')} /></View><SectionHeader title={t('Vínculo e quilometragem')} /><View className="rounded-2xl border border-border bg-surface p-5"><Text className="mb-2 text-xs font-semibold text-muted">{t('Unidade')}</Text>{unitsQuery.isLoading ? <Text className="mb-4 text-sm text-muted">{t('Carregando unidades...')}</Text> : units.length === 0 ? <Text className="mb-4 text-sm text-warning">{t('Cadastre uma unidade antes de incluir veículos.')}</Text> : <View className="mb-4"><CatalogSearch value={unitId ? Number(unitId) : null} options={units.map((unit) => ({ id: unit.id, label: unit.name }))} placeholder={t('Pesquisar unidade')} emptyLabel={t('Nenhuma unidade encontrada')} onChange={(value) => setUnitId(value !== null ? String(value) : '')} /></View>}<View className="flex-row gap-3"><View className="flex-1"><Field label={t('KM atual')} value={form.currentKm} onChangeText={(value) => update('currentKm', value)} placeholder="74820" keyboardType="numeric" /></View><View className="flex-1"><Field label={t('KM última manutenção')} value={form.lastMaintenanceKm} onChangeText={(value) => update('lastMaintenanceKm', value)} placeholder="65000" keyboardType="numeric" /></View></View><Field label={t('Intervalo de manutenção (KM)')} value={form.interval} onChangeText={(value) => update('interval', value)} placeholder="10000" keyboardType="numeric" /></View><SectionHeader title={t('Controle e observações')} /><View className="rounded-2xl border border-border bg-surface p-5"><Field label={t('Vencimento do extintor')} value={form.extinguisherDue} onChangeText={(value) => update('extinguisherDue', value)} placeholder={t('AAAA-MM-DD')} /><Text className="mb-2 text-xs font-semibold text-muted">{t('Observações')}</Text><TextInput value={form.observations} onChangeText={(value) => update('observations', value)} multiline placeholder={t('Informações de uso, acessórios ou restrições...')} placeholderTextColor={colors.muted} className="min-h-[90px] rounded-xl border border-border bg-background px-4 py-3 text-foreground" /></View>{feedback ? <Text className="mb-4 text-sm font-semibold text-error">{feedback}</Text> : null}<PrimaryButton label={(createVehicle.isPending || updateVehicle.isPending) ? t('Salvando...') : isEditing ? t('Salvar alterações') : t('Cadastrar veículo')} onPress={() => void save()} /></ScrollView></View></ScreenContainer>;
}
function Field({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'numeric' | 'default' }) { const colors = useColors(); return <View className="mb-4"><Text className="mb-2 text-xs font-semibold text-muted">{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} placeholderTextColor={colors.muted} className="rounded-xl border border-border bg-background px-4 py-3 text-foreground" /></View>; }

// Padrão de "digitar e buscar" usado em todos os campos de cadastro
// vinculado do sistema (mesma lógica de new-trip.tsx e expenses.tsx).
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
