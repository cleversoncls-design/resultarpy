# Validação visual

Em 19/08/2026, a rota inicial (`/`) carregou no preview com a dashboard móvel renderizada, incluindo saudação, viagem ativa, métricas, ações rápidas e pendências. A navegação inferior exibiu Início, Viagens, Aprovações, Operação e Perfil.

Ao tocar em Viagens, o navegador foi para `/trips`, mas o preview retornou uma página indisponível. O problema parece estar relacionado à forma como o Expo Router web resolve rotas fora da pasta `(tabs)`, e precisa ser corrigido ou contornado antes da entrega.
