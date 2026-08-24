# Diagnóstico e simulação Docker com PostgreSQL

## Objetivo

Este documento registra uma simulação isolada para avaliar a execução do Controle de Viagens com PostgreSQL em Docker. A simulação não substitui o preview atual, não altera a base gerenciada do projeto e não migra automaticamente os dados demonstrativos da interface.

## Diagnóstico da arquitetura atual

| Área | Situação identificada | Impacto |
|---|---|---|
| Interface | Expo SDK 54, React Native Web e Expo Router | Pode continuar como aplicação web e mobile |
| API | Node.js, Express e tRPC | Pode ser empacotada em um container separado |
| ORM | Drizzle ORM | Pode ser mantido, mas o dialeto atual é MySQL |
| Driver de banco | `mysql2` | Precisa ser substituído por `pg` ou por uma configuração PostgreSQL equivalente |
| Schema atual | Contém apenas a tabela de usuários do template | O domínio de viagens e frota ainda precisa ser modelado no schema real |
| Rotas tRPC | Incluem autenticação e sistema, sem CRUD de viagens, despesas ou frota | Os dados da interface ainda não são persistidos pela API |
| Dados da interface | Grande parte está em `lib/demo-data.ts` | É necessário migrar arrays e regras para tabelas e procedimentos tRPC |
| Inicialização | O servidor não executa migração nem seed ao iniciar | Docker precisa de uma etapa explícita para preparar o banco |

## Arquivos da simulação

A simulação foi criada com três partes principais:

1. `docker-compose.postgres.yml` define um serviço PostgreSQL 16, volume persistente, healthcheck e montagem dos scripts de inicialização.
2. `docker/postgres/init/001_schema.sql` cria tabelas e índices para usuários, unidades, viajantes, clientes, tipos de gasto, limites, viagens, despesas, veículos, reservas, eventos e ordens de serviço.
3. `docker/postgres/init/002_seed.sql` insere registros iniciais seguros para teste, incluindo perfis, unidades, clientes, limites, uma viagem, despesas, veículos e uma ordem de serviço.

Os scripts `docker:postgres:*` adicionados ao `package.json` permitem validar, iniciar, consultar e encerrar a simulação de forma reproduzível.

## Resultado da simulação

O Compose foi validado e o PostgreSQL 16 iniciou com healthcheck aprovado. O seed criou as seguintes quantidades:

| Entidade | Registros simulados |
|---|---:|
| Unidades | 2 |
| Viajantes/condutores | 3 |
| Clientes | 2 |
| Viagens | 1 |
| Despesas | 2 |
| Veículos | 2 |
| Ordens de serviço | 1 |

Também foi validada a regra de faturamento. Para a viagem `TR-2026-031`, uma hospedagem de `R$ 86,00` com limite de `R$ 80,00` resultou em `R$ 80,00` a faturar; uma alimentação de `R$ 120,00` com limite de `R$ 65,00` resultou em `R$ 65,00` a faturar.

## Comandos de execução

Em uma máquina com Docker e Docker Compose instalados, a sequência básica será:

```bash
pnpm docker:postgres:config
pnpm docker:postgres:up
pnpm docker:postgres:ps
pnpm docker:postgres:down
```

Para remover também o volume da simulação e recriar o banco desde o início, use `pnpm docker:postgres:reset`. Esse comando deve ser usado somente na simulação, pois remove os dados do volume Docker identificado como `controle-viagens-pgdata-sim`.

A conexão de teste usada pelo serviço é equivalente a:

```text
postgresql://controle:controle_dev_only@localhost:5432/controle_viagens
```

A senha acima é apenas de desenvolvimento. Em qualquer ambiente real, ela deve ser substituída por um segredo externo e nunca deve ser incorporada à imagem ou ao repositório.

## Limitações encontradas

A simulação prova que o PostgreSQL pode ser criado com as tabelas e dados iniciais, mas ainda não transforma o produto atual em uma aplicação plenamente orientada a banco. O código de produção continua configurado para `drizzle-orm/mysql2`, e as telas continuam consumindo dados demonstrativos em diversos fluxos.

Uma migração completa exige converter o schema Drizzle para `drizzle-orm/node-postgres` ou `drizzle-orm/postgres-js`, gerar migrações PostgreSQL, criar queries em `server/db.ts`, expor operações no `server/routers.ts`, conectar as telas aos hooks tRPC e substituir progressivamente o estado demonstrativo. Também será necessário decidir como autenticar usuários reais e como armazenar fotos de avarias e comprovantes.

O Compose da simulação usa `network_mode: host` porque o sandbox não disponibiliza as regras `iptables/raw` necessárias para a rede bridge padrão. Em uma máquina Docker convencional, o Compose de produção deve usar a rede interna padrão, sem `network_mode: host`, e o serviço `api` deve acessar o banco pelo nome do serviço, por exemplo `postgres:5432`.

## Arquitetura recomendada para a próxima etapa

| Serviço | Responsabilidade |
|---|---|
| `web` | Build estático da interface Expo Web servido por Nginx |
| `api` | Express/tRPC, autenticação, autorização, regras de faturamento e reembolso |
| `postgres` | Persistência transacional com volume e backup |
| `storage` opcional | Armazenamento de comprovantes e fotos de avarias, caso não seja usado um storage externo |

A sequência segura para uma implementação completa é manter o preview atual funcionando, criar as tabelas PostgreSQL em paralelo, migrar primeiro os cadastros gerais, depois viagens e despesas, e por fim os módulos de frota e relatórios. Cada grupo deve ter testes de autorização, cálculos monetários, quilometragem e alertas antes de retirar os dados demonstrativos correspondentes.
