import { describe, expect, it } from 'vitest';
import { isValidExpenseForm } from '../lib/expense-form';

describe('expense form validation', () => {
  const valid = {
    tripId: 12,
    expenseTypeId: 3,
    occurredOn: '2026-08-27',
    city: 'Assunção',
    quantity: '1',
    unitValue: '125,50',
  };

  it('accepts a valid persisted trip, city and date', () => {
    expect(isValidExpenseForm(valid)).toBe(true);
  });

  it('requires an existing trip selection', () => {
    expect(isValidExpenseForm({ ...valid, tripId: 0 })).toBe(false);
  });

  it('requires ISO date and a selected city', () => {
    expect(isValidExpenseForm({ ...valid, occurredOn: '27/08/2026' })).toBe(false);
    expect(isValidExpenseForm({ ...valid, city: '' })).toBe(false);
  });
});
