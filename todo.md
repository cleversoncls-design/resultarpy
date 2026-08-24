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

## Separação de permissões da Frota

- [x] Remover Frota da navegação principal do perfil Viajante
- [x] Manter Frota, veículos, reservas, manutenção e Ordens de Serviço exclusivos do Administrativo
- [x] Exibir ao Viajante somente o veículo atribuído dentro do detalhe da viagem
- [x] Restringir ações do Viajante a iniciar, finalizar, informar KM e registrar ocorrências com anexos
- [x] Validar a navegação e os fluxos separados por perfil

## Matriz de permissões revisada

- [x] Definir Viajante com acesso a viagens próprias, gastos e operação do veículo atribuído
- [x] Definir Aprovador como extensão do Viajante com acesso adicional às aprovações
- [x] Definir Administrativo com acesso completo à Frota, operações, relatórios, aprovações e solicitações
- [x] Permitir ao Administrativo solicitar viagens e veículos pelo mesmo fluxo do Viajante
- [x] Ajustar dashboard e navegação conforme a matriz de permissões
- [x] Validar os três perfis em desktop responsivo

## Links de visualização por perfil

- [x] Permitir abrir o preview com o perfil definido na URL
- [x] Gerar e validar links diretos para Viajante, Viajante + Aprovador e Administrativo

## Correção dos links de visualização

- [x] Criar rotas de entrada estáveis para Viajante, Aprovador e Administrativo
- [x] Testar cada link diretamente no preview web desktop
- [x] Entregar somente links confirmados como funcionais

## Seletor interno de perfis demonstrativos

- [x] Adicionar seletor visível de perfil na interface web
- [x] Permitir alternar entre Viajante, Viajante + Aprovador e Administrativo sem alterar a URL
- [x] Atualizar navegação e dashboard imediatamente após a troca de perfil

## Responsividade entre dispositivos

- [x] Adaptar sidebar desktop para navegação compacta em larguras menores
- [x] Reorganizar cartões, métricas, listas e ações para tablet e smartphone
- [x] Ajustar formulários e telas de detalhe para rolagem e toque em telas estreitas
- [x] Validar redimensionamento contínuo entre desktop, tablet e smartphone

## Configurações de idioma e tema

- [x] Exibir seletor de idioma com Português e Espanhol no Perfil
- [x] Exibir seletor de tema com Claro, Escuro e Sistema no Perfil
- [x] Persistir as preferências e aplicar o tema imediatamente em todas as telas
- [x] Validar os controles em desktop, tablet e smartphone

## Manutenção corretiva e análise de gastos

- [x] Criar cadastro de tipos ou motivos de manutenção
- [x] Vincular tipo ou motivo às Ordens de Serviço
- [x] Permitir Ordem de Serviço Corretiva avulsa, sem manutenção prevista
- [x] Diferenciar manutenção preventiva e corretiva no histórico
- [x] Criar relatório de manutenções por veículo e período
- [x] Exibir custos, quantidade de O.S. e totais filtrados

## Relatório analítico de gastos e faturamento

- [x] Detalhar viagem, cliente, data, conceito, quantidade e valor do gasto
- [x] Exibir limite de valor faturável por cliente e diferença para o gasto realizado
- [x] Calcular valor total faturável por gasto e total do período selecionado
- [x] Adicionar filtros por período, viagem e cliente
- [x] Adaptar o relatório para desktop e smartphone

## Reembolso ao viajante e separação de relatórios

- [x] Corrigir valor faturável para usar o teto quando o gasto ultrapassar o limite faturável
- [x] Criar limites de reembolso por tipo de gasto e cidade
- [x] Criar relatório de reembolso por viagem, data, cidade, conceito, quantidade e valor
- [x] Calcular valor reembolsável e excedente não reembolsável por evento
- [x] Liberar relatório de reembolso para Viajante e Administrativo
- [x] Ocultar relatório de faturamento ao cliente do perfil Viajante
- [x] Validar cálculos e permissões em desktop e smartphone

