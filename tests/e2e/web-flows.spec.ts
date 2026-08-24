import { expect, test } from '@playwright/test';

test.describe('fluxos web do Controle de Viagens', () => {
  test('abre a visão do Viajante e alterna para o formulário de nova viagem', async ({ page }) => {
    await page.goto('/viajante?perfil=Viajante');
    await expect(page.getByText('Controle de Viagens')).toBeVisible();
    await page.getByText('Nova solicitação').first().click();
    await expect(page).toHaveURL(/new-trip/);
    await expect(page.getByText('Nova solicitação', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Destino da viagem')).toBeVisible();
  });

  test('abre o formulário de despesa no ambiente web independente', async ({ page }) => {
    await page.goto('/expenses?perfil=Viajante');
    await expect(page.getByText('Despesas', { exact: true })).toBeVisible();
    await page.getByText('Adicionar outro lançamento').click();
    await expect(page).toHaveURL(/expenses/);
    await expect(page.getByText('Nova despesa', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Salvar despesa')).toBeVisible();
  });

  test('abre a edição de viagem por identificador persistente', async ({ page }) => {
    await page.goto('/new-trip?perfil=Administrativo&tripId=1');
    await expect(page.getByText('Editar viagem')).toBeVisible();
    await expect(page.getByText('Salvar alterações')).toBeVisible();
  });

  test('abre a visão de Aprovador e exibe a fila de decisões', async ({ page }) => {
    await page.goto('/approvals?perfil=Aprovador');
    await expect(page.getByText('Aprovações', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Revise destino, cliente e adiantamento antes de liberar cada viagem.')).toBeVisible();
    await expect(page.getByText('Aprovar').first()).toBeVisible();
  });

  test('exibe o histórico e exige comentário antes da decisão', async ({ page }) => {
    await page.goto('/approvals?perfil=Aprovador');
    await expect(page.getByText('Filtros do histórico', { exact: true })).toBeVisible();
    await expect(page.getByText('Aprovada', { exact: true })).toBeVisible();
    await page.getByText('Aprovada', { exact: true }).click();
    await page.getByText('Histórico', { exact: true }).first().click();
    await expect(page.getByText('Histórico de decisões', { exact: true })).toBeVisible();
    await page.getByText('Aprovar').first().click();
    await expect(page.getByText('Confirmar aprovação')).toBeVisible();
    await page.getByText('Confirmar decisão').click();
    await expect(page.getByText('Comentário obrigatório', { exact: true })).toBeVisible();
    await expect(page.getByText('Confirmar aprovação')).toBeVisible();
  });
});
