import { useState } from 'react';
import { formatDateDisplay, normalizeDateValue } from '@/lib/date-utils';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { StatusPill } from '@/components/app-ui';
import { CalendarModal } from '@/components/calendar-field';
import { formatCurrency } from '@/lib/currency';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';
import { useCurrency } from '@/lib/currency-provider';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';
import { ReportExportActions } from '@/components/report-export-actions';

type DecisionAction = 'Aprovar' | 'Rejeitar';
type HistoryDecision = 'Pendente' | 'Aprovada' | 'Rejeitada';

const decisionOptions: HistoryDecision[] = ['Pendente', 'Aprovada', 'Rejeitada'];
const historyPageSize = 10;

export default function ApprovalsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { isAuthenticated } = useAuth();
  const [pendingDecision, setPendingDecision] = useState<{ id: string; action: DecisionAction } | null>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  // A aba selecionada agora dirige a lista inteira (não mais um histórico
  // "por viagem" escondido dentro de cada card) — Pendiente mostra a fila
  // de decisão; Aprovada/Rejeitada mostram o histórico global.
  const [activeTab, setActiveTab] = useState<HistoryDecision>('Pendente');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const fromFilter = normalizeDateValue(historyFrom) ?? undefined;
  const toFilter = normalizeDateValue(historyTo) ?? undefined;
  const rangeValid = (!historyFrom || Boolean(fromFilter)) && (!historyTo || Boolean(toFilter)) && (!fromFilter || !toFilter || fromFilter <= toFilter);

  const pendingQuery = trpc.operations.approvals.list.useQuery(
    { page: 1, pageSize: 50, direction: 'asc', status: 'Pendiente', from: fromFilter, to: toFilter },
    { enabled: isAuthenticated && activeTab === 'Pendente' && rangeValid },
  );
  const decideMutation = trpc.operations.approvals.decide.useMutation();

  const globalHistoryDecision = activeTab === 'Aprovada' ? 'Aprovada' : activeTab === 'Rejeitada' ? 'Rejeitada' : undefined;
  const globalHistoryQuery = trpc.operations.approvals.historyGlobal.useQuery(
    { decision: globalHistoryDecision, from: fromFilter, to: toFilter, page: historyPage, pageSize: historyPageSize },
    { enabled: isAuthenticated && activeTab !== 'Pendente' && rangeValid },
  );
  const globalHistoryExportQuery = trpc.operations.approvals.historyGlobalExport.useQuery(
    { decision: globalHistoryDecision, from: fromFilter, to: toFilter },
    { enabled: isAuthenticated && activeTab !== 'Pendente' && rangeValid },
  );

  const pendingItems = (pendingQuery.data?.items ?? []).map((trip) => ({
    id: String(trip.id),
    traveler: t('Viajante vinculado'),
    destination: trip.destination,
    dates: `${trip.startsOn} – ${trip.endsOn}`,
    client: trip.clientId ? t('Cliente vinculado') : t('Sem cliente'),
    amount: Number(trip.advanceAmount),
    status: trip.status,
    latestApproval: trip.latestApproval,
  }));

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
        await pendingQuery.refetch();
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
          <Text className="text-sm font-bold text-foreground">{t('Filtros')}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {decisionOptions.map((option) => (
              <Pressable
                key={option}
                onPress={() => { setActiveTab(option); setHistoryPage(1); }}
                style={({ pressed }) => [{ backgroundColor: activeTab === option ? colors.primary : colors.background, borderColor: activeTab === option ? colors.primary : colors.border, opacity: pressed ? 0.7 : 1 }]}
                className="rounded-xl border px-3 py-2"
              >
                <Text style={{ color: activeTab === option ? colors.background : colors.foreground }} className="text-sm font-bold">{t(option)}</Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1 text-xs font-bold text-muted">{t('De')}</Text>
              <Pressable onPress={() => setShowFromCalendar(true)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className="flex-row items-center rounded-xl border border-border bg-background px-3 py-2"><Text className={historyFrom ? 'flex-1 text-foreground' : 'flex-1 text-muted'}>{formatDateDisplay(historyFrom) || 'dd/mm/aaaa'}</Text><Text className="text-lg text-primary">▣</Text></Pressable>
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-xs font-bold text-muted">{t('Até')}</Text>
              <Pressable onPress={() => setShowToCalendar(true)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className="flex-row items-center rounded-xl border border-border bg-background px-3 py-2"><Text className={historyTo ? 'flex-1 text-foreground' : 'flex-1 text-muted'}>{formatDateDisplay(historyTo) || 'dd/mm/aaaa'}</Text><Text className="text-lg text-primary">▣</Text></Pressable>
            </View>
          </View>
          {!rangeValid ? <Text className="mt-2 text-sm font-medium text-error">{t('Informe datas válidas e um período final igual ou posterior ao inicial.')}</Text> : null}
        </View>

        {activeTab === 'Pendente' ? (
          <FlatList
            className="mt-6"
            data={pendingItems}
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
                  <StatusPill status={item.status} />
                </View>
                <View className="mt-4 flex-row items-center">
                  <IconSymbol name="building.2.fill" size={16} color={colors.muted} />
                  <Text className="ml-2 text-sm text-muted">{item.client}</Text>
                  <Text className="ml-auto font-bold text-foreground">{formatCurrency(item.amount, currency)}</Text>
                </View>
                {item.latestApproval?.decision === 'Devolvida' && item.latestApproval.comment ? <View className="mt-4 rounded-2xl border border-warning bg-background p-4"><Text className="text-sm font-bold text-warning">{t('Devolvida para correção')}</Text><Text className="mt-1 text-sm text-muted">{item.latestApproval.comment}</Text></View> : null}
                <View className="mt-5 flex-row flex-wrap gap-3">
                  {item.status === 'Aguardando aprovação' ? <>
                    <Pressable onPress={() => openDecision(item.id, 'Rejeitar')} style={({ pressed }) => [{ borderColor: colors.error, opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center rounded-xl border px-3 py-3">
                      <Text style={{ color: colors.error }} className="font-bold">{t('Rejeitar')}</Text>
                    </Pressable>
                    <Pressable onPress={() => openDecision(item.id, 'Aprovar')} style={({ pressed }) => [{ backgroundColor: colors.success, opacity: pressed ? 0.7 : 1 }]} className="flex-1 items-center rounded-xl px-3 py-3">
                      <Text className="font-bold text-white">{t('Aprovar')}</Text>
                    </Pressable>
                  </> : null}
                </View>
                {item.status === 'Devolvida' ? <Text className="mt-3 text-sm font-medium text-warning">{t('Aguardando correção do viajante')}</Text> : null}
              </View>
            )}
            ListEmptyComponent={<View className="items-center py-16"><IconSymbol name="checkmark.seal.fill" size={42} color={colors.success} /><Text className="mt-4 text-lg font-bold text-foreground">{t('Tudo em dia')}</Text><Text className="mt-2 text-center text-sm text-muted">{t('Não há solicitações pendentes para revisão no período selecionado.')}</Text></View>}
          />
        ) : (
          <View className="mt-6">
            {globalHistoryQuery.isLoading ? <Text className="text-sm text-muted">{t('Carregando histórico...')}</Text> : null}
            {globalHistoryQuery.isError ? <Text className="text-sm text-error">{t('Não foi possível carregar o histórico.')}</Text> : null}
            {!globalHistoryQuery.isLoading && !globalHistoryQuery.isError && globalHistoryQuery.data?.items.length ? (
              <View className="gap-3">
                {globalHistoryQuery.data.items.map((entry) => (
                  <View key={entry.id} className="rounded-2xl border border-border bg-surface p-4">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-xs font-bold tracking-wider text-muted">{entry.tripCode}</Text>
                        <Text className="mt-1 font-bold text-foreground">{entry.destination}</Text>
                      </View>
                      <StatusPill status={entry.decision} />
                    </View>
                    <Text className="mt-2 text-xs text-muted">{t('Cliente')}: {entry.clientName} · {t('Aprovador')}: {entry.approverName} · {new Date(entry.decidedAt).toLocaleString()}</Text>
                    <Text className="mt-1 text-sm text-muted">{entry.comment ?? t('Sem comentário')}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {!globalHistoryQuery.isLoading && !globalHistoryQuery.isError && !globalHistoryQuery.data?.items.length ? (
              <View className="items-center py-16"><IconSymbol name="checkmark.seal.fill" size={42} color={colors.muted} /><Text className="mt-4 text-lg font-bold text-foreground">{t('Nenhum histórico para este status')}</Text><Text className="mt-2 text-center text-sm text-muted">{t('Não há solicitações neste status para o período selecionado.')}</Text></View>
            ) : null}
            {globalHistoryQuery.data && globalHistoryQuery.data.total > 0 ? (
              <>
                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="text-xs text-muted">{t('Página')} {globalHistoryQuery.data.page} {t('de')} {globalHistoryQuery.data.totalPages} · {globalHistoryQuery.data.total} {t('registros')}</Text>
                  <View className="flex-row gap-2">
                    <Pressable disabled={historyPage <= 1} onPress={() => setHistoryPage((page) => Math.max(page - 1, 1))} style={({ pressed }) => [{ borderColor: colors.border, opacity: pressed || historyPage <= 1 ? 0.45 : 1 }]} className="rounded-xl border px-3 py-2"><Text className="font-bold text-foreground">‹ {t('Anterior')}</Text></Pressable>
                    <Pressable disabled={historyPage >= globalHistoryQuery.data.totalPages} onPress={() => setHistoryPage((page) => Math.min(page + 1, globalHistoryQuery.data!.totalPages))} style={({ pressed }) => [{ borderColor: colors.border, opacity: pressed || historyPage >= globalHistoryQuery.data.totalPages ? 0.45 : 1 }]} className="rounded-xl border px-3 py-2"><Text className="font-bold text-foreground">{t('Próxima')} ›</Text></Pressable>
                  </View>
                </View>
                {globalHistoryExportQuery.data?.length ? <View className="mt-3"><ReportExportActions title={`${t('Histórico de decisões')} · ${t(activeTab)}`} filename={`historico-aprovacoes-${activeTab}`} columns={[{ key: 'trip', label: 'Viagem' }, { key: 'client', label: 'Cliente' }, { key: 'decision', label: 'Decisão' }, { key: 'approver', label: 'Aprovador' }, { key: 'date', label: 'Data' }, { key: 'comment', label: 'Comentário' }]} rows={globalHistoryExportQuery.data.map((entry) => ({ trip: `${entry.tripCode} · ${entry.destination}`, client: entry.clientName, decision: t(entry.decision), approver: entry.approverName, date: new Date(entry.decidedAt).toLocaleString(), comment: entry.comment ?? t('Sem comentário') }))} /></View> : null}
              </>
            ) : null}
          </View>
        )}
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
      <CalendarModal visible={showFromCalendar} onClose={() => setShowFromCalendar(false)} onSelect={(date) => { setHistoryFrom(date); setHistoryPage(1); setShowFromCalendar(false); }} title={t('Data inicial')} value={historyFrom} />
      <CalendarModal visible={showToCalendar} onClose={() => setShowToCalendar(false)} onSelect={(date) => { setHistoryTo(date); setHistoryPage(1); setShowToCalendar(false); }} title={t('Data final')} value={historyTo} />
    </ScreenContainer>
  );
}
