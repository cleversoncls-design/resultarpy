import { describe, expect, it } from 'vitest';
import { formatCurrency } from '../lib/currency';

describe('moeda global', () => {
  it('formata reais com símbolo e centavos', () => {
    expect(formatCurrency(154, 'BRL')).toBe('R$ 154,00');
  });

  it('formata dólares com símbolo US$ e ponto decimal', () => {
    expect(formatCurrency(154, 'USD')).toBe('US$ 154.00');
  });

  it('formata guaranies sem casas decimais', () => {
    expect(formatCurrency(154.4, 'PYG')).toBe('G$ 154');
  });
});