## Correção do valor faturável por limite do cliente

- [x] Corrigir o valor a faturar para usar o gasto quando for menor ou igual ao limite
- [x] Corrigir o valor a faturar para usar o limite quando o gasto ultrapassar o teto
- [x] Corrigir os totais do período e adicionar teste para hospedagem de R$ 86,00 com teto de R$ 80,00

## Recuperação da pré-visualização

- [x] Corrigir rota de entrada de perfil com exportação padrão
- [x] Registrar rotas de reembolso e faturamento no grupo Tabs
- [x] Restaurar e validar a pré-visualização web após recompilação

## Correção da regra de reembolso por evento

- [x] Ajustar o valor reembolsável para ser o menor entre gasto informado e limite por evento
- [x] Garantir que o excedente seja calculado apenas quando o gasto ultrapassar o limite
- [x] Validar o relatório com eventos abaixo, iguais e acima do limite

## Moeda global configurável

- [x] Criar configuração administrativa de moeda com R$, US$ e G$
- [x] Aplicar a moeda selecionada na formatação monetária de todo o sistema
- [x] Persistir a configuração global e refletir a alteração para todos os perfis
- [x] Validar relatórios, despesas, adiantamentos e dashboards nas três moedas

## Revisão global dos campos monetários

- [x] Mapear valores fixos em R$ ou formatações monetárias fora do formatador global
- [x] Corrigir dashboard, viagens, despesas, adiantamentos, frota, manutenção e relatórios
- [x] Validar todos os perfis com a moeda configurada como G$
- [x] Confirmar que nenhum valor monetário permanece em R$ indevidamente

## Variação visual inspirada nas referências

- [x] Criar sidebar clara com navegação ativa em preto e controles de idioma/tema no rodapé
- [x] Reorganizar dashboard em métricas e cartões de ação no estilo das referências
- [x] Reestruturar telas administrativas em seções e tabelas mais próximas dos exemplos
- [x] Validar responsividade, perfis, moeda global e fluxos existentes após a mudança visual

## Revisão visual por diferença insuficiente

- [x] Reestruturar o dashboard com composição claramente diferente da versão anterior e mais próxima das referências
- [x] Reposicionar a navegação e o bloco de perfil para reproduzir a hierarquia visual dos exemplos
- [x] Aplicar cartões de acesso rápido com dimensões, espaçamento e agrupamento visivelmente distintos
- [x] Validar a nova versão lado a lado em desktop e mobile antes de criar novo checkpoint

## Correção do tema claro

- [x] Mapear superfícies, textos e bordas fixados no tema escuro
- [x] Corrigir dashboard, sidebar e cartões para respeitar o tema claro
- [x] Validar contraste e consistência entre claro, escuro e sistema
- [x] Confirmar que a moeda global e os estados de status permanecem legíveis

## Menu com interação visual

- [x] Alinhar cada ícone diretamente ao lado do texto do menu
- [x] Criar retângulo arredondado para hover e item ativo
- [x] Validar menu nos temas claro e escuro e em larguras responsivas

## Idioma direto no menu

- [x] Adicionar troca de idioma diretamente no menu com bandeiras do Brasil e da Espanha
- [x] Remover o seletor de idioma da tela Perfil sem remover a preferência global
- [x] Validar persistência, temas, perfis e responsividade após a mudança

## Tema direto no menu

- [x] Adicionar controles compactos de Claro, Escuro e Sistema no menu
- [x] Remover o seletor de tema da tela Perfil sem remover a preferência global
- [x] Validar destaque ativo, persistência, idioma e responsividade após a mudança

## Exportação de relatórios

- [x] Criar exportação de todos os relatórios para planilha
- [x] Criar exportação de todos os relatórios para CSV
- [x] Criar exportação de todos os relatórios para PDF
- [x] Preservar filtros, moeda global, totais e permissões nos arquivos exportados
- [x] Validar download e compartilhamento em desktop e mobile

