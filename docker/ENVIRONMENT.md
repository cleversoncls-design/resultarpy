# Ambiente Docker

O arquivo `compose.yaml` não contém credenciais reais. Antes de iniciar o ambiente, exporte as variáveis pelo shell, por um secret manager ou por um arquivo `.env` mantido fora do controle de versão.

| Variável | Obrigatória | Uso |
|---|---:|---|
| `JWT_SECRET` | Sim | Assinatura das sessões da API; o Compose falha rapidamente quando não está definida. |
| `POSTGRES_DB` | Não | Nome do banco; padrão local `controle_viagens`. |
| `POSTGRES_USER` | Não | Usuário do banco; padrão local `controle`. |
| `POSTGRES_PASSWORD` | Sim em produção | Senha do PostgreSQL; o padrão existente serve somente para testes locais. |
| `FRONTEND_PORT` | Não | Porta publicada pelo Nginx; padrão `8080`. |
| `VITE_APP_ID` | Conforme OAuth | Identificador da aplicação usado pelo backend. |
| `OAUTH_SERVER_URL` | Conforme OAuth | Servidor OAuth utilizado pelo login. |
| `OWNER_OPEN_ID` | Conforme OAuth | Identidade do proprietário administrativo. |
| `BUILT_IN_FORGE_API_URL` | Opcional | Endpoint de serviços integrados. |
| `BUILT_IN_FORGE_API_KEY` | Opcional | Chave do serviço integrado; nunca deve ser embutida no frontend. |

Exemplo de inicialização local, sem salvar o segredo no projeto:

```bash
export JWT_SECRET="use-uma-string-longa-e-aleatoria"
export POSTGRES_PASSWORD="use-uma-senha-local-forte"
docker compose -f compose.yaml up -d --build
bash scripts/docker-health.sh
```

O frontend e a API compartilham o mesmo domínio através do Nginx. Por isso, `EXPO_PUBLIC_API_BASE_URL` pode permanecer vazio na imagem de produção; as chamadas `/api/*` são encaminhadas internamente para o serviço `api`.
