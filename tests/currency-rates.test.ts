import { describe, expect, it } from 'vitest';
import { asuncionDate, parseBcpDailyRates, parseDnitMonthlyRates } from '../server/currency-rates';
import { chooseReimbursementProfile, rateFor } from '../server/operations-repository';

describe('currency rates sources', () => {
  it('parses DNIT sale rates for USD and BRL from the requested day', () => {
    const html = '<div data-analytics-asset-title="Tipos de cambios del mes de Agosto 2026"><table><thead><tr><th></th><th>DÓLAR</th><th></th><th>REAL</th><th></th></tr><tr><th></th><th>Compra</th><th>Venta</th><th>Compra</th><th>Venta</th></tr></thead><tbody><tr><td>24</td><td>5.950,00</td><td>5.970,96</td><td>1.170,00</td><td>1.175,62</td></tr><tr><td>25</td><td>5.960,00</td><td>5.980,10</td><td>1.180,00</td><td>1.183,20</td></tr></tbody></table></div>';
    expect(parseDnitMonthlyRates(html, '2026-08-25')).toEqual([
      { fromCurrency: 'USD', rate: '5980.10000000' },
      { fromCurrency: 'BRL', rate: '1183.20000000' },
    ]);
  });

  it('uses the most recent available DNIT row when the requested day is not published yet', () => {
    const html = '<div data-analytics-asset-title="Tipos de cambios del mes de Agosto 2026"><table><tbody><tr><td>01</td><td>5.900,00</td><td>5.910,00</td><td>1.150,00</td><td>1.155,00</td></tr><tr><td>03</td><td>5.920,00</td><td>5.930,00</td><td>1.160,00</td><td>1.165,00</td></tr></tbody></table></div>';
    expect(parseDnitMonthlyRates(html, '2026-08-04')).toEqual([
      { fromCurrency: 'USD', rate: '5930.00000000' },
      { fromCurrency: 'BRL', rate: '1165.00000000' },
    ]);
  });

  it('parses BCP referential rates from the final PYG column', () => {
    const html = '<table><tbody><tr><td>DÓLAR ESTADOUNIDENSE</td><td>USD</td><td>1,0000</td><td>5.986,89</td></tr><tr><td>REAL BRASILEÑO</td><td>BRL</td><td>5,1469</td><td>1.163,20</td></tr></tbody></table>';
    expect(parseBcpDailyRates(html)).toEqual([
      { fromCurrency: 'USD', rate: '5986.89000000' },
      { fromCurrency: 'BRL', rate: '1163.20000000' },
    ]);
  });

  it('prefers a city profile containing the expense type and falls back to generic', () => {
    const profiles = [
      { id: 1, city: 'Asunción', currency: 'USD', items: [{ expenseTypeId: 2, limitAmount: 40 }] },
      { id: 2, city: '', currency: 'BRL', items: [{ expenseTypeId: 1, limitAmount: 100 }] },
    ];
    expect(chooseReimbursementProfile(profiles, 'Asunción', 'PYG', 2)?.id).toBe(1);
    expect(chooseReimbursementProfile(profiles, 'Ciudad del Este', 'BRL', 1)?.id).toBe(2);
  });

  it('returns the latest rate on or before the expense date', () => {
    expect(rateFor([
      { rateDate: '2026-08-20', fromCurrency: 'USD', toCurrency: 'PYG', rate: '7000' },
      { rateDate: '2026-08-25', fromCurrency: 'USD', toCurrency: 'PYG', rate: '7100' },
    ], 'USD', 'PYG', '2026-08-26')).toEqual({ value: 7100, rateDate: '2026-08-25' });
    expect(rateFor([], 'BRL', 'BRL', '2026-08-26')).toEqual({ value: 1, rateDate: '2026-08-26' });
  });

  it('formats a date in the Asunción timezone', () => {
    expect(asuncionDate(new Date('2026-08-27T02:30:00.000Z'))).toBe('2026-08-26');
  });
});
