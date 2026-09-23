import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { KpiCard, PrimaryButton, StatusPill, statusTone } from '@/components/app-ui';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

export default function ClosureQueueScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.profile === 'admin';
  const enabled = isAuthenticated && isAdmin;
  const query = trpc.operations.trips.closureQueue.useQuery({ page: 1, pageSize: 50, direction: 'asc' }, { enabled });
  const validateReceipts = trpc.operations.trips.validateReceipts.useMutation({ onSuccess: () => void query.refetch() });
  const billTrip = trpc.operations.trips.billTrip.useMutation({ onSuccess: () => void query.refetch() });
  const { width } = useWindowDimensions();
  const items = query.data?.items ?? [];
  const pendingValidationCount = items.filter((item) => !item.receiptsValidatedAt).length;
  const pendingBillingCount = items.filter((item) => Boolean(item.receiptsValidatedAt) && !item.billedAt).length;

  if (!isAdmin) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6">
        <View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
          <IconSymbol name="exclamationmark.triangle.fill" size={28} color={colors.warning} />
          <Text className="mt-4 text-xl font-bold text-foreground">{t('Acesso restrito')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('Esta fila está disponível somente para o perfil Administrativo.')}</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 42, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4">
      <View className="w-full max-w-5xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar')}</Text></Pressable>
          <Text className="text-sm font-medium text-muted">{t('Administrativo · Fechamento')}</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">{t('Prestações pendentes')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('Viagens com prestação de contas enviada, aguardando validação de comprovantes e faturamento ao cliente.')}</Text>

          {!query.isLoading && items.length > 0 ? (
            <View className={width < 640 ? 'mt-5 flex-col gap-3' : 'mt-5 flex-row gap-3'}>
              <KpiCard label={t('Total pendentes')} value={String(items.length)} color={colors.foreground} />
              <KpiCard label={t('Aguardando validação')} value={String(pendingValidationCount)} color={colors.warning} />
              <KpiCard label={t('Aguardando faturamento')} value={String(pendingBillingCount)} color={colors.primary} />
            </View>
          ) : null}

          {query.isLoading ? <Text className="mt-6 text-sm text-muted">{t('Carregando...')}</Text> : null}
          {query.isError ? <Text className="mt-6 text-sm text-error">{t('Não foi possível carregar a fila.')}</Text> : null}

          {!query.isLoading && items.length === 0 ? (
            <View className="mt-8 items-center rounded-2xl border border-dashed border-border bg-surface p-8">
              <IconSymbol name="checkmark.seal.fill" size={36} color={colors.success} />
              <Text className="mt-3 text-base font-bold text-foreground">{t('Nada pendente')}</Text>
              <Text className="mt-1 text-center text-sm text-muted">{t('Não há prestações de contas aguardando validação ou faturamento.')}</Text>
            </View>
          ) : null}

          <View className="mt-6 gap-3">
            {items.map((item) => {
              const needsValidation = !item.receiptsValidatedAt;
              const needsBilling = Boolean(item.receiptsValidatedAt) && !item.billedAt;
              const rowStatus = needsValidation ? 'Aguardando validação' : 'Aguardando faturamento';
              return (
                <View key={item.id} style={{ borderLeftWidth: 3, borderLeftColor: statusTone(rowStatus, colors).color }} className="rounded-2xl border border-border bg-surface p-5">
                  <View className="flex-row items-start justify-between">
                    <Pressable onPress={() => router.push({ pathname: '/trip-detail', params: { tripId: String(item.id) } })} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className="flex-1">
                      <Text className="text-xs font-bold tracking-wider text-muted">{item.tripCode}</Text>
                      <Text className="mt-1 text-lg font-bold text-foreground">{item.destination}</Text>
                      <Text className="mt-1 text-xs text-muted">{item.travelerName ?? t('Viajante')} · {item.clientName ?? t('Sem cliente')}</Text>
                    </Pressable>
                    <StatusPill status={rowStatus} />
                  </View>
                  <Text className="mt-3 text-xs text-muted">{t('Enviada em')} {item.closureSubmittedAt ? new Date(item.closureSubmittedAt as unknown as string).toLocaleString('pt-BR') : '—'}</Text>
                  {item.receiptsValidatedAt ? <Text className="mt-1 text-xs text-success">{t('Validada em')} {new Date(item.receiptsValidatedAt as unknown as string).toLocaleString('pt-BR')}</Text> : null}
                  <View className="mt-4 flex-row gap-3">
                    {needsValidation ? (
                      <View className="flex-1">
                        <PrimaryButton
                          label={validateReceipts.isPending ? t('Validando...') : t('Validar comprovantes')}
                          onPress={validateReceipts.isPending ? undefined : () => validateReceipts.mutate({ id: item.id })}
                        />
                      </View>
                    ) : needsBilling ? (
                      <View className="flex-1">
                        <PrimaryButton
                          label={billTrip.isPending ? t('Faturando...') : t('Faturar gastos')}
                          onPress={billTrip.isPending ? undefined : () => billTrip.mutate({ id: item.id })}
                        />
                      </View>
                    ) : null}
                    <Pressable onPress={() => router.push({ pathname: '/trip-detail', params: { tripId: String(item.id) } })} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                      <Text className="font-bold text-foreground">{t('Ver viagem')}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}
