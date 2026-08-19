import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryButton } from '@/components/app-ui';
import { useColors } from '@/hooks/use-colors';

export default function LoginScreen() {
  const colors = useColors(); const [email, setEmail] = useState('mariana.lopes@empresa.com');
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} className="justify-center px-6"><View className="mb-10"><View style={{ backgroundColor: colors.primary }} className="mb-6 h-16 w-16 items-center justify-center rounded-2xl"><Text className="text-2xl font-bold text-white">CV</Text></View><Text className="text-4xl font-bold text-foreground">Controle de{`\n`}Viagens</Text><Text className="mt-3 text-base leading-6 text-muted">Solicite, aprove e feche suas viagens corporativas em um só lugar.</Text></View><Text className="mb-2 text-sm font-bold text-foreground">E-mail corporativo</Text><TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="nome@empresa.com" placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /><Text className="mb-2 mt-5 text-sm font-bold text-foreground">Senha</Text><TextInput defaultValue="••••••••" secureTextEntry placeholderTextColor={colors.muted} className="rounded-2xl border border-border bg-surface px-4 py-4 text-foreground" /><View className="mt-6"><PrimaryButton label="Entrar com segurança" onPress={() => router.replace('/(tabs)')} /></View><Pressable onPress={() => Alert.alert('Recuperação de acesso', 'Na integração com Supabase Auth, enviaremos um link seguro para este e-mail.')} className="mt-5 items-center"><Text className="font-semibold text-primary">Esqueci minha senha</Text></Pressable><View className="mt-10 items-center"><Text className="text-xs text-muted">Português · Español</Text><Text className="mt-2 text-xs text-muted">Dados protegidos por autenticação corporativa</Text></View></ScreenContainer>;
}
