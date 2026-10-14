# Migrar o banco do Docker para um PostgreSQL 16 em outra máquina

Este guia move os dados do PostgreSQL que roda no Docker (serviço `postgres` do `compose.yaml`) para um PostgreSQL 16 instalado em outra máquina da mesma rede. A aplicação (api, frontend e migrate) continua no Docker; só o banco passa a ser externo.

Nomes usados nos exemplos (troque pelos seus):

- **Servidor da aplicação** (onde roda o Docker): `192.168.1.10`
- **Servidor do banco** (PostgreSQL 16 instalado): `192.168.1.50`
- Banco `controle_viagens`, usuário `controle`, senha `SENHA_FORTE`

Os dados da aplicação (inclusive comprovantes) ficam todos no banco; o único volume do Compose é o do PostgreSQL.

## 1. Preparar o servidor do banco (192.168.1.50)

Crie o usuário e o banco:

```bash
sudo -u postgres psql
```
```sql
CREATE ROLE controle LOGIN PASSWORD 'SENHA_FORTE';
CREATE DATABASE controle_viagens OWNER controle ENCODING 'UTF8';
\q
```

Libere o acesso pela rede. Localize os arquivos com `sudo -u postgres psql -c "SHOW config_file;"` (Debian/Ubuntu: `/etc/postgresql/16/main/`; RHEL/Rocky/Alma: `/var/lib/pgsql/16/data/`).

- Em `postgresql.conf`: `listen_addresses = '*'` (ou o IP do servidor do banco).
- Em `pg_hba.conf`, no fim do arquivo, permita só o servidor da aplicação:
  `host  controle_viagens  controle  192.168.1.10/32  scram-sha-256`
- Reinicie: `sudo systemctl restart postgresql` (RHEL: `postgresql-16`).
- Firewall, só para o servidor da aplicação:
  - Ubuntu: `sudo ufw allow from 192.168.1.10 to any port 5432 proto tcp`
  - RHEL: `sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.10" port port="5432" protocol="tcp" accept' && sudo firewall-cmd --reload`

Teste a conexão **a partir do servidor da aplicação** (não precisa instalar nada, usa a imagem do Docker):

```bash
docker run --rm postgres:16-alpine psql "postgresql://controle:SENHA_FORTE@192.168.1.50:5432/controle_viagens" -c "select version();"
```

Se a senha tiver caracteres especiais, codifique-os na URL (`@` = `%40`, `:` = `%3A`, `/` = `%2F`, `#` = `%23`, `%` = `%25`).

## 2. Parar a aplicação e fazer o backup

Pare quem escreve no banco (o `postgres` continua ligado):

```bash
cd ~/resultarpy
docker compose stop api frontend
bash scripts/db-backup.sh ~/backups/controle_$(date +%F_%H%M).dump
ls -lh ~/backups/
```

Guarde também uma cópia do arquivo `.env`.

## 3. Restaurar no servidor novo

Direto do servidor da aplicação, sem copiar arquivos:

```bash
docker run --rm -i -e PGPASSWORD='SENHA_FORTE' postgres:16-alpine \
  pg_restore -h 192.168.1.50 -U controle -d controle_viagens --no-owner --no-acl --exit-on-error \
  < ~/backups/controle_AAAA-MM-DD_HHMM.dump
```

O restore inclui o histórico de migrações (schema `drizzle`), então o `migrate` não repete nada.

## 4. Conferir os dados

Rode nos dois bancos e compare os números:

```sql
select 'users' t, count(*) from users union all
select 'trips', count(*) from trips union all
select 'trip_expenses', count(*) from trip_expenses union all
select 'vehicles', count(*) from vehicles union all
select 'currency_rates', count(*) from currency_rates;
```

Banco antigo: `docker compose exec postgres psql -U controle -d controle_viagens`.
Banco novo: `docker run --rm -it postgres:16-alpine psql "postgresql://controle:SENHA_FORTE@192.168.1.50:5432/controle_viagens"`.

## 5. Apontar a aplicação para o banco novo

No servidor da aplicação, acrescente ao `.env` (a versão atual do `compose.yaml` já lê estas variáveis):

```dotenv
APP_DATABASE_URL=postgresql://controle:SENHA_FORTE@192.168.1.50:5432/controle_viagens
APP_DATABASE_SSL=false
```

Suba de novo e acompanhe:

```bash
docker compose up -d --build
docker compose logs --no-color migrate api | tail -40
bash scripts/docker-health.sh
```

Entre no sistema, abra Todas as viagens, um relatório e a tela de moedas. Se algo usar o banco errado, o `api` mostra erro de conexão no log.

## 6. Depois de alguns dias

- O volume do Docker (`postgres_data`) continua com os dados antigos: serve de plano B. **Não** rode `docker compose down -v` até ter certeza.
- O contêiner `postgres` local continua subindo sem ser usado. Para tirá-lo, remova o serviço `postgres` e o `depends_on` do `migrate` no `compose.yaml` (peça o ajuste se quiser).
- Configure backup diário no servidor do banco, por exemplo em `crontab -e` do usuário `postgres`:

```cron
30 2 * * * pg_dump -Fc controle_viagens > /var/backups/controle_$(date +\%F).dump && find /var/backups -name 'controle_*.dump' -mtime +14 -delete
```

## Voltar atrás

Apague as linhas `APP_DATABASE_URL`/`APP_DATABASE_SSL` do `.env` e rode `docker compose up -d`. A aplicação volta ao banco do Docker, com os dados de antes da troca (o que foi gravado no banco novo depois da troca não volta sozinho: gere um dump dele e restaure no Docker se precisar).
