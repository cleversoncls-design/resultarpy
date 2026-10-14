import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import type { TripStatus } from '@/lib/demo-data';
import { useLanguage } from '@/lib/language-provider';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Extraído do StatusPill para poder ser reaproveitado onde só a cor (sem o
// componente inteiro do "pill") é necessária — ex.: a faixa colorida na
// borda esquerda das linhas da tabela de viagens.
export function statusTone(status: TripStatus | string, colors: ReturnType<typeof useColors>) {
  if (status.includes('Final') || status.includes('Liber') || status.includes('Aprov')) return { backgroundColor: `${colors.success}22`, color: colors.success };
  if (status.includes('Reje') || status.includes('Cancel')) return { backgroundColor: `${colors.error}22`, color: colors.error };
  return { backgroundColor: `${colors.warning}25`, color: colors.warning };
}

export function StatusPill({ status }: { status: TripStatus | string }) {
  const colors = useColors();
  const { t } = useLanguage();
  const tone = statusTone(status, colors);
  return <View style={{ backgroundColor: tone.backgroundColor, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' }}><Text style={{ color: tone.color }} className="text-xs font-semibold">{t(status)}</Text></View>;
}

// Aparência do botão compacto, sem comportamento: para quando o card inteiro já
// é um Pressable (evita Pressable dentro de Pressable). Usa a mesma altura do
// StatusPill (texto xs + 5px de padding vertical).
// Tom 'neutral' = cinza grafite, para ações de "Abrir" (menos peso que Editar).
const NEUTRAL_BUTTON_COLOR = '#4B5563';

export function ActionButtonFace({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'warning' | 'neutral' }) {
  const colors = useColors();
  return <View style={{ backgroundColor: tone === 'warning' ? colors.warning : tone === 'neutral' ? NEUTRAL_BUTTON_COLOR : colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' }}><Text className="text-xs font-bold text-white">{label}</Text></View>;
}

// Botão compacto para ações dentro de cards e tabelas (Abrir, Editar,
// Gerenciar...), no estilo sólido de "+ Nova O.S." / "+ Novo veículo".
export function ActionButton({ label, onPress, tone = 'primary' }: { label: string; onPress?: () => void; tone?: 'primary' | 'warning' | 'neutral' }) {
  return <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, alignSelf: 'flex-start' })}><ActionButtonFace label={label} tone={tone} /></Pressable>;
}

// Filtro de escolha única apresentado como checkboxes (mesmo visual do
// checklist da tela de Operação): marcar uma opção desmarca as outras.
export function ChoiceCheckboxes<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const colors = useColors();
  return <View className="flex-row flex-wrap" style={{ columnGap: 20, rowGap: 10 }}>
    {options.map((option) => {
      const checked = option.value === value;
      return <Pressable key={option.value} onPress={() => onChange(option.value)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center' })}>
        <View style={{ backgroundColor: checked ? colors.success : colors.background, borderColor: checked ? colors.success : colors.border }} className="h-5 w-5 items-center justify-center rounded-md border">{checked ? <IconSymbol name="checkmark" size={14} color="white" /> : null}</View>
        <Text className="ml-3 text-sm text-foreground">{option.label}</Text>
      </Pressable>;
    })}
  </View>;
}

// Lista suspensa de escolha única: um só campo que abre a lista de opções logo
// abaixo (sem modal). Usada nos filtros com muitas opções, onde uma fileira de
// checkboxes poluiria a tela. Layout via style (className em Pressable não é
// confiável nesta versão do app).
export function SelectField<T extends string>({ value, options, onChange, placeholder }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; placeholder?: string }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <View>
    <Pressable onPress={() => setOpen((current) => !current)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: open ? colors.primary : colors.border, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 })}>
      <Text style={{ flex: 1, color: selected ? colors.foreground : colors.muted }} className="text-sm">{selected?.label ?? placeholder ?? ''}</Text>
      <Text style={{ color: colors.muted }} className="text-xs">{open ? '▲' : '▼'}</Text>
    </Pressable>
    {open ? <View style={{ marginTop: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return <Pressable key={option.value} onPress={() => { onChange(option.value); setOpen(false); }} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border, backgroundColor: isSelected ? `${colors.primary}14` : pressed ? colors.background : 'transparent' })}>
          <Text style={{ flex: 1, color: isSelected ? colors.primary : colors.foreground }} className={isSelected ? 'text-sm font-bold' : 'text-sm'}>{option.label}</Text>
          {isSelected ? <IconSymbol name="checkmark" size={14} color={colors.primary} /> : null}
        </Pressable>;
      })}
    </View> : null}
  </View>;
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
