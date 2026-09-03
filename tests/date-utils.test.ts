import { describe, expect, it } from 'vitest';
import { formatDateDisplay, isIsoDate, normalizeDateValue } from '../lib/date-utils';

describe('date-utils', () => {
  it('exibe uma data ISO no formato brasileiro', () => {
    expect(formatDateDisplay('1990-07-05')).toBe('05/07/1990');
  });

  it('aceita apenas o formato ISO exigido pelo backend', () => {
    expect(isIsoDate('1990-07-05')).toBe(true);
    expect(isIsoDate('05/07/1990')).toBe(false);
    expect(isIsoDate('1990-7-5')).toBe(false);
  });

  it('normaliza formatos de cadastro para ISO', () => {
    expect(normalizeDateValue('05/07/1990')).toBe('1990-07-05');
    expect(normalizeDateValue('1990-07-05')).toBe('1990-07-05');
    expect(normalizeDateValue('1990-07-05T00:00:00.000Z')).toBe('1990-07-05');
    expect(normalizeDateValue('31/02/1990')).toBeNull();
    expect(normalizeDateValue('')).toBeNull();
  });
});
