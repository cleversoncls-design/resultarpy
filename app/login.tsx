import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton } from "@/components/app-ui";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Antes não tinha como conferir a senha digitada antes de enviar —
  // adicionado o ícone de olho para mostrar/ocultar.
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Informe seu e-mail e sua senha.");
      return;
    }
    try {
      setBusy(true);
      const result = await Api.loginLocal(email, password);
      const user = result.user;
      await Auth.setUserInfo({
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
        loginMethod: user.loginMethod,
        lastSignedIn: new Date(user.lastSignedIn),
        role: user.role,
        profile: user.profile,
        active: user.active,
      });
      if (Platform.OS === "web") {
        window.dispatchEvent(new Event("local-auth-changed"));
      }
      router.replace("/(tabs)");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível realizar o login.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="justify-center px-4">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%", maxWidth: 390, alignSelf: "center" }}>
        <View className="mb-7">
          <View style={{ backgroundColor: colors.primary }} className="mb-5 h-12 w-12 items-center justify-center rounded-xl">
            <Text className="text-xl font-bold text-white">CV</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground">Controle de{`\n`}Viagens</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">Acesse sua conta corporativa para consultar viagens, aprovações e operações da frota.</Text>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-base font-bold text-foreground">Acesso local</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">Entre com o e-mail e a senha cadastrados pelo Administrador.</Text>

          <Text className="mt-4 text-sm font-semibold text-foreground">E-mail</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={handleLogin}
            placeholder="nome@empresa.com"
            placeholderTextColor={colors.muted}
            returnKeyType="next"
            style={{ borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }}
            className="mt-2 rounded-xl border px-4 py-3"
            value={email}
          />

          <Text className="mt-4 text-sm font-semibold text-foreground">Senha</Text>
          <View style={{ borderColor: colors.border, backgroundColor: colors.background }} className="mt-2 flex-row items-center rounded-xl border pr-2">
            <TextInput
              autoCapitalize="none"
              autoComplete="current-password"
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
              placeholder="Digite sua senha"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              secureTextEntry={!showPassword}
              style={{ color: colors.foreground }}
              className="flex-1 px-4 py-3"
              value={password}
            />
            <Pressable
              accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onPress={() => setShowPassword((current) => !current)}
              style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ color: colors.primary }} className="text-xs font-bold">{showPassword ? "Ocultar" : "Mostrar"}</Text>
            </Pressable>
          </View>

          {error ? <Text className="mt-4 text-sm leading-5 text-error">{error}</Text> : null}
          <View className="mt-5">
            {busy ? <View className="h-[50px] items-center justify-center"><ActivityIndicator color={colors.primary} /></View> : <PrimaryButton label="Entrar" onPress={handleLogin} />}
          </View>
        </View>

        <Pressable onPress={() => setError("A redefinição de senha deve ser solicitada ao Administrador.")} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="mt-5 items-center">
          <Text className="font-semibold text-primary">Preciso recuperar meu acesso</Text>
        </Pressable>
        <View className="mt-8 items-center">
          <Text className="text-xs text-muted">Acesso privado da organização</Text>
          <Text className="mt-2 text-center text-xs text-muted">Usuários e permissões são gerenciados pelo Administrador.</Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
