export type ClientBillingItemDraft = {
  expenseTypeId: string;
  limitAmount: string;
};

export type ClientBillingProfilePayload = {
  clientId: number;
  currency: string;
  items: Array<{ expenseTypeId: number; limitAmount: string }>;
};

export function prepareClientBillingProfile(input: {
  clientId: string;
  currency: string;
  items: ClientBillingItemDraft[];
}): ClientBillingProfilePayload {
  const clientId = Number(input.clientId);
  const currency = input.currency.trim().toUpperCase();
  const items = input.items
    .filter((item) => item.expenseTypeId && item.limitAmount.trim())
    .map((item) => ({ expenseTypeId: Number(item.expenseTypeId), limitAmount: item.limitAmount.trim() }));

  if (!Number.isInteger(clientId) || clientId <= 0) throw new Error('Informe um cliente válido.');
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Informe uma moeda válida com três letras.');
  if (items.length === 0) throw new Error('Informe ao menos um tipo de gasto com seu valor.');
  if (items.some((item) => !Number.isInteger(item.expenseTypeId) || item.expenseTypeId <= 0)) throw new Error('Selecione tipos de gasto válidos.');
  if (new Set(items.map((item) => item.expenseTypeId)).size !== items.length) throw new Error('Não repita o mesmo tipo de gasto no cadastro do cliente.');

  return { clientId, currency, items };
}
