import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import type { Role } from '@/lib/demo-data';
import { useDemoRole } from '@/lib/demo-role';

export function ProfileEntry({ role }: { role: Role }) {
  const { setRole } = useDemoRole();
  useEffect(() => { setRole(role); router.replace('/'); }, [role, setRole]);
  return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></View>;
}

export default function ProfileEntryRoute() {
  return <ProfileEntry role="Viajante" />;
}
