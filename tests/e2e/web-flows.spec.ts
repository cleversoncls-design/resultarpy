import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const oneOf = (...values: string[]) => new RegExp(`^(?:${values.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`);

async function signIn(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, 'Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD no ambiente E2E.');
  await page.goto('/login');
  await page.getByPlaceholder('nome@empresa.com').fill(email!);
  await page.getByPlaceholder('Digite sua senha').fill(password!);
  await page.getByText('Entrar', { exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  // O menu lateral desktop não existe no layout compacto; a ausência do
  // campo de login é o marcador de autenticação estável em qualquer viewport.
  await expect(page.getByPlaceholder('nome@empresa.com')).toHaveCount(0);
}

async function switchToSpanish(page: Page) {
  const languageButton = page.getByLabel(/^Abrir (Idioma|Language)$/i).first();
  await expect(languageButton).toBeVisible();
  await languageButton.click();
  await page.getByText('Español', { exact: true }).last().click();
  await expect(page.getByText('Español', { exact: true }).last()).toBeVisible();
}

test.describe('fluxos web do Controle de Viagens', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title === 'executa login, troca para Español e encerra a sessão') return;
    await signIn(page);
  });

  test('abre a visão de viagens e o formulário de nova viagem', async ({ page }) => {
    await page.goto('/trips');
    await expect(page.getByText(oneOf('Minhas viagens', 'Mis viajes')).last()).toBeVisible();
    await page.goto('/new-trip');
    await expect(page.getByText(oneOf('Nova solicitação', 'Nueva solicitud')).last()).toBeVisible();
    await expect(page.getByText(oneOf('Destino da viagem', 'Destino del viaje')).first()).toBeVisible();
  });

  test('abre a lista e o formulário de despesas', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.getByText(oneOf('Despesas', 'Gastos')).last()).toBeVisible();
    await page.getByText(oneOf('Adicionar outro lançamento', 'Agregar otro registro')).click();
    await expect(page.getByText(oneOf('Nova despesa', 'Nuevo gasto')).last()).toBeVisible();
    await expect(page.getByText(oneOf('Salvar despesa', 'Guardar gasto')).first()).toBeVisible();
  });

  test('abre o formulário de nova viagem sem dados demonstrativos', async ({ page }) => {
    await page.goto('/new-trip');
    await expect(page.getByText(oneOf('Nova solicitação', 'Nueva solicitud')).last()).toBeVisible();
    await expect(page.getByText(oneOf('Destino da viagem', 'Destino del viaje')).first()).toBeVisible();
    await expect(page.getByText(oneOf('Salvar rascunho', 'Guardar borrador')).first()).toBeVisible();
  });

  test('abre aprovações e exibe fila ou estado vazio', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.getByText(oneOf('Aprovações', 'Aprobaciones')).last()).toBeVisible();
    await expect(page.getByText(oneOf('Filtros do histórico', 'Filtros del historial')).first()).toBeVisible();
    const approvalButton = page.getByText(oneOf('Aprovar', 'Aprobar'), { exact: true }).first();
    if (await approvalButton.isVisible().catch(() => false)) {
      await expect(approvalButton).toBeVisible();
    } else {
      await expect(page.getByText(oneOf('Tudo em dia', 'Todo al día'), { exact: true })).toBeVisible();
    }
  });

  test('percorre as telas principais após trocar para Español', async ({ page }) => {
    await switchToSpanish(page);
    const routes: Array<[string, RegExp]> = [
      ['/trips', oneOf('Mis viajes')],
      ['/operations', oneOf('Operación')],
      ['/fleet', oneOf('Control de Flota')],
      ['/general-cadastros', oneOf('Registros generales')],
      ['/reports', oneOf('Informe de facturación')],
      ['/reimbursements', oneOf('Reembolso al viajero')],
      ['/profile', oneOf('Preferencias')],
      ['/admin-users', oneOf('Usuarios locales')],
    ];
    for (const [path, heading] of routes) {
      await page.goto(path);
      await expect(page.getByText(heading, { exact: true }).last()).toBeVisible();
    }
  });

  test('executa login, troca para Español e encerra a sessão', async ({ page }) => {
    await signIn(page);
    await switchToSpanish(page);
    await expect(page.getByText('Cerrar sesión', { exact: true }).last()).toBeVisible();
    await page.getByLabel('Cerrar sesión').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('exibe filtros e estados vazios de aprovações sem dados demonstrativos', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.getByText('Filtros do histórico', { exact: true })).toBeVisible();
    const approvalButton = page.getByText('Aprovar', { exact: true }).first();
    if (!(await approvalButton.isVisible().catch(() => false))) {
      await expect(page.getByText('Não há solicitações pendentes para revisão.', { exact: true })).toBeVisible();
      return;
    }
    await page.getByText('Todas', { exact: true }).click();
    await page.getByText('Histórico', { exact: true }).first().click();
    await expect(page.getByText('Histórico de decisões', { exact: true })).toBeVisible();
  });
});
