import { describe, expect, it } from 'vitest';
import { formatMoneyInput, parseMoneyInput } from '../lib/money-input';

describe('money input', () => {
  it('masks BRL with Brazilian separators and cents', () => {
    expect(formatMoneyInput('12345678901234', 'BRL')).toBe('123.456.789.012,34');
    expect(parseMoneyInput('123.456.789.012,34', 'BRL')).toBe('123456789012.34');
  });

  it('masks USD with US separators and cents', () => {
    expect(formatMoneyInput('12345678901234', 'USD')).toBe('123,456,789,012.34');
    expect(parseMoneyInput('123,456,789,012.34', 'USD')).toBe('123456789012.34');
  });

  it('masks PYG without decimal places', () => {
    expect(formatMoneyInput('123456789', 'PYG')).toBe('123.456.789');
    expect(parseMoneyInput('123.456.789', 'PYG')).toBe('123456789');
  });
});
