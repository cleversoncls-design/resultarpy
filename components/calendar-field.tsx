import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useLanguage } from '@/lib/language-provider';

// Componente único de calendário usado em todos os campos de data do app
// (Nova viagem, Ordem de serviço, Despesas, Filtros de aprovação etc.).
//
// Antes desta unificação existiam 4 implementações independentes, cada uma
// com um problema diferente:
//   - new-trip.tsx: cabeçalho de dias da semana fixo em português, mesmo
//     com o app em espanhol — por isso "Fecha de inicio" aparecia com as
//     letras D/S/T/Q/Q/S/S, que não significam nada para quem lê em
//     espanhol e dá a impressão de que os números não batem com a coluna.
//   - expenses.tsx / new-work-order.tsx: o grid de dias nem tinha a linha
//     de cabeçalho com os dias da semana, então não havia nenhuma
//     referência visual pra conferir o alinhamento.
//   - approvals.tsx: implementação correta (cabeçalho localizado), mas
//     duplicada com pequenas diferenças das demais.
//
// A correção usa uma única fonte de verdade para o grid: os dias são
// organizados em semanas completas (arrays de 7, com `null` para as
// células vazias) e cada semana é renderizada como sua própria linha
// (`flex-row`) com 7 células `flex-1`. Isso evita o problema clássico de
// alinhamento de grids de calendário feitos com `flex-wrap` + largura em
// porcentagem (14.28% × 7 nunca fecha exatamente 100%, e o arredondamento
// pode empurrar uma célula para a linha seguinte de forma imprevisível
// entre navegadores). Com `flex-1` cada linha é distribuída de forma
// independente e exata, então o cabeçalho e os dias sempre ficam nas
// mesmas colunas.

const WEEKDAYS: Record<'pt-BR' | 'es-ES', string[]> = {
  'pt-BR': ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  'es-ES': ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
};

const MONTHS: Record<'pt-BR' | 'es-ES', string[]> = {
  'pt-BR': ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  'es-ES': ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

function parseIsoDate(value: string | undefined): Date | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoOf(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildWeeks(year: number, monthIndex: number): (number | null)[][] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const cells: (number | null)[] = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export type CalendarModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  title: string;
  /** Valor ISO (AAAA-MM-DD) atualmente selecionado, se houver — define o
   * mês inicial exibido e destaca o dia. */
  value?: string;
};

export function CalendarModal({ visible, onClose, onSelect, title, value }: CalendarModalProps) {
  const colors = useColors();
  const { language } = useLanguage();
  const selected = parseIsoDate(value);
  const [currentMonth, setCurrentMonth] = useState(() => selected ?? new Date());
  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const weeks = buildWeeks(year, monthIndex);
  const weekdayNames = WEEKDAYS[language] ?? WEEKDAYS['pt-BR'];
  const monthNames = MONTHS[language] ?? MONTHS['pt-BR'];
  const changeMonth = (offset: number) => setCurrentMonth(new Date(year, monthIndex + offset, 1));
  const selectedIso = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-5">
        <View className="w-full max-w-sm rounded-3xl bg-background p-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">{title}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <IconSymbol name="xmark" size={20} color={colors.muted} />
            </Pressable>
          </View>
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable onPress={() => changeMonth(-1)} className="p-2" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: colors.primary }} className="text-xl font-bold">‹</Text>
            </Pressable>
            <Text className="font-bold text-foreground">{monthNames[monthIndex]} {year}</Text>
            <Pressable onPress={() => changeMonth(1)} className="p-2" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: colors.primary }} className="text-xl font-bold">›</Text>
            </Pressable>
          </View>
          <View className="flex-row">
            {weekdayNames.map((day, index) => (
              <View key={`weekday-${index}`} style={{ flex: 1 }} className="items-center py-2">
                <Text className="text-xs font-bold text-muted">{day}</Text>
              </View>
            ))}
          </View>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} className="flex-row">
              {week.map((day, dayIndex) =>
                day === null ? (
                  <View key={`blank-${weekIndex}-${dayIndex}`} style={{ flex: 1 }} className="py-1" />
                ) : (
                  <View key={day} style={{ flex: 1 }} className="items-center py-1">
                    <Pressable
                      onPress={() => onSelect(isoOf(year, monthIndex, day))}
                      style={({ pressed }) => ({
                        backgroundColor: selectedIso === isoOf(year, monthIndex, day) ? colors.primary : 'transparent',
                        opacity: pressed ? 0.65 : 1,
                      })}
                      className="h-8 w-8 items-center justify-center rounded-full"
                    >
                      <Text style={{ color: selectedIso === isoOf(year, monthIndex, day) ? 'white' : colors.foreground }} className="text-sm font-medium">
                        {day}
                      </Text>
                    </Pressable>
                  </View>
                ),
              )}
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

export type CalendarFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/** Campo de data completo (gatilho + modal) — usado onde o formulário só
 * precisa mostrar um único valor selecionável, como "Data do gasto" ou
 * "Data da manutenção". Para pares de datas lado a lado (início/fim), use
 * `CalendarModal` diretamente com um `Pressable` próprio, como em
 * new-trip.tsx. */
export function CalendarField({ value, onChange, placeholder }: CalendarFieldProps) {
  const colors = useColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({ borderColor: colors.border, backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 })}
        className="mb-4 flex-row items-center justify-between rounded-xl border px-4 py-3"
      >
        <Text className={value ? 'text-foreground' : 'text-muted'}>{value || t(placeholder ?? 'Selecionar data')}</Text>
        <IconSymbol name="calendar" size={20} color={colors.primary} />
      </Pressable>
      <CalendarModal visible={open} onClose={() => setOpen(false)} onSelect={(date) => { onChange(date); setOpen(false); }} title={t(placeholder ?? 'Selecionar data')} value={value} />
    </>
  );
}
