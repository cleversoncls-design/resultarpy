import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/hooks/use-auth';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';
import { trpc } from '@/lib/trpc';

type Security = 'ssl' | 'starttls' | 'none';

const securityOptions: Array<{ key: Security; label: string; port: number }> = [
  { key: 'ssl', label: 'SSL/TLS', port: 465 },
  { key: 'starttls', label: 'STARTTLS', port: 587 },
  { key: 'none', label: 'Sem criptografia', port: 25 },
];

const emptyForm = { enabled: false, smtpHost: '', smtpPort: '465', smtpSecurity: 'ssl' as Security, smtpUser: '', smtpPassword: '', fromEmail: '', fromName: '', adminRecipients: '' };

export default function EmailSettingsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const settingsQuery = trpc.settings.email.get.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const saveSettings = trpc.settings.email.save.useMutation();
  const sendTest = trpc.settings.email.sendTest.useMutation();
  const [form, setForm] = useState(emptyForm);
  const [prefilled, setPrefilled] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [testTo, setTestTo] = useState('');
  const [testFeedback, setTestFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const wide = width >= 900;

  useEffect(() => {
    const data = settingsQuery.data;
    if (!data || prefilled) return;
    setForm({
      enabled: data.enabled,
      smtpHost: data.smtpHost,
      smtpPort: String(data.smtpPort),
      smtpSecurity: (data.smtpSecurity === 'starttls' || data.smtpSecurity === 'none' ? data.smtpSecurity : 'ssl') as Security,
      smtpUser: data.smtpUser,
      smtpPassword: '',
      fromEmail: data.fromEmail,
      fromName: data.fromName,
      adminRecipients: data.adminRecipients,
    });
    setPrefilled(true);
  }, [prefilled, settingsQuery.data]);

  const update = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => setForm((current) => ({ ...current, [key]: value }));

  // Ao trocar a segurança, ajusta a porta junto se ela ainda for a padrão da opção anterior.
  const changeSecurity = (next: Security) => setForm((current) => {
    const previousDefault = securityOptions.find((option) => option.key === current.smtpSecurity)?.port;
    const nextDefault = securityOptions.find((option) => option.key === next)?.port ?? 465;
    return { ...current, smtpSecurity: next, smtpPort: Number(current.smtpPort) === previousDefault ? String(nextDefault) : current.smtpPort };
  });

  const save = async () => {
    setFeedback(null);
    const port = Number(form.smtpPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) { setFeedback({ ok: false, text: t('Informe uma porta válida (1 a 65535).') }); return; }
    try {
      await saveSettings.mutateAsync({ ...form, smtpPort: port, smtpPassword: form.smtpPassword || undefined });
      update('smtpPassword', '');
      void settingsQuery.refetch();
      setFeedback({ ok: true, text: t('Configuração salva com sucesso.') });
    } catch (error) {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : t('Não foi possível salvar a configuração.') });
    }
  };

  const runTest = async () => {
    setTestFeedback(null);
    try {
      await sendTest.mutateAsync({ to: testTo });
      setTestFeedback({ ok: true, text: t('E-mail de teste enviado.') });
    } catch (error) {
      setTestFeedback({ ok: false, text: error instanceof Error ? error.message : t('Não foi possível enviar o e-mail de teste.') });
    } finally {
      void settingsQuery.refetch();
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="items-center justify-center px-6"><View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6"><IconSymbol name="exclamationmark.triangle.fill" size={28} color={colors.warning} /><Text className="mt-4 text-xl font-bold text-foreground">{t('Acesso restrito')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Somente o Administrador pode configurar o envio de e-mails.')}</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 44, marginTop: 20, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable></View></ScreenContainer>;
  }

  const data = settingsQuery.data;
  const inputStyle = { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background };
  const label = (text: string, required = false) => <Text className="mb-2 mt-4 text-xs font-semibold text-muted">{text}{required ? <Text style={{ color: colors.error }}> *</Text> : null}</Text>;
  const banner = (item: { ok: boolean; text: string }) => <View style={{ borderColor: item.ok ? colors.success : colors.error, backgroundColor: `${item.ok ? colors.success : colors.error}14` }} className="mt-4 rounded-xl border px-4 py-3"><Text style={{ color: item.ok ? colors.success : colors.error }} className="text-sm font-semibold">{item.text}</Text></View>;

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="px-5 pt-4"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} className="w-full max-w-6xl self-center">
    <View className="mb-5 flex-row flex-wrap items-start justify-between gap-3">
      <View className="flex-1" style={{ minWidth: 260 }}><Text className="text-2xl font-bold text-foreground">{t('Configuração de e-mail')}</Text><Text className="mt-1 text-sm leading-5 text-muted">{t('Dados de SMTP usados para os avisos automáticos do sistema (solicitações, aprovações, liberação da viagem e prestação de contas).')}</Text></View>
      <Pressable onPress={() => router.push('/email-log')} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 })}><IconSymbol name="calendar.badge.clock" size={16} color={colors.foreground} /><Text className="text-sm font-semibold text-foreground">{t('Registro de e-mails enviados')}</Text></Pressable>
    </View>

    {settingsQuery.isLoading ? <View className="items-center py-10"><ActivityIndicator color={colors.primary} /></View> : settingsQuery.error ? <Text className="text-sm text-error">{settingsQuery.error.message}</Text> : <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
      <View style={{ flex: wide ? 2 : undefined, width: wide ? undefined : '100%' }} className="rounded-2xl border border-border bg-surface">
        <View className="border-b border-border px-5 py-4"><Text className="text-base font-bold text-foreground">{t('Servidor SMTP')}</Text></View>
        <View className="px-5 pb-5">
          <Pressable onPress={() => update('enabled', !form.enabled)} className="mt-5 flex-row items-center" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: form.enabled ? colors.primary : colors.muted, backgroundColor: form.enabled ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>{form.enabled ? <IconSymbol name="checkmark" size={13} color="#fff" /> : null}</View>
            <Text className="flex-1 text-sm text-foreground">{t('Ativo — envia os avisos automáticos de verdade')}</Text>
          </Pressable>

          <View style={{ flexDirection: width >= 600 ? 'row' : 'column', gap: 16 }}>
            <View style={{ flex: width >= 600 ? 3 : undefined }}>{label(t('Servidor SMTP'), true)}<TextInput value={form.smtpHost} onChangeText={(value) => update('smtpHost', value)} autoCapitalize="none" autoCorrect={false} placeholder="smtp.empresa.com" placeholderTextColor={colors.muted} style={inputStyle} className="rounded-xl border px-4 py-3" /></View>
            <View style={{ flex: width >= 600 ? 1 : undefined }}>{label(t('Porta'), true)}<TextInput value={form.smtpPort} onChangeText={(value) => update('smtpPort', value.replace(/\D/g, ''))} keyboardType="numeric" placeholder="465" placeholderTextColor={colors.muted} style={inputStyle} className="rounded-xl border px-4 py-3" /></View>
          </View>

          {label(t('Segurança da conexão'), true)}
          <View className="flex-row flex-wrap gap-2">{securityOptions.map((option) => { const selected = form.smtpSecurity === option.key; return <Pressable key={option.key} onPress={() => changeSecurity(option.key)} style={({ pressed }) => ({ backgroundColor: selected ? colors.primary : colors.background, borderColor: selected ? colors.primary : colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: selected ? '#fff' : colors.foreground }} className="text-sm font-semibold">{t(option.label)}</Text></Pressable>; })}</View>

          <View style={{ flexDirection: width >= 600 ? 'row' : 'column', gap: 16 }}>
            <View style={{ flex: 1 }}>{label(t('Usuário SMTP'))}<TextInput value={form.smtpUser} onChangeText={(value) => update('smtpUser', value)} autoCapitalize="none" autoCorrect={false} placeholder="usuario@empresa.com" placeholderTextColor={colors.muted} style={inputStyle} className="rounded-xl border px-4 py-3" /></View>
            <View style={{ flex: 1 }}>{label(t('Senha SMTP'))}<TextInput value={form.smtpPassword} onChangeText={(value) => update('smtpPassword', value)} autoCapitalize="none" autoCorrect={false} secureTextEntry placeholder={data?.hasPassword ? '••••••••' : ''} placeholderTextColor={colors.muted} style={inputStyle} className="rounded-xl border px-4 py-3" />{data?.hasPassword ? <Text className="mt-1 text-xs text-muted">{t('Já existe uma senha guardada — deixe em branco para mantê-la.')}</Text> : null}</View>
          </View>

          <View style={{ flexDirection: width >= 600 ? 'row' : 'column', gap: 16 }}>
            <View style={{ flex: 1 }}>{label(t('E-mail de origem (remetente)'), true)}<TextInput value={form.fromEmail} onChangeText={(value) => update('fromEmail', value)} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="viagens@empresa.com" placeholderTextColor={colors.muted} style={inputStyle} className="rounded-xl border px-4 py-3" /></View>
            <View style={{ flex: 1 }}>{label(t('Nome do remetente'))}<TextInput value={form.fromName} onChangeText={(value) => update('fromName', value)} placeholder="Controle de Viagens" placeholderTextColor={colors.muted} style={inputStyle} className="rounded-xl border px-4 py-3" /></View>
          </View>

          {label(t('E-mails do Administrativo'))}
          <TextInput value={form.adminRecipients} onChangeText={(value) => update('adminRecipients', value)} multiline autoCapitalize="none" autoCorrect={false} placeholder={'financeiro@empresa.com\nviagens@empresa.com'} placeholderTextColor={colors.muted} style={{ ...inputStyle, minHeight: 84, textAlignVertical: 'top' }} className="rounded-xl border px-4 py-3" />
          <Text className="mt-1 text-xs leading-4 text-muted">{t('Recebem os avisos "Viagem aprovada" e "Prestação de contas enviada". Um e-mail por linha (ou separados por vírgula). O aprovador e o viajante recebem os avisos no e-mail do próprio cadastro.')}</Text>

          {feedback ? banner(feedback) : null}
          <View className="mt-5 flex-row justify-end"><Pressable disabled={saveSettings.isPending} onPress={() => void save()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12, opacity: saveSettings.isPending ? 0.6 : pressed ? 0.8 : 1 })}><Text className="font-bold text-white">{saveSettings.isPending ? t('Salvando...') : t('Salvar')}</Text></Pressable></View>
        </View>
      </View>

      <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }} className="rounded-2xl border border-border bg-surface">
        <View className="border-b border-border px-5 py-4"><Text className="text-base font-bold text-foreground">{t('Enviar e-mail de teste')}</Text></View>
        <View className="px-5 pb-5">
          <Text className="mt-4 text-xs leading-4 text-muted">{t('Envia um e-mail de teste usando os dados já salvos ao lado — funciona mesmo com "Ativo" desligado.')}</Text>
          {label(t('Enviar teste para'), true)}
          <TextInput value={testTo} onChangeText={setTestTo} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="voce@exemplo.com" placeholderTextColor={colors.muted} style={inputStyle} className="rounded-xl border px-4 py-3" />
          <Pressable disabled={sendTest.isPending || !testTo.trim()} onPress={() => void runTest()} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 10, marginTop: 12, minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, opacity: sendTest.isPending || !testTo.trim() ? 0.5 : pressed ? 0.7 : 1 })}><Text className="font-semibold text-foreground">{sendTest.isPending ? t('Enviando...') : t('Enviar teste')}</Text></Pressable>
          {testFeedback ? banner(testFeedback) : null}
          {data?.lastTestAt ? <View style={{ borderColor: data.lastTestOk ? colors.success : colors.error, backgroundColor: `${data.lastTestOk ? colors.success : colors.error}14` }} className="mt-4 rounded-xl border px-4 py-3"><Text style={{ color: data.lastTestOk ? colors.success : colors.error }} className="text-sm font-semibold">{data.lastTestOk ? t('Último teste: sucesso') : t('Último teste: falhou')}</Text><Text className="mt-1 text-xs text-muted">{new Date(data.lastTestAt).toLocaleString('pt-BR')}</Text>{!data.lastTestOk && data.lastTestMessage ? <Text className="mt-1 text-xs text-muted">{data.lastTestMessage}</Text> : null}</View> : null}
        </View>
      </View>
    </View>}
  </ScrollView></ScreenContainer>;
}
