import { formatDateDisplay } from './date-utils';

export type CurrencyRateRow = { rateDate: string; fromCurrency: string; toCurrency: string; rate: string; buyRate?: string | null; source: string; rateType?: string };

export type CurrencyDayRow = {
  date: string;
  source: string;
  usdBuy: string | null;
  usdSell: string | null;
  brlBuy: string | null;
  brlSell: string | null;
};

/** Formata uma cotação em Guaraní no padrão da planilha da DNIT (ex.: 5720,76), sem separador de milhar. */
export function formatRateValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return parsed.toFixed(2).replace('.', ',');
}

/**
 * Agrupa as cotações (uma linha por moeda/data) em uma linha por data com colunas
 * USD Compra | USD Venda | BRL Compra | BRL Venda. O campo "rate" é sempre o valor de VENDA.
 */
export function groupCurrencyRates(rows: CurrencyRateRow[]): CurrencyDayRow[] {
  const byDate = new Map<string, CurrencyDayRow>();
  for (const row of rows) {
    const from = row.fromCurrency.toUpperCase();
    if (row.toCurrency.toUpperCase() !== 'PYG' || (from !== 'USD' && from !== 'BRL')) continue;
    const day = byDate.get(row.rateDate) ?? { date: row.rateDate, source: row.source, usdBuy: null, usdSell: null, brlBuy: null, brlSell: null };
    if (from === 'USD') { day.usdSell = row.rate; day.usdBuy = row.buyRate ?? null; } else { day.brlSell = row.rate; day.brlBuy = row.buyRate ?? null; }
    day.source = row.source;
    byDate.set(row.rateDate, day);
  }
  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function formatCurrencyDay(row: CurrencyDayRow) {
  return { date: formatDateDisplay(row.date), usdBuy: formatRateValue(row.usdBuy), usdSell: formatRateValue(row.usdSell), brlBuy: formatRateValue(row.brlBuy), brlSell: formatRateValue(row.brlSell), source: row.source };
}