## Execução dos itens pendentes: idioma e exportações

- [x] Mover o seletor de idioma para o menu com bandeiras do Brasil e da Espanha
- [x] Remover o seletor duplicado de idioma do Perfil
- [x] Criar exportação dos relatórios em planilha, CSV e PDF
- [x] Aplicar exportação aos relatórios analítico, reembolso e manutenções
- [x] Preservar filtros, moeda, totais e permissões nos arquivos
- [x] Validar downloads em desktop e mobile

## Menus suspensos de idioma e tema

- [x] Criar acionador de idioma exibindo bandeira e idioma atual
- [x] Criar painel suspenso de Aparência com Sistema, Claro e Escuro
- [x] Criar indicador circular para a opção ativa e fechar o painel após seleção
- [x] Remover os controles compactos anteriores e validar desktop, mobile e temas

## Tradução efetiva PT/ES

- [x] Criar catálogo de traduções para Português e Espanhol
- [x] Fazer o menu e o dashboard reagirem ao idioma selecionado
- [x] Traduzir Minhas viagens, Nova solicitação, Aprovações, Operação e Perfil
- [ ] Traduzir Relatórios, Reembolso, Frota, Cadastros e detalhes
- [x] Validar troca para Español sem recarregar e persistência após navegação

## Recuperação do link de preview

- [x] Verificar o estado do servidor e do endereço atual
- [x] Recuperar ou gerar um novo link de preview funcional
- [x] Validar o acesso ao novo link em desktop

## Novo link de visualização

- [x] Verificar e ativar o servidor de desenvolvimento
- [x] Validar o preview web após a compilação
- [x] Entregar um link de acesso funcional

## Navegação por módulos

- [x] Criar entrada inicial para o módulo Viagens
- [x] Criar entrada inicial para o módulo Frota
- [x] Implementar submenus de Viagens com funcionalidades permitidas por perfil
- [x] Implementar submenus de Frota com funcionalidades administrativas
- [x] Preservar idioma, tema, moeda, rotas e responsividade

## Aprimoramentos da navegação modular

- [x] Criar submenu específico para Cadastros de Frota
- [x] Criar submenu específico para Ordens de Serviço
- [x] Persistir o último módulo expandido
- [x] Adicionar animação curta na abertura e fechamento dos submenus
- [x] Validar permissões, rotas, temas e responsividade

## Aprimoramentos de Frota e manutenção

- [x] Criar tela independente de Cadastros de Frota
- [x] Adicionar filtros avançados ao Histórico de manutenção
- [x] Animar o fechamento dos submenus
- [x] Validar permissões, rotas, filtros e responsividade

## Relatório de Faturamento restrito

- [x] Renomear o item Relatórios para Relatório de Faturamento
- [x] Exibir o item somente no perfil Administrativo
- [x] Validar menus, rota e tradução PT/ES nos três perfis


## Cadastros gerais compartilhados

- [x] Criar entrada explícita de Cadastros gerais para o perfil Administrativo
- [x] Organizar Unidade, Viajantes, Clientes e Tipos de gasto como cadastros compartilhados entre Viagens e Frota
- [x] Integrar a entrada de Cadastros gerais à navegação modular e ao shell de rotas externas
- [x] Traduzir e validar a nova navegação em PT/ES, desktop e smartphone
- [x] Validar que Viajante e Aprovador não recebam acesso administrativo aos cadastros gerais
- [x] Testar rotas, permissões e responsividade após a alteração

## Diagnóstico e simulação Docker com PostgreSQL

- [x] Inventariar a arquitetura atual, o banco configurado e os dados demonstrativos
- [x] Definir a arquitetura Docker para web, API e PostgreSQL
- [x] Preparar arquivos de simulação com schema, migrações e seed inicial
- [x] Executar smoke tests da aplicação e do banco em ambiente isolado
- [x] Documentar limitações, riscos de migração e instruções de execução
- [x] Salvar checkpoint da simulação após validação
