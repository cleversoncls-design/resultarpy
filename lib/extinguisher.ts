export type ExtinguisherAlert = 'expired' | 'soon' | null;

function addOneMonth(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(year, month, 1)); // primeiro dia do mês seguinte
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Situação do extintor a partir do vencimento (AAAA-MM-DD):
 * - 'expired': vencido (data anterior a hoje);
 * - 'soon': vence em até 1 mês (inclui o próprio dia do vencimento);
 * - null: em dia ou sem data informada.
 */
export function extinguisherAlert(dueIso: string | null | undefined, today: string = new Date().toISOString().slice(0, 10)): ExtinguisherAlert {
  const due = typeof dueIso === 'string' ? dueIso.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return null;
  if (due < today) return 'expired';
  if (due <= addOneMonth(today)) return 'soon';
  return null;
}
