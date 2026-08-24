import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { StatusPill } from '@/components/app-ui';
import { approvalQueue, formatCurrency } from '@/lib/demo-data';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';

type DecisionAction = 'Aprovar' | 'Rejeitar';
type HistoryDecision = 'Todas' | 'Aprovada' | 'Rejeitada' | 'Devolvida';

const decisionOptions: HistoryDecision[] = ['Todas', 'Aprovada', 'Rejeitada', 'Devolvida'];
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export default function ApprovalsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [demoItems, setDemoItems] = useState(approvalQueue);
  const [pendingDecision, setPendingDecision] = useState<{ id: string; action: DecisionAction } | null>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [historyTripId, setHistoryTripId] = useState<string | null>(null);
  const [historyDecision, setHistoryDecision] = useState<HistoryDecision>('Todas');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const query = trpc.operations.approvals.list.useQuery({ page: 1, pageSize: 50, direction: 'asc' }, { enabled: isAuthenticated });
  const decideMutation = trpc.operations.approvals.decide.useMutation();
  const historyNumericId = historyTripId && /^\d+$/.test(historyTripId) ? Number(historyTripId) : null;
  const fromFilter = isIsoDate(historyFrom) ? historyFrom : undefined;
  const toFilter = isIsoDate(historyTo) ? historyTo : undefined;
  const historyRangeValid = (!historyFrom || Boolean(fromFilter)) && (!historyTo || Boolean(toFilter)) && (!fromFilter || !toFilter || fromFilter <= toFilter);
  const historyQuery = trpc.operations.approvals.history.useQuery(
    { id: historyNumericId ?? 0, decision: historyDecision === 'Todas' ? undefined : historyDecision, from: fromFilter, to: toFilter },
    { enabled: isAuthenticated && historyNumericId !== null && historyRangeValid },
  );
  const persistedItems = query.data?.items.map((trip) => ({
    id: String(trip.id),
    traveler: t('Viajante vinculado'),
    destination: trip.destination,
    dates: `${trip.startsOn} – ${trip.endsOn}`,
    client: trip.clientId ? t('Cliente vinculado') : t('Sem cliente'),
    amount: Number(trip.advanceAmount),
  }));
  const items = isAuthenticated ? (persistedItems ?? []) : demoItems;

  const openDecision = (id: string, action: DecisionAction) => {
    setPendingDecision({ id, action });
    setComment('');
    setCommentError(null);
  };

  const submitDecision = async () => {
    if (!pendingDecision) return;
    const trimmedComment = comment.trim();
    if (trimmedComment.length < 3) {
      setCommentError(t('Comentário obrigatório'));
      Alert.alert(t('Comentário obrigatório'), t('Informe o motivo da decisão antes de confirmar.'));
      return;
    }
    setCommentError(null);
    const decision = pendingDecision.action === 'Aprovar' ? 'Aprovada' : 'Rejeitada';
    try {
      if (isAuthenticated && /^\d+$/.test(pendingDecision.id)) {
        await decideMutation.mutateAsync({ tripId: Number(pendingDecision.id), decision, comment: trimmedComment });
        await query.refetch();
      } else {
        setDemoItems((current) => current.filter((item) => item.id !== pendingDecision.id));
      }
      setPendingDecision(null);
      setComment('');
      setCommentError(null);
      Alert.alert(
        pendingDecision.action === 'Aprovar' ? t('Viagem aprovada') : t('Viagem rejeitada'),
        pendingDecision.action === 'Aprovar' ? t('A solicitação avançou para o Administrativo.') : t('O viajante receberá a solicitação para correção.'),
      );
    } catch (error) {
      Alert.alert(t('Não foi possível decidir'), error instanceof Error ? error.message : t('Tente novamente.'));
    }
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      <View className="w-full max-w-6xl flex-1 self-center">
        <Text className="text-sm font-medium text-muted">{t('Gestão da equipe')}</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">{t('Aprovações')}</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">{t('Revise destino, cliente e adiantamento antes de liberar cada viagem.')}</Text>

        <View className="mt-5 rounded-3xl border border-border bg-surface p-4">
          <Text className="text-sm font-bold text-foreground">{t('Filtros do histórico')}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {decisionOptions.map((option) => (
              <Pressable
                key={option}
                onPress={() => setHistoryDecision(option)}
                style={({ pressed }) => [{ backgroundColor: historyDecision === option ? colors.primary : colors.background, borderColor: historyDecision === option ? colors.primary : colors.border, opacity: pressed ? 0.7 : 1 }]}
                className="rounded-xl border px-3 py-2"
              >
                <Text style={{ color: historyDecision === option ? colors.background : colors.foreground }} className="text-sm font-bold">{t(option)}</Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1 text-xs font-bold text-muted">{t('De')}</Text>
              <TextInput value={historyFrom} onChangeText={setHistoryFrom} placeholder="AAAA-MM-DD" placeholderTextColor={colors.muted} maxLength={10} className="rounded-xl border border-border bg-background px-3 py-2 text-foreground" />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-xs font-bold text-muted">{t('Até')}</Text>
              <TextInput value={historyTo} onChangeText={setHistoryTo} placeholder="AAAA-MM-DD" placeholderTextColor={colors.muted} maxLength={10} className="rounded-xl border border-border bg-background px-3 py-2 text-foreground" />
            </View>
          </View>
          {!historyRangeValid ? <Text className="mt-2 text-sm font-medium text-error">{t('Informe datas válidas e um período final igual ou posterior ao inicial.')}</Text> : null}
        </View>

        <FlatList
          className="mt-6"
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 36, gap: 12 }}
          renderItem={({ item }) => (
            <View className="rounded-3xl border border-border bg-surface p-5">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-bold tracking-wider text-muted">{item.id}</Text>
                  <Text className="mt-2 text-lg font-bold text-foreground">{item.destination}</Text>
                  <Text className="mt-1 text-sm text-muted">{item.traveler} · {item.dates}</Text>
                </View>
                <StatusPill status="Aguardando aprovação" />
              </View>
              <View className="mt-4 flex-row items-center">
                <IconSymbol name="building.2.fill" size={16} color={colors.muted} />
                <Text className="ml-2 text-sm text-muted">{item.client}</Text>
                <Text className="ml-auto font-bold text-foreground">{formatCurrency(item.amount)}</Text>
              </View>
              <View className="mt-5 flex-row flex-wrap gap-3">
                <Pressable onPress={() => setHistoryTripId(historyTripId === item.id ? null : item.id)} style={({ pressed }) => [{ borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]} className="rounded-xl border px-3 py-3">
                  <Text className="font-bold text-foreground">{t('Histórico')}</Text>
                </Pressable>
                <Pressable onPress={() => openDecision(item.id, 'Rejeitar')} style={({ pressed }) => [{ borderColor: colors.error, opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center rounded-xl border px-3 py-3">
                  <Text style={{ color: colors.error }} className="font-bold">{t('Rejeitar')}</Text>
                </Pressable>
                <Pressable onPress={() => openDecision(item.id, 'Aprovar')} style={({ pressed }) => [{ backgroundColor: colors.success, opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center rounded-xl px-3 py-3">
                  <Text className="font-bold text-white">{t('Aprovar')}</Text>
                </Pressable>
              </View>
              {historyTripId === item.id ? (
                <View className="mt-4 rounded-2xl border border-border p-4">
                  <Text className="text-sm font-bold text-foreground">{t('Histórico de decisões')}</Text>
                  {historyQuery.isLoading ? <Text className="mt-2 text-sm text-muted">{t('Carregando histórico...')}</Text> : null}
                  {historyQuery.isError ? <Text className="mt-2 text-sm text-error">{t('Não foi possível carregar o histórico.')}</Text> : null}
                  {!historyQuery.isLoading && !historyQuery.isError && historyQuery.data?.length ? historyQuery.data.map((entry) => (
                    <View key={entry.id} className="mt-3 border-t border-border pt-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-bold text-foreground">{t(entry.decision)}</Text>
                        <Text className="text-xs text-muted">{new Date(entry.decidedAt).toLocaleDateString()}</Text>
                      </View>
                      <Text className="mt-1 text-xs text-muted">{t('Aprovador')}: {entry.approverName}</Text>
                      <Text className="mt-1 text-sm text-muted">{entry.comment ?? t('Sem comentário')}</Text>
                    </View>
                  )) : null}
                  {!historyQuery.isLoading && !historyQuery.isError && !historyQuery.data?.length ? <Text className="mt-2 text-sm text-muted">{t('Sem histórico de decisões para esta viagem.')}</Text> : null}
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={<View className="items-center py-16"><IconSymbol name="checkmark.seal.fill" size={42} color={colors.success} /><Text className="mt-4 text-lg font-bold text-foreground">{t('Tudo em dia')}</Text><Text className="mt-2 text-center text-sm text-muted">{t('Não há solicitações pendentes para revisão.')}</Text></View>}
        />
      </View>
      <Modal transparent visible={pendingDecision !== null} animationType="fade" onRequestClose={() => setPendingDecision(null)}>
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <View className="w-full max-w-lg rounded-3xl bg-background p-6">
            <Text className="text-xl font-bold text-foreground">{pendingDecision?.action === 'Aprovar' ? t('Confirmar aprovação') : t('Confirmar rejeição')}</Text>
            <Text className="mt-2 text-sm leading-5 text-muted">{t('O comentário será registrado no histórico da viagem.')}</Text>
            <Text className="mt-5 text-sm font-bold text-foreground">{t('Comentário da decisão')}</Text>
            <TextInput value={comment} onChangeText={(value) => { setComment(value); if (commentError) setCommentError(null); }} placeholder={t('Informe o motivo da decisão')} placeholderTextColor={colors.muted} multiline maxLength={2000} className="mt-2 min-h-28 rounded-2xl border border-border bg-surface px-4 py-3 text-foreground" style={{ textAlignVertical: 'top' }} />
            {commentError ? <Text className="mt-2 text-sm font-medium text-error">{commentError}</Text> : null}
            <View className="mt-5 flex-row gap-3">
              <Pressable onPress={() => setPendingDecision(null)} style={({ pressed }) => [{ borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center rounded-xl border px-3 py-3"><Text className="font-bold text-foreground">{t('Cancelar')}</Text></Pressable>
              <Pressable disabled={decideMutation.isPending} onPress={() => void submitDecision()} style={({ pressed }) => [{ backgroundColor: pendingDecision?.action === 'Aprovar' ? colors.success : colors.error, opacity: pressed || decideMutation.isPending ? 0.6 : 1 }]} className="flex-1 items-center rounded-xl px-3 py-3"><Text className="font-bold text-white">{t('Confirmar decisão')}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
