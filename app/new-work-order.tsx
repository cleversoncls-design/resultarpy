import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton, SectionHeader } from '@/components/app-ui';
import { maintenanceReasons, vehicles, type MaintenanceKind } from '@/lib/demo-data';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';

export default function NewWorkOrderScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ workOrderId?: string }>();
  const editId = typeof params.workOrderId === 'string' && /^\d+$/.test(params.workOrderId) ? Number(params.workOrderId) : undefined;
  const [vehicleId, setVehicleId] = useState(vehicles[0].id);
  const [kind, setKind] = useState<MaintenanceKind>('Preventiva');
  const [reasonId, setReasonId] = useState<string | number>(maintenanceReasons[0].id);
  const [km, setKm] = useState('');
  const [date, setDate] = useState('');
  const [observation, setObservation] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState<'Em andamento' | 'Concluída' | 'Cancelada'>('Concluída');
  const [isSaving, setIsSaving] = useState(false);
  const workOrderQuery = trpc.operations.fleet.workOrders.get.useQuery({ id: editId as number }, { enabled: isAuthenticated && editId !== undefined });
  const createWorkOrder = trpc.operations.fleet.workOrders.create.useMutation();
  const updateWorkOrder = trpc.operations.fleet.workOrders.update.useMutation();
  const isEditing = editId !== undefined;

  useEffect(() => {
    const order = workOrderQuery.data;
    if (!order) return;
    setVehicleId(String(order.vehicleId));
    setKind(order.maintenanceType);
    setReasonId(order.reasonId ?? maintenanceReasons[0].id);
    setKm(String(order.vehicleKm));
    setDate(order.maintenanceDate);
    setObservation(order.observation ?? '');
    setCost(order.costAmount);
    setStatus(order.status);
  }, [workOrderQuery.data]);

  const save = async () => {
    const normalizedCost = cost.replace(',', '.').trim();
    const numericKm = Number(km);
    if (!Number.isInteger(numericKm) || numericKm < 0 || !date || !observation.trim() || !normalizedCost || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Preencha os dados da manutenção', 'Informe KM, data no formato AAAA-MM-DD, observação e custo.');
      return;
    }
    if (!isAuthenticated) {
      Alert.alert(isEditing ? 'Alteração simulada' : 'Ordem de Serviço registrada', isEditing ? 'No modo demonstrativo, a alteração será aplicada após conectar uma sessão.' : 'A O.S. foi preparada no modo demonstrativo.', [{ text: 'Voltar para Frota', onPress: () => router.replace('/fleet') }]);
      return;
    }
    setIsSaving(true);
    try {
      if (isEditing) {
        await updateWorkOrder.mutateAsync({ id: editId, reasonId: typeof reasonId === 'number' ? reasonId : null, maintenanceType: kind, maintenanceDate: date, vehicleKm: numericKm, observation: observation.trim(), costAmount: normalizedCost, status });
        Alert.alert('Ordem de Serviço atualizada', 'As alterações foram salvas no histórico de manutenção.', [{ text: 'Voltar para Frota', onPress: () => router.replace('/fleet') }]);
      } else {
        await createWorkOrder.mutateAsync({ vehicleId: Number(vehicleId), reasonId: typeof reasonId === 'number' ? reasonId : null, maintenanceType: kind, maintenanceDate: date, vehicleKm: numericKm, observation: observation.trim(), costAmount: normalizedCost, status });
        Alert.alert('Ordem de Serviço registrada', 'A O.S. foi salva e os dados de manutenção do veículo foram atualizados.', [{ text: 'Voltar para Frota', onPress: () => router.replace('/fleet') }]);
      }
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><View className="w-full max-w-4xl flex-1 self-center"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-5"><Text className="font-semibold text-primary">‹ Voltar para Frota</Text></Pressable><Text className="text-sm font-medium text-muted">Administrativo · Manutenção</Text><Text className="mt-1 text-3xl font-bold text-foreground">{isEditing ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</Text><Text className="mt-2 text-sm leading-5 text-muted">Registre uma manutenção preventiva prevista ou uma O.S. corretiva avulsa.</Text><SectionHeader title="Classificação" /><View className="rounded-2xl border border-border bg-surface p-4"><Text className="mb-2 text-xs font-semibold text-muted">Tipo de manutenção</Text><View className="flex-row gap-2"><Choice label="Preventiva" selected={kind === 'Preventiva'} onPress={() => setKind('Preventiva')} /><Choice label="Corretiva avulsa" selected={kind === 'Corretiva'} onPress={() => setKind('Corretiva')} /></View><Text className="mb-2 mt-4 text-xs font-semibold text-muted">Tipo ou motivo</Text>{maintenanceReasons.map((reason) => <Pressable key={reason.id} onPress={() => setReasonId(reason.id)} style={({ pressed }) => ({ borderColor: reason.id === reasonId ? colors.primary : colors.border, backgroundColor: reason.id === reasonId ? `${colors.primary}10` : colors.background, opacity: pressed ? 0.72 : 1 })} className="mb-2 rounded-xl border p-3"><Text className="font-bold text-foreground">{reason.name}</Text><Text className="mt-1 text-xs text-muted">{reason.description}</Text></Pressable>)}</View><SectionHeader title="Veículo em manutenção" /><View className="rounded-2xl border border-border bg-surface p-5">{isEditing ? <View className="rounded-xl border border-primary bg-primary/10 p-3"><Text className="font-bold text-foreground">Veículo vinculado: {selectedVehicle?.brand ?? 'Registro persistente'} {selectedVehicle?.model ?? ''}</Text><Text className="mt-1 text-xs text-muted">A edição preserva o veículo originalmente associado à O.S.</Text></View> : vehicles.map((vehicle) => <Pressable key={vehicle.id} onPress={() => setVehicleId(vehicle.id)} style={({ pressed }) => ({ borderColor: vehicle.id === vehicleId ? colors.primary : colors.border, backgroundColor: vehicle.id === vehicleId ? `${colors.primary}10` : colors.background, opacity: pressed ? 0.72 : 1 })} className="mb-2 rounded-xl border p-3"><Text className="font-bold text-foreground">{vehicle.brand} {vehicle.model}</Text><Text className="mt-1 text-xs text-muted">{vehicle.plate} · KM atual {vehicle.currentKm.toLocaleString('pt-BR')}</Text></Pressable>)}</View><SectionHeader title="Dados da manutenção" /><View className="rounded-2xl border border-border bg-surface p-5"><Field label="KM do veículo" value={km} onChangeText={setKm} placeholder="Ex.: 75000" keyboardType="numeric" /><Field label="Data da manutenção" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" /><Field label="Custo da manutenção" value={cost} onChangeText={setCost} placeholder="Ex.: 1850,00" keyboardType="decimal-pad" /><Text className="mb-2 text-xs font-semibold text-muted">Status</Text><View className="mb-4 flex-row gap-2"><Choice label="Concluída" selected={status === 'Concluída'} onPress={() => setStatus('Concluída')} /><Choice label="Em andamento" selected={status === 'Em andamento'} onPress={() => setStatus('Em andamento')} /></View><Text className="mb-2 text-xs font-semibold text-muted">Observação</Text><TextInput value={observation} onChangeText={setObservation} multiline placeholder="Descreva os serviços executados, peças trocadas ou recomendações..." placeholderTextColor={colors.muted} className="min-h-[110px] rounded-xl border border-border bg-background px-4 py-3 text-foreground" /></View><PrimaryButton label={isSaving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Registrar Ordem de Serviço'} onPress={() => void save()} /></ScrollView></View></ScreenContainer>;
}
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { const colors = useColors(); return <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: selected ? colors.primary : colors.background, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.72 : 1 })} className="flex-1 rounded-xl border px-3 py-3"><Text style={{ color: selected ? '#fff' : colors.foreground }} className="text-center text-sm font-bold">{label}</Text></Pressable>; }
function Field({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'numeric' | 'decimal-pad' }) { const colors = useColors(); return <View className="mb-4"><Text className="mb-2 text-xs font-semibold text-muted">{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} placeholderTextColor={colors.muted} className="rounded-xl border border-border bg-background px-4 py-3 text-foreground" /></View>; }
