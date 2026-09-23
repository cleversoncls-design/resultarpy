import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { KpiCard } from "@/components/app-ui";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useLanguage } from "@/lib/language-provider";
import * as Api from "@/lib/_core/api";
import { formatDateDisplay, formatDateInput, parseBrazilianDate } from "@/lib/date-utils";

type Profile = Api.LocalProfile;

const profileOptions: Array<{ key: Profile; label: string; description: string }> = [
  { key: "traveler", label: "Viajante", description: "Acompanha as próprias viagens e presta contas." },
  { key: "traveler_approver", label: "Viajante + Aprovador", description: "Viaja, presta contas e aprova solicitações." },
  { key: "approver", label: "Aprovador", description: "Analisa e aprova solicitações de viagem." },
  { key: "admin", label: "Administrativo", description: "Acesso completo à gestão da organização." },
];

function profileLabel(profile: Profile) {
  return profileOptions.find((option) => option.key === profile)?.label ?? "Viajante + Aprovador";
}

export default function AdminUsersScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<Api.LocalUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [profile, setProfile] = useState<Profile>("traveler_approver");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingProfile, setEditingProfile] = useState<Profile>("traveler_approver");
  const [editingBirthDate, setEditingBirthDate] = useState("");
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((item) => {
      const matchesSearch = !normalizedSearch || `${item.name ?? ""} ${item.email ?? ""}`.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? item.active : !item.active);
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, users]);

  const refreshUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      setUsers(await Api.listLocalUsers());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("Não foi possível carregar os usuários."));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") refreshUsers();
  }, [isAuthenticated, user?.role, refreshUsers]);

  const createUser = async () => {
    setError(null);
    setSuccess(null);
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
      setName("");
      setEmail("");
      setPassword("");
      setBirthDate("");
      setProfile("traveler_approver");
      setSuccess(t("Usuário criado com sucesso."));
      await refreshUsers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t("Não foi possível criar o usuário."));
    } finally {
      setBusy(false);
    }
  };

  const beginEdit = (target: Api.LocalUser) => {
    setEditingId(target.id);
    setEditingName(target.name ?? "");
    setEditingProfile(target.profile);
    setEditingBirthDate(formatDateDisplay(target.birthDate ?? ""));
    setError(null);
    setSuccess(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) {
      setError(t("Informe o nome do usuário."));
      return;
    }
    const parsedBirthDate = editingBirthDate.trim() ? parseBrazilianDate(editingBirthDate) : null;
    if (editingBirthDate.trim() && !parsedBirthDate) {
      setError(t("Informe uma data de nascimento válida no formato dd/mm/aaaa."));
      return;
    }
    try {
      setBusy(true);
      const updated = await Api.updateLocalUser(editingId, { name: editingName, profile: editingProfile, birthDate: parsedBirthDate });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditingId(null);
      setSuccess(t("Usuário atualizado com sucesso."));
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : t("Não foi possível editar o usuário."));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (!resetId || !resetPassword) {
      setError(t("Informe a nova senha."));
      return;
    }
    try {
      setBusy(true);
      await Api.resetLocalUserPassword(resetId, resetPassword);
      setResetId(null);
      setResetPassword("");
      setSuccess(t("Senha redefinida e sessões anteriores encerradas."));
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : t("Não foi possível redefinir a senha."));
    } finally {
      setBusy(false);
    }
  };

  const toggleUser = async (target: Api.LocalUser) => {
    if (target.active) {
      const message = `${t('Bloquear o acesso de')} ${target.name || target.email}? ${t('As sessões ativas serão encerradas.')}`;
      const confirmed = Platform.OS === "web" ? window.confirm(message) : await new Promise<boolean>((resolve) => Alert.alert(t("Bloquear usuário"), message, [{ text: t("Cancelar"), style: "cancel", onPress: () => resolve(false) }, { text: t("Bloquear"), style: "destructive", onPress: () => resolve(true) }]));
      if (!confirmed) return;
    }
    setError(null);
    setSuccess(null);
    try {
      setTogglingId(target.id);
      const updated = await Api.setLocalUserActive(target.id, !target.active);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(updated.active ? t("Usuário desbloqueado.") : t("Usuário bloqueado."));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : t("Não foi possível atualizar o usuário."));
    } finally {
      setTogglingId(null);
    }
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center px-6"><View className="w-full max-w-md rounded-2xl border border-border bg-surface p-6"><Text className="text-xl font-bold text-foreground">{t('Acesso restrito')}</Text><Text className="mt-2 text-sm leading-5 text-muted">{t('Somente o Administrador pode gerenciar usuários locais.')}</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 44, marginTop: 20, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1 })}><Text className="font-bold text-white">{t('Voltar')}</Text></Pressable></View></ScreenContainer>;
  }

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5 pt-4"><ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="w-full max-w-3xl self-center">
    <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="mb-5 font-semibold text-primary">‹ {t('Voltar')}</Text></Pressable>
    <Text className="text-sm font-medium text-muted">{t('Administrativo · Segurança')}</Text>
    <Text className="mt-1 text-3xl font-bold text-foreground">{t('Usuários locais')}</Text>
    <Text className="mt-2 text-sm leading-5 text-muted">{t('Gerencie as contas registradas, bloqueie acessos e defina um único perfil funcional para cada usuário.')}</Text>

    {users.length > 0 ? <View className="mt-5 flex-row gap-3">
      <KpiCard label={t('Usuários')} value={String(users.length)} color={colors.foreground} />
      <KpiCard label={t('Ativos')} value={String(users.filter((item) => item.active).length)} color={colors.success} />
      <KpiCard label={t('Bloqueados')} value={String(users.filter((item) => !item.active).length)} color={colors.error} />
    </View> : null}

    <View style={{ borderTopWidth: 3, borderTopColor: colors.primary }} className="mt-6 rounded-2xl border border-border bg-surface p-5">
      <View className="flex-row items-center justify-between"><Text className="text-base font-bold text-foreground">{t('Usuários registrados')}</Text><Pressable onPress={refreshUsers} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="font-semibold text-primary">{t('Atualizar')}</Text></Pressable></View>
      <TextInput value={search} onChangeText={setSearch} placeholder={t('Buscar por nome ou e-mail')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-4 rounded-xl border px-4 py-3" />
      <View className="mt-3 flex-row gap-2"><Text className="mr-1 self-center text-xs font-semibold text-muted">{t('Status')}:</Text>{(["all", "active", "blocked"] as const).map((option) => { const selected = statusFilter === option; return <Pressable key={option} onPress={() => setStatusFilter(option)} style={({ pressed }) => ({ backgroundColor: selected ? colors.primary : colors.background, borderColor: selected ? colors.primary : colors.border, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: selected ? "#fff" : colors.foreground }} className="text-xs font-semibold">{option === "all" ? t("Todos") : option === "active" ? t("Ativos") : t("Bloqueados")}</Text></Pressable>; })}</View>
      {loadingUsers ? <View className="mt-5 items-center"><ActivityIndicator color={colors.primary} /></View> : users.length === 0 ? <Text className="mt-4 text-sm text-muted">{t('Nenhum usuário local registrado.')}</Text> : filteredUsers.length === 0 ? <Text className="mt-4 text-sm text-muted">{t('Nenhum usuário corresponde aos filtros.')}</Text> : <View className="mt-4">{filteredUsers.map((item) => <View key={item.id} style={{ borderLeftWidth: 3, borderLeftColor: item.active ? colors.success : colors.error }} className="mb-3 rounded-xl border border-border p-4">
        <View className="flex-row items-start justify-between"><View className="flex-1"><Text className="font-bold text-foreground">{item.name || "Sem nome"}</Text><Text className="mt-1 text-sm text-muted">{item.email}</Text><Text className="mt-2 text-xs font-semibold text-primary">{t(profileLabel(item.profile))}</Text></View><Text style={{ color: item.active ? colors.success : colors.error }} className="text-xs font-bold">{item.active ? t("Ativo") : t("Bloqueado")}</Text></View>
        {editingId === item.id ? <View className="mt-3 rounded-xl border border-border p-3"><TextInput value={editingName} onChangeText={setEditingName} placeholder={t('Nome completo')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="rounded-xl border px-3 py-2" /><TextInput value={editingBirthDate} onChangeText={(value) => setEditingBirthDate(formatDateInput(value))} keyboardType="numeric" placeholder="dd/mm/aaaa" placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-3 rounded-xl border px-3 py-2" /><View className="mt-3">{profileOptions.map((option) => <Pressable key={option.key} onPress={() => setEditingProfile(option.key)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingVertical: 6, opacity: pressed ? 0.7 : 1 })}><View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: editingProfile === option.key ? colors.primary : colors.muted, marginRight: 8, alignItems: "center", justifyContent: "center" }}>{editingProfile === option.key ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }} /> : null}</View><Text className="text-sm text-foreground">{t(option.label)}</Text></Pressable>)}</View><View className="mt-3 flex-row gap-2"><Pressable onPress={() => setEditingId(null)} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}><Text className="text-sm font-semibold text-muted">{t('Cancelar')}</Text></Pressable><Pressable onPress={saveEdit} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}><Text className="text-sm font-semibold text-white">{t('Salvar')}</Text></Pressable></View></View> : <View className="mt-3 flex-row gap-2"><Pressable onPress={() => beginEdit(item)} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}><Text className="text-xs font-semibold text-foreground">{t('Editar')}</Text></Pressable><Pressable onPress={() => { setResetId(item.id); setResetPassword(""); setError(null); setSuccess(null); }} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}><Text className="text-xs font-semibold text-foreground">{t('Redefinir senha')}</Text></Pressable></View>}
        {resetId === item.id ? <View className="mt-3 rounded-xl border border-border p-3"><TextInput value={resetPassword} onChangeText={setResetPassword} autoCapitalize="none" secureTextEntry placeholder={t('Nova senha (mínimo de 10 caracteres)')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="rounded-xl border px-3 py-2" /><View className="mt-3 flex-row gap-2"><Pressable onPress={() => setResetId(null)} style={({ pressed }) => ({ borderColor: colors.border, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}><Text className="text-sm font-semibold text-muted">{t('Cancelar')}</Text></Pressable><Pressable onPress={savePassword} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}><Text className="text-sm font-semibold text-white">{t('Salvar senha')}</Text></Pressable></View></View> : null}
        <Pressable disabled={togglingId === item.id || (item.id === user.id && item.active && item.profile === "admin")} onPress={() => toggleUser(item)} style={({ pressed }) => ({ borderColor: item.active ? colors.error : colors.success, borderWidth: 1, borderRadius: 9, minHeight: 38, marginTop: 12, alignItems: "center", justifyContent: "center", opacity: pressed || togglingId === item.id ? 0.65 : 1 })}><Text style={{ color: item.active ? colors.error : colors.success }} className="font-semibold">{togglingId === item.id ? t("Atualizando…") : item.active ? t("Bloquear acesso") : t("Desbloquear acesso")}</Text></Pressable>
      </View>)}</View>}
    </View>

    <View className="mt-5 rounded-2xl border border-border bg-surface p-5">
      <Text className="text-base font-bold text-foreground">{t('Novo usuário')}</Text>
      <Text className="mt-4 text-sm font-semibold text-foreground">{t('Nome')}</Text><TextInput value={name} onChangeText={setName} placeholder={t('Nome completo')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-2 rounded-xl border px-4 py-3" />
      <Text className="mt-4 text-sm font-semibold text-foreground">{t('E-mail')}</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder={t('nome@empresa.com')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-2 rounded-xl border px-4 py-3" />
<Text className="mt-4 text-sm font-semibold text-foreground">{t('Senha inicial')}</Text><TextInput value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry placeholder={t('Mínimo de 10 caracteres')} placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-2 rounded-xl border px-4 py-3" />
       <Text className="mt-4 text-sm font-semibold text-foreground">{t('Data de nascimento')}</Text><TextInput value={birthDate} onChangeText={(value) => setBirthDate(formatDateInput(value))} keyboardType="numeric" placeholder="dd/mm/aaaa" placeholderTextColor={colors.muted} style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }} className="mt-2 rounded-xl border px-4 py-3" />
       <Text className="mt-4 text-sm font-semibold text-foreground">{t('Perfil de acesso')}</Text>
      <View className="mt-2">{profileOptions.map((option) => { const selected = profile === option.key; return <Pressable key={option.key} onPress={() => setProfile(option.key)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", borderColor: selected ? colors.primary : colors.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, backgroundColor: selected ? `${colors.primary}14` : colors.background, opacity: pressed ? 0.75 : 1 })}><View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selected ? colors.primary : colors.muted, alignItems: "center", justifyContent: "center", marginRight: 10 }}>{selected ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}</View><View className="flex-1"><Text className="font-semibold text-foreground">{t(option.label)}</Text><Text className="mt-1 text-xs text-muted">{t(option.description)}</Text></View></Pressable>; })}</View>
      {error ? <Text className="mt-2 text-sm text-error">{error}</Text> : null}{success ? <Text className="mt-2 text-sm text-success">{success}</Text> : null}
      <View className="mt-5">{busy ? <ActivityIndicator color={colors.primary} /> : <Pressable onPress={createUser} style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 10, minHeight: 50, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}><Text className="font-bold text-white">{t('Criar usuário')}</Text></Pressable>}</View>
    </View>
  </ScrollView></ScreenContainer>;
}
