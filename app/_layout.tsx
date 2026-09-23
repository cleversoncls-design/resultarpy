import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { DemoRoleProvider } from "@/lib/demo-role";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import LoginScreen from "./login";
import { CurrencyProvider } from "@/lib/currency-provider";
import { LanguageProvider } from "@/lib/language-provider";
import { DesktopRouteShell } from "@/components/desktop-route-shell";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };
const TrpcProvider = trpc.Provider;

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppSessionBoundary({ children }: { children: ReactNode }) {
  const colors = useColors();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const requireRealAuth = true;
  const isOAuthCallback = pathname.startsWith("/oauth/callback");

  if (requireRealAuth && !isOAuthCallback) {
    if (loading) {
      return <View style={{ backgroundColor: colors.background }} className="flex-1 items-center justify-center"><ActivityIndicator color={colors.primary} /><Text className="mt-3 text-sm text-muted">Verificando sessão…</Text></View>;
    }
    if (!user) return <LoginScreen />;
    const role = user.role === "admin" ? "Administrativo" : "Viajante";
    return <DemoRoleProvider lockedRole={role}>{children}</DemoRoleProvider>;
  }

  return <DemoRoleProvider lockedRole="Viajante">{children}</DemoRoleProvider>;
}

export default function RootLayout() {
  const pathname = usePathname();
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const standaloneRoutes = ['/new-trip', '/expenses', '/fleet-reservation', '/maintenance-report', '/new-vehicle', '/new-work-order', '/fleet-cadastros', '/general-cadastros', '/cadastro-detalhe', '/closure-queue', '/admin-users', '/currency-settings', '/vehicle-detail', '/trip-detail', '/administrativo', '/aprovador', '/viajante'];
  const useStandaloneShell = Platform.OS === 'web' && standaloneRoutes.some((route) => pathname.startsWith(route));
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* LanguageProvider precisa envolver o AppSessionBoundary (e não só os
          "children" dele): quando não há usuário autenticado, o boundary
          retorna a LoginScreen diretamente, sem renderizar children — e a
          tela de login também usa useLanguage() (seletor de idioma e
          traduções do card de login). */}
      <LanguageProvider>
        <AppSessionBoundary>
          <TrpcProvider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <CurrencyProvider>
                {useStandaloneShell ? <DesktopRouteShell><Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /><Stack.Screen name="oauth/callback" /></Stack></DesktopRouteShell> : <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /><Stack.Screen name="oauth/callback" /></Stack>}
                <StatusBar style="auto" />
              </CurrencyProvider>
            </QueryClientProvider>
          </TrpcProvider>
        </AppSessionBoundary>
      </LanguageProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
