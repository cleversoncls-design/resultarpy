import { describe, expect, it } from 'vitest';
import { clientBillableAmountFor, expenses, reimbursementAmountFor, reimbursementExcessFor } from '../lib/demo-data';

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

describe('regra de reembolso ao viajante', () => {
  it('reembolsa o gasto quando ele fica abaixo do limite por evento', () => {
    const expense = expenses.find((item) => item.concept === 'Alimentação');
    expect(expense).toBeDefined();
    expect(reimbursementAmountFor(expense!)).toBe(36);
    expect(reimbursementExcessFor(expense!)).toBe(0);
  });

  it('reembolsa exatamente o limite quando o gasto ultrapassa o teto', () => {
    const expense = expenses.find((item) => item.concept === 'Hospedagem');
    expect(expense).toBeDefined();
    expect(reimbursementAmountFor(expense!)).toBe(80);
    expect(reimbursementExcessFor(expense!)).toBe(6);
  });

  it('considera o limite como teto único do evento, sem multiplicar pela quantidade', () => {
    const expense = expenses.find((item) => item.concept === 'Alimentação');
    expect(expense).toBeDefined();
    expect(reimbursementAmountFor({ ...expense!, quantity: 3, unitValue: 20 })).toBe(40);
    expect(reimbursementExcessFor({ ...expense!, quantity: 3, unitValue: 20 })).toBe(20);
  });
});
