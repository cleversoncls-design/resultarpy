import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton, SecondaryButton } from '@/components/app-ui';
import { useColors } from '@/hooks/use-colors';
import { formatCurrency } from '@/lib/demo-data';
import { useLanguage } from '@/lib/language-provider';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';

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
};

const defaultDraft: TripDraft = {
  tripCode: `TR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  travelerId: 1,
  approverId: null as number | null,
  clientId: 1,
  unitId: 1,
  origin: 'Campo Grande',
  destination: '',
  country: 'Paraguai',
  area: 'Comercial',
  transport: 'Veículo da frota',
  startsOn: '2026-09-02',
  endsOn: '2026-09-05',
  status: 'Aguardando aprovação' as const,
  requiresFleetVehicle: true,
  hasAdvance: true,
  needsHotel: true,
  advanceAmount: '920.00',
};

export default function NewTripScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const editId = typeof params.tripId === 'string' && /^\d+$/.test(params.tripId) ? Number(params.tripId) : undefined;
  const [draft, setDraft] = useState(defaultDraft);
  const [isSaving, setIsSaving] = useState(false);
  const tripQuery = trpc.operations.trips.get.useQuery({ id: editId as number }, { enabled: isAuthenticated && editId !== undefined });
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
      advanceAmount: trip.advanceAmount,
    });
  }, [tripQuery.data]);

  const setField = <K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    if (!draft.destination.trim()) {
      Alert.alert(t('Destino obrigatório'), t('Informe a cidade de destino para continuar.'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.endsOn)) {
      Alert.alert(t('Data inválida'), t('Use o formato AAAA-MM-DD para início e fim da viagem.'));
      return;
    }
    if (!isAuthenticated) {
      Alert.alert(isEditing ? t('Alteração simulada') : t('Solicitação enviada'), isEditing ? t('No modo demonstrativo, a alteração será aplicada após conectar uma sessão.') : t('A viagem foi encaminhada ao aprovador da área.'), [{ text: t('Ver minhas viagens'), onPress: () => router.replace('/(tabs)/trips') }]);
      return;
    }
    setIsSaving(true);
    try {
      if (isEditing) {
        await updateTrip.mutateAsync({ id: editId, ...draft });
        Alert.alert(t('Viagem atualizada'), t('As alterações foram salvas na solicitação.'), [{ text: t('Ver minhas viagens'), onPress: () => router.replace('/(tabs)/trips') }]);
      } else {
        await createTrip.mutateAsync(draft);
        Alert.alert(t('Solicitação enviada'), t('A viagem foi encaminhada ao aprovador da área.'), [{ text: t('Ver minhas viagens'), onPress: () => router.replace('/(tabs)/trips') }]);
      }
    } catch (error) {
      Alert.alert(t('Não foi possível salvar'), error instanceof Error ? error.message : t('Tente novamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mb-5"><Text className="font-semibold text-primary">‹ {t('Voltar')}</Text></Pressable><Text className="text-3xl font-bold text-foreground">{isEditing ? t('Editar viagem') : t('Nova solicitação')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{isEditing ? t('Atualize os dados da solicitação antes de reenviar para o fluxo operacional.') : t('Preencha os dados essenciais. Você poderá complementar a prestação depois.')}</Text><FormLabel text="Destino da viagem" /><TextInput value={draft.destination} onChangeText={(value) => setField('destination', value)} placeholder="Ex.: Asunción" placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /><View className="mt-5 flex-row gap-3"><View className="flex-1"><FormLabel text="Início" /><TextInput value={draft.startsOn} onChangeText={(value) => setField('startsOn', value)} placeholder="AAAA-MM-DD" placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /></View><View className="flex-1"><FormLabel text="Fim" /><TextInput value={draft.endsOn} onChangeText={(value) => setField('endsOn', value)} placeholder="AAAA-MM-DD" placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /></View></View><FormLabel text="Área responsável" /><Select value={draft.area || 'Comercial'} /><FormLabel text="Unidade de atendimento" /><Select value={draft.unitId === 1 ? 'Asunción' : String(draft.unitId)} /><FormLabel text="Cliente" /><Select value={draft.clientId === 1 ? 'Cooperativa Central' : String(draft.clientId)} /><FormLabel text="Meio de transporte" /><View className="flex-row flex-wrap gap-2">{['Veículo da frota', 'Veículo próprio', 'Ônibus', 'Passagem aérea'].map((option) => <Pressable key={option} onPress={() => setDraft((current) => ({ ...current, transport: option, requiresFleetVehicle: option === 'Veículo da frota' }))} style={({ pressed }) => ({ borderColor: draft.transport === option ? colors.primary : colors.border, backgroundColor: draft.transport === option ? `${colors.primary}14` : colors.surface, opacity: pressed ? 0.72 : 1 })} className="rounded-xl border px-3 py-3"><Text style={{ color: draft.transport === option ? colors.primary : colors.foreground }} className="text-sm font-semibold">{t(option)}</Text></Pressable>)}</View><FormLabel text="Adiantamento" /><View className="flex-row gap-3"><Pressable onPress={() => setDraft((current) => ({ ...current, hasAdvance: true }))} style={({ pressed }) => ({ backgroundColor: draft.hasAdvance ? `${colors.primary}14` : colors.surface, borderColor: draft.hasAdvance ? colors.primary : colors.border, opacity: pressed ? 0.72 : 1 })} className="flex-1 rounded-2xl border p-4"><Text className="font-bold text-foreground">{t('Sim')}</Text><Text className="mt-1 text-xs text-muted">{formatCurrency(Number(draft.advanceAmount))} {t('estimados')}</Text></Pressable><Pressable onPress={() => setDraft((current) => ({ ...current, hasAdvance: false }))} style={({ pressed }) => ({ backgroundColor: !draft.hasAdvance ? `${colors.primary}14` : colors.surface, borderColor: !draft.hasAdvance ? colors.primary : colors.border, opacity: pressed ? 0.72 : 1 })} className="flex-1 rounded-2xl border p-4"><Text className="font-bold text-foreground">{t('Não')}</Text><Text className="mt-1 text-xs text-muted">{t('Sem adiantamento')}</Text></Pressable></View><View className="mt-5 flex-row gap-3"><View className="flex-1"><SecondaryButton label={t('Salvar rascunho')} onPress={() => Alert.alert(t('Rascunho salvo'), t('A solicitação ficará disponível para continuar depois.'))} /></View><View className="flex-1"><PrimaryButton label={isSaving ? t('Salvando...') : isEditing ? t('Salvar alterações') : t('Enviar para aprovação')} onPress={() => void submit()} /></View></View></ScrollView></ScreenContainer>;
}

function FormLabel({ text }: { text: string }) { const { t } = useLanguage(); return <Text className="mb-2 mt-5 text-sm font-bold text-foreground">{t(text)}</Text>; }
function Select({ value }: { value: string }) { const colors = useColors(); const { t } = useLanguage(); return <View className="flex-row items-center rounded-2xl border border-border bg-surface px-4 py-4"><Text className="flex-1 text-foreground">{t(value)}</Text><Text style={{ color: colors.primary }} className="text-lg">⌄</Text></View>; }
