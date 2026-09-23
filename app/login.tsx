import { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { NAV_COLORS, APP_VERSION } from "@/components/nav-theme";
import { useLanguage } from "@/lib/language-provider";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";

const logo = require("@/assets/images/resultar-logo.png");

export default function LoginScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
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
    <View style={{ flex: 1, backgroundColor: NAV_COLORS.bg }}>
      <View style={{ height: 4, backgroundColor: NAV_COLORS.topAccent }} />
      <SafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <View style={{ width: "100%", maxWidth: 400, backgroundColor: NAV_COLORS.card, borderWidth: 1, borderColor: NAV_COLORS.border, borderRadius: 16, padding: 32 }}>
            <Pressable
              accessibilityLabel={t("Idioma")}
              onPress={() => setLanguage(language === "pt-BR" ? "es-ES" : "pt-BR")}
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", marginBottom: 16, opacity: pressed ? 0.7 : 1 }]}
            >
              <IconSymbol name="globe" size={16} color={NAV_COLORS.fg} />
              <Text style={{ color: NAV_COLORS.fg, fontSize: 12, fontWeight: "700" }}>{language === "pt-BR" ? "PT" : "ES"}</Text>
            </Pressable>

            <View style={{ alignItems: "center", marginBottom: 26 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11 }}>
                <View style={{ width: 34, height: 34, flexShrink: 0 }}>
                  <Image source={logo} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
                </View>
                <Text style={{ color: NAV_COLORS.fgStrong, fontSize: 19, fontWeight: "800" }}>RESULTAR SERVICIOS</Text>
              </View>
              <Text style={{ color: NAV_COLORS.fg, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center", marginTop: 9 }}>
                {t("Controle de Viagens e Frota")}
              </Text>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: NAV_COLORS.fgStrong, fontSize: 12, fontWeight: "700", marginBottom: 7 }}>{t("E-mail")}</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                onSubmitEditing={handleLogin}
                placeholder="nome@empresa.com"
                placeholderTextColor={NAV_COLORS.placeholder}
                returnKeyType="next"
                style={{ width: "100%", padding: 11, borderRadius: 10, borderWidth: 1, borderColor: NAV_COLORS.border, backgroundColor: NAV_COLORS.fieldBg, color: NAV_COLORS.fgStrong, fontSize: 13.5 }}
                value={email}
              />
            </View>

            <View style={{ marginBottom: 6 }}>
              <Text style={{ color: NAV_COLORS.fgStrong, fontSize: 12, fontWeight: "700", marginBottom: 7 }}>{t("Senha")}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: NAV_COLORS.border, backgroundColor: NAV_COLORS.fieldBg }}>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="current-password"
                  onChangeText={setPassword}
                  onSubmitEditing={handleLogin}
                  placeholder="••••••••"
                  placeholderTextColor={NAV_COLORS.placeholder}
                  returnKeyType="done"
                  secureTextEntry={!showPassword}
                  style={{ flex: 1, padding: 11, color: NAV_COLORS.fgStrong, fontSize: 13.5 }}
                  value={password}
                />
                <Pressable
                  accessibilityLabel={showPassword ? t("Ocultar senha") : t("Mostrar senha")}
                  onPress={() => setShowPassword((current) => !current)}
                  style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={{ color: NAV_COLORS.accent, fontSize: 12, fontWeight: "700" }}>{showPassword ? t("Ocultar") : t("Mostrar")}</Text>
                </Pressable>
              </View>
            </View>

            {error ? <Text style={{ color: NAV_COLORS.error, fontSize: 13, lineHeight: 18, marginTop: 10 }}>{error}</Text> : null}

            <View style={{ marginTop: 16 }}>
              {busy ? (
                <View style={{ height: 46, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator color={NAV_COLORS.accent} />
                </View>
              ) : (
                <Pressable
                  onPress={handleLogin}
                  style={({ pressed }) => [{ width: "100%", padding: 12, borderRadius: 10, backgroundColor: NAV_COLORS.accent, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.9 : 1 }]}
                >
                  <Text style={{ color: NAV_COLORS.accentOn, fontWeight: "800", fontSize: 14 }}>{t("Entrar")}</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => setError("A redefinição de senha deve ser solicitada ao Administrador.")}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ color: NAV_COLORS.fg, fontSize: 12.5, textAlign: "center", marginTop: 16 }}>{t("Preciso recuperar meu acesso")}</Text>
            </Pressable>

            <View style={{ borderTopWidth: 1, borderTopColor: NAV_COLORS.border, marginTop: 22, paddingTop: 16, alignItems: "center" }}>
              <Text style={{ color: NAV_COLORS.fgMuted, fontSize: 11, textAlign: "center" }}>{t("Acesso privado da organização")}</Text>
              <Text style={{ color: NAV_COLORS.fgMuted, fontSize: 11, textAlign: "center", marginTop: 4 }}>{t("Usuários e permissões são gerenciados pelo Administrador.")}</Text>
              <Text style={{ color: NAV_COLORS.fgMuted, fontSize: 9, fontWeight: "700", letterSpacing: 0.5, marginTop: 12 }}>CONTROL DE VIAJES Y FLOTA · {APP_VERSION}</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
