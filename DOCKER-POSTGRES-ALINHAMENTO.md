# Alinhamento do escopo Docker/PostgreSQL

## Fonte analisada

Foi analisado o arquivo `pasted_content_2.txt`, recebido como especificação para concluir a migração de MySQL para PostgreSQL 16, preparar uma execução reproduzível com Docker Compose e iniciar a persistência real dos cadastros compartilhados.

A orientação é compatível com o diagnóstico anterior, mas amplia o escopo: a configuração criada anteriormente era uma simulação isolada do PostgreSQL; o arquivo recebido define uma futura migração completa da aplicação, incluindo API, frontend de produção, Nginx, migrations, tRPC, backups e persistência dos quatro cadastros principais.

## Comparação de estado

| Tema | Já validado | Exigência do arquivo recebido | Situação |
|---|---|---|---|
| PostgreSQL | PostgreSQL 16 em container, volume, healthcheck, schema e seed | PostgreSQL 16 como serviço definitivo | Parcialmente atendido |
| Modelo de dados | 14 tabelas simuladas para o domínio | Migrations Drizzle versionadas e executáveis em banco vazio | O schema simulado precisa ser convertido para migrations oficiais |
| Drizzle | Configuração atual ainda usa `mysql-core`, `mysql2` e dialeto MySQL | Migração integral para PostgreSQL, preservando constraints e precisão monetária | Pendente |
| API | Express/tRPC está operacional, mas os routers de domínio ainda não existem | CRUD tRPC de Unidades, Clientes, Viajantes e Tipos de gasto | Pendente |
| Frontend | Telas responsivas funcionais com dados demonstrativos | Substituir mocks somente nos quatro cadastros migrados | Pendente |
| Docker | Compose isolado do PostgreSQL foi executado | Compose completo com `postgres`, `migrate`, `api` e `frontend` | Parcialmente atendido |
| Frontend de produção | A aplicação é Expo/React Native Web | Build de produção servido por Nginx, com fallback de rotas | Pendente e requer definir o comando de exportação web |
| API de produção | Servidor Node pode ser empacotado | Multi-stage, JavaScript compilado, usuário não root e healthcheck | Pendente |
| Seeds | Seed inicial da simulação produz registros idempotentes no banco novo | Seed oficial idempotente, sem duplicação e sem SQL manual externo | Parcialmente atendido |
| Operação | Comandos básicos para subir e parar o PostgreSQL | Migrations, seed, logs, saúde, backup e restore | Parcialmente atendido |
| Autenticação | Existe infraestrutura Manus OAuth e seleção de perfil demonstrativo local | Preservar autenticação atual e documentar pendências reais | Requer integração de autorização de domínio |
| Segurança | Não foram usados secrets reais | Sem secrets em imagens ou bundle, banco sem exposição pública | Deve ser aplicado no Compose final |
| Validação | Compose, container, tabelas, seed, regra de faturamento, TypeScript e 11 testes validados | Build das imagens, API, frontend, healthchecks, persistência após restart e rotas SPA | Parcialmente atendido |

## Decisões incorporadas

A migração deve ser incremental. A implementação MySQL não deve ser apagada antes de o PostgreSQL estar validado; o caminho mais seguro é manter um checkpoint anterior e introduzir o novo driver em uma etapa identificável. As regras de faturamento, reembolso, quilometragem, manutenção e permissões já validadas não devem ser reescritas durante a migração do banco.

O acesso do frontend ao banco deve continuar proibido. As telas devem acessar a API por tRPC, com validação Zod no servidor, autorização por perfil, tratamento de erros e invalidação de cache após mutações. O cliente não deve receber credenciais ou variáveis sensíveis no bundle.

A primeira fatia funcional deve ser limitada aos quatro cadastros compartilhados: **Unidades, Clientes, Viajantes e Tipos de gasto**. Cada cadastro deve ter listagem, busca, criação, atualização, exclusão conforme a regra definida, paginação, ordenação, pesquisa, validação, verificação de duplicidade e testes. Viagens, despesas, frota e relatórios devem continuar utilizando a fonte atual até que suas tabelas e routers sejam migrados de forma independente.

