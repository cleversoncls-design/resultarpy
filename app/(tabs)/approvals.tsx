import { useState } from 'react';
import { formatDateDisplay, normalizeDateValue } from '@/lib/date-utils';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View, type ViewStyle } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { StatusPill } from '@/components/app-ui';
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
const historyPageSize = 5;
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export default function ApprovalsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { isAuthenticated } = useAuth();
  const [pendingDecision, setPendingDecision] = useState<{ id: string; action: DecisionAction } | null>(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [historyTripId, setHistoryTripId] = useState<string | null>(null);
  const [historyDecision, setHistoryDecision] = useState<HistoryDecision>('Pendente');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const query = trpc.operations.approvals.list.useQuery({ page: 1, pageSize: 50, direction: 'asc', status: historyDecision === 'Pendente' ? 'Pendiente' : historyDecision }, { enabled: isAuthenticated });
  const decideMutation = trpc.operations.approvals.decide.useMutation();
  const historyNumericId = historyTripId && /^\d+$/.test(historyTripId) ? Number(historyTripId) : null;
  const fromFilter = normalizeDateValue(historyFrom) ?? undefined;
  const toFilter = normalizeDateValue(historyTo) ?? undefined;
  const historyRangeValid = (!historyFrom || Boolean(fromFilter)) && (!historyTo || Boolean(toFilter)) && (!fromFilter || !toFilter || fromFilter <= toFilter);
  const historyDecisionFilter = historyDecision === 'Pendente' ? undefined : historyDecision;
  const historyQuery = trpc.operations.approvals.history.useQuery(
    { id: historyNumericId ?? 0, decision: historyDecisionFilter, from: fromFilter, to: toFilter, page: historyPage, pageSize: historyPageSize },
    { enabled: isAuthenticated && historyNumericId !== null && historyRangeValid },
  );
  const historyExportQuery = trpc.operations.approvals.historyExport.useQuery(
    { id: historyNumericId ?? 0, decision: historyDecisionFilter, from: fromFilter, to: toFilter },
    { enabled: isAuthenticated && historyNumericId !== null && historyRangeValid },
  );
  const persistedItems = query.data?.items.map((trip) => ({
    id: String(trip.id),
    traveler: t('Viajante vinculado'),
    destination: trip.destination,
    dates: `${trip.startsOn} – ${trip.endsOn}`,
    client: trip.clientId ? t('Cliente vinculado') : t('Sem cliente'),
    amount: Number(trip.advanceAmount),
    status: trip.status,
    latestApproval: trip.latestApproval,
  }));
  const items = persistedItems ?? [];

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
                onPress={() => { setHistoryDecision(option); setHistoryPage(1); }}
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
              <Pressable onPress={() => setShowFromCalendar(true)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className="flex-row items-center rounded-xl border border-border bg-background px-3 py-2"><Text className={historyFrom ? 'flex-1 text-foreground' : 'flex-1 text-muted'}>{formatDateDisplay(historyFrom) || 'dd/mm/aaaa'}</Text><Text className="text-lg text-primary">▣</Text></Pressable>
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-xs font-bold text-muted">{t('Até')}</Text>
              <Pressable onPress={() => setShowToCalendar(true)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className="flex-row items-center rounded-xl border border-border bg-background px-3 py-2"><Text className={historyTo ? 'flex-1 text-foreground' : 'flex-1 text-muted'}>{formatDateDisplay(historyTo) || 'dd/mm/aaaa'}</Text><Text className="text-lg text-primary">▣</Text></Pressable>
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
                <StatusPill status={item.status} />
              </View>
              <View className="mt-4 flex-row items-center">
                <IconSymbol name="building.2.fill" size={16} color={colors.muted} />
                <Text className="ml-2 text-sm text-muted">{item.client}</Text>
                <Text className="ml-auto font-bold text-foreground">{formatCurrency(item.amount, currency)}</Text>
              </View>
              {item.latestApproval?.decision === 'Devolvida' && item.latestApproval.comment ? <View className="mt-4 rounded-2xl border border-warning bg-background p-4"><Text className="text-sm font-bold text-warning">{t('Devolvida para correção')}</Text><Text className="mt-1 text-sm text-muted">{item.latestApproval.comment}</Text></View> : null}
              <View className="mt-5 flex-row flex-wrap gap-3">
                <Pressable onPress={() => { setHistoryTripId(historyTripId === item.id ? null : item.id); setHistoryPage(1); }} style={({ pressed }) => [{ borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]} className="rounded-xl border px-3 py-3">
                  <Text className="font-bold text-foreground">{t('Histórico')}</Text>
                </Pressable>
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
              {historyTripId === item.id ? (
                <View className="mt-4 rounded-2xl border border-border p-4">
                  <Text className="text-sm font-bold text-foreground">{t('Histórico de decisões')}</Text>
                  {historyQuery.isLoading ? <Text className="mt-2 text-sm text-muted">{t('Carregando histórico...')}</Text> : null}
                  {historyQuery.isError ? <Text className="mt-2 text-sm text-error">{t('Não foi possível carregar o histórico.')}</Text> : null}
                  {!historyQuery.isLoading && !historyQuery.isError && historyQuery.data?.items.length ? historyQuery.data.items.map((entry) => (
                    <View key={entry.id} className="mt-3 border-t border-border pt-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-bold text-foreground">{t(entry.decision)}</Text>
                        <Text className="text-xs text-muted">{new Date(entry.decidedAt).toLocaleDateString()}</Text>
                      </View>
                      <Text className="mt-1 text-xs text-muted">{t('Aprovador')}: {entry.approverName}</Text>
                      <Text className="mt-1 text-sm text-muted">{entry.comment ?? t('Sem comentário')}</Text>
                    </View>
                  )) : null}
                  {!historyQuery.isLoading && !historyQuery.isError && !historyQuery.data?.items.length ? <Text className="mt-2 text-sm text-muted">{t('Sem histórico de decisões para esta viagem.')}</Text> : null}
                  {historyQuery.data && historyQuery.data.total > 0 ? (
                    <>
                      <View className="mt-4 flex-row items-center justify-between">
                        <Text className="text-xs text-muted">{t('Página')} {historyQuery.data.page} {t('de')} {historyQuery.data.totalPages} · {historyQuery.data.total} {t('registros')}</Text>
                        <View className="flex-row gap-2">
                          <Pressable disabled={historyPage <= 1} onPress={() => setHistoryPage((page) => Math.max(page - 1, 1))} style={({ pressed }) => [{ borderColor: colors.border, opacity: pressed || historyPage <= 1 ? 0.45 : 1 }]} className="rounded-xl border px-3 py-2"><Text className="font-bold text-foreground">‹ {t('Anterior')}</Text></Pressable>
                          <Pressable disabled={historyPage >= historyQuery.data.totalPages} onPress={() => setHistoryPage((page) => Math.min(page + 1, historyQuery.data.totalPages))} style={({ pressed }) => [{ borderColor: colors.border, opacity: pressed || historyPage >= historyQuery.data.totalPages ? 0.45 : 1 }]} className="rounded-xl border px-3 py-2"><Text className="font-bold text-foreground">{t('Próxima')} ›</Text></Pressable>
                        </View>
                      </View>
                      {historyExportQuery.data?.length ? <ReportExportActions title={`${t('Histórico de decisões')} · ${item.id}`} filename={`historico-aprovacoes-${item.id}`} columns={[{ key: 'decision', label: 'Decisão' }, { key: 'approver', label: 'Aprovador' }, { key: 'date', label: 'Data' }, { key: 'comment', label: 'Comentário' }]} rows={historyExportQuery.data.map((entry) => ({ decision: t(entry.decision), approver: entry.approverName, date: new Date(entry.decidedAt).toLocaleString(), comment: entry.comment ?? t('Sem comentário') }))} /> : null}
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={<View className="items-center py-16"><IconSymbol name="checkmark.seal.fill" size={42} color={colors.success} /><Text className="mt-4 text-lg font-bold text-foreground">{historyDecision === 'Pendente' ? t('Tudo em dia') : t('Nenhum histórico para este status')}</Text><Text className="mt-2 text-center text-sm text-muted">{historyDecision === 'Pendente' ? t('Não há solicitações pendentes para revisão.') : t('Não há solicitações neste status para o período selecionado.')}</Text></View>}
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
      <DateCalendarModal visible={showFromCalendar} onClose={() => setShowFromCalendar(false)} onSelect={(date) => { setHistoryFrom(date); setHistoryPage(1); setShowFromCalendar(false); }} title={t('Data inicial')} />
      <DateCalendarModal visible={showToCalendar} onClose={() => setShowToCalendar(false)} onSelect={(date) => { setHistoryTo(date); setHistoryPage(1); setShowToCalendar(false); }} title={t('Data final')} />
    </ScreenContainer>
  );
}

function DateCalendarModal({ visible, onClose, onSelect, title }: { visible: boolean; onClose: () => void; onSelect: (date: string) => void; title: string }) {
  const colors = useColors();
  const { t, language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, index) => index);
  const monthNames = language === 'es-ES'
    ? ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    : ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekdayNames = language === 'es-ES' ? ['D', 'L', 'M', 'X', 'J', 'V', 'S'] : ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const cellStyle: ViewStyle = { width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center' };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-black/40 px-5"><View className="w-full max-w-sm rounded-3xl bg-background p-6"><View className="mb-4 flex-row items-center justify-between"><Text className="text-lg font-bold text-foreground">{title}</Text><Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><IconSymbol name="xmark" size={20} color={colors.muted} /></Pressable></View><View className="mb-4 flex-row items-center justify-between"><Pressable onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text style={{ color: colors.primary }} className="p-2 text-xl font-bold">‹</Text></Pressable><Text className="font-bold text-foreground">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text><Pressable onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text style={{ color: colors.primary }} className="p-2 text-xl font-bold">›</Text></Pressable></View><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{weekdayNames.map((day, index) => <View key={`weekday-${index}`} style={cellStyle}><Text className="text-xs font-bold text-muted">{day}</Text></View>)}{blanks.map((blank) => <View key={`blank-${blank}`} style={cellStyle} />)}{days.map((day) => <Pressable key={day} onPress={() => onSelect(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)} style={({ pressed }) => [cellStyle, { opacity: pressed ? 0.55 : 1 }]}><Text className="text-sm font-medium text-foreground">{day}</Text></Pressable>)}</View></View></View></Modal>;
}
