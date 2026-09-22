import { Alert, Pressable, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { exportReport, type ReportColumn, type ReportImage, type ReportInfoLine, type ReportRow } from '@/lib/report-export';
import { useLanguage } from '@/lib/language-provider';

export function ReportExportActions({ title, filename, columns, rows, infoLines, summaryRow, images }: { title: string; filename: string; columns: ReportColumn[]; rows: ReportRow[]; infoLines?: ReportInfoLine[]; summaryRow?: ReportRow; images?: ReportImage[] }) {
  const colors = useColors();
  const { t } = useLanguage();
  const run = async (format: 'xlsx' | 'csv' | 'pdf', label: string) => {
    try {
      await exportReport(format, title, filename, columns, rows, { infoLines, summaryRow, images: format === 'pdf' ? images : undefined });
    } catch (error) {
      Alert.alert(t('Exportação não concluída'), error instanceof Error ? error.message : `${t('Não foi possível gerar o arquivo')} ${label}.`);
    }
  };
  return <View className="mt-5 flex-row flex-wrap items-center gap-2"><Text className="mr-1 text-xs font-bold uppercase tracking-widest text-muted">{t('Exportar')}</Text>{([['xlsx', 'Planilha'], ['csv', 'CSV'], ['pdf', 'PDF']] as const).map(([format, label]) => <Pressable key={format} accessibilityLabel={`${t('Exportar')} ${title} ${t('em')} ${t(label)}`} onPress={() => void run(format, label)} style={({ pressed }) => [{ borderColor: colors.border, backgroundColor: pressed ? `${colors.primary}18` : colors.surface, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, opacity: pressed ? 0.75 : 1 }]}><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>{t(label)}</Text></Pressable>)}</View>;
}
