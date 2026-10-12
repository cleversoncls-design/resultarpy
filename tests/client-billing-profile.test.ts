import { describe, expect, it } from 'vitest';
import { prepareClientBillingProfile } from '../lib/client-billing-profile';

describe('cadastro agrupado de limites por cliente', () => {
  it('prepara uma moeda e vários tipos de gasto no mesmo perfil', () => {
    expect(prepareClientBillingProfile({ clientId: '7', currency: 'usd', items: [{ expenseTypeId: '1', limitAmount: '10' }, { expenseTypeId: '2', limitAmount: '45' }] })).toEqual({ clientId: 7, currency: 'USD', items: [{ expenseTypeId: 1, limitAmount: '10' }, { expenseTypeId: 2, limitAmount: '45' }] });
  });

  it('ignora linhas ainda vazias para permitir adicionar novas linhas antes de salvar', () => {
    expect(prepareClientBillingProfile({ clientId: '7', currency: 'BRL', items: [{ expenseTypeId: '1', limitAmount: '10' }, { expenseTypeId: '', limitAmount: '' }] }).items).toHaveLength(1);
  });

  it('rejeita o mesmo tipo de gasto duas vezes', () => {
    expect(() => prepareClientBillingProfile({ clientId: '7', currency: 'BRL', items: [{ expenseTypeId: '1', limitAmount: '10' }, { expenseTypeId: '1', limitAmount: '20' }] })).toThrow('Não repita');
  });

  it('aceita vírgula decimal e envia com ponto', () => {
    expect(prepareClientBillingProfile({ clientId: '7', currency: 'USD', items: [{ expenseTypeId: '3', limitAmount: '0,50' }] }).items[0].limitAmount).toBe('0.50');
  });
});
