# Deploy em VM Docker com rede bridge nativa

Este guia prepara o `compose.yaml` para execução em uma VM Ubuntu 24.04 com Docker Engine e kernel capaz de criar redes bridge via iptables. A validação deve ser executada na VM, pois o sandbox atual não possui a tabela `iptables/raw` necessária para endpoints bridge.

## Pré-requisitos

A VM deve ter Docker Engine, Docker Compose v2, Git e acesso de saída à internet para baixar as imagens de build. O usuário de operação precisa ter permissão para executar Docker. Antes da primeira subida, confirme:

```bash
docker version
docker compose version
docker info
sudo iptables -t raw -S
```

O comando `docker info` deve mostrar o daemon ativo. A consulta à tabela `raw` deve retornar regras ou uma resposta válida; erro informando que a tabela não existe indica que a VM ainda não está pronta para validar o modo bridge.

## Preparação do código

Clone o repositório e fixe a revisão que será implantada, evitando deploy implícito de alterações futuras:

```bash
sudo mkdir -p /opt/resultarpy
sudo chown -R "$USER":"$USER" /opt/resultarpy
git clone https://github.com/cleversoncls-design/resultarpy.git /opt/resultarpy
cd /opt/resultarpy
git checkout main
git pull --ff-only origin main
```

Depois que o Pull Request de segurança for revisado e incorporado à `main`, o deploy deve ser feito a partir do commit resultante. Enquanto ele permanecer aberto, use a branch do PR somente para homologação, nunca como fonte de produção.

## Variáveis de produção

Crie `/opt/resultarpy/.env` com permissões restritas. Não faça commit desse arquivo e não reutilize os valores de teste locais:

```dotenv
POSTGRES_DB=controle_viagens
POSTGRES_USER=controle
POSTGRES_PASSWORD=gere-uma-senha-forte-e-unica
JWT_SECRET=gere-uma-chave-aleatoria-longa-e-unica
FRONTEND_PORT=8080
PUBLIC_APP_URL=http://IP_PUBLICO_DA_VM:8080
EXPO_PUBLIC_API_BASE_URL=http://IP_PUBLICO_DA_VM:8080
EXPO_PUBLIC_DEMO_MODE=false
INITIAL_ADMIN_NAME=Administrador
INITIAL_ADMIN_EMAIL=admin@empresa.local
INITIAL_ADMIN_PASSWORD=troque-por-uma-senha-forte-e-unica
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
```

Proteja o arquivo e valide que os segredos não estão vazios:

```bash
chmod 600 /opt/resultarpy/.env
test -n "$(grep '^JWT_SECRET=' /opt/resultarpy/.env | cut -d= -f2-)"
test -n "$(grep '^POSTGRES_PASSWORD=' /opt/resultarpy/.env | cut -d= -f2-)"
```

O Compose já mantém o PostgreSQL em volume nomeado, executa migrations e seed no serviço `migrate` e publica somente o Nginx. O PostgreSQL e a API permanecem na rede interna bridge e não devem receber portas públicas.

## Subida e validação

Execute a composição padrão de produção:

```bash
cd /opt/resultarpy
docker compose --env-file .env -f compose.yaml config
docker compose --env-file .env -f compose.yaml up -d --build
bash scripts/docker-health.sh
docker compose --env-file .env -f compose.yaml ps
```

A validação esperada é `postgres` saudável, `migrate` concluído com sucesso, `api` saudável e `frontend` saudável. O acesso externo deve ser feito pela porta publicada do frontend, por exemplo `http://IP_DA_VM:8080`, até que um domínio e HTTPS sejam configurados.

## Firewall e exposição

