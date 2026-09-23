import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

const catalogQueryInput = {
  page: 1,
  pageSize: 100,
  includeInactive: false,
  direction: 'asc' as const,
};

type CatalogKind = 'units' | 'cities' | 'clients' | 'travelers' | 'expenseTypes' | 'reimbursementLimits' | 'clientBillingLimits' | 'maintenanceReasons';

export default function GeneralRegistrationsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const profile = user?.profile ?? (user?.role === 'admin' ? 'admin' : 'traveler');
  const isAdmin = profile === 'admin';
  const liveEnabled = isAdmin && isAuthenticated;

  // Esta tela agora é só a "vitrine": mostra as contagens de cada cadastro
  // e leva para uma página própria de cada um ao clicar. As listas
  // completas e os formulários de criar/editar moraram para
  // app/cadastro-detalhe.tsx — antes ficavam todos empilhados aqui, o que
  // deixava a tela muito longa e confusa.
  const unitsQuery = trpc.catalogs.units.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const citiesQuery = trpc.catalogs.cities.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const clientsQuery = trpc.catalogs.clients.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const travelersQuery = trpc.catalogs.travelers.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const expenseTypesQuery = trpc.catalogs.expenseTypes.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const reimbursementLimitsQuery = trpc.catalogs.reimbursementLimits.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const clientBillingLimitsQuery = trpc.catalogs.clientBillingLimits.list.useQuery(catalogQueryInput, { enabled: liveEnabled });
  const maintenanceReasonsQuery = trpc.catalogs.maintenanceReasons.list.useQuery(catalogQueryInput, { enabled: liveEnabled });

  const queries = [unitsQuery, citiesQuery, clientsQuery, travelersQuery, expenseTypesQuery, reimbursementLimitsQuery, clientBillingLimitsQuery, maintenanceReasonsQuery];
  const isLoadingCatalogs = liveEnabled && queries.some((query) => query.isLoading);
  const hasCatalogError = liveEnabled && queries.some((query) => query.isError);
  const retryCatalogs = () => queries.forEach((query) => void query.refetch());

  const cards: { title: string; description: string; count: number; icon: 'building.2.fill' | 'briefcase.fill' | 'person.crop.circle.fill' | 'wallet.pass.fill' | 'wrench.and.screwdriver.fill'; kind: CatalogKind }[] = [
    { title: 'Unidades', description: 'Filiais ou escritórios da própria empresa, usados para vincular viagens, veículos e equipes.', count: unitsQuery.data?.total ?? 0, icon: 'building.2.fill', kind: 'units' },
    { title: 'Cidades', description: 'Qualquer cidade onde possa haver gasto de viagem — não precisa ter escritório da empresa lá.', count: citiesQuery.data?.total ?? 0, icon: 'building.2.fill', kind: 'cities' },
    { title: 'Viajantes e condutores', description: 'Pessoas que solicitam viagens ou conduzem veículos atribuídos.', count: travelersQuery.data?.total ?? 0, icon: 'person.crop.circle.fill', kind: 'travelers' },
    { title: 'Clientes', description: 'Clientes utilizados nas solicitações e no faturamento das despesas.', count: clientsQuery.data?.total ?? 0, icon: 'briefcase.fill', kind: 'clients' },
    { title: 'Tipos de gasto', description: 'Conceitos usados em reembolso e faturamento.', count: expenseTypesQuery.data?.total ?? 0, icon: 'wallet.pass.fill', kind: 'expenseTypes' },
    { title: 'Limites de reembolso', description: 'Limites por tipo de gasto, cidade ou regra genérica.', count: reimbursementLimitsQuery.data?.total ?? 0, icon: 'wallet.pass.fill', kind: 'reimbursementLimits' },
    { title: 'Limites por cliente', description: 'Vínculos de faturamento e teto por cliente.', count: clientBillingLimitsQuery.data?.total ?? 0, icon: 'briefcase.fill', kind: 'clientBillingLimits' },
    { title: 'Motivos de manutenção', description: 'Tipos preventivos e corretivos para Ordens de Serviço.', count: maintenanceReasonsQuery.data?.total ?? 0, icon: 'wrench.and.screwdriver.fill', kind: 'maintenanceReasons' },
  ];

  if (!isAdmin) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6">
        <View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
          <IconSymbol name="exclamationmark.triangle.fill" size={28} color={colors.warning} />
          <Text className="mt-4 text-xl font-bold text-foreground">{t('Acesso restrito')}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{t('Os cadastros gerais estão disponíveis somente para o perfil Administrativo.')}</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 42, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4">
      <View className="w-full max-w-6xl flex-1 self-center">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar')}</Text></Pressable>
          <Text className="text-sm font-medium text-muted">{t('Administrativo · Cadastros compartilhados')}</Text>
          <Text className="mt-1 text-3xl font-bold text-foreground">{t('Cadastros gerais')}</Text>
          <Text className="mt-2 max-w-3xl text-sm leading-5 text-muted">{t('Consulte os registros que alimentam simultaneamente as solicitações de viagem, a operação da frota e os relatórios administrativos. Toque em um cartão para abrir a lista completa daquele cadastro.')}</Text>
          <View className="mt-4 flex-row items-center"><View className="h-2 w-2 rounded-full" style={{ backgroundColor: liveEnabled ? colors.success : colors.warning }} /><Text className="ml-2 text-xs font-semibold text-muted">{liveEnabled ? t('Dados PostgreSQL') : t('Modo demonstração local')}</Text>{authLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}</View>

          {hasCatalogError && <View className="mt-4 rounded-xl border border-error bg-surface p-4"><Text className="font-semibold text-error">{t('Não foi possível carregar as contagens dos cadastros.')}</Text><Pressable onPress={retryCatalogs} style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: 10, opacity: pressed ? 0.65 : 1 })}><Text className="font-bold text-primary">{t('Tentar novamente')}</Text></Pressable></View>}
          {isLoadingCatalogs && <View className="mt-6 flex-row items-center rounded-xl border border-border bg-surface p-4"><ActivityIndicator color={colors.primary} /><Text className="ml-3 text-sm text-muted">{t('Carregando cadastros...')}</Text></View>}

          <View className="mt-7 flex-row flex-wrap gap-3">
            {cards.map((card) => (
              <Pressable
                key={card.kind}
                onPress={() => router.push({ pathname: '/cadastro-detalhe', params: { tipo: card.kind } })}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, borderTopWidth: 3, borderTopColor: colors.primary })}
                className="min-w-[250px] flex-1 rounded-2xl border border-border bg-surface p-5"
              >
                <View className="flex-row items-start justify-between">
                  <View style={{ backgroundColor: `${colors.primary}16` }} className="h-11 w-11 items-center justify-center rounded-xl"><IconSymbol name={card.icon} size={22} color={colors.primary} /></View>
                  <Text style={{ fontSize: 25, fontWeight: '800', lineHeight: 28 }} className="text-foreground">{card.count}</Text>
                </View>
                <Text className="mt-5 text-base font-bold text-foreground">{t(card.title)}</Text>
                <Text className="mt-1 min-h-[42px] text-sm leading-5 text-muted">{t(card.description)}</Text>
                <Text className="mt-3 text-xs font-bold text-primary">{t('Abrir cadastro')} ›</Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <Text className="text-lg font-bold text-foreground">{t('Cadastros específicos da Frota')}</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">{t('Veículos e motivos de manutenção continuam no cadastro da Frota, vinculados aos registros gerais acima.')}</Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              <Pressable onPress={() => router.push('/fleet-cadastros')} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Abrir Cadastros de Frota')}</Text></Pressable>
              <Pressable onPress={() => router.push('/new-trip')} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 10, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-foreground">{t('Nova solicitação')}</Text></Pressable>
            </View>
          </View>
          <CurrencyRatesPanel enabled={liveEnabled} colors={colors} t={t} />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function CurrencyRatesPanel({ enabled, colors, t }: { enabled: boolean; colors: ReturnType<typeof useColors>; t: (key: string) => string }) {
  const query = trpc.catalogs.currencyRates.latest.useQuery(undefined, { enabled });
  const sync = trpc.catalogs.currencyRates.sync.useMutation({ onSuccess: () => void query.refetch() });
  const rows = (query.data ?? []).filter((row) => row.fromCurrency !== row.toCurrency);
  const latestDate = rows[0]?.rateDate ?? t('Sem cotação registrada');
  return <View className="mt-4 rounded-2xl border border-border bg-surface p-5"><View className="flex-row flex-wrap items-start justify-between gap-3"><View className="min-w-0 flex-1"><Text className="text-lg font-bold text-foreground">{t('Cotações diárias')}</Text><Text className="mt-1 text-sm leading-5 text-muted">{t('Taxas oficiais em relação ao Guarani, registradas por data, fonte e tipo de cotação.')}</Text></View><Pressable onPress={() => sync.mutate()} disabled={!enabled || sync.isPending} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 9, minHeight: 38, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', opacity: pressed || sync.isPending ? 0.65 : 1 })}><Text className="text-xs font-bold text-white">{sync.isPending ? t('Atualizando...') : t('Atualizar agora')}</Text></Pressable></View>{query.isLoading ? <View className="mt-4 flex-row items-center"><ActivityIndicator color={colors.primary} /><Text className="ml-2 text-sm text-muted">{t('Carregando cotações...')}</Text></View> : rows.length === 0 ? <Text className="mt-4 text-sm text-muted">{t('A rotina automática ainda não registrou uma cotação.')}</Text> : <View className="mt-4 flex-row flex-wrap gap-3">{rows.map((row) => <View key={`${row.rateDate}-${row.fromCurrency}-${row.toCurrency}`} className="min-w-[180px] flex-1 rounded-xl border border-border bg-background p-3"><Text className="text-xs font-bold text-muted">{row.fromCurrency} → {row.toCurrency}</Text><Text className="mt-1 text-lg font-bold text-foreground">{row.rate}</Text><Text className="mt-1 text-xs text-muted">{latestDate} · {row.source} · {row.rateType}</Text></View>)}</View>}</View>;
}
