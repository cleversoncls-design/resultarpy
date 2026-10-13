import { describe, expect, it } from 'vitest';
import { formatCurrencyDay, formatRateValue, groupCurrencyRates } from '../lib/currency-table';
import { buildRateInputs, type OfficialRates, parseDnitMonthlyRates, parseDnitMonthlyTable } from '../server/currency-rates';

const html = '<div data-analytics-asset-title="Tipos de cambios del mes de Octubre 2026"><table><tbody>'
  + '<tr><td>12</td><td>5.690,00</td><td>5.710,00</td><td>1.140,00</td><td>1.145,00</td></tr>'
  + '<tr><td>13</td><td>5.698,34</td><td>5.720,76</td><td>1.143,08</td><td>1.147,23</td></tr>'
  + '<tr><td>14</td><td>5.700,00</td><td>5.730,00</td><td>1.150,00</td><td>1.155,00</td></tr></tbody></table></div>';

describe('currency table', () => {
  it('parses every published DNIT day up to the target with buy and sell', () => {
    const table = parseDnitMonthlyTable(html, '2026-10-13');
    expect(table.map((row) => row.date)).toEqual(['2026-10-13', '2026-10-12']);
    expect(table[0]).toEqual({ date: '2026-10-13', usdBuy: '5698.34000000', usdSale: '5720.76000000', brlBuy: '1143.08000000', brlSale: '1147.23000000' });
  });

  it('keeps the sale value as the rate used for conversion and the buy value as informative', () => {
    expect(parseDnitMonthlyRates(html, '2026-10-13')).toEqual([
      { fromCurrency: 'USD', rate: '5720.76000000', buyRate: '5698.34000000' },
      { fromCurrency: 'BRL', rate: '1147.23000000', buyRate: '1143.08000000' },
    ]);
  });

  it('builds one input per day and does not overwrite manual rates', () => {
    const official: OfficialRates = { source: 'DNIT', rateType: 'venda', sourceUrl: 'x', table: parseDnitMonthlyTable(html, '2026-10-13') };
    const inputs = buildRateInputs('2026-10-13', official, new Set(['2026-10-12|USD']));
    expect(inputs.filter((input) => input.fromCurrency === 'USD').map((input) => input.rateDate)).toEqual(['2026-10-13']);
    expect(inputs.filter((input) => input.fromCurrency === 'BRL').map((input) => input.rateDate)).toEqual(['2026-10-13', '2026-10-12']);
    expect(inputs.every((input) => input.fromCurrency === 'PYG' || input.rateType === 'venda')).toBe(true);
  });

  it('groups rows by date with USD/BRL buy and sell columns', () => {
    const days = groupCurrencyRates([
      { rateDate: '2026-10-13', fromCurrency: 'USD', toCurrency: 'PYG', rate: '5720.76000000', buyRate: '5698.34000000', source: 'DNIT' },
      { rateDate: '2026-10-13', fromCurrency: 'BRL', toCurrency: 'PYG', rate: '1147.23000000', buyRate: '1143.08000000', source: 'DNIT' },
      { rateDate: '2026-10-12', fromCurrency: 'USD', toCurrency: 'PYG', rate: '5710.00000000', buyRate: null, source: 'BCP' },
      { rateDate: '2026-10-12', fromCurrency: 'PYG', toCurrency: 'PYG', rate: '1', source: 'BCP' },
    ]);
    expect(days).toHaveLength(2);
    expect(formatCurrencyDay(days[0])).toEqual({ date: '13/10/2026', usdBuy: '5698,34', usdSell: '5720,76', brlBuy: '1143,08', brlSell: '1147,23', source: 'DNIT' });
    expect(formatCurrencyDay(days[1])).toMatchObject({ usdBuy: '—', usdSell: '5710,00', brlSell: '—' });
    expect(formatRateValue(null)).toBe('—');
  });
});
