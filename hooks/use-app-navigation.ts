import { useMemo } from 'react';
import { usePathname } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { trpc } from '@/lib/trpc';

// Fonte única do menu do app (antes havia duas cópias, uma em
// desktop-route-shell.tsx e outra em app/(tabs)/_layout.tsx, que precisavam
// ser editadas em par — ambas agora consomem este hook.
export const moduleGroups = [
  { key: 'travel', label: 'Viagens', icon: 'airplane' as const, items: [
    { label: 'Visão geral', path: '/', icon: 'house.fill' as const },
    { label: 'Minhas viagens', path: '/trips', icon: 'airplane' as const },
    { label: 'Minhas viagens', path: '/trips?mine=1', icon: 'airplane' as const },
    { label: 'Nova solicitação', path: '/new-trip', icon: 'plus' as const },
    { label: 'Cadastros gerais', path: '/general-cadastros', icon: 'building.2.fill' as const },
    { label: 'Aprovações', path: '/approvals', icon: 'checkmark.seal.fill' as const },
    { label: 'Prestações pendentes', path: '/closure-queue', icon: 'checkmark.seal.fill' as const },
    { label: 'Operação', path: '/operations', icon: 'briefcase.fill' as const },
    { label: 'Relatório de reembolso', path: '/reimbursements', icon: 'wallet.pass.fill' as const },
    { label: 'Relatório de Faturamento', path: '/reports', icon: 'chart.bar.fill' as const },
  ] },
  { key: 'fleet', label: 'Frota', icon: 'car.fill' as const, items: [
    { label: 'Painel da frota', path: '/fleet', icon: 'car.fill' as const },
    { label: 'Cadastros de Frota', path: '/fleet-cadastros', icon: 'building.2.fill' as const },
    { label: 'Ordens de Serviço', path: '/new-work-order', icon: 'wrench.and.screwdriver.fill' as const },
    { label: 'Histórico de manutenção', path: '/maintenance-report', icon: 'chart.bar.fill' as const },
  ] },
  { key: 'settings', label: 'Configurações Gerais', icon: 'gearshape.fill' as const, items: [
    { label: 'Usuários', path: '/admin-users', icon: 'person.2.fill' as const },
    { label: 'Moedas', path: '/currency-settings', icon: 'wallet.pass.fill' as const },
  ] },
];

// Títulos para telas que não aparecem no menu lateral (abertas a partir de
// outra tela, ex.: detalhe de uma viagem), usados só no cabeçalho.
const EXTRA_TITLES: Record<string, { crumb: string; title: string }> = {
  '/profile': { crumb: 'Conta', title: 'Perfil' },
  '/trip-detail': { crumb: 'Viagens', title: 'Detalhe da viagem' },
  '/vehicle-detail': { crumb: 'Frota', title: 'Detalhe do veículo' },
  '/new-vehicle': { crumb: 'Frota', title: 'Novo veículo' },
  '/fleet-reservation': { crumb: 'Frota', title: 'Reserva de veículo' },
  '/cadastro-detalhe': { crumb: 'Viagens', title: 'Detalhe do cadastro' },
  '/admin-translations': { crumb: 'Configurações Gerais', title: 'Traduções' },
  '/administrativo': { crumb: 'Conta', title: 'Perfil administrativo' },
  '/aprovador': { crumb: 'Conta', title: 'Perfil aprovador' },
  '/viajante': { crumb: 'Conta', title: 'Perfil viajante' },
  '/profile-entry': { crumb: 'Conta', title: 'Perfil' },
};

export function useVisibleModules() {
  const { user } = useAuth();
  const profile = user?.profile ?? (user?.role === 'admin' ? 'admin' : 'traveler');
  const role = profile === 'admin' ? 'Administrativo' : profile === 'approver' ? 'Aprovador' : profile === 'traveler_approver' ? 'Viajante + Aprovador' : 'Viajante';
  const canApprove = profile === 'admin' || profile === 'approver' || profile === 'traveler_approver';
  const canAdmin = profile === 'admin';
  const hasOwnTripsQuery = trpc.operations.trips.hasOwnTrips.useQuery(undefined, { enabled: canAdmin });
  const visibleModules = useMemo(() => moduleGroups.map((module) => ({ ...module, items: module.items.filter((item) => {
    if ((module.key === 'fleet' || module.key === 'settings') && !canAdmin) return false;
    if (item.path === '/approvals') return canApprove;
    if (item.path === '/trips?mine=1') return canAdmin && Boolean(hasOwnTripsQuery.data);
    if (['/operations', '/reports', '/general-cadastros', '/admin-users', '/closure-queue'].includes(item.path)) return canAdmin;
    return true;
  }).map((item) => item.path === '/trips' && canAdmin ? { ...item, label: 'Todas as viagens' } : item) })).filter((module) => module.items.length > 0), [canAdmin, canApprove, hasOwnTripsQuery.data]);
  return { visibleModules, role, canAdmin, canApprove };
}

// Resolve o par "trilha / título" do cabeçalho a partir da rota atual,
// usando o próprio menu lateral como fonte — evita manter um título por
// tela separadamente.
export function usePageHeading(visibleModules: ReturnType<typeof useVisibleModules>['visibleModules']) {
  const pathname = usePathname();
  return useMemo(() => {
    for (const module of visibleModules) {
      const item = module.items.find((entry) => entry.path === '/' ? pathname === '/' : pathname.startsWith(entry.path.split('?')[0]));
      if (item) return { crumb: module.label, title: item.label };
    }
    const extra = EXTRA_TITLES[pathname];
    if (extra) return extra;
    const slug = pathname.replace(/^\//, '').split('/')[0] || 'inicio';
    const humanized = slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    return { crumb: 'Controle de Viagens', title: humanized };
  }, [pathname, visibleModules]);
}
