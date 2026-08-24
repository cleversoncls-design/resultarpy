# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: web-flows.spec.ts >> fluxos web do Controle de Viagens >> abre a visão de Aprovador e exibe a fila de decisões
- Location: tests/e2e/web-flows.spec.ts:28:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Aprovações', { exact: true }).last()
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Aprovações', { exact: true }).last()
    13 × locator resolved to <div dir="auto" class="css-146c3p1 r-dnmrzs r-1udh08x r-1udbk01 r-3s2u2q r-1iln25a r-1niwhzg r-q4m81j r-135wba7 r-1a11zyx r-wizibn">Aprovações</div>
       - unexpected value "hidden"

```

```yaml
- text: " Controle de Viagens Perfil de teste Aprovador Clique para trocar a visão Workspace  Viagens ⌃  Visão geral  Minhas viagens  Nova solicitação  Aprovações 2  Relatório de reembolso Perfil Aprovador Configurações e preferências 🇧🇷 Português ⌄  Sistema ⌄ Bom dia, Mariana Lopes. Perfil: Aprovador  Total de viagens 02 Aguardando aprovação 02 Em preparação 00 Fechamento enviado R$ 0,00 Próxima atividade Ver tudo Em prestação Ciudad del Este 18 ago — 21 ago · AgroNorte S.A. Em prestação Adiantamento R$ 1.280,00 Abrir detalhes › Acesso rápido  Minhas viagens Acompanhar e criar solicitações  Nova solicitação Solicitar uma viagem  Aprovações Aprovar ou rejeitar viagens  Revisão de fechamento Conferir despesas e finalizar Pendências do ambiente 2 aprovações aguardando Solicitações da sua equipe e preparações administrativas."
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test.describe('fluxos web do Controle de Viagens', () => {
  4  |   test('abre a visão do Viajante e alterna para o formulário de nova viagem', async ({ page }) => {
  5  |     await page.goto('/viajante?perfil=Viajante');
  6  |     await expect(page.getByText('Controle de Viagens')).toBeVisible();
  7  |     await page.getByText('Nova solicitação').first().click();
  8  |     await expect(page).toHaveURL(/new-trip/);
  9  |     await expect(page.getByText('Nova solicitação', { exact: true }).last()).toBeVisible();
  10 |     await expect(page.getByText('Destino da viagem')).toBeVisible();
  11 |   });
  12 | 
  13 |   test('abre o formulário de despesa no ambiente web independente', async ({ page }) => {
  14 |     await page.goto('/expenses?perfil=Viajante');
  15 |     await expect(page.getByText('Despesas', { exact: true })).toBeVisible();
  16 |     await page.getByText('Adicionar outro lançamento').click();
  17 |     await expect(page).toHaveURL(/expenses/);
  18 |     await expect(page.getByText('Nova despesa', { exact: true }).last()).toBeVisible();
  19 |     await expect(page.getByText('Salvar despesa')).toBeVisible();
  20 |   });
  21 | 
  22 |   test('abre a edição de viagem por identificador persistente', async ({ page }) => {
  23 |     await page.goto('/new-trip?perfil=Administrativo&tripId=1');
  24 |     await expect(page.getByText('Editar viagem')).toBeVisible();
  25 |     await expect(page.getByText('Salvar alterações')).toBeVisible();
  26 |   });
  27 | 
  28 |   test('abre a visão de Aprovador e exibe a fila de decisões', async ({ page }) => {
  29 |     await page.goto('/aprovador?perfil=Aprovador');
> 30 |     await expect(page.getByText('Aprovações', { exact: true }).last()).toBeVisible();
     |                                                                        ^ Error: expect(locator).toBeVisible() failed
  31 |     await expect(page.getByText('Revise destino, cliente e adiantamento antes de liberar cada viagem.')).toBeVisible();
  32 |     await expect(page.getByText('Aprovar').first()).toBeVisible();
  33 |   });
  34 | });
  35 | 
```