import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { StatusPill } from '@/components/app-ui';
import { approvalQueue, formatCurrency } from '@/lib/demo-data';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';

export default function ApprovalsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [demoItems, setDemoItems] = useState(approvalQueue);
  const query = trpc.operations.approvals.list.useQuery({ page: 1, pageSize: 50, direction: 'asc' }, { enabled: isAuthenticated });
  const decideMutation = trpc.operations.approvals.decide.useMutation();
  const persistedItems = query.data?.items.map((trip) => ({ id: String(trip.id), traveler: t('Viajante vinculado'), destination: trip.destination, dates: `${trip.startsOn} – ${trip.endsOn}`, client: trip.clientId ? t('Cliente vinculado') : t('Sem cliente'), amount: Number(trip.advanceAmount) }));
  const items = isAuthenticated ? (persistedItems ?? []) : demoItems;

  const decide = async (id: string, action: 'Aprovar' | 'Rejeitar') => {
    const decision = action === 'Aprovar' ? 'Aprovada' : 'Rejeitada';
    try {
      if (isAuthenticated && /^\d+$/.test(id)) {
        await decideMutation.mutateAsync({ tripId: Number(id), decision });
        await query.refetch();
      } else {
        setDemoItems((current) => current.filter((item) => item.id !== id));
      }
      Alert.alert(action === 'Aprovar' ? t('Viagem aprovada') : t('Viagem rejeitada'), action === 'Aprovar' ? t('A solicitação avançou para o Administrativo.') : t('O viajante receberá a solicitação para correção.'));
    } catch (error) {
      Alert.alert(t('Não foi possível decidir'), error instanceof Error ? error.message : t('Tente novamente.'));
    }
  };

  return <ScreenContainer className="px-5 pt-4"><View className="w-full max-w-6xl flex-1 self-center"><Text className="text-sm font-medium text-muted">{t('Gestão da equipe')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{t('Aprovações')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Revise destino, cliente e adiantamento antes de liberar cada viagem.')}</Text><FlatList className="mt-6" data={items} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 36, gap: 12 }} renderItem={({ item }) => <View className="rounded-3xl border border-border bg-surface p-5"><View className="flex-row items-start justify-between"><View className="flex-1"><Text className="text-xs font-bold tracking-wider text-muted">{item.id}</Text><Text className="mt-2 text-lg font-bold text-foreground">{item.destination}</Text><Text className="mt-1 text-sm text-muted">{item.traveler} · {item.dates}</Text></View><StatusPill status="Aguardando aprovação" /></View><View className="mt-4 flex-row items-center"><IconSymbol name="building.2.fill" size={16} color={colors.muted} /><Text className="ml-2 text-sm text-muted">{item.client}</Text><Text className="ml-auto font-bold text-foreground">{formatCurrency(item.amount)}</Text></View><View className="mt-5 flex-row gap-3"><Pressable onPress={() => void decide(item.id, 'Rejeitar')} style={({ pressed }) => [{ borderColor: colors.error, opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center rounded-xl border px-3 py-3"><Text style={{ color: colors.error }} className="font-bold">{t('Rejeitar')}</Text></Pressable><Pressable onPress={() => void decide(item.id, 'Aprovar')} style={({ pressed }) => [{ backgroundColor: colors.success, opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center rounded-xl px-3 py-3"><Text className="font-bold text-white">{t('Aprovar')}</Text></Pressable></View></View>} ListEmptyComponent={<View className="items-center py-16"><IconSymbol name="checkmark.seal.fill" size={42} color={colors.success} /><Text className="mt-4 text-lg font-bold text-foreground">{t('Tudo em dia')}</Text><Text className="mt-2 text-center text-sm text-muted">{t('Não há solicitações pendentes para revisão.')}</Text></View>} /></View></ScreenContainer>;
}