O Compose definitivo deve usar rede interna entre serviços. O modo `network_mode: host` existente no Compose de simulação foi necessário apenas porque o sandbox não possui as regras `iptables/raw` para a rede bridge. Essa adaptação não deve ser levada para produção. O banco não deve publicar uma porta para a internet; somente o frontend deve ter porta pública configurável.

## Estrutura alvo

```text
postgres -> migrate -> api -> frontend/nginx
```

O PostgreSQL deve ficar saudável antes das migrations. As migrations devem concluir com sucesso antes da API iniciar. O frontend deve ser construído em uma etapa Node e servido em uma imagem Nginx mínima, com fallback para `index.html` nas rotas web da aplicação.

A estrutura recomendada para a próxima implementação é:

```text
docker/
  api/Dockerfile
  frontend/Dockerfile
  nginx/default.conf
  postgres/init/                 # somente para a simulação ou bootstrap inicial
scripts/
  docker-up.sh
  docker-down.sh
  docker-health.sh
  db-migrate.sh
  db-seed.sh
  db-backup.sh
  db-restore.sh
docker-compose.yml               # ambiente completo de produção local
Dockerfile.api                   # se o projeto preferir arquivos na raiz
Dockerfile.frontend              # se o projeto preferir arquivos na raiz
.env.example
```

## Pontos que exigem decisão técnica antes da migração completa

| Decisão | Motivo |
|---|---|
| Driver PostgreSQL | Escolher `drizzle-orm/node-postgres` ou `drizzle-orm/postgres-js` conforme o runtime Node e o padrão de conexão desejado |
| Migrations | Converter o schema simulado em migrations Drizzle versionadas, sem depender de scripts montados diretamente no container |
| Seed oficial | Definir quais usuários, unidades, clientes e limites são dados de demonstração e quais devem ser cadastrados pelo administrador |
| Frontend web | Confirmar o comando Expo SDK 54 que produzirá o diretório estático final para o Nginx |
| Autorização | Relacionar os perfis demonstrativos atuais com usuários autenticados reais e regras de servidor |
| Arquivos | Definir storage para comprovantes e fotos de avarias; PostgreSQL deve guardar metadados, não necessariamente arquivos binários |
| Backup | Definir diretório externo, retenção, criptografia e procedimento de restauração antes de uso produtivo |

## Pendências formalmente adicionadas ao projeto

A especificação foi incorporada ao backlog como uma etapa posterior à simulação. Permanecem pendentes a conversão oficial do Drizzle, a persistência tRPC dos quatro cadastros, a integração inicial do frontend, os containers de API e Nginx, o Compose completo, os scripts operacionais de backup/restore e a bateria de testes de integração.

Portanto, o resultado atual deve ser interpretado como **prova técnica de que o PostgreSQL 16, o schema de domínio e o seed podem ser executados em Docker**, e não como conclusão da migração total. Essa distinção evita declarar como concluídos os critérios que dependem de API e frontend conectados ao banco real.

## Execução da etapa seguinte

A primeira fatia funcional da migração foi concluída. O schema principal e o Drizzle Kit agora usam `drizzle-orm/node-postgres`, `pg` e dialeto PostgreSQL; a configuração MySQL anterior permanece em `drizzle/schema.mysql-rollback.ts` e `drizzle.config.mysql-rollback.ts` para rollback explícito. A migration oficial em `drizzle-pg/0000_postgres_domain_initial.sql` foi aplicada ao banco isolado.

Foram criados `server/catalog-repository.ts` e `server/catalog-router.ts`, com listagem paginada, pesquisa, ordenação, criação, atualização, arquivamento lógico, validação Zod, tratamento de conflitos e proteção por `adminProcedure` para Unidades, Clientes, Viajantes e Tipos de gasto. A tela `app/general-cadastros.tsx` agora oferece CRUD quando existe sessão autenticada e perfil Administrativo; sessões demonstrativas não autenticadas continuam identificadas como modo local para preservar a avaliação atual.

O seed oficial `scripts/seed-postgres.ts` é idempotente e foi executado duas vezes, mantendo 3 usuários, 2 unidades, 2 clientes, 3 tipos de gasto, 2 viajantes e 3 motivos de manutenção. Os testes de repositories e autorização tRPC passaram contra o banco PostgreSQL isolado.

