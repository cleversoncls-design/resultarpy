import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/hooks/use-auth';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

const eventLabels: Record<string, string> = {
  trip_requested: 'Solicitação de viagem',
  trip_approved: 'Viagem aprovada',
  trip_released: 'Viagem liberada',
  closure_submitted: 'Prestação de contas',
  test: 'Teste',
};

const PAGE_SIZE = 20;

export default function EmailLogScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [page, setPage] = useState(1);
  const logQuery = trpc.settings.email.log.useQuery({ page, pageSize: PAGE_SIZE }, { enabled: isAuthenticated && isAdmin });

  if (!isAuthenticated || !isAdmin) {
    return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6"><View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6"><Text className="text-xl font-bold text-foreground">{t('Acesso restrito')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Somente o Administrador pode ver o registro de e-mails.')}</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 44, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable></View></ScreenContainer>;
  }

  const items = logQuery.data?.items ?? [];
  const pagerButton = (text: string, disabled: boolean, onPress: () => void) => <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.background, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}><Text className="text-sm font-semibold text-foreground">{text}</Text></Pressable>;

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} className="w-full max-w-6xl self-center">
    <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar para Configuração de e-mail')}</Text></Pressable>
    <View className="flex-row items-start justify-between gap-3"><View className="flex-1"><Text className="text-2xl font-bold text-foreground">{t('Registro de e-mails enviados')}</Text><Text className="mt-1 text-sm leading-5 text-muted">{t('Cada aviso automático e teste tentado, com o resultado do envio.')}</Text></View><Pressable onPress={() => void logQuery.refetch()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="font-semibold text-primary">{t('Atualizar')}</Text></Pressable></View>

    <View style={{ borderTopWidth: 3, borderTopColor: colors.primary }} className="mt-5 rounded-2xl border border-border bg-surface p-5">
      {logQuery.isLoading ? <View className="items-center py-6"><ActivityIndicator color={colors.primary} /></View> : logQuery.error ? <Text className="text-sm text-error">{logQuery.error.message}</Text> : items.length === 0 ? <Text className="text-sm text-muted">{page === 1 ? t('Nenhum e-mail enviado ainda.') : t('Não há mais registros.')}</Text> : <View>
        <View className="flex-row items-center border-b border-border px-1 pb-2"><Text className="w-36 text-xs font-semibold text-muted">{t('Data')}</Text><Text className="w-36 text-xs font-semibold text-muted">{t('Aviso')}</Text><Text className="flex-[2] text-xs font-semibold text-muted">{t('Para')}</Text><Text className="flex-[3] text-xs font-semibold text-muted">{t('Assunto')}</Text><Text className="w-20 text-xs font-semibold text-muted">{t('Situação')}</Text></View>
        {items.map((item) => { const ok = item.status === 'sent'; return <View key={item.id} className="border-b border-border px-1 py-2">
          <View className="flex-row items-center">
            <Text className="w-36 text-xs text-muted">{new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
            <Text numberOfLines={1} className="w-36 pr-2 text-xs font-semibold text-foreground">{t(eventLabels[item.event] ?? item.event)}</Text>
            <Text numberOfLines={1} className="flex-[2] pr-2 text-xs text-muted">{item.toEmail}</Text>
            <Text numberOfLines={1} className="flex-[3] pr-2 text-xs text-foreground">{item.subject}</Text>
            <Text style={{ color: ok ? colors.success : colors.error }} className="w-20 text-xs font-bold">{ok ? t('Enviado') : t('Erro')}</Text>
          </View>
          {!ok && item.error ? <Text style={{ color: colors.error }} className="mt-1 text-xs">{item.error}</Text> : null}
        </View>; })}
        <View className="mt-4 flex-row items-center justify-between"><View>{pagerButton(`‹ ${t('Anterior')}`, page <= 1, () => setPage((current) => Math.max(1, current - 1)))}</View><Text className="text-xs text-muted">{t('Página')} {page}</Text><View>{pagerButton(`${t('Próxima')} ›`, !logQuery.data?.hasMore, () => setPage((current) => current + 1))}</View></View>
      </View>}
    </View>
  </ScrollView></ScreenContainer>;
}
