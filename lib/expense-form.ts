export type ExpenseFormValidationInput = {
  tripId: number;
  expenseTypeId: number;
  occurredOn: string;
  city: string;
  quantity: string;
  unitValue: string;
};

export function isValidExpenseForm(input: ExpenseFormValidationInput) {
  return Boolean(
    input.tripId > 0 &&
      input.expenseTypeId > 0 &&
      input.city.trim() &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn) &&
      Number(input.quantity) > 0 &&
      Number(input.unitValue.replace(',', '.')) >= 0,
  );
}
