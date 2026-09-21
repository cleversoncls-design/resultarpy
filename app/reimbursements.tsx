import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { MetricCard } from '@/components/app-ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';
import { formatCurrency, type Currency } from '@/lib/currency';
import { ReportExportActions } from '@/components/report-export-actions';
import type { ReportImage, ReportInfoLine, ReportRow as ExportRow } from '@/lib/report-export';

type ReimbursementRow = {
  id: number;
  tripId: number;
  tripCode: string;
  clientName: string;
  date: string;
  city: string;
  expenseTypeName: string;
  quantity: string;
  sourceAmount: string;
  sourceCurrency: string;
  currency: string;
  rate: number | null;
  spent: number;
  limit: number | null;
  reimbursable: number;
  excess: number;
  // Sempre em Guaraní (PYG), independente da moeda do perfil de limite —
  // é o que este relatório usa para exibir e somar valores.
  spentPyg: number;
  reimbursablePyg: number;
  excessPyg: number;
  profileCity: string | null;
  rateDate: string | null;
  conversionAvailable: boolean;
  receiptUri: string | null;
  reviewNote: string | null;
  reimbursementRejectedAt: string | null;
};

function validCurrency(value: string): Currency {
  return value === 'USD' || value === 'PYG' ? value : 'BRL';
}

function formatPyg(value: number) {
  return formatCurrency(value, 'PYG');
}

// Soma valores da moeda original (que pode variar de gasto pra gasto),
// juntando lado a lado — ex.: "G$ 100.000 · US$ 50,00".
function totalSourceByCurrency(rows: ReimbursementRow[]) {
  const totals = new Map<string, number>();
  rows.forEach((row) => totals.set(row.sourceCurrency, (totals.get(row.sourceCurrency) ?? 0) + Number(row.sourceAmount)));
  return Array.from(totals.entries()).map(([code, value]) => formatCurrency(value, validCurrency(code))).join(' · ') || formatPyg(0);
}

