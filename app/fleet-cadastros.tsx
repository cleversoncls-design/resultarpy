import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SectionHeader } from '@/components/app-ui';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/lib/language-provider';

export default function FleetRegistrationsScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const input = { page: 1, pageSize: 100, direction: 'asc' as const };
  const vehiclesQuery = trpc.operations.fleet.vehicles.list.useQuery(input, { enabled: isAuthenticated });
  const unitsQuery = trpc.catalogs.units.list.useQuery({ ...input, includeInactive: false }, { enabled: isAuthenticated });
  const reasonsQuery = trpc.catalogs.maintenanceReasons.list.useQuery({ ...input, includeInactive: false }, { enabled: isAuthenticated });
  const vehicles = vehiclesQuery.data?.items ?? [];
  const units = unitsQuery.data?.items ?? [];
  const reasons = reasonsQuery.data?.items ?? [];
  const loading = vehiclesQuery.isLoading || unitsQuery.isLoading || reasonsQuery.isLoading;
  // "Unidades" e "Motivos de manutenção" agora abrem a página própria de
  // cada cadastro (app/cadastro-detalhe.tsx), em vez de levar para o topo
  // de "Cadastros gerais" inteiro.
  const cards = [
    { title: 'Veículos', description: 'Cadastre e atualize os veículos disponíveis na frota.', count: vehicles.length, icon: 'car.fill' as const, action: '/new-vehicle' as const, actionLabel: 'Novo veículo' },
    { title: 'Unidades', description: 'Consulte as unidades vinculadas à operação.', count: units.length, icon: 'building.2.fill' as const, action: { pathname: '/cadastro-detalhe', params: { tipo: 'units' } } as const, actionLabel: 'Ver unidades' },
    { title: 'Motivos de manutenção', description: 'Organize os tipos usados nas Ordens de Serviço.', count: reasons.length, icon: 'wrench.and.screwdriver.fill' as const, action: { pathname: '/cadastro-detalhe', params: { tipo: 'maintenanceReasons' } } as const, actionLabel: 'Gerenciar motivos' },
  ];
  const unitName = (id: number) => units.find((unit) => Number(unit.id) === id)?.name ?? `Unidade ${id}`;
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><View className="w-full max-w-6xl flex-1 self-center"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}><Pressable onPress={() => router.back()}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar para Frota')}</Text></Pressable><Text className="text-sm font-medium text-muted">{t('Administrativo · Cadastros')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{t('Cadastros de Frota')}</Text><Text className="mt-2 max-w-2xl text-sm leading-5 text-muted">{t('Gerencie os registros persistidos que sustentam reservas, manutenção e disponibilidade dos veículos.')}</Text>{loading && <View className="mt-5 flex-row items-center"><ActivityIndicator color={colors.primary} /><Text className="ml-2 text-sm text-muted">{t('Carregando dados persistidos...')}</Text></View>}<View className="mt-7 flex-row flex-wrap gap-3">{cards.map((card) => <View key={card.title} className="min-w-[280px] flex-1 rounded-2xl border border-border bg-surface p-5"><View className="flex-row items-start justify-between"><View style={{ backgroundColor: `${colors.primary}16` }} className="h-11 w-11 items-center justify-center rounded-xl"><IconSymbol name={card.icon} size={22} color={colors.primary} /></View><Text className="text-2xl font-bold text-foreground">{card.count}</Text></View><Text className="mt-5 text-base font-bold text-foreground">{t(card.title)}</Text><Text className="mt-1 min-h-[42px] text-sm leading-5 text-muted">{t(card.description)}</Text><Pressable onPress={() => router.push(card.action)} style={({ pressed }) => [{ backgroundColor: colors.primary, borderRadius: 10, minHeight: 40, marginTop: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 }]}><Text className="font-bold text-white">{t(card.actionLabel)}</Text></Pressable></View>)}</View><SectionHeader title={t('Veículos cadastrados')} action={`${vehicles.length} ${t('registros')}`} /><View className="rounded-2xl border border-border bg-surface p-2">{vehicles.length === 0 ? <Text className="p-4 text-sm text-muted">{t('Nenhum veículo persistido. Use Novo veículo para cadastrar o primeiro.')}</Text> : vehicles.map((vehicle) => <Pressable key={vehicle.id} onPress={() => router.push({ pathname: '/new-vehicle', params: { vehicleId: vehicle.id } })} className="border-b border-border p-4"><View className="flex-row items-center justify-between"><View className="flex-1 flex-row items-center"><View style={{ backgroundColor: `${colors.primary}16` }} className="h-10 w-10 items-center justify-center rounded-xl"><IconSymbol name="car.fill" size={20} color={colors.primary} /></View><View className="ml-3"><Text className="font-bold text-foreground">{vehicle.brand} {vehicle.model}</Text><Text className="mt-1 text-xs text-muted">{vehicle.plate} · {vehicle.modelYear} · {vehicle.color ?? t('Sem cor')} · {unitName(Number(vehicle.unitId))}</Text></View></View><Text className="text-xs font-bold text-primary">{t('Editar ›')}</Text></View></Pressable>)}</View><SectionHeader title={t('Motivos disponíveis')} action={`${reasons.length} ${t('motivos')}`} /><View className="mb-5 rounded-2xl border border-border bg-surface p-4">{reasons.length === 0 ? <Text className="text-sm text-muted">{t('Nenhum motivo persistido. Crie motivos em Cadastros Gerais.')}</Text> : reasons.map((reason) => <View key={reason.id} className="border-b border-border py-3"><Text className="font-bold text-foreground">{reason.name}</Text><Text className="mt-1 text-sm text-muted">{reason.description ?? reason.category}</Text></View>)}</View></ScrollView></View></ScreenContainer>;
}
