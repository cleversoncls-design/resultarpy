import { describe, expect, it } from 'vitest';
import { calculateBillingAmounts } from '../server/operations-repository';

describe('billing report amounts', () => {
  it('fatura o gasto quando ele está abaixo do limite', () => {
    expect(calculateBillingAmounts(80, 100)).toEqual({ billable: 80, difference: 0 });
  });

  it('fatura exatamente o limite quando o gasto ultrapassa o teto', () => {
    expect(calculateBillingAmounts(86, 80)).toEqual({ billable: 80, difference: 6 });
  });

  it('mantém o gasto para revisão quando não há limite cadastrado', () => {
    expect(calculateBillingAmounts(86, null)).toEqual({ billable: 86, difference: 0 });
  });
});
