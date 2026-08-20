# Project TODO

- [x] Ler a especificação funcional anexada
- [x] Inicializar o projeto móvel Expo
- [x] Documentar o plano de design e os fluxos principais
- [x] Criar identidade visual e ícone exclusivo do aplicativo
- [x] Atualizar tema, nome e configuração de marca do aplicativo
- [x] Implementar navegação principal por perfil de acesso
- [x] Implementar acesso, sessão de demonstração e seleção de perfil
- [x] Implementar painel inicial do viajante
- [x] Implementar criação e acompanhamento de solicitações de viagem
- [x] Implementar fluxo de aprovação e rejeição pelo aprovador
- [x] Implementar preparação administrativa com checklist
- [x] Implementar lançamento e revisão de despesas
- [x] Implementar seleção de comprovantes com suporte planejado a HEIC
- [x] Implementar relatórios analítico e resumo por cliente
- [x] Implementar preferências de idioma PT/ES e tema automático/claro/escuro
- [x] Isolar adaptadores de dados para futura integração com Supabase Auth, PostgreSQL e Storage
- [x] Validar tipos, lint, testes e fluxos principais

- [x] Reconstruir a estrutura visual para uso web desktop responsivo
- [x] Criar shell desktop com navegação lateral e cabeçalho operacional
- [x] Adaptar dashboard, viagens, aprovações, operação, despesas e relatórios para telas largas
- [x] Validar responsividade desktop e mobile após a reconstrução web

## Controle de Frota

- [x] Criar modelo de domínio de veículos, reservas, viagens de frota, manutenções, alertas e eventos
- [x] Reutilizar unidades e viajantes do Controle de Viagens
- [x] Implementar cadastro de veículos com dados técnicos, unidade, quilometragem, manutenção, extintor e observações
- [x] Implementar painel administrativo de frota com status Disponível, Reservado, Em viagem, Realizar Manutenção, Em manutenção, Extintor próximo do vencimento e Avaria registrada
- [x] Implementar reserva de veículo vinculada a viagem aberta que solicitou veículo de frota
- [x] Implementar associação de veículo disponível e condutor à reserva
- [x] Implementar início da viagem com data de saída e quilometragem inicial
- [x] Implementar finalização da viagem com data de retorno e quilometragem final
- [x] Implementar cálculo de quilometragem percorrida e atualização do KM atual do veículo
- [x] Implementar registro de multas, avarias e outros eventos com observações e anexos de fotos
- [x] Implementar alerta preventivo de manutenção com faixa de 3% abaixo e até 3% acima do intervalo configurado
- [x] Implementar bloqueio manual do veículo como Em manutenção e liberação administrativa
- [x] Implementar alerta de extintor com 30 dias de antecedência
- [x] Alterar automaticamente o status para ação administrativa quando houver avaria
- [x] Validar fluxos de administrador e viajante em desktop e mobile

## Ordens de Serviço da Frota

- [x] Criar modelo de Ordem de Serviço vinculada a um veículo
- [x] Implementar formulário com veículo, KM, data, observação e custo da manutenção
- [x] Exibir lista de Ordens de Serviço no painel de Frota
- [x] Atualizar a última manutenção e o status do veículo a partir da Ordem de Serviço
- [x] Validar tipos, lint, testes e fluxo web desktop
