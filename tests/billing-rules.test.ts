import { describe, expect, it } from 'vitest';
import { clientBillableAmountFor, expenses } from '../lib/demo-data';

describe('regra de faturamento ao cliente', () => {
  it('fatura o gasto quando ele está dentro do limite', () => {
    const expense = expenses.find((item) => item.concept === 'Alimentação');
    expect(expense).toBeDefined();
    expect(clientBillableAmountFor(expense!)).toBe(36);
  });

  it('fatura o limite quando o gasto ultrapassa o teto', () => {
    const expense = expenses.find((item) => item.concept === 'Hospedagem');
    expect(expense).toBeDefined();
    expect(expense!.unitValue).toBe(86);
    expect(expense!.limit).toBe(80);
    expect(clientBillableAmountFor(expense!)).toBe(80);
  });
});