A VM deve manter o padrão restritivo do UFW. Abra somente SSH e a porta do proxy web, preferencialmente atrás de um domínio e HTTPS:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 8080/tcp
sudo ufw enable
sudo ufw status verbose
```

Não abra `5432` nem `3000`; esses serviços não possuem exposição direta no Compose. Para produção, recomenda-se colocar o Nginx atrás de um domínio, restringir SSH por IP quando possível e emitir certificado TLS com um terminador apropriado.

## Auto-início e recuperação

Crie `/etc/systemd/system/resultarpy-compose.service` com o conteúdo abaixo para que o stack volte após reinicializações da VM:

```ini
[Unit]
Description=Resultarpy Docker Compose stack
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/opt/resultarpy
EnvironmentFile=/opt/resultarpy/.env
ExecStart=/usr/bin/docker compose --env-file /opt/resultarpy/.env -f /opt/resultarpy/compose.yaml up -d
ExecStop=/usr/bin/docker compose --env-file /opt/resultarpy/.env -f /opt/resultarpy/compose.yaml down
RemainAfterExit=yes
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Ative e teste o serviço:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now resultarpy-compose.service
sudo systemctl status resultarpy-compose.service
```

## Atualização controlada

Faça backup antes de atualizar, baixe a revisão desejada e recrie os serviços:

```bash
cd /opt/resultarpy
bash scripts/db-backup.sh
sudo git fetch origin
sudo git checkout main
sudo git pull --ff-only origin main
docker compose --env-file .env -f compose.yaml up -d --build
bash scripts/docker-health.sh
```

Se a validação falhar, preserve logs e reverta para a revisão anterior com `git checkout` de um commit conhecido; não remova o volume `postgres_data`. A restauração do banco deve usar `scripts/db-restore.sh` somente após confirmar o arquivo de backup e o destino.

## Critérios de aceite da VM bridge

O deploy estará validado quando `docker network inspect controle-viagens_internal` mostrar uma rede com driver `bridge`, os quatro serviços iniciarem com os healthchecks verdes, a API responder em `/api/health`, o frontend responder em `/healthz`, migrations/seed concluírem sem erro e o navegador acessar o frontend pela porta publicada. Também deve ser confirmado que `5432` e `3000` não estão publicados no host.

A implementação não foi executada nesta sessão porque não há uma VM persistente anexada ao ambiente. Para executar de fato, anexe uma Cloud Computer existente pelo ícone de computador abaixo da caixa de chat ou use uma máquina própria com Docker Engine. A VM Cloud Computer é uma opção paga a partir de US$ 10/mês; uma máquina local é a alternativa sem custo adicional, desde que permaneça online durante o serviço.


## Primeiro acesso como Administrador

O endereço de entrada é `http://IP_DA_VM:8080/login`. O IP não é definido pelo repositório nem pelo Compose; consulte-o no painel do servidor. Se `FRONTEND_PORT` for alterada para `80` ou `443`, use a porta correspondente.

A autenticação é local e não depende de Manus OAuth. Para criar o primeiro Administrador, configure temporariamente `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` e `INITIAL_ADMIN_NAME` no `.env`. A senha deve ser forte, não deve ser commitada e não deve aparecer em logs. Depois execute:

```bash
docker compose --env-file .env -f compose.yaml up -d --build --force-recreate
```

Acesse `http://IP_DA_VM:8080/login`, informe o e-mail e a senha do bootstrap e confirme o acesso ao painel Administrativo. O serviço cria apenas a conta caso ainda não exista; execuções posteriores são idempotentes. Após o primeiro login, remova `INITIAL_ADMIN_PASSWORD` do `.env` e recrie somente a API:

```bash
sed -i '/^INITIAL_ADMIN_PASSWORD=/d' .env
docker compose --env-file .env -f compose.yaml up -d --force-recreate api
```

O Administrador poderá criar contas locais em `/admin-users`, escolher entre os perfis Viajante/Aprovador e Administrativo e gerenciar a operação pelos módulos existentes. O perfil é determinado no PostgreSQL e não por seletor demonstrativo.

Se o login não funcionar, consulte `docker compose logs --tail=100 api frontend`, confirme que as migrations foram aplicadas e verifique se `frontend` e `api` estão saudáveis. Não remova o volume `postgres_data` durante a correção.
