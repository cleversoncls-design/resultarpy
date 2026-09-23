import { Pressable, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import type { TripStatus } from '@/lib/demo-data';
import { useLanguage } from '@/lib/language-provider';

export function StatusPill({ status }: { status: TripStatus | string }) {
  const colors = useColors();
  const { t } = useLanguage();
  const tone = status.includes('Final') || status.includes('Liber') || status.includes('Aprov') ? { backgroundColor: `${colors.success}22`, color: colors.success } : status.includes('Reje') ? { backgroundColor: `${colors.error}22`, color: colors.error } : { backgroundColor: `${colors.warning}25`, color: colors.warning };
  return <View style={{ backgroundColor: tone.backgroundColor, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' }}><Text style={{ color: tone.color }} className="text-xs font-semibold">{t(status)}</Text></View>;
}

export function PrimaryButton({ label, onPress, compact = false }: { label: string; onPress?: () => void; compact?: boolean }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: colors.primary, minHeight: compact ? 40 : 50, paddingHorizontal: compact ? 16 : 20, paddingVertical: compact ? 10 : 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] }]}><Text className="font-bold text-white">{label}</Text></Pressable>;
}

export function SecondaryButton({ label, onPress }: { label: string; onPress?: () => void }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={({ pressed }) => [{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface, minHeight: 50, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 }]}><Text className="font-bold text-foreground">{label}</Text></Pressable>;
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return <View className="mb-3 flex-row items-center justify-between"><Text className="text-base font-bold text-foreground">{title}</Text>{action ? <Text className="text-sm font-semibold text-primary">{action}</Text> : null}</View>;
}

export function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const colors = useColors();
  return <View className="flex-1 rounded-xl border border-border bg-surface p-4"><Text className="text-xs font-medium text-muted">{label}</Text><Text style={{ color: accent ?? colors.foreground }} className="mt-2 text-2xl font-bold">{value}</Text></View>;
}

// Cartão de indicador no padrão do protótipo de layout: faixa colorida no
// topo, valor grande e rótulo pequeno em maiúsculas embaixo (ao contrário
// do MetricCard, que mostra o rótulo em cima). Usado nos painéis com KPIs
// (ex.: Visão geral).
export function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  const barColor = color ?? colors.foreground;
  return (
    <View style={{ flex: 1, minWidth: 148, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderTopWidth: 3, borderTopColor: barColor, borderRadius: 12, padding: 16 }}>
      <Text style={{ fontSize: 25, fontWeight: '800', color: colors.foreground, lineHeight: 28 }} numberOfLines={1}>{value}</Text>
      <Text style={{ marginTop: 7, fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <View className="items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-8"><Text className="text-base font-bold text-foreground">{title}</Text><Text className="mt-2 text-center text-sm leading-5 text-muted">{detail}</Text></View>;
}