Também foram preparados `compose.yaml`, Dockerfiles multi-stage, proxy Nginx, scripts de saúde, subida, encerramento, logs, backup e restore, além de `docker/ENVIRONMENT.md`. As imagens da API e do frontend foram construídas com sucesso. O frontend retornou HTTP 200 para `/general-cadastros`, a API respondeu `/api/health` e o proxy Nginx encaminhou `/api/health` corretamente. No sandbox, o Compose completo com rede bridge não pode ser iniciado por uma limitação do kernel/iptables; a configuração de produção mantém rede interna bridge e foi validada sintaticamente.

Permanecem fora desta etapa a migração dos demais domínios — viagens, despesas, frota, manutenção e relatórios — e a configuração dos valores reais de OAuth/JWT em cada ambiente. O Compose exige `JWT_SECRET` antes de iniciar a API, e nenhum secret real é incluído nas imagens ou no bundle.

## Atualização após execução dos próximos passos

A cadeia de migrations PostgreSQL foi ampliada para os domínios de viagens, despesas, frota e manutenção. O modelo agora contempla campos de viagem e despesa para os relatórios, estados de reserva, ordens de serviço com status, aprovações de viagem e múltiplas fotos de eventos da frota. A migration de `unit_value` foi tornada segura para bases que já contenham despesas, preenchendo o valor unitário antes de aplicar `NOT NULL`. A migration de reservas também preenche datas planejadas a partir da viagem antes de impor a restrição.

Foram implementados `server/operations-repository.ts` e `server/operations-router.ts`, com consultas paginadas e filtros para viagens, despesas, veículos, reservas, eventos e ordens de serviço. Os routers usam Zod e separam operações autenticadas das operações administrativas. Viagens, despesas e o dashboard de frota consultam a API persistida quando há sessão; o fallback demonstrativo permanece somente para o modo não autenticado usado na avaliação local.

O banco gerenciado foi preservado: ele continua sendo TiDB/MySQL e não recebeu SQL PostgreSQL. O arquivo `server/db.ts` agora possui adaptador dual, usando PostgreSQL para o ambiente Docker e MySQL/TiDB para a autenticação do preview gerenciado.

As imagens da API e do frontend foram reconstruídas com sucesso. A tentativa do Compose de produção com rede bridge confirmou a limitação do kernel do sandbox (`iptables` sem a tabela `raw`). Em seguida, o Compose standalone `compose.sandbox.yaml`, com rede host e volume separado, subiu com sucesso: PostgreSQL ficou saudável, migrations e seed concluíram, a API respondeu `/api/health`, o frontend Nginx respondeu `/healthz` e 16 tabelas foram confirmadas. Esse override é apenas para teste local; produção deve usar o `compose.yaml` bridge em um Docker Engine com suporte normal a iptables.

## CRUD completo e teste autenticado

Os routers de operações agora oferecem `list`, `get`, `create`, `update` e `delete` para viagens e despesas, com escopo por usuário para perfis não administrativos. Ordens de Serviço também possuem `get`, `create`, `update` e `delete`; ao criar ou concluir uma O.S., o KM e a última manutenção do veículo são atualizados. O dashboard de frota, a lista de viagens e a tela de despesas consultam a persistência quando a sessão autenticada está disponível, mantendo o modo demonstrativo local separado.

Foi criado `tests/operations-router.test.ts`. Contra o PostgreSQL host do Compose, o teste autenticado executou CRUD de viagem, despesa e Ordem de Serviço e confirmou que um usuário autenticado não administrador recebe `FORBIDDEN` ao consultar veículos administrativos. O seed foi ampliado com um veículo idempotente para tornar esse teste reproduzível.

A tentativa do `compose.yaml` bridge foi executada com privilégios do daemon e construiu as imagens da API e do frontend, mas o kernel do sandbox rejeitou a criação do endpoint por ausência da tabela `iptables/raw`. A verificação de contexts confirmou que só existe o context `default`; não há VM ou Docker context externo anexado nesta sessão. O `compose.sandbox.yaml` host continua sendo a simulação integrada executável e saudável.
