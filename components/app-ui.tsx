import { Pressable, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import type { TripStatus } from '@/lib/demo-data';

export function StatusPill({ status }: { status: TripStatus | string }) {
  const colors = useColors();
  const tone = status.includes('Final') || status.includes('Liber') || status.includes('Aprov')
    ? { backgroundColor: `${colors.success}22`, color: colors.success }
    : status.includes('Reje') || status.includes('Devol')
      ? { backgroundColor: `${colors.error}22`, color: colors.error }
      : { backgroundColor: `${colors.warning}25`, color: colors.warning };
  return <View style={{ backgroundColor: tone.backgroundColor }} className="self-start rounded-full px-3 py-1"><Text style={{ color: tone.color }} className="text-xs font-semibold">{status}</Text></View>;
}

export function PrimaryButton({ label, onPress, compact = false }: { label: string; onPress?: () => void; compact?: boolean }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] }]} className={`items-center rounded-2xl ${compact ? 'px-4 py-2.5' : 'px-5 py-4'}`}><Text className="font-bold text-white">{label}</Text></Pressable>;
}

export function SecondaryButton({ label, onPress }: { label: string; onPress?: () => void }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={({ pressed }) => [{ borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]} className="items-center rounded-2xl border bg-surface px-5 py-3.5"><Text className="font-bold text-foreground">{label}</Text></Pressable>;
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return <View className="mb-3 flex-row items-center justify-between"><Text className="text-base font-bold text-foreground">{title}</Text>{action ? <Text className="text-sm font-semibold text-primary">{action}</Text> : null}</View>;
}

export function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const colors = useColors();
  return <View className="flex-1 rounded-2xl border border-border bg-surface p-4"><Text className="text-xs font-medium text-muted">{label}</Text><Text style={{ color: accent ?? colors.foreground }} className="mt-2 text-2xl font-bold">{value}</Text></View>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <View className="items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-8"><Text className="text-base font-bold text-foreground">{title}</Text><Text className="mt-2 text-center text-sm leading-5 text-muted">{detail}</Text></View>;
}
