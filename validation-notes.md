# Validação visual

Em 19/08/2026, a rota inicial (`/`) carregou no preview com a dashboard móvel renderizada, incluindo saudação, viagem ativa, métricas, ações rápidas e pendências. A navegação inferior exibiu Início, Viagens, Aprovações, Operação e Perfil.

Ao tocar em Viagens, o navegador foi para `/trips`, mas o preview retornou uma página indisponível. O problema parece estar relacionado à forma como o Expo Router web resolve rotas fora da pasta `(tabs)`, e precisa ser corrigido ou contornado antes da entrega.

## Validação visual da primeira fatia PostgreSQL

Em 24/08/2026, o preview web foi capturado em `/general-cadastros?perfil=administrativo` e `/general-cadastros?perfil=viajante`, em viewport desktop 1280x720. O perfil Administrativo exibiu a tela de Cadastros gerais com indicador de modo demonstração local, cards de Unidades, Viajantes e condutores, Clientes e Tipos de gasto, e o menu Relatório de Faturamento. O perfil Viajante exibiu a mensagem de acesso restrito e não exibiu Cadastros gerais nem o relatório de faturamento. A responsividade permanece baseada no layout flexível já existente; a execução real de CRUD depende de sessão autenticada e API PostgreSQL disponível.
