import { Text, View } from 'react-native';
import { extinguisherAlert } from '@/lib/extinguisher';
import { useLanguage } from '@/lib/language-provider';

/** Selo de alerta do extintor: vencido (branco sobre vermelho) ou por vencer em até 1 mês (preto sobre amarelo). */
export function ExtinguisherBadge({ dueIso }: { dueIso: string | null | undefined }) {
  const { t } = useLanguage();
  const alert = extinguisherAlert(dueIso);
  if (!alert) return null;
  const expired = alert === 'expired';
  return (
    <View style={{ backgroundColor: expired ? '#DC2626' : '#FACC15', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end' }}>
      <Text style={{ color: expired ? '#FFFFFF' : '#000000', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>{expired ? t('EXTINTOR VENCIDO') : t('EXTINTOR POR VENCER')}</Text>
    </View>
  );
}
