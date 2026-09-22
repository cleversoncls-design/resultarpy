# Validação da proteção da branch main

Em 24 de agosto de 2026 foi criado o Pull Request de teste [#1](https://github.com/cleversoncls-design/resultarpy/pull/1), com a branch `test/branch-protection-validate-web` comparada à `main`. O PR contém somente o arquivo temporário `.github/branch-protection-test.md` e não deve ser incorporado.

Estado observado na abertura: **Checks pending**, com um check esperado chamado `validate`, marcado como **Required** e aguardando o reporte de status. A página também exibe o PR como aberto e ainda não mesclado. Essa evidência confirma que a proteção está sendo aplicada ao PR; a confirmação final deverá aguardar a conclusão do `validate` e depois o PR deverá ser fechado sem merge.

O push pelo remoto GitHub no sandbox falhou com HTTP 403; por isso, a branch temporária foi criada pela interface web autenticada do GitHub. O workspace local foi mantido na branch `main`, com a alteração pendente em `todo.md` preservada.

## Resultado final

O workflow do Pull Request foi executado no run [32779991173](https://github.com/cleversoncls-design/resultarpy/actions/runs/32779991173) e terminou com sucesso em aproximadamente 3 minutos. O job `validate` passou por TypeScript, lint, PostgreSQL 16, Vitest, instalação do Playwright, Compose bridge smoke environment, healthcheck do frontend, Playwright E2E e teardown. No PR, `CI / validate (pull_request)` apareceu como **Successful** e **Required**; o GitHub exibiu **Ready to merge** somente depois da conclusão. A publicação de imagens ficou corretamente **Skipped** no evento `pull_request`, pois o workflow publica imagens apenas em push para `main`.

Depois da confirmação visual, o PR #1 foi fechado sem merge. A `main` permaneceu inalterada.


## Scan inicial de vulnerabilidades

O workflow do PR #2 (run 32780984264) executou os dois scans Trivy e bloqueou o job `validate` no passo `Enforce vulnerability threshold`. Os relatórios SARIF foram publicados como artefato. Os achados incluem dependências de desenvolvimento e transitivas presentes no runtime da API, além de pacotes Alpine desatualizados na imagem Nginx. Para reduzir a superfície, a correção local altera a API para bundle CommonJS com apenas `dotenv` externo e atualiza o frontend para `nginx:1.29-alpine3.22`.

A validação TypeScript, lint e build local passou. O build Docker local não pôde concluir mesmo com `sudo` porque o sandbox não possui a tabela `iptables/raw` necessária para criar endpoints na rede bridge; o mesmo Compose/bridge já foi validado anteriormente no runner do GitHub Actions.
