import { describe, expect, it } from 'vitest';
import { clientBillableAmountFor, reimbursementAmountFor, reimbursementExcessFor, type Expense } from '../lib/demo-data';

const mealExpense: Expense = {
  id: 'fixture-meal', tripId: 'fixture-trip', date: '2026-01-01', city: 'Cidade teste', client: 'Cliente teste', concept: 'Alimentação', group: 'Viáticos', quantity: 1, unitValue: 36, prepaid: true, billable: true, limit: 40,
};

const hotelExpense: Expense = {
  id: 'fixture-hotel', tripId: 'fixture-trip', date: '2026-01-01', city: 'Cidade teste', client: 'Cliente teste', concept: 'Hospedagem', group: 'Hospedagem', quantity: 1, unitValue: 86, prepaid: true, billable: true, limit: 80,
};

describe('regra de faturamento ao cliente', () => {
  it('fatura o gasto quando ele está dentro do limite', () => {
    expect(clientBillableAmountFor(mealExpense)).toBe(36);
  });

  it('fatura o limite quando o gasto ultrapassa o teto', () => {
    expect(clientBillableAmountFor(hotelExpense)).toBe(80);
  });
});

describe('regra de reembolso ao viajante', () => {
  it('reembolsa o gasto quando ele fica abaixo do limite por evento', () => {
    expect(reimbursementAmountFor(mealExpense)).toBe(36);
    expect(reimbursementExcessFor(mealExpense)).toBe(0);
  });

  it('reembolsa exatamente o limite quando o gasto ultrapassa o teto', () => {
    expect(reimbursementAmountFor(hotelExpense)).toBe(80);
    expect(reimbursementExcessFor(hotelExpense)).toBe(6);
  });

  it('considera o limite como teto único do evento, sem multiplicar pela quantidade', () => {
    expect(reimbursementAmountFor({ ...mealExpense, quantity: 3, unitValue: 20 })).toBe(40);
    expect(reimbursementExcessFor({ ...mealExpense, quantity: 3, unitValue: 20 })).toBe(20);
  });
});
