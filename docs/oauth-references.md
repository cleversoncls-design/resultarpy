# Referências consultadas sobre OAuth

## GitHub — Web App Template com Manus Auth

Fonte: [README do repositório vayana-mvp](https://github.com/oommensy/vayana-mvp/blob/main/README.md).

A documentação descreve o fluxo padrão do template: Manus OAuth no frontend, callback em `/api/oauth/callback`, `VITE_APP_ID` como identificador da aplicação, `OAUTH_SERVER_URL` como servidor OAuth e `VITE_OAUTH_PORTAL_URL` como portal de login. Também indica que, no web, a sessão padrão usa cookie HTTP-only. Esses valores são relevantes apenas para o fluxo legado; a decisão atual do projeto é removê-lo do ambiente de produção.

## Manus API — Authentication

Fonte: [Authentication — Manus API](https://open.manus.ai/docs/v2/authentication).

A documentação pública explica autenticação da API Manus por chave de API ou token OAuth2 e informa que aplicações OAuth2 dependem de configuração própria e escopos. Ela não fornece um serviço OAuth local para este projeto. Por isso, uma instalação independente precisa hospedar seu próprio mecanismo de identidade e sessão, em vez de apontar o `OAUTH_SERVER_URL` para o IP local.

## Decisão do projeto

A aplicação será migrada para login local em `/login`, com credenciais persistidas no PostgreSQL, sessões locais HTTP-only e autorização baseada nos perfis existentes. O portal e a API OAuth do Manus não serão necessários para o acesso do servidor Docker.
