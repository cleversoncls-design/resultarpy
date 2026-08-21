import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { StatusPill } from '@/components/app-ui';
import { approvalQueue, formatCurrency } from '@/lib/demo-data';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';

export default function ApprovalsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const [items, setItems] = useState(approvalQueue);
  const decide = (id: string, action: 'Aprovar' | 'Rejeitar') => { setItems((current) => current.filter((item) => item.id !== id)); Alert.alert(action === 'Aprovar' ? t('Viagem aprovada') : t('Viagem rejeitada'), action === 'Aprovar' ? t('A solicitação avançou para o Administrativo.') : t('O viajante receberá a solicitação para correção.')); };
  return <ScreenContainer className="px-5 pt-4"><View className="w-full max-w-6xl flex-1 self-center"><Text className="text-sm font-medium text-muted">{t('Gestão da equipe')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{t('Aprovações')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Revise destino, cliente e adiantamento antes de liberar cada viagem.')}</Text><FlatList className="mt-6" data={items} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 36, gap: 12 }} renderItem={({ item }) => <View className="rounded-3xl border border-border bg-surface p-5"><View className="flex-row items-start justify-between"><View><Text className="text-xs font-bold tracking-wider text-muted">{item.id}</Text><Text className="mt-2 text-lg font-bold text-foreground">{item.destination}</Text><Text className="mt-1 text-sm text-muted">{item.traveler} · {item.dates}</Text></View><StatusPill status="Aguardando aprovação" /></View><View className="mt-4 flex-row items-center"><IconSymbol name="building.2.fill" size={16} color={colors.muted} /><Text className="ml-2 text-sm text-muted">{item.client}</Text><Text className="ml-auto font-bold text-foreground">{formatCurrency(item.amount)}</Text></View><View className="mt-5 flex-row gap-3"><Pressable onPress={() => decide(item.id, 'Rejeitar')} style={({ pressed }) => [{ borderColor: colors.error, opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center rounded-xl border px-3 py-3"><Text style={{ color: colors.error }} className="font-bold">{t('Rejeitar')}</Text></Pressable><Pressable onPress={() => decide(item.id, 'Aprovar')} style={({ pressed }) => [{ backgroundColor: colors.success, opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center rounded-xl px-3 py-3"><Text className="font-bold text-white">{t('Aprovar')}</Text></Pressable></View></View>} ListEmptyComponent={<View className="items-center py-16"><IconSymbol name="checkmark.seal.fill" size={42} color={colors.success} /><Text className="mt-4 text-lg font-bold text-foreground">{t('Tudo em dia')}</Text><Text className="mt-2 text-center text-sm text-muted">{t('Não há solicitações pendentes para revisão.')}</Text></View>} /></View></ScreenContainer>;
}
