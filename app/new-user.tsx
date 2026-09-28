import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";
import * as Api from "@/lib/_core/api";
import { formatDateInput, parseBrazilianDate } from "@/lib/date-utils";

type Profile = Api.LocalProfile;

const profileOptions: Array<{ key: Profile; label: string; description: string }> = [
  { key: "traveler", label: "Viajante", description: "Acompanha as próprias viagens e presta contas." },
  { key: "traveler_approver", label: "Viajante + Aprovador", description: "Viaja, presta contas e aprova solicitações." },
  { key: "approver", label: "Aprovador", description: "Analisa e aprova solicitações de viagem." },
  { key: "admin", label: "Administrativo", description: "Acesso completo à gestão da organização." },
];

export default function NewUserScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [profile, setProfile] = useState<Profile>("traveler_approver");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const createUser = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError(t("Informe nome, e-mail e senha."));
      return;
    }
    const parsedBirthDate = birthDate.trim() ? parseBrazilianDate(birthDate) : null;
    if (birthDate.trim() && !parsedBirthDate) {
      setError(t("Informe uma data de nascimento válida no formato dd/mm/aaaa."));
      return;
    }
    try {
      setBusy(true);
      await Api.createLocalUser({ name, email, password, role: profile === "admin" ? "admin" : "user", profile, birthDate: parsedBirthDate });
      router.replace("/admin-users");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t("Não foi possível criar o usuário."));
    } finally {
      setBusy(false);
    }
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center px-6"><View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6"><Text className="text-xl font-bold text-foreground">{t('Acesso restrito')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Somente o Administrador pode gerenciar usuários locais.')}</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 44, marginTop: 20, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable></View></ScreenContainer>;
  }

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5 pt-4"><ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="w-full max-w-3xl self-center">
    <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar para Usuários locais')}</Text></Pressable>
    <Text className="text-sm font-medium text-muted">{t('Administrativo · Segurança')}</Text>
    <Text className="mt-1 text-3xl font-bold text-foreground">{t('Adicionar usuário')}</Text>
    <Text className="mt-2 text-sm leading-5 text-muted">{t('Crie uma conta local e defina o perfil de acesso do usuário.')}</Text>

    <View className="mt-6 rounded-2xl border border-border bg-surface p-5">
      <Text className="text-sm font-semibold text-foreground">{t('Nome')}</Text><TextInput value={name} onChangeText={setName} placeholder={t('Nome completo')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-2 rounded-xl border px-4 py-3" />
      <Text className="mt-4 text-sm font-semibold text-foreground">{t('E-mail')}</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder={t('nome@empresa.com')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-2 rounded-xl border px-4 py-3" />
      <Text className="mt-4 text-sm font-semibold text-foreground">{t('Senha inicial')}</Text><TextInput value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry placeholder={t('Mínimo de 10 caracteres')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-2 rounded-xl border px-4 py-3" />
      <Text className="mt-4 text-sm font-semibold text-foreground">{t('Data de nascimento')}</Text><TextInput value={birthDate} onChangeText={(value) => setBirthDate(formatDateInput(value))} keyboardType="numeric" placeholder="dd/mm/aaaa" placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-2 rounded-xl border px-4 py-3" />
      <Text className="mt-4 text-sm font-semibold text-foreground">{t('Perfil de acesso')}</Text>
      <View className="mt-2">{profileOptions.map((option) => { const selected = profile === option.key; return <Pressable key={option.key} onPress={() => setProfile(option.key)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", borderColor: selected ? colors.primary : colors.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: selected ? `${colors.primary}14` : colors.background, opacity: pressed ? 0.75 : 1 })}><View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selected ? colors.primary : colors.muted, alignItems: "center", justifyContent: "center", marginRight: 10 }}>{selected ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}</View><View className="flex-1"><Text className="font-semibold text-foreground">{t(option.label)}</Text><Text className="mt-1 text-xs text-muted">{t(option.description)}</Text></View></Pressable>; })}</View>
      {error ? <Text className="mt-2 text-sm text-error">{error}</Text> : null}
      <View className="mt-5">{busy ? <ActivityIndicator color={colors.primary} /> : <Pressable onPress={() => void createUser()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 50, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}><Text className="font-bold text-white">{t('Criar usuário')}</Text></Pressable>}</View>
    </View>
  </ScrollView></ScreenContainer>;
}
