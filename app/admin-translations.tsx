import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/hooks/use-auth';
import { useColors } from '@/hooks/use-colors';
import { getTranslationEntries, useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

export default function AdminTranslationsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, loading } = useAuth();
  const { t, translationOverrides, updateTranslation } = useLanguage();
  const remoteEntries = trpc.catalogs.translations.list.useQuery({}, { enabled: user?.role === 'admin', staleTime: 60_000 });
  const saveRemote = trpc.catalogs.translations.save.useMutation();
  const [search, setSearch] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const entries = useMemo(() => {
    const source = remoteEntries.data?.length ? remoteEntries.data.map((entry) => ({ key: entry.translationKey, spanish: entry.spanish })) : getTranslationEntries();
    return source.filter((entry) => `${entry.key} ${entry.spanish}`.toLowerCase().includes(search.toLowerCase()));
  }, [remoteEntries.data, search]);

  if (loading) return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  if (user?.role !== 'admin') return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6"><Text className="text-xl font-bold text-foreground">{t('Acesso restrito')}</Text><Text className="mt-2 text-center text-muted">{t('Os cadastros gerais estão disponíveis somente para o perfil Administrativo.')}</Text></ScreenContainer>;

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><View className="w-full max-w-5xl flex-1 self-center"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}><Pressable onPress={() => router.back()}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar')}</Text></Pressable><Text className="text-sm font-medium text-muted">{t('Administrativo · Configurações')}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{t('Catálogo de traduções')}</Text><Text className="mt-2 max-w-3xl text-sm leading-5 text-muted">{t('Edite as traduções padronizadas em espanhol. Os valores são salvos neste navegador ou dispositivo.')}</Text><TextInput value={search} onChangeText={setSearch} placeholder={t('Buscar tradução')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }} className="mt-6 rounded-xl border px-4 py-3" />{entries.map((entry) => <TranslationRow key={entry.key} entry={entry} value={translationOverrides[entry.key] ?? entry.spanish} colors={colors} t={t} saved={savedKey === entry.key} onSave={(value) => { const spanish = value.trim() || entry.spanish; updateTranslation(entry.key, spanish); if (user?.role === 'admin') void saveRemote.mutateAsync({ items: [{ key: entry.key, spanish }] }).catch(() => undefined); setSavedKey(entry.key); setTimeout(() => setSavedKey(null), 1200); }} />)}</ScrollView></View></ScreenContainer>;
}

function TranslationRow({ entry, value, colors, t, saved, onSave }: { entry: { key: string; spanish: string }; value: string; colors: ReturnType<typeof useColors>; t: (text: string) => string; saved: boolean; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  return <View className="mt-3 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs font-semibold text-muted">{entry.key}</Text><TextInput value={draft} onChangeText={setDraft} accessibilityLabel={`${t('Tradução para espanhol')}: ${entry.key}`} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-2 rounded-xl border px-3 py-2" /><View className="mt-3 flex-row items-center justify-between"><Text className="text-xs text-muted">{saved ? t('Salvo') : t('Espanhol')}</Text><Pressable onPress={() => onSave(draft)} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, opacity: pressed ? 0.7 : 1 })}><Text className="font-bold text-white">{t('Salvar')}</Text></Pressable></View></View>;
}