export default function ReimbursementsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, loading, isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const [tripId, setTripId] = useState<number | undefined>();
  const isNarrow = width < 640;

  const tripsQuery = trpc.operations.trips.list.useQuery(
    { page: 1, pageSize: 100, direction: 'asc' },
    { enabled: isAuthenticated },
  );
  // Só usado para preencher o bloco de dados da viagem (nome do
  // viajante), quando o filtro está numa viagem só.
  // catalogs.travelers.list é exclusivo do Administrativo — para o
  // próprio viajante vendo seu relatório, isso daria "acesso negado" e
  // quebraria a tela inteira. Só buscamos quando quem está olhando é
  // Administrativo; para o viajante, usamos o próprio nome de quem
  // está logado.
  const isAdminViewer = user?.role === 'admin';
  const travelersQuery = trpc.catalogs.travelers.list.useQuery(
    { page: 1, pageSize: 100, direction: 'asc', includeInactive: false },
    { enabled: isAuthenticated && Boolean(tripId) && isAdminViewer },
  );
  const reportQuery = trpc.operations.reports.reimbursement.useQuery(
    { page: 1, pageSize: 100, direction: 'asc', ...(tripId ? { tripId } : {}) },
    { enabled: isAuthenticated },
  );

  const rows = useMemo(() => (reportQuery.data?.items ?? []) as ReimbursementRow[], [reportQuery.data]);
  const trips = tripsQuery.data?.items ?? [];
  const travelers = travelersQuery.data?.items ?? [];
  const selectedTrip = tripId ? trips.find((trip) => trip.id === tripId) : undefined;
  const selectedTraveler = selectedTrip
    ? (isAdminViewer ? travelers.find((traveler) => traveler.id === (selectedTrip as any).travelerId) : undefined)
    : undefined;
  const travelerName = selectedTraveler?.name ?? (isAdminViewer ? undefined : user?.name) ?? t('Não informado');

  // Rejeição de comprovante — só o Administrativo pode marcar um gasto
  // como "comprovante inválido"; o gasto some do total a reembolsar e
  // aparece como rejeitado para o viajante.
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const setRejection = trpc.operations.expenses.setReimbursementRejection.useMutation({
    onSuccess: () => { void reportQuery.refetch(); setRejectingId(null); setRejectReason(''); },
  });

  const infoLines: ReportInfoLine[] | undefined = selectedTrip ? [
    { label: t('Viagem'), value: `${selectedTrip.tripCode} · ${selectedTrip.destination}` },
    { label: t('Viajante'), value: travelerName },
    { label: t('Data Início Viagem'), value: selectedTrip.startsOn },
    { label: t('Data Fim Viagem'), value: selectedTrip.endsOn },
  ] : undefined;

  const exportColumns = [
    { key: 'trip', label: t('Viagem') },
    { key: 'date', label: t('Data') },
    { key: 'city', label: t('Cidade') },
    { key: 'concept', label: t('Tipo de gasto') },
    { key: 'sourceSpent', label: t('Gasto') },
    { key: 'rate', label: t('Taxa da Moeda no dia') },
    { key: 'spent', label: t('Gasto Convertido') },
    { key: 'reimbursable', label: t('A reembolsar') },
    { key: 'excess', label: t('Excedente') },
  ];
  const exportRows: ExportRow[] = rows.map((row) => ({
    trip: `${row.tripCode} · ${row.clientName}`,
    date: row.date,
    city: row.city,
    concept: row.expenseTypeName,
    sourceSpent: formatCurrency(Number(row.sourceAmount), validCurrency(row.sourceCurrency)),
    rate: row.rate == null ? '—' : row.rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
    spent: formatPyg(row.spentPyg),
    reimbursable: formatPyg(row.reimbursablePyg),
    excess: formatPyg(row.excessPyg),
  }));
  const hasConversionWarning = rows.some((row) => !row.conversionAvailable);
  const totalSourceSpent = totalSourceByCurrency(rows);
  const spentTotal = formatPyg(rows.reduce((sum, row) => sum + row.spentPyg, 0));
  const reimbursableTotal = formatPyg(rows.reduce((sum, row) => sum + row.reimbursablePyg, 0));
  const excessTotal = formatPyg(rows.reduce((sum, row) => sum + row.excessPyg, 0));
  // Somatório pedido especificamente para Gasto, Gasto Convertido, A
  // reembolsar e Excedente (as demais colunas ficam em branco).
  const summaryRow: ExportRow = {
    trip: t('TOTAL DO PERÍODO SELECIONADO'),
    date: '', city: '', concept: '', rate: '',
    sourceSpent: totalSourceSpent,
    spent: spentTotal,
    reimbursable: reimbursableTotal,
    excess: excessTotal,
  };
  // Imagens de comprovante para anexar ao PDF — só as que são imagem de
  // verdade (um PDF de comprovante não entra dentro de outro PDF pelo
  // jeito que a biblioteca funciona) e que não foram rejeitadas.
  const receiptImages: ReportImage[] = rows
    .filter((row) => row.receiptUri?.startsWith('data:image') && !row.reimbursementRejectedAt)
    .map((row) => ({
      label: `${row.tripCode} · ${row.date} · ${row.expenseTypeName} · ${formatCurrency(Number(row.sourceAmount), validCurrency(row.sourceCurrency))}`,
      uri: row.receiptUri as string,
    }));

  if (loading) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6">
        <View className="w-full max-w-md items-center rounded-3xl border border-border bg-surface p-8">
          <IconSymbol name="lock.fill" size={28} color={colors.warning} />
          <Text className="mt-4 text-xl font-bold text-foreground">{t('Sessão necessária')}</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted">{t('Entre com seu usuário para consultar o relatório de reembolso.')}</Text>
          <Pressable
            onPress={() => router.replace('/login')}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: 10,
              minHeight: 42,
              marginTop: 20,
              paddingHorizontal: 18,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text className="font-bold text-white">{t('Ir para login')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4">
      <View className="w-full max-w-7xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
            <Text className="mb-5 font-semibold text-primary">‹ {t('Voltar')}</Text>
          </Pressable>
          <Text className="text-sm font-medium text-muted">{t('Viajante · Prestação de contas')}</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">{t('Reembolso ao viajante')}</Text>
          <Text className="mt-2 max-w-3xl text-sm leading-5 text-muted">
            {t('O limite específico da cidade tem prioridade; quando não existe, o sistema aplica o perfil genérico. Valores são sempre convertidos para Guaraní pela cotação diária registrada.')}
          </Text>

          <View className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{t('Filtrar por viagem')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <FilterChip label={t('Todas')} selected={!tripId} onPress={() => setTripId(undefined)} colors={colors} />
              {trips.map((trip) => (
                <FilterChip
                  key={trip.id}
                  label={`${trip.tripCode} · ${trip.destination}`}
                  selected={tripId === trip.id}
                  onPress={() => setTripId(trip.id)}
                  colors={colors}
                />
              ))}
            </ScrollView>
          </View>

          {selectedTrip ? (
            <View className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <Text className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{t('Dados da viagem')}</Text>
              <View className="flex-row flex-wrap gap-x-8 gap-y-2">
                <InfoField label={t('Viajante')} value={travelerName} colors={colors} />
                <InfoField label={t('Data Início Viagem')} value={selectedTrip.startsOn} colors={colors} />
                <InfoField label={t('Data Fim Viagem')} value={selectedTrip.endsOn} colors={colors} />
              </View>
            </View>
          ) : null}

          {reportQuery.isLoading && (
            <View className="mt-6 flex-row items-center rounded-2xl border border-border bg-surface p-5">
              <ActivityIndicator color={colors.primary} />
              <Text className="ml-3 text-sm text-muted">{t('Carregando relatório...')}</Text>
            </View>
          )}

          {reportQuery.isError && (
            <View className="mt-6 rounded-2xl border border-error bg-surface p-5">
              <Text className="font-semibold text-error">{t('Não foi possível carregar o relatório.')}</Text>
              <Text className="mt-1 text-sm text-muted">{t('Verifique a API e tente novamente.')}</Text>
              <Pressable onPress={() => void reportQuery.refetch()} style={({ pressed }) => ({ marginTop: 12, alignSelf: 'flex-start', opacity: pressed ? 0.65 : 1 })}>
                <Text className="font-bold text-primary">{t('Tentar novamente')}</Text>
              </Pressable>
            </View>
          )}

          {!reportQuery.isLoading && !reportQuery.isError && (
            <>
              <View className={isNarrow ? 'mt-6 flex-row flex-wrap gap-3' : 'mt-6 flex-row gap-3'}>
                <View className={isNarrow ? 'w-[48%]' : 'flex-1'}>
                  <MetricCard label={t('Gasto informado')} value={spentTotal} accent={colors.primary} />
                </View>
                <View className={isNarrow ? 'w-[48%]' : 'flex-1'}>
                  <MetricCard label={t('A reembolsar')} value={reimbursableTotal} accent={colors.success} />
                </View>
                <View className={isNarrow ? 'w-[48%]' : 'flex-1'}>
                  <MetricCard label={t('Excedente')} value={excessTotal} accent={rows.some((row) => row.excessPyg > 0) ? colors.warning : colors.success} />
                </View>
              </View>

              <Text className="mb-3 mt-8 text-base font-bold text-foreground">{t('Eventos de gasto')}</Text>
              {rows.length === 0 ? (
                <View className="rounded-2xl border border-border bg-surface p-6">
                  <Text className="text-sm text-muted">{t('Nenhum gasto persistido para os filtros selecionados.')}</Text>
                </View>
              ) : (
                <View className="rounded-2xl border border-border bg-surface p-2">
                  {rows.map((row) => (
                    <View key={row.id} className="border-b border-border p-4 last:border-b-0">
                      <View className="flex-row items-start justify-between">
                        <View className="min-w-0 flex-1">
                          <View className="flex-row flex-wrap items-center gap-2">
                            <Text className="text-xs font-bold tracking-wider text-muted">{row.tripCode} · {row.date} · {row.city}</Text>
                            {row.reimbursementRejectedAt ? <View style={{ backgroundColor: `${colors.error}18` }} className="rounded-full px-2 py-0.5"><Text style={{ color: colors.error }} className="text-[10px] font-bold uppercase">{t('Rejeitado')}</Text></View> : null}
                          </View>
                          <Text className="mt-1 font-bold text-foreground">{row.expenseTypeName} · {t('quantidade')} {row.quantity}</Text>
                          <Text className="mt-1 text-xs text-muted">{t('Gasto')}: {formatCurrency(Number(row.sourceAmount), validCurrency(row.sourceCurrency))}{row.sourceCurrency !== 'PYG' ? ` · ${t('Taxa da Moeda no dia')}: ${row.rate == null ? '—' : row.rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} · ${t('Gasto Convertido')}: ${formatPyg(row.spentPyg)}` : ''}</Text>
                          <Text className="mt-1 text-xs text-muted">{t('Limite aplicado')}: {row.limit === null ? t('Não cadastrado') : formatCurrency(row.limit, validCurrency(row.currency))} · {row.profileCity ? `${t('Perfil')}: ${row.profileCity}` : t('Perfil genérico')}</Text>
                          {row.reimbursementRejectedAt && row.reviewNote ? <Text style={{ color: colors.error }} className="mt-1 text-xs font-semibold">{t('Motivo')}: {row.reviewNote}</Text> : null}
                        </View>
                        <Text style={{ color: row.reimbursementRejectedAt ? colors.error : row.reimbursablePyg > 0 ? colors.success : colors.muted }} className="font-bold">{row.reimbursementRejectedAt ? t('Não reembolsável') : formatPyg(row.reimbursablePyg)}</Text>
                      </View>
                      <View className="mt-3 flex-row flex-wrap items-center justify-between gap-2">
                        <Text className="text-xs text-muted">{row.excessPyg > 0 ? `${t('Excedente não reembolsável')}: ${formatPyg(row.excessPyg)}` : t('Dentro do limite')}</Text>
                        <Text className="text-xs font-bold text-success">{row.conversionAvailable ? `${t('Cotação')}: ${row.rateDate ?? t('data não informada')}` : t('Cotação indisponível')}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Galeria de comprovantes — pedida para que quem estiver
                  conferindo possa ver as imagens de cada gasto lado a
                  lado com a referência dele, e (só o Administrativo)
                  rejeitar um comprovante inválido direto daqui. */}
              {rows.some((row) => row.receiptUri) ? (
                <>
                  <Text className="mb-3 mt-8 text-base font-bold text-foreground">{t('Comprovantes anexados')}</Text>
                  <View className="gap-3">
                    {rows.filter((row) => row.receiptUri).map((row) => (
                      <View key={row.id} className="rounded-2xl border border-border bg-surface p-4">
                        <View className="flex-row gap-3">
                          <Pressable onPress={() => setViewingReceipt(row.receiptUri)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                            {row.receiptUri?.startsWith('data:image') ? (
                              <Image source={{ uri: row.receiptUri }} style={{ width: 72, height: 72, borderRadius: 10 }} resizeMode="cover" />
                            ) : (
                              <View style={{ width: 72, height: 72, backgroundColor: `${colors.primary}14` }} className="items-center justify-center rounded-xl"><IconSymbol name="doc.text.fill" size={26} color={colors.primary} /></View>
                            )}
                          </Pressable>
                          <View className="flex-1">
                            <Text className="text-xs font-bold tracking-wider text-muted">{row.tripCode} · {row.date}</Text>
                            <Text className="mt-1 font-bold text-foreground">{row.expenseTypeName} · {formatCurrency(Number(row.sourceAmount), validCurrency(row.sourceCurrency))}</Text>
                            {row.reimbursementRejectedAt ? (
                              <View className="mt-2 flex-row items-center gap-2">
                                <View style={{ backgroundColor: `${colors.error}18` }} className="rounded-full px-2 py-0.5"><Text style={{ color: colors.error }} className="text-[10px] font-bold uppercase">{t('Rejeitado')}</Text></View>
                                {isAdminViewer ? <Pressable onPress={() => setRejection.mutate({ id: row.id, rejected: false })} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-xs font-bold text-primary">{t('Aceitar novamente')}</Text></Pressable> : null}
                              </View>
                            ) : isAdminViewer ? (
                              <Pressable onPress={() => { setRejectingId(row.id); setRejectReason(''); }} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })} className="mt-2 self-start"><Text style={{ color: colors.error }} className="text-xs font-bold">{t('Rejeitar comprovante')}</Text></Pressable>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              <ReportExportActions title={t('Reembolso ao viajante')} filename={`relatorio-reembolso-${tripId ?? 'todas'}`} columns={exportColumns} rows={exportRows} infoLines={infoLines} summaryRow={summaryRow} images={receiptImages} />
              {hasConversionWarning && (
                <View className="mt-5 flex-row items-center rounded-2xl border border-warning/20 bg-warning/10 p-4">
                  <Text className="flex-1 text-sm leading-5 text-foreground">{t('Há eventos sem cotação histórica suficiente. Atualize o cadastro diário de moedas antes de concluir o fechamento.')}</Text>
                </View>
              )}
              <ReceiptViewerModal uri={viewingReceipt} onClose={() => setViewingReceipt(null)} colors={colors} t={t} />
              <RejectReasonModal
                visible={rejectingId !== null}
                reason={rejectReason}
                onChangeReason={setRejectReason}
                onCancel={() => setRejectingId(null)}
                onConfirm={() => { if (rejectingId !== null) setRejection.mutate({ id: rejectingId, rejected: true, reviewNote: rejectReason.trim() || null }); }}
                saving={setRejection.isPending}
                colors={colors}
                t={t}
              />
            </>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function FilterChip({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? colors.primary : colors.background,
        borderColor: selected ? colors.primary : colors.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: selected ? '#fff' : colors.foreground }} className="text-xs font-bold">{label}</Text>
    </Pressable>
  );
}

function InfoField({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View>
      <Text className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</Text>
      <Text style={{ color: colors.foreground }} className="mt-0.5 text-sm font-bold">{value}</Text>
    </View>
  );
}

// Mostra o comprovante em tela cheia — imagem, ou um aviso quando for
// PDF (a Image do React Native não sabe exibir PDF).
function ReceiptViewerModal({ uri, onClose, colors, t }: { uri: string | null; onClose: () => void; colors: ReturnType<typeof useColors>; t: (key: string) => string }) {
  if (!uri) return null;
  const isPdf = uri.startsWith('data:application/pdf');
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 items-center justify-center bg-black/70 px-5">
        <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.surface }} className="max-h-[85%] w-full max-w-2xl rounded-2xl p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">{t('Comprovante')}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-2xl text-muted">×</Text></Pressable>
          </View>
          {isPdf ? <Text className="text-sm text-muted">{t('Este comprovante é um PDF — abra-o pela lista de despesas para visualizar.')}</Text> : <Image source={{ uri }} style={{ width: '100%', height: 420, borderRadius: 12 }} resizeMode="contain" />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Pede o motivo antes de confirmar a rejeição de um comprovante — fica
// registrado e é mostrado depois para o viajante.
function RejectReasonModal({ visible, reason, onChangeReason, onCancel, onConfirm, saving, colors, t }: {
  visible: boolean;
  reason: string;
  onChangeReason: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
  colors: ReturnType<typeof useColors>;
  t: (key: string) => string;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable onPress={onCancel} className="flex-1 items-center justify-center bg-black/70 px-5">
        <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.surface }} className="w-full max-w-md rounded-2xl p-5">
          <Text className="text-base font-bold text-foreground">{t('Rejeitar comprovante')}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">{t('Este gasto deixará de contar no total a reembolsar, e o motivo ficará visível para o viajante.')}</Text>
          <TextInput
            value={reason}
            onChangeText={onChangeReason}
            placeholder={t('Motivo (ex.: foto ilegível, comprovante de outra pessoa...)')}
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }}
            className="mt-4 min-h-[80px] rounded-xl border px-3 py-2"
          />
          <View className="mt-4 flex-row gap-2">
            <Pressable onPress={onCancel} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 10, flex: 1, paddingVertical: 10, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}><Text className="font-semibold text-muted">{t('Cancelar')}</Text></Pressable>
            <Pressable onPress={onConfirm} disabled={saving} style={({ pressed }) => ({ backgroundColor: colors.error, borderRadius: 10, flex: 1, paddingVertical: 10, alignItems: 'center', opacity: pressed || saving ? 0.7 : 1 })}><Text className="font-bold text-white">{saving ? t('Salvando...') : t('Confirmar rejeição')}</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
