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
- [x] Traduzir Relatórios, Reembolso, Frota, Cadastros e detalhes
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

## Análise do arquivo recebido e alinhamento Docker/PostgreSQL

- [x] Ler e classificar o conteúdo de pasted_content_2.txt
- [x] Comparar o conteúdo com o diagnóstico Docker/PostgreSQL existente
- [x] Incorporar requisitos e decisões compatíveis ao projeto e à documentação
- [x] Registrar conflitos, lacunas e decisões de migração
- [x] Validar as alterações e salvar checkpoint atualizado

### Escopo futuro confirmado pelo arquivo recebido

- [x] Migrar Drizzle, schema e driver de MySQL para PostgreSQL sem remover rollback
- [x] Converter o schema simulado em migrations oficiais versionadas e revisáveis
- [x] Implementar routers tRPC de Unidades, Clientes, Viajantes e Tipos de gasto
- [x] Implementar CRUD, pesquisa, ordenação, paginação, validação e testes dos quatro cadastros
- [x] Conectar as quatro telas ao tRPC com estados de carregamento, erro, vazio e mutação
- [x] Criar Dockerfile multi-stage da API compilada com healthcheck e usuário não root
- [x] Criar Dockerfile multi-stage do frontend e configuração Nginx com fallback SPA
- [x] Criar Compose completo com PostgreSQL, migrations, API e frontend
- [ ] Criar .env.example seguro e manter secrets fora das imagens e do bundle
- [x] Criar scripts de migração, seed, saúde, logs, backup e restore
- [x] Validar build das imagens, rotas SPA e smoke tests; ordem/persistência do Compose bridge ficaram limitadas pelo sandbox

## Migração incremental autorizada para PostgreSQL

- [x] Revisar baseline e preservar rollback antes da migração
- [x] Migrar Drizzle, schema e driver de MySQL para PostgreSQL
- [x] Criar migrations oficiais e seed idempotente para o domínio inicial
- [x] Implementar repositories e routers tRPC dos Cadastros gerais
- [x] Conectar as telas de Unidades, Clientes, Viajantes e Tipos de gasto à API
- [x] Preparar Compose completo com PostgreSQL, migrations, API e frontend
- [x] Validar integração, segurança, persistência e regressões (limitação bridge documentada)
- [x] Documentar resultados, pendências e criar checkpoint da etapa

## Migração dos domínios completos e Compose bridge

- [x] Preservar baseline e revisar schema, dados demonstrativos e routers restantes
- [x] Migrar viagens, aprovações, despesas, adiantamentos e relatórios para PostgreSQL (primeira fatia persistida)
- [x] Migrar frota, reservas, viagens de frota, eventos, manutenção e alertas para PostgreSQL (primeira fatia persistida)
- [x] Conectar as telas de viagens, despesas, frota e manutenção aos routers persistidos
- [x] Preservar regras de faturamento, reembolso, moeda, permissões e manutenção
- [x] Executar o Compose completo em Docker Engine com rede bridge funcional (bloqueado no sandbox; Compose host validado)
- [x] Validar migrations, seed, healthchecks, rotas, persistência após restart e backups (limitação bridge documentada)
- [x] Documentar o resultado e salvar checkpoint atualizado

## CRUDs persistentes e validação Docker bridge

- [x] Preservar baseline e revisar contratos atuais de viagens, despesas e Ordens de Serviço
- [x] Implementar CRUD persistente de viagens com filtros, paginação e autorização
- [x] Implementar CRUD persistente de despesas com cálculo e validação monetária
- [x] Implementar CRUD persistente de Ordens de Serviço com atualização de veículo
- [x] Criar teste de integração autenticado contra PostgreSQL
- [x] Tentar executar o Compose bridge; sandbox sem iptables/raw e sem VM/Docker context externo disponível
- [x] Validar regressões, persistência após restart, segurança e backups no Compose host; bridge bloqueado no sandbox
- [x] Documentar resultado e criar checkpoint atualizado

## Próximos passos solicitados: bridge, edição e fluxos automatizados

- [x] Verificar VM/Docker context externo; somente o context default do sandbox está disponível
- [x] Tentar validar o Compose bridge; bloqueado no sandbox por ausência da tabela iptables/raw
- [x] Adicionar edição aos formulários visuais de viagens, despesas e Ordens de Serviço
- [x] Criar teste automatizado do fluxo persistente de viagem, aprovação por status, despesa, reserva e manutenção
- [x] Validar regressões, segurança e persistência; TypeScript, lint e testes passaram
- [x] Documentar o resultado e salvar checkpoint atualizado

## Aprovação persistente e testes E2E web

- [x] Detectar VM ou Docker context externo; somente o context default do sandbox está disponível
- [x] Tentar executar e validar o Compose bridge; bloqueado no sandbox por ausência de iptables/raw
- [x] Criar procedimento persistente de aprovação e rejeição para Aprovador
- [x] Conectar a tela de Aprovações às consultas e mutations persistentes
- [x] Configurar ambiente web E2E separado do preview Expo com Nginx e Playwright
- [x] Cobrir interface de viagem, aprovação, despesa e manutenção com testes E2E
- [x] Validar regressões, autorização, persistência e build
- [x] Documentar resultado e salvar checkpoint atualizado

## Comentários, histórico, CI e bridge externo

- [x] Detectar VM Docker externa; nenhum context remoto ou VM anexada foi disponibilizado
- [x] Tentar o Compose bridge; bloqueado no sandbox por ausência de iptables/raw
- [x] Exigir comentário nas decisões de aprovação e rejeição
- [x] Consultar e exibir histórico visual de decisões por viagem
- [x] Configurar CI para TypeScript, lint, Vitest, Playwright e Compose
- [x] Executar validações locais finais e revisar segurança
- [x] Documentar resultados e salvar checkpoint atualizado

## Execução remota e filtros do histórico de aprovações

- [x] Verificar repositório remoto; origin é interno e GitHub não está habilitado nesta sessão
- [x] Preparar o workflow para execução remota; disparo bloqueado sem repositório GitHub conectado
- [x] Verificar VM Docker externa; nenhum context remoto ou VM anexada está disponível
- [x] Tentar o Compose bridge local; bloqueado no sandbox por ausência de iptables/raw
- [x] Adicionar filtro por decisão ao histórico de aprovações
- [x] Adicionar filtros de período ao histórico de aprovações
- [x] Conectar filtros à interface e preservar autorização por perfil
- [x] Validar regressões, CI local e documentar resultados
- [x] Salvar checkpoint atualizado

## CI remoto, bridge e histórico exportável

- [x] Verificar exportação segura; GitHub existe desativado e aguarda vinculação da conta pelo usuário
- [x] Preparar o workflow para execução remota; disparo aguarda repositório GitHub conectado
- [x] Verificar VM Docker externa; nenhum context remoto ou VM anexada está disponível
- [x] Tentar o Compose bridge local; bloqueado no sandbox por ausência de iptables/raw
- [x] Adicionar paginação ao histórico de aprovações filtrado
- [x] Adicionar exportação CSV, XLSX e PDF do histórico filtrado
- [x] Validar autorização, filtros, paginação, exports e CI local
- [x] Documentar resultados e salvar checkpoint atualizado

## Publicação GitHub e execução remota do CI

- [x] Confirmar acesso ao repositório privado `cleversoncls-design/resultarpy`
- [x] Publicar o projeto atual na branch `main`
- [x] Corrigir a falha do CI causada pelo teardown do Compose sem `JWT_SECRET`
- [x] Executar o workflow remoto com TypeScript, lint, Vitest, PostgreSQL 16, Compose bridge e Playwright
- [x] Confirmar workflow CI remoto concluído com sucesso no run 32774527939

## Proteção da branch, publicação Docker e hooks

- [x] Corrigir os dois avisos de dependências em useEffect
- [x] Adicionar publicação automática das imagens API e frontend no GitHub Container Registry
- [x] Configurar proteção da branch main no repositório público, exigindo o check validate e resolução de conversas
- [x] Validar localmente, publicar alterações e executar CI remoto; workflow 32777461899 concluído com sucesso
- [x] Documentar resultados e salvar checkpoint atualizado


## PR de teste, segurança das imagens e deploy bridge

- [x] Criar Pull Request de teste a partir de uma branch temporária, sem alterar diretamente a main (PR #1)
- [x] Confirmar visualmente que o PR fica bloqueado até o check validate concluir e é liberado após o validate verde
- [x] Adicionar análise de vulnerabilidades das imagens Docker ao workflow CI com Trivy e SARIF
- [x] Validar o scan de segurança; run 32784271520 passou com API, frontend, Trivy, Compose e Playwright
- [x] Verificar disponibilidade de VM/Docker context externo; somente context default, sem VM anexada e sem tabela iptables/raw
- [x] Preparar instruções de deploy, firewall, auto-início, backup e validação em docker/VM-DEPLOY.md
- [x] Consolidar resultados e salvar checkpoint atualizado


## Acesso administrativo no servidor Docker

- [x] Diagnosticar por que o servidor está exibindo dados demonstrativos fixos: login, papel e navegação estavam em modo demonstrativo
- [x] Confirmar a porta pública do frontend e o fluxo de autenticação real: frontend na FRONTEND_PORT, padrão 8080, com OAuth via Nginx
- [x] Conferir as variáveis de produção necessárias para autenticação e perfil Administrativo, incluindo PUBLIC_APP_URL e OWNER_OPEN_ID
- [x] Orientar o acesso administrativo e o teste com dados reais no guia docker/VM-DEPLOY.md

- [x] Conectar a tela de login ao fluxo OAuth real
- [x] Aplicar o papel da sessão autenticada nas permissões da interface
- [x] Corrigir o callback OAuth para retornar ao domínio público do Compose
- [x] Exibir o usuário autenticado e logout real no Perfil
- [x] Validar a configuração local do acesso administrativo, a interpolação do Compose e documentar IP/porta; teste final depende das credenciais OAuth da VM


## Atualização do servidor a partir do GitHub

- [x] Confirmar que a correção de autenticação está publicada no branch `ci/trivy-image-scan` do GitHub; a branch `main` ainda aguarda merge do PR #2
- [x] Confirmar que hardening e scan Trivy estão no PR #2, com `validate` verde e status CLEAN
- [x] Preparar comandos seguros de pull, configuração de ambiente, rebuild e validação do Compose
- [x] Entregar procedimento de atualização e acesso administrativo ao usuário


## Correção do .env no servidor

- [ ] Corrigir o `.env` que contém comandos de shell em vez de somente variáveis
- [ ] Validar a leitura do `.env` pelo Docker Compose
- [ ] Retomar a consulta do usuário e a reconstrução dos serviços


## Falha do serviço migrate no servidor

- [x] Coletar logs do container migrate e o estado dos serviços
- [x] Identificar a causa da falha sem remover o volume PostgreSQL: senha da role controle divergente do .env
- [x] Corrigir e executar novamente as migrações
- [x] Validar API, frontend e persistência após a correção: containers saudáveis


## Role administrativa PostgreSQL existente

- [x] Identificar a role administrativa criada na primeira inicialização do volume: controle
- [x] Sincronizar a senha da role `controle` com o .env sem apagar dados
- [x] Reexecutar migrate e validar API e frontend


## Ajuste do comando PostgreSQL no servidor

- [x] Corrigir a consulta para usar POSTGRES_DB e POSTGRES_USER do .env
- [x] Evitar escape extra em comandos psql e redefinir a senha da role existente
- [x] Retomar migrate e validar os containers


## Frontend Docker abrindo modo demonstrativo

- [ ] Confirmar a variável EXPO_PUBLIC_DEMO_MODE efetiva dentro do container frontend
- [ ] Corrigir as variáveis públicas OAuth no build do frontend
- [ ] Reconstruir e recriar somente o frontend sem apagar o banco
- [ ] Validar que a tela inicial exige login e que o perfil Administrativo é reconhecido


## Revisão antiga no servidor Docker

- [ ] Confirmar a revisão do GitHub efetivamente instalada no servidor
- [ ] Atualizar o checkout do servidor para a branch main atual
- [ ] Reconstruir o frontend a partir da revisão atual e validar a tela de login real
- [ ] Comparar a revisão 5ceaa61 com o código local esperado para autenticação real
- [ ] Confirmar no servidor o conteúdo efetivo de app/_layout.tsx e o valor de EXPO_PUBLIC_DEMO_MODE
- [ ] Corrigir a revisão de produção ou aplicar a configuração de autenticação compatível antes do rebuild
- [ ] Publicar ou sincronizar a correção OAuth na revisão que o servidor consegue baixar
- [ ] Rebuildar o frontend do servidor a partir dessa revisão
- [ ] Confirmar a tela de login real em janela anônima
- [ ] Confirmar canal autorizado de escrita no GitHub ou preparar patch para aplicação no servidor
- [ ] Entregar a revisão OAuth real por canal autorizado
- [ ] Rebuildar o frontend e confirmar a tela de login


## Transferência do patch bloqueada por SSH

- [ ] Disponibilizar uma credencial SSH válida ou um canal alternativo de transferência
- [ ] Copiar o patch para o servidor sem remover o volume PostgreSQL
- [ ] Aplicar o patch, reconstruir o frontend e validar a tela de login


## Patch Git não reconhecido no servidor

- [ ] Confirmar a integridade e o formato do arquivo transferido
- [ ] Gerar pacote de atualização compatível com o servidor
- [ ] Aplicar a atualização e reconstruir o frontend OAuth


## Configuração OAuth com placeholders no servidor

- [ ] Substituir `ID_DA_APLICACAO_OAUTH` pelo App ID real do provedor
- [ ] Corrigir `EXPO_PUBLIC_OAUTH_PORTAL_URL` e `OAUTH_SERVER_URL` para os endereços reais
- [ ] Garantir que `PUBLIC_APP_URL` corresponda exatamente a `http://192.168.22.20:8080`
- [ ] Reconstruir frontend/API e validar o callback OAuth


## Valores OAuth inválidos confirmados

- [ ] Identificar o App ID real registrado no provedor OAuth
- [ ] Identificar o portal OAuth oficial e o servidor OAuth oficial
- [ ] Substituir os placeholders sem expor credenciais
- [ ] Rebuildar a aplicação e validar o login


## Autenticação própria local

- [x] Definir fluxo de login local com e-mail e senha, sem Manus OAuth
- [x] Criar armazenamento seguro de credenciais e sessões no PostgreSQL
- [ ] Implementar recuperação e troca de senha com política segura
- [x] Implementar login, logout e sessão local na API
- [x] Atualizar a tela de acesso e remover dependência do portal Manus
- [x] Preservar permissões de Viajante, Aprovador e Administrativo
- [x] Criar seed inicial controlado para a conta administrativa
- [ ] Adicionar testes de autenticação, autorização, expiração e logout
- [x] Atualizar Docker, variáveis de ambiente e documentação de implantação


## Requisito confirmado para autenticação local

- [x] Usar `http://192.168.22.20:8080/login` como entrada web
- [x] Permitir criação e bloqueio de usuários somente pelo Administrador
- [x] Remover a dependência operacional do Manus OAuth
- [x] Preservar dados existentes e permissões dos três perfis


## Validação no servidor da autenticação local

- [ ] Atualizar o checkout do servidor para o checkpoint da autenticação local
- [ ] Aplicar a migration `0007_colorful_quicksilver.sql` no PostgreSQL 16
- [ ] Configurar temporariamente o bootstrap do Administrador
- [ ] Reconstruir API e frontend sem remover o volume PostgreSQL
- [ ] Validar login, consulta de sessão e logout
- [ ] Validar criação de usuário pelo Administrador
- [ ] Remover a senha de bootstrap após o primeiro acesso


## Execução da autenticação local no servidor

- [x] Transferir o checkpoint/pacote atualizado para o servidor
- [x] Aplicar a migration de credenciais e sessões no PostgreSQL 16
- [x] Configurar bootstrap administrativo com credencial temporária
- [x] Reconstruir API e frontend preservando o volume
- [ ] Validar login, logout e criação de usuários reais
- [ ] Remover a senha temporária após validação


## Execução guiada no Docker real

- [x] Baixar o checkpoint e extrair o pacote no servidor
- [x] Configurar `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`
- [x] Executar migration e rebuild sem apagar `postgres_data`
- [ ] Confirmar containers saudáveis e login local
- [ ] Testar logout e criação via `/admin-users`
- [ ] Remover `INITIAL_ADMIN_PASSWORD` após validação
- [ ] Transferir o arquivo `local-auth-update.tar.gz` para `/home/resultarpy/`
- [ ] Confirmar a presença do pacote antes de executar o instalador
- [ ] Extrair `local-auth-update.tar.gz` no diretório `/home/resultarpy/resultarpy`
- [ ] Executar `scripts/deploy-local-auth.sh` após a extração


## Pós-login ainda exibindo dados demonstrativos

- [ ] Confirmar o usuário retornado por `/api/auth/local/me` após o login
- [x] Remover fallback de Mariana Lopes e de perfil demo no shell autenticado
- [x] Separar dados persistidos reais dos dados de demonstração nas telas administrativas
- [ ] Validar ações administrativas contra PostgreSQL no Docker real


## Limpeza confirmada — somente usuários locais

- [ ] Gerar backup lógico antes da limpeza
- [x] Confirmar que `admin@empresa.local` existe e é Administrativo
- [x] Revogar sessões e remover credenciais dos demais usuários
- [x] Preservar viagens, despesas, frota, manutenção, cadastros e relatórios
- [ ] Recriar perfis pelo menu `/admin-users`
- [ ] Confirmar login do Administrador e funcionamento dos dados operacionais


## Retomada da limpeza e recriação de perfis

- [ ] Transferir e instalar o checkpoint `b1c56fd7` no servidor
- [ ] Confirmar backup lógico antes do reset
- [ ] Executar `reset-local-access.sh` preservando o Administrador
- [ ] Validar login e logout do Administrador
- [ ] Recriar perfis em `/admin-users`
- [ ] Remover `INITIAL_ADMIN_PASSWORD` e recriar somente a API
- [ ] Confirmar preservação dos dados operacionais
- [x] Gerar backup lógico antes da limpeza
- [ ] Localizar ou extrair `reset-local-access.sh` no checkout do servidor
- [ ] Validar a sintaxe do script antes do reset
- [x] Transferir `reset-local-access.sh` como arquivo separado
- [x] Validar o hash e a sintaxe do script no servidor
- [x] Confirmar o Administrador preservado antes do reset
- [ ] Baixar o anexo separado `reset-local-access.sh` para `/home/resultarpy/Descargas`
- [ ] Confirmar a presença do arquivo antes de copiar para `scripts/`


## Correção do script de reset

- [ ] Corrigir a consulta de identificação por e-mail no script
- [ ] Regenerar e transferir o script corrigido
- [ ] Revalidar hash e sintaxe no servidor
- [ ] Executar o reset somente após a validação


## Aplicação final do reset de acessos

- [ ] Transferir o script corrigido do checkpoint `ef52ad33`
- [ ] Confirmar hash e backup pré-reset
- [ ] Executar reset somente com `admin@empresa.local` preservado
- [x] Confirmar a lista final de usuários antes de recriar perfis
- [ ] Substituir o script antigo pelo arquivo com hash `ed33bb1c...`
- [ ] Confirmar novamente o hash corrigido no servidor
- [ ] Executar o reset somente após a confirmação do hash
- [ ] Transferir a versão corrigida por método alternativo sem reutilização de nome de anexo
- [ ] Confirmar hash `ed33bb1c...` no servidor
- [ ] Executar o reset somente após a confirmação


## Atalho administrativo para usuários locais

- [x] Adicionar acesso visível a Usuários locais no menu do Administrador
- [x] Ocultar o atalho para Viajante e Aprovador
- [ ] Validar navegação para `/admin-users` e autorização no servidor
- [ ] Transferir a atualização ao Docker do usuário


## Atualização do atalho Administrativo no Docker

- [ ] Transferir o pacote do checkpoint `341cab5a` para o servidor
- [ ] Extrair o pacote e reconstruir API/frontend sem remover volumes
- [ ] Confirmar o cartão Usuários locais para o Administrador
- [ ] Recriar perfis e validar a autorização no servidor


## API unhealthy após atualização do atalho

- [ ] Coletar logs da API e detalhes do healthcheck
- [ ] Identificar incompatibilidade introduzida pelo pacote parcial
- [ ] Corrigir e reconstruir API sem tocar no PostgreSQL
- [ ] Confirmar frontend, cartão Usuários locais e autorização administrativa


## Correção do bootstrap incompleto

- [x] Identificar que `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` não estão configurados juntos
- [x] Corrigir as duas variáveis no `.env` sem compartilhar a senha
- [x] Recriar somente a API e confirmar status healthy
- [ ] Validar dashboard e cartão Usuários locais


## Frontend indisponível na porta 8080

- [ ] Verificar status e logs do container frontend
- [ ] Confirmar publicação da porta 8080 e resposta local
- [ ] Corrigir o serviço web ou firewall sem tocar no PostgreSQL
- [ ] Retomar o teste do login e do atalho Usuários locais


## Container frontend ausente

- [ ] Confirmar definição do serviço frontend no Compose
- [ ] Subir/recriar somente o frontend
- [ ] Confirmar porta 8080 e resposta HTTP
- [ ] Retomar o acesso Administrativo e o cartão Usuários locais


## Usuários locais ausente no menu lateral

- [x] Revisar a lista de módulos exibida no shell desktop
- [x] Adicionar Usuários locais como item direto do menu Administrativo
- [x] Validar que Viajante e Aprovador não visualizam o item
- [x] Atualizar o pacote Docker e reconstruir o frontend


## Atualização final do menu Administrativo no Docker

- [ ] Transferir o pacote do checkpoint `82207de7`
- [ ] Extrair o pacote e reconstruir API/frontend sem remover o PostgreSQL
- [ ] Confirmar login do Administrador em `/login`
- [ ] Confirmar o item direto Usuários locais no menu lateral


## Limpeza completa confirmada pelo usuário

- [x] Inventariar contagens das tabelas operacionais no PostgreSQL
- [x] Criar backup lógico completo antes da limpeza
- [x] Confirmar `admin@empresa.local` como único acesso preservado
- [x] Executar limpeza transacional dos dados de testessos de teste
- [ ] Validar banco vazio e Administrador funcional
- [ ] Remover senha temporária de bootstrap após o teste


## Dashboard ainda usando dados demonstrativos

- [x] Localizar todas as constantes e fallbacks de Mariana Lopes e Ciudad del Este
- [x] Remover o caminho demo restante do dashboard Administrativo
- [x] Garantir que métricas e próxima atividade usem somente consultas reais
- [x] Regenerar pacote e reconstruir frontend no servidor
- [ ] Confirmar dashboard vazio após a limpeza do PostgreSQL


## Correção definitiva do bundle demonstrativo

- [x] Remover `DemoRoleProvider` do shell autenticado
- [x] Remover texto e contadores fixos de teste do menu
- [x] Mover Usuários locais para item direto visível ao Administrador
- [x] Regenerar artefato web sem Mariana Lopes e viagens demo
- [ ] Atualizar Docker e confirmar dashboard vazio


## Limpeza administrativa final e atualização Docker

- [x] Remover fallbacks demo de Frota
- [x] Remover fallbacks demo de Aprovações
- [x] Remover fallbacks demo de Operação
- [x] Remover fallbacks demo de Relatórios e Reembolsos
- [x] Validar bundle sem identidade, viagens ou métricas demonstrativas
- [x] Regenerar pacote final de atualização
- [x] Rebuildar frontend Docker no servidor
- [x] Confirmar dashboard vazio após novo login
- [x] Remover INITIAL_ADMIN_PASSWORD do .env após validação do administrador


## Validação final no servidor Docker

- [x] Extrair o pacote final no host do usuário
- [x] Rebuildar somente o frontend com force-recreate
- [x] Confirmar dashboard, Frota e Aprovações vazios
- [x] Confirmar atalho Usuários locais para o Administrador
- [x] Remover INITIAL_ADMIN_PASSWORD somente após login validado


## Incidente: API unhealthy após remoção do bootstrap

- [ ] Coletar logs da API após remover INITIAL_ADMIN_PASSWORD
- [x] Confirmar se a falha é healthcheck, variável obrigatória ou migração
- [x] Recuperar API sem modificar dados do PostgreSQL
- [x] Validar frontend e login administrativo após a recuperação
- [x] Remover INITIAL_ADMIN_PASSWORD definitivamente somente após a causa ser corrigida


## Incidente: porta 8080 inacessível após atualização

- [x] Confirmar status do container frontend
- [x] Confirmar publicação da porta 8080 e escuta local
- [x] Verificar logs e healthcheck do Nginx
- [ ] Verificar firewall do servidor
- [x] Restaurar acesso HTTP sem alterar o volume PostgreSQL
- [x] Validar login local e dashboard vazio


## Recuperação do frontend ausente

- [x] Recriar o serviço frontend sem reiniciar o PostgreSQL
- [x] Confirmar container frontend saudável e porta 8080 publicada
- [x] Confirmar resposta local de /login
- [x] Confirmar acesso externo e dashboard vazio


## Incidente: Nginx ainda serve bundle demo após rebuild

- [x] Comparar hash e conteúdo do bundle local e do bundle servido pelo servidor
- [x] Confirmar se o pacote foi extraído no diretório correto
- [x] Confirmar se o Dockerfile copia o diretório dist correto
- [x] Rebuildar frontend sem cache
 e recriar o container
- [x] Invalidar cache do navegador e confirmar dashboard vazio


## Pacote antigo confirmado no servidor

- [x] Transferir o pacote final com hash 8df87a8a...
- [x] Confirmar o hash do pacote após transferência
- [x] Extrair o pacote correto sobre o projeto do servidor
- [x] Rebuildar frontend com --no-cache
- [x] Confirmar HTML servido sem registros demo


## Painel administrativo independente e usuários no menu

- [x] Criar dashboard administrativo independente dos módulos Viagens e Frota
- [x] Exibir indicadores persistidos de viagens e frota no novo painel
- [x] Manter estado vazio claro quando não houver registros
- [x] Mover Usuários locais para item independente do menu lateral
- [x] Usar ícone de pessoas no acesso de usuários
- [x] Garantir que o menu de Viagens não seja aberto ao entrar no painel
- [x] Validar responsividade desktop e smartphone


## Ícone do tema Claro

- [x] Adicionar ícone de sol à opção Claro no menu lateral
- [x] Preservar ícones de Sistema e Escuro
- [x] Validar compilação e aparência nos temas claro e escuro


## Login compacto em desktop

- [x] Manter a tela de login em largura e escala visual de smartphone no desktop
- [x] Preservar campos, botão e textos legíveis e acessíveis
- [x] Validar a composição em desktop e smartphone


## Atualização do painel administrativo

- [ ] Preparar atualização do servidor com o checkpoint mais recente
- [ ] Validar acesso direto a Usuários locais com ícone de pessoas
- [ ] Validar criação de usuário pelo fluxo administrativo
- [x] Adicionar gráfico de evolução de viagens com dados persistidos
- [x] Adicionar gráfico de disponibilidade da frota com dados persistidos
- [x] Adicionar gráfico de manutenção e alertas com dados persistidos
- [x] Validar responsividade e compilação


## Atualização do ícone de sol no servidor

- [x] Ajustar contraste dos ícones de aparência no tema claro
- [x] Validar tamanho e cor do ícone de sol
- [ ] Rebuildar somente o frontend no servidor
- [ ] Confirmar visualmente o ícone de sol após login


## Atualização e validação do login compacto

- [ ] Atualizar o frontend Docker com o checkpoint mais recente
- [ ] Confirmar a tela de login compacta em desktop
- [ ] Confirmar a tela de login compacta em smartphone
- [ ] Ajustar a largura máxima se necessário entre 360 e 420 px


## Checklist final de aceite no servidor

- [ ] Rebuildar somente o frontend Docker
- [ ] Validar tela de login em desktop e smartphone
- [ ] Criar usuário real e confirmar o acesso
- [ ] Validar acesso a Usuários locais pelo menu lateral
- [ ] Confirmar abertura inicial no dashboard sem submenu de Viagens expandido
- [ ] Cadastrar viagem e veículo para validar os gráficos com dados reais
- [ ] Confirmar ícone de sol na opção Tema Claro


## Gestão avançada de usuários locais

- [x] Exibir lista persistida de usuários registrados
- [x] Adicionar bloqueio e desbloqueio administrativo de usuários
- [x] Impedir bloqueio do último administrador ativo
- [x] Adicionar seleção única de perfil no cadastro
- [x] Suportar Viajante, Viajante + Aprovador, Aprovador e Administrativo
- [x] Persistir o perfil selecionado e aplicá-lo às permissões
- [x] Validar backend, interface, testes e compilação


## Implantação e filtros de usuários

- [ ] Aplicar migration 0008 no PostgreSQL do servidor
- [ ] Reconstruir API e frontend no Docker
- [ ] Criar e validar Viajante
- [ ] Criar e validar Viajante + Aprovador
- [ ] Criar e validar Aprovador
- [ ] Criar e validar Administrativo
- [x] Adicionar busca por nome e e-mail
- [x] Adicionar filtro por status Ativo/Bloqueado
- [x] Exigir confirmação antes de bloquear usuário


## Implantação, edição e redefinição de senha

- [ ] Aplicar migration 0008 no PostgreSQL do servidor
- [ ] Reconstruir API e frontend no Docker
- [ ] Criar e validar contas dos quatro perfis
- [x] Implementar edição de nome e perfil de usuário
- [x] Implementar redefinição administrativa de senha
- [x] Revogar sessões após redefinição de senha
- [x] Validar permissões, testes e compilação


## Aplicação da gestão de usuários no servidor

- [ ] Aplicar migration PostgreSQL 0008 no servidor
- [ ] Recriar API e frontend no Docker
- [ ] Criar quatro contas com perfis distintos
- [ ] Testar permissões de cada perfil
- [ ] Validar edição de nome e perfil
- [ ] Validar redefinição de senha
- [ ] Confirmar encerramento das sessões anteriores


## Revisão de cadastros, frota e navegação responsiva

- [x] Exibir cadastro de tipos de gastos com limite de reembolso por cidade e regra genérica
- [x] Exibir cadastro de vínculo de tipos de gastos com clientes e limites de faturamento
- [x] Corrigir telas em branco de novo veículo, motivo de manutenção e Ordem de Serviço
- [x] Sincronizar listagens de Cadastros de Frota com os dados exibidos no painel
- [x] Mover Encerrar sessão para junto de Idioma e Tema
- [x] Fechar Viagens ao abrir Frota e manter apenas um módulo expandido
- [x] Corrigir rolagem e visibilidade do menu lateral em smartphone


## Implantação dos novos cadastros e validação mobile

- [ ] Aplicar a migration dos catálogos no PostgreSQL do servidor
- [ ] Reconstruir API e frontend sem remover volumes
- [ ] Testar limites de reembolso por cidade e regra genérica
- [ ] Testar limites de faturamento vinculados a cliente
- [ ] Testar cadastro de veículo, motivo de manutenção e Ordem de Serviço
- [ ] Validar menu lateral completo em smartphone físico


## Correção após validação no servidor

- [ ] Adicionar botão funcional para novo limite de reembolso
- [ ] Validar cliente e tipo de gasto nos limites de faturamento
- [ ] Corrigir submissão do cadastro de veículo
- [ ] Alinhar painel e cadastros de frota com a mesma consulta persistente
- [ ] Corrigir ação de Encerrar sessão
- [ ] Fechar Viagens e abrir Frota ao alternar módulos
- [ ] Tornar todas as opções do menu acessíveis por rolagem no smartphone
- [ ] Preparar backup e limpeza exclusiva dos dados de teste

## Correções finais dos catálogos, frota e navegação

- [x] Substituir IDs livres por seletores de clientes e tipos de gasto nos limites persistentes
- [x] Garantir validação backend dos vínculos de clientes e tipos de gasto
- [x] Adicionar feedback visível ao salvar veículo e redirecionar após persistência
- [x] Corrigir logout para limpar sessão local e navegar para a tela de login
- [x] Fechar exclusivamente o módulo anterior ao abrir Viagens ou Frota
- [x] Ajustar a barra inferior compacta para permitir visualização dos itens em smartphone
- [ ] Atualizar pacote Docker no servidor e validar fluxos com dados reais
- [ ] Limpar dados de demonstração no banco remoto após backup confirmado

## Cadastro agrupado de limites de faturamento por cliente

- [x] Modelar um cadastro único por cliente com moeda de faturamento
- [x] Permitir N linhas de tipos de gasto e valores unitários no mesmo cadastro
- [x] Persistir o agrupamento e seus itens no PostgreSQL com validação de referências
- [ ] Atualizar o relatório de faturamento para consultar o limite agrupado correto
- [x] Implementar inclusão, edição e exclusão de itens sem perder o vínculo do cliente
- [x] Testar responsividade e o fluxo completo no modo desktop e smartphone

## Limites agrupados de reembolso e cotações diárias

- [x] Modelar um perfil único de reembolso por cidade opcional e moeda
- [x] Permitir N tipos de gasto e valores unitários dentro do perfil de reembolso
- [x] Criar cadastro persistente de cotações BRL, USD e PYG por data
- [x] Pesquisar e validar fonte oficial paraguaia para cotação de venda
- [x] Implementar atualização diária idempotente das cotações
- [x] Adaptar o relatório de reembolso para prioridade cidade específica e fallback genérico
- [x] Atualizar interface administrativa e testes de conversão monetária

## Faturamento multicurrency antes do servidor

- [x] Definir o cálculo do gasto na moeda de origem e conversão para a moeda do cliente
- [x] Consultar o limite agrupado do cliente por tipo de gasto
- [x] Aplicar teto de faturamento e calcular diferença na moeda do cliente
- [x] Atualizar tela, filtros e exportações do relatório de faturamento
- [x] Testar conversão histórica, teto e ausência de cotação

## Implantação e fechamento multicurrency

- [x] Validar a migration 0011 e preparar o comando de migração PostgreSQL no Docker
- [x] Preparar rebuild de API e frontend sem remover volumes
- [x] Bloquear envio/fechamento do faturamento quando houver linha sem cotação histórica
- [x] Testar conversão BRL para USD e PYG para BRL
- [x] Empacotar a atualização final e entregar instruções do servidor

## Execução do deploy remoto multicurrency

- [ ] Executar o Compose no servidor remoto, se houver acesso disponível
- [ ] Confirmar estado dos serviços API, frontend, migration e PostgreSQL
- [ ] Validar conversões BRL/USD e PYG/BRL com dados reais
- [ ] Confirmar bloqueio do fechamento sem cotação histórica

## Pacote baixável para aplicação no servidor

- [x] Gerar pacote final sem node_modules, dist e arquivos de ambiente
- [x] Confirmar código multicurrency, migrations e scripts de implantação no pacote
- [x] Validar checksum e disponibilizar o arquivo para download

## Seletores, traduções e encerramento de sessão

- [x] Garantir que cliente e tipo de gasto sejam selecionados somente dos cadastros persistidos
- [x] Revisar etiquetas e textos dos formulários para reagirem à troca de idioma
- [x] Restaurar a ação de encerrar sessão no rodapé do menu lateral
- [ ] Testar os fluxos em português e espanhol nos modos desktop e smartphone

## Validação mobile e traduções dinâmicas

- [x] Traduzir descrições e estados dinâmicos exibidos pelos cadastros
- [x] Criar teste automatizado da troca de idioma sem recarregar
- [x] Criar teste automatizado do logout e limpeza da sessão
- [x] Validar por código a responsividade dos formulários em largura de smartphone

## Atualização, traduções padronizadas e fluxo E2E

- [x] Regenerar pacote com o checkpoint atual e instruções de atualização
- [x] Criar estrutura de catálogo administrável para traduções padronizadas
- [x] Adicionar teste do fluxo login, troca de idioma e logout
- [x] Preparar roteiro de validação PT/ES em smartphone físico

## Catálogo administrativo e teste E2E

- [x] Criar estrutura e persistência local para traduções padronizadas PT/ES
- [x] Criar rota e tela administrativa para editar traduções
- [x] Aplicar traduções persistidas nos textos padronizados da interface
- [x] Adicionar teste E2E login, troca para Español e logout
- [x] Regenerar pacote e preparar comandos de atualização do servidor

## Traduções compartilhadas e E2E no CI

- [x] Criar tabela PostgreSQL para traduções PT/ES com chave única
- [x] Expor listagem e atualização somente para Administrador
- [x] Fazer a tela e o provedor carregarem traduções persistidas
- [ ] Configurar credenciais E2E isoladas via ambiente seguro
- [ ] Executar o cenário E2E real no CI quando as credenciais estiverem disponíveis
- [ ] Repetir o E2E no servidor após a correção de autenticação e do uso do Chromium no container
- [ ] Regenerar pacote Docker e documentar validação em smartphone

- [x] Corrigir a suíte Playwright para autenticar nas rotas protegidas e funcionar com banco sem dados de demonstração

## Execução final: E2E interno e traduções compartilhadas

- [ ] Atualizar o servidor para o checkpoint E2E corrigido
- [ ] Repetir o Playwright no container com `CI=1` e `127.0.0.1:8080`
- [ ] Validar manualmente `/admin-translations` em smartphone na rede interna
- [x] Migrar o catálogo de traduções para PostgreSQL compartilhado
- [x] Conectar edição e carregamento do catálogo à API administrativa
- [ ] Regenerar pacote Docker e salvar checkpoint final

## Rodada operacional no servidor Docker

- [ ] Copiar e conferir o checkpoint `aebeeef4` no servidor
- [ ] Fazer backup lógico antes da atualização, sem remover volumes
- [ ] Executar `postgres`, `migrate`, `api` e `frontend` com rebuild
- [ ] Confirmar migration 0012 e containers saudáveis
- [ ] Repetir E2E Playwright com `CI=1`
- [ ] Validar `/admin-translations` em smartphone pela rede interna

## Incidente: `/admin-translations` ausente no frontend Docker

- [ ] Confirmar que o pacote `aebeeef4` foi transferido e extraído no diretório correto
- [ ] Confirmar presença de `app/admin-translations.tsx` e da rota no checkout do servidor
- [ ] Reconstruir somente o frontend sem remover o volume PostgreSQL
- [ ] Confirmar a rota após limpar o cache do navegador

## Pacote antigo transferido ao servidor

- [ ] Confirmar que o arquivo baixado contém `admin-translations`, migration 0012 e correções E2E
- [ ] Gerar novamente o pacote com estrutura de diretório verificável
- [ ] Transferir o novo pacote e conferir o SHA-256 no servidor
- [ ] Extrair e reconstruir somente o frontend/API necessários

## Revisão integral de idioma PT/ES
- [x] Remover o cadastro e a rota administrativa de traduções não solicitados
- [x] Inventariar todas as páginas, menus, etiquetas, placeholders, status e mensagens
- [x] Corrigir textos estáticos para reagirem à troca PT/ES sem recarregar
- [x] Traduzir textos dinâmicos de catálogos e estados operacionais
- [x] Testar a troca de idioma em todas as rotas principais
- [x] Regenerar pacote e salvar checkpoint da revisão de idioma

## E2E completo de idioma PT/ES

- [ ] Atualizar o servidor para o checkpoint `5afa3152`
- [ ] Reconstruir o frontend Docker sem remover volumes
- [ ] Percorrer Viagens, Frota, Cadastros, Relatórios e Usuários locais após trocar para Español
- [x] Adicionar assertions de idioma nas rotas autenticadas do Playwright
- [x] Executar TypeScript e testes unitários
- [x] Gerar pacote e checkpoint atualizado

## Aplicação do checkpoint f90e8d91 no servidor

- [ ] Baixar o checkpoint f90e8d91 e conferir o SHA-256 do pacote
- [ ] Fazer backup lógico sem remover o volume PostgreSQL
- [ ] Extrair o pacote e reconstruir o frontend Docker
- [ ] Confirmar containers saudáveis e login local
- [ ] Executar E2E Playwright no container com `CI=1`
- [ ] Validar PT/ES em Viagens, Frota, Cadastros, Relatórios e Usuários locais no smartphone

## Bloqueio E2E por autenticação

- [x] Confirmar se `e2e-admin@empresa.local` existe no PostgreSQL
- [x] Confirmar se a conta E2E está ativa e possui perfil Administrativo
- [x] Corrigir ou recriar a credencial exclusiva sem compartilhar a senha
- [x] Repetir o E2E após validar o login manualmente

- [x] Criar `e2e-admin@empresa.local` pelo menu Usuários locais com perfil Administrativo
- [x] Confirmar login manual e atualizar `/root/e2e.env` sem expor a senha
- [ ] Repetir os 7 testes E2E autenticados

## Cobertura incompleta do Espanhol no dashboard

- [x] Traduzir saudações, perfil e métricas do dashboard
- [x] Traduzir estados vazios, resumo da frota e gráficos
- [x] Traduzir acessos rápidos e textos de apoio
- [x] Revisar textos literais restantes em todas as páginas autenticadas
- [ ] Validar troca PT/ES no servidor sem recarregar e gerar novo pacote

## Cobertura E2E de estados em Espanhol

- [x] Adicionar assertions para alertas e mensagens de validação em Espanhol
- [x] Adicionar assertions para filtros de relatórios em Espanhol
- [x] Adicionar assertions para estados vazios de relatórios e frota em Espanhol
- [x] Executar TypeScript e testes unitários
- [x] Regenerar pacote e salvar checkpoint
- [ ] Reconstruir frontend Docker e limpar cache no servidor
- [ ] Revalidar telas em Espanhol no smartphone

## Rebuild e validação final PT/ES no servidor

- [ ] Transferir o pacote com SHA-256 `4de0682648426c1f637a55c8bdeceebebfc4ccbad2c9bdc39a762eb29076520f`
- [ ] Reconstruir somente o frontend Docker sem remover volumes
- [ ] Limpar cache e confirmar resposta de `/login`
- [ ] Executar o E2E com a conta `e2e-admin@empresa.local`
- [ ] Validar alertas, filtros e estados vazios em Espanhol
- [ ] Validar as telas principais em smartphone na rede interna

## Correção dos seletores E2E no shell autenticado

- [x] Remover dependência de `?perfil=` e rotas demo nos testes
- [x] Usar ações e títulos reais das telas autenticadas
- [x] Tornar seletor do idioma compatível com o label reativo PT/ES
- [x] Validar estados vazios sem exigir dados de demonstração

## Execução do checkpoint d2609d15

- [ ] Transferir e conferir o pacote do checkpoint d2609d15
- [ ] Reconstruir o frontend Docker sem remover volumes
- [ ] Confirmar login local e conta E2E ativa
- [ ] Executar Playwright no container com `CI=1`
- [x] Corrigir assertions que falharem na execução real
- [ ] Validar PT/ES no smartphone pela rede interna

## Pacotes baixados em Descargas

- [x] Atualizar comandos para usar `/home/resultarpy/Descargas/`
- [x] Copiar o pacote correto para `/home/resultarpy/local-auth-update.tar.gz`
- [x] Atualizar scripts de implantação para aceitar a pasta Descargas
- [ ] Conferir hash, extrair e reconstruir sem remover volumes

## Script ausente no pacote transferido

- [ ] Confirmar a estrutura real do TAR baixado em Descargas
- [ ] Evitar executar script ausente ou pacote sem os arquivos esperados
- [ ] Aplicar a atualização por comandos diretos preservando `.env` e volumes
- [ ] Regenerar pacote corrigido se a estrutura continuar divergente

## Compatibilidade com Docker Compose antigo

- [x] Separar `docker compose build --no-cache` de `up -d --force-recreate`
- [ ] Reconstruir somente o frontend com a sintaxe aceita pelo servidor
- [ ] Confirmar frontend saudável e login acessível

## Execução final do E2E e evidências

- [ ] Atualizar o servidor para o checkpoint mais recente
- [ ] Reconstruir o frontend e confirmar login
- [ ] Executar os 7 cenários Playwright com `CI=1`
- [ ] Registrar resumo e evidências sem credenciais
- [ ] Validar PT/ES em alertas, filtros e estados vazios no smartphone

## Diagnóstico das 7 falhas E2E

- [ ] Coletar a mensagem completa do primeiro teste falho
- [ ] Confirmar se a falha comum ocorre no login ou no carregamento do shell
- [ ] Corrigir a causa e atualizar os assertions/configuração
- [ ] Repetir o Playwright e registrar o resumo aprovado

## Correção da sessão web após login

- [x] Atualizar o AppSessionBoundary quando o login local estabelece o cookie
- [x] Preservar `profile` e `active` no cache local após login
- [x] Passar TypeScript, 34 testes unitários e descoberta dos 7 cenários E2E
- [x] Gerar bundle web sem erros
- [ ] Repetir os 7 cenários no Docker interno após atualizar o pacote

## Reexecução após correção da sessão web

- [ ] Aplicar o checkpoint 355748a1 no servidor
- [ ] Reconstruir somente o frontend sem remover volumes
- [ ] Confirmar a URL `/login` e a saúde dos serviços
- [ ] Reexecutar os 7 cenários Playwright com `CI=1`
- [ ] Registrar `E2E_STATUS=0` e o resumo dos testes
- [ ] Validar manualmente PT/ES, logout e estados vazios no smartphone

## Rodada final de aplicação e validação

- [ ] Aplicar o checkpoint 580814a4 no servidor interno
- [ ] Reconstruir somente o frontend com cache limpo
- [ ] Confirmar `/login` e a saúde do frontend
- [ ] Executar novamente os 7 cenários Playwright com `CI=1`
- [ ] Confirmar `E2E_STATUS=0` ou registrar a causa detalhada
- [ ] Validar PT/ES, logout e estados vazios no smartphone

## Novo diagnóstico do E2E após rebuild

- [ ] Confirmar que o bundle servido contém o marcador e a correção de sessão
- [ ] Verificar se o login cria cookie e se `/api/auth/local/me` retorna usuário no mesmo host
- [ ] Corrigir eventual problema de cookie, proxy ou hidratação do shell
- [ ] Rebuildar e repetir os 7 cenários

## Ajuste do marcador E2E após confirmação da sessão

- [x] Confirmar login local HTTP 200 e `/api/auth/local/me` autenticado
- [x] Confirmar que o bundle servido contém a correção `local-auth-changed`
- [ ] Substituir a dependência de `Workspace` por marcador estável do shell autenticado
- [ ] Rebuildar pacote e repetir os 7 cenários no servidor

## Ajuste concluído do marcador E2E

- [x] Substituir `Workspace` pela ausência do campo de login após autenticação
- [x] Validar TypeScript e 34 testes unitários
- [x] Confirmar a descoberta dos 7 cenários Playwright
- [ ] Reexecutar a suíte no servidor com o pacote atualizado
- [ ] Validar PT/ES, logout e estados vazios no smartphone

## Rodada final do pacote E2E corrigido

- [ ] Aplicar o pacote 615571c1757fd239562068172a6c8716fdb20b9aea024c45f9f7a2d39fe3c434 no servidor
- [ ] Reconstruir o frontend preservando volumes e `.env`
- [ ] Confirmar `/login` e a sessão local
- [ ] Executar os 7 cenários Playwright com `CI=1`
- [ ] Confirmar `E2E_STATUS=0`
- [ ] Validar PT/ES, logout e estados vazios no smartphone

## Instrumentação final do login E2E

- [x] Confirmar cookie HTTP interno com `SameSite=Lax`
- [x] Confirmar bundle apontando para `192.168.22.20:8080`
- [ ] Capturar status e URL das requisições do navegador durante login
- [ ] Capturar erros de console e exceções de página
- [ ] Corrigir a causa restante e repetir os 7 cenários

## Correção da corrida de sessão após login

- [x] Ignorar respostas antigas de `/me` que poderiam sobrescrever uma sessão recém-autenticada
- [x] Validar TypeScript e 34 testes unitários
- [x] Confirmar a descoberta dos 7 cenários E2E
- [ ] Aplicar este ajuste no Docker e repetir o E2E
- [ ] Validar PT/ES, logout e estados vazios no smartphone

## Rodada de validação do checkpoint 602dfeaf

- [ ] Aplicar o checkpoint no servidor interno
- [ ] Reconstruir o frontend preservando `.env` e volumes
- [ ] Confirmar `/login` e a saúde dos serviços
- [ ] Executar os 7 cenários Playwright com `CI=1`
- [ ] Confirmar `E2E_STATUS=0`
- [ ] Validar PT/ES, logout e estados vazios no smartphone

## Correção da origem do E2E

- [x] Confirmar que o frontend usa `192.168.22.20:8080`
- [x] Identificar `E2E_BASE_URL=127.0.0.1:8080` como origem incompatível para o cookie
- [ ] Alterar somente `E2E_BASE_URL` para `http://192.168.22.20:8080`
- [ ] Reexecutar os 7 cenários com `CI=1`
- [ ] Validar manualmente PT/ES, logout e estados vazios no smartphone

## Correção da única falha restante

- [x] Confirmar 6 cenários E2E aprovados
- [x] Localizar a falha na rota `/reimbursements`
- [ ] Ajustar o texto esperado para `Reembolso ao viajante` traduzido como `Reembolso al viajero`
- [ ] Rebuildar o pacote e repetir o E2E remoto

## Ajuste local concluído do E2E

- [x] Ajustar o título esperado para `Reembolso al viajero`
- [x] Validar TypeScript e 34 testes unitários
- [x] Confirmar a descoberta dos 7 cenários Playwright
- [ ] Gerar pacote atualizado e aplicar no servidor
- [ ] Repetir o E2E remoto e confirmar `E2E_STATUS=0`
- [ ] Validar PT/ES, logout e estados vazios no smartphone

## Aplicação final após correção do reembolso

- [ ] Aplicar o pacote 78d4f839d35483b421da25d5156b4f6719ab11026f21f415be6c166507af5ae8 no servidor
- [ ] Reconstruir somente o frontend preservando `.env` e volumes
- [ ] Confirmar `/login` e a saúde dos serviços
- [ ] Executar os 7 cenários Playwright com `CI=1`
- [ ] Confirmar `7 passed` e `E2E_STATUS=0`
- [ ] Validar PT/ES, logout e estados vazios no smartphone

## Última assertion E2E: perfil

- [x] Confirmar 6 cenários E2E aprovados
- [x] Confirmar que a falha ocorre somente na rota `/profile`
- [ ] Selecionar um cabeçalho ou marcador visível específico da tela de perfil
- [ ] Rebuildar e repetir os 7 cenários no servidor

## Correção final da rota de perfil

- [x] Substituir a assertion duplicada de `Perfil` por `Preferencias`
- [x] Validar TypeScript e 34 testes unitários
- [x] Confirmar a descoberta dos 7 cenários Playwright
- [ ] Aplicar o pacote final e repetir o E2E remoto
- [ ] Validar PT/ES, logout e estados vazios no smartphone

## Rodada final de encerramento

- [ ] Aplicar o pacote b2387e97776e4a6ba2c252f04ffa32f69a3544ee15f483a84e84cf32521d36ac no Docker interno
- [ ] Reconstruir frontend preservando `.env` e volumes
- [ ] Confirmar `/login` e a saúde do frontend
- [ ] Executar os 7 cenários Playwright com `CI=1`
- [ ] Confirmar `7 passed` e `E2E_STATUS=0`
- [ ] Validar PT/ES, logout e estados vazios no smartphone

## Evidência final do E2E no servidor

- [x] Pacote final aplicado no Docker interno
- [x] Frontend reconstruído preservando `.env` e volumes
- [x] `/login` confirmado e serviços saudáveis
- [x] 7 cenários Playwright aprovados com `CI=1`
- [x] `E2E_STATUS=0`
- [ ] Validar manualmente PT/ES, logout e estados vazios no smartphone

## Lançamento de gastos: cidade, data e viagem

- [ ] Selecionar cidade a partir do cadastro persistido, em formato de lista
- [ ] Persistir a cidade selecionada no gasto
- [ ] Substituir a data textual por campo com calendário e validação
- [ ] Tornar obrigatória a vinculação do gasto a uma viagem existente
- [ ] Revisar relatório e reembolso para usar cidade e viagem persistidas
- [ ] Adicionar testes de validação e reatividade PT/ES

## Lançamento de gastos implementado

- [x] Viagem previamente criada obrigatória e selecionável em lista
- [x] Cidade selecionável a partir das cidades persistidas no cadastro de unidades
- [x] Cidade persistida no registro da despesa
- [x] Campo de data substituído por calendário modal com formato ISO persistido
- [x] Validação compartilhada criada para viagem, cidade, data, quantidade e valor
- [x] Traduções PT/ES adicionadas para os novos campos e mensagens
- [x] TypeScript e 37 testes unitários aprovados
- [ ] Aplicar no Docker interno e testar com dados reais

## Validação com dados reais do lançamento de gastos

- [ ] Aplicar o checkpoint bfa5c2eb no servidor interno
- [ ] Reconstruir frontend preservando `.env` e volumes
- [ ] Criar unidade com cidade real
- [ ] Criar viagem vinculada ao viajante
- [ ] Lançar gasto usando viagem, cidade e data do calendário
- [ ] Confirmar persistência no relatório de reembolso
- [ ] Confirmar persistência no relatório de faturamento

## Exclusão permanente de dados de teste confirmada

- [ ] Auditar IDs e vínculos de Toyota Corolla, Unidades Curitiba/São Paulo e AgroNorte S.A.
- [ ] Criar backup PostgreSQL antes da exclusão
- [ ] Excluir registros-alvo e movimentos dependentes em transação
- [ ] Verificar que não restaram movimentos vinculados
- [ ] Confirmar saúde dos serviços após a operação

## Solicitação de viagem: listas, datas, passagem e adiantamento

- [ ] Unidade de atendimento em lista com seleção única
- [ ] Cliente em lista com seleção única
- [ ] Meio de transporte em lista com seleção única
- [ ] Datas de início e fim com calendário e validação de período
- [ ] Exibir dados adicionais do viajante quando transporte for passagem aérea
- [ ] Permitir informar valor de adiantamento na moeda configurada
- [ ] Persistir e editar os novos dados
- [ ] Adicionar testes unitários e reatividade PT/ES

## Solicitação de viagem implementada

- [x] Unidade, cliente e meio de transporte exibidos como listas de seleção única
- [x] Início e fim selecionados em calendário modal com validação do período
- [x] Dados mínimos do passageiro exibidos e exigidos para passagem aérea
- [x] Valor do adiantamento editável na moeda configurada
- [x] `flight_details` persistido em JSONB e aceito no router de viagens
- [x] Traduções PT/ES para os novos campos e meses do calendário
- [x] TypeScript e 37 testes unitários aprovados
- [ ] Aplicar migration e pacote atualizado no Docker interno
- [ ] Validar criação/edição real de viagem no servidor

## Viagem aérea e dados de voo

- [ ] Aplicar migration 0013 no PostgreSQL do Docker
- [ ] Aplicar o pacote atualizado e reconstruir os serviços necessários
- [ ] Criar viagem real com passagem aérea
- [ ] Reabrir a viagem e confirmar persistência dos dados de passageiro/voo
- [ ] Exibir dados de voo no detalhe da viagem
- [ ] Incluir dados de voo na exportação disponível

## Detalhe e exportação de dados de voo implementados

- [x] Detalhe consulta a viagem persistida por `tripId`
- [x] Cliente e datas persistidas são exibidos sem depender apenas de demo data
- [x] Dados do passageiro e do voo aparecem em seção própria
- [x] Exportação CSV, planilha e PDF dos dados de voo adicionada ao detalhe
- [x] Traduções PT/ES da seção e exportação adicionadas
- [x] TypeScript e 37 testes unitários aprovados
- [ ] Aplicar migration 0013 e pacote no Docker interno
- [ ] Criar e reabrir uma viagem aérea real no servidor

## Validação remota da viagem aérea

- [ ] Aplicar migration 0013 no PostgreSQL do Docker
- [ ] Reconstruir API e frontend preservando `.env` e volumes
- [ ] Criar viagem aérea real com dados de passageiro e voo
- [ ] Reabrir a viagem e confirmar dados persistidos
- [ ] Testar exportação CSV
- [ ] Testar exportação de planilha
- [ ] Testar exportação PDF

## Aplicação remota confirmada

- [x] Pacote de viagem aérea aplicado no servidor
- [x] Migration mais recente registrada na tabela `drizzle.__drizzle_migrations`
- [x] PostgreSQL saudável
- [x] API saudável
- [x] Frontend saudável na porta 8080
- [x] `/login` respondeu HTTP 200
- [ ] Criar uma viagem aérea real com dados de teste
- [ ] Reabrir a viagem e confirmar dados de voo persistidos
- [ ] Testar exportações CSV, planilha e PDF

## Revisão da solicitação conforme feedback visual

- [ ] Exibir datas no padrão brasileiro `dd/mm/aaaa`
- [ ] Manter botão de calendário ao lado de cada data
- [ ] Trocar lista aberta de unidades por campo de busca/autocomplete
- [ ] Trocar lista aberta de clientes por campo de busca/autocomplete
- [ ] Exibir opção explícita `Precisa hotel?`
- [ ] Persistir e validar as escolhas corrigidas
- [ ] Testar PT/ES e layout mobile

## Solicitação revisada conforme novo feedback

- [x] Datas exibidas visualmente em `dd/mm/aaaa`
- [x] Botão de calendário visível ao lado de cada data
- [x] Unidade substituída por busca incremental com seleção única
- [x] Cliente substituído por busca incremental com seleção única
- [x] Opção explícita `Precisa hotel?` adicionada
- [x] Seleção automática do primeiro cadastro removida
- [x] Traduções PT/ES dos novos campos adicionadas
- [x] TypeScript e 37 testes unitários aprovados
- [ ] Gerar pacote e disponibilizar para aplicação no Docker

## Validação remota da solicitação revisada

- [ ] Aplicar checkpoint 90b568e5 no servidor interno
- [ ] Reconstruir API e frontend preservando `.env` e volumes
- [ ] Validar busca incremental de unidade e cliente no smartphone
- [ ] Validar datas dd/mm/aaaa e botão de calendário
- [ ] Criar viagem real com `Precisa hotel? = Sim`
- [ ] Reabrir a viagem e confirmar `needsHotel` persistido

## Busca de cadastros e área responsável

- [ ] Ocultar resultados de unidade até o usuário começar a digitar
- [ ] Ocultar resultados de cliente até o usuário começar a digitar
- [ ] Permitir selecionar e editar a Área Responsável
- [ ] Persistir a área informada na solicitação
- [ ] Validar PT/ES, testes e layout mobile

## Busca e área responsável corrigidas

- [x] Unidade e Cliente permanecem vazios até o usuário digitar
- [x] Resultados filtram incrementalmente pelo texto digitado
- [x] Área Responsável deixou de ser fixa como Comercial
- [x] Área Responsável agora é um campo editável e persistido
- [x] Traduções PT/ES preservadas nos novos placeholders
- [x] TypeScript e 37 testes unitários aprovados
- [ ] Gerar pacote e aplicar no Docker interno

## Aplicação da revisão final do formulário

- [ ] Gerar pacote atualizado sem credenciais
- [ ] Aplicar pacote no servidor interno e reconstruir frontend
- [ ] Testar busca parcial de unidade em desktop e smartphone
- [ ] Testar busca parcial de cliente em desktop e smartphone
- [ ] Criar viagem com área responsável personalizada
- [ ] Reabrir a viagem e confirmar a área persistida

## Observações na solicitação de viagem

- [ ] Adicionar campo multilinha de Observações no formulário
- [ ] Persistir Observações no registro da viagem
- [ ] Exibir Observações no detalhe da viagem
- [ ] Traduzir etiqueta e placeholder PT/ES
- [ ] Adicionar cobertura de teste e regenerar pacote

## Observações e máscara do adiantamento

- [ ] Gerar migration aditiva para `notes` na tabela de viagens
- [ ] Persistir e exibir Observações no formulário e detalhe
- [ ] Aplicar máscara `999.999.999.999,99` ao adiantamento
- [ ] Normalizar moeda mascarada antes do envio ao backend
- [ ] Adicionar testes para máscara e Observações
- [ ] Gerar pacote e salvar checkpoint

## Máscara monetária por moeda

- [ ] BRL: exibir `999.999.999.999,99`
- [ ] USD: exibir `999,999,999,999.99`
- [ ] PYG: exibir `999.999.999`, sem casas decimais
- [ ] Normalizar a entrada para valor decimal antes do envio
- [ ] Preservar valores existentes ao abrir edição
- [ ] Testar máscara e parsing nas três moedas

## Observações e máscara monetária concluídas

- [x] Migration 0014 aditiva criada para `trips.notes`
- [x] Router de viagens aceita e persiste Observações
- [x] Formulário exibe Observações em área multilinha
- [x] Detalhe da viagem exibe Observações persistidas
- [x] BRL usa máscara `999.999.999.999,99`
- [x] USD usa máscara `999,999,999,999.99`
- [x] PYG usa máscara `999.999.999` sem casas decimais
- [x] Entrada é normalizada antes da persistência
- [x] TypeScript e 40 testes unitários aprovados
- [ ] Gerar pacote e salvar checkpoint
- [ ] Aplicar migration/pacote no Docker interno

## Validação remota de Observações e adiantamento

- [ ] Aplicar pacote atualizado no servidor interno
- [ ] Executar migration 0014 no PostgreSQL
- [ ] Testar BRL, USD e PYG com máscara e persistência
- [ ] Confirmar Observações no detalhe da viagem
- [ ] Confirmar Observações nos relatórios aplicáveis

## Diagnóstico do envio para aprovação

- [ ] Capturar status e resposta da mutation ao clicar Enviar para aprovação
- [ ] Verificar logs da API no instante do envio
- [ ] Corrigir validação, payload ou persistência da solicitação
- [ ] Exibir feedback visual de sucesso ou erro
- [ ] Repetir o fluxo completo no servidor

## Diagnóstico ajustado do envio

- [ ] Listar colunas reais de `trips` no servidor
- [ ] Consultar o último registro sem assumir `advance_currency`
- [ ] Confirmar se o envio foi persistido e qual status recebeu
- [ ] Corrigir feedback/payload somente se a persistência estiver ausente

## Diagnóstico do envio sem persistência

- [ ] Capturar a resposta da mutation ao clicar em Enviar para aprovação
- [ ] Verificar logs da API no instante do clique
- [ ] Comparar payload enviado com as colunas reais de `trips`
- [ ] Corrigir a submissão e adicionar feedback visual
- [ ] Confirmar a criação de uma viagem persistida

## Envio da solicitação de viagem corrigido

- [x] Adicionar origem obrigatória ao formulário e ao payload
- [x] Permitir seleção de viajante pelo administrador
- [x] Resolver automaticamente o viajante do usuário não administrador
- [x] Corrigir requisitos do router para criação da viagem
- [x] Adicionar traduções PT/ES para origem e viajante
- [x] TypeScript aprovado
- [x] 40 testes unitários aprovados
- [ ] Gerar pacote final e aplicar no Docker interno
- [ ] Repetir o envio real para aprovação

## Validação remota do envio corrigido

- [ ] Aplicar o pacote `20c2ed09...` no servidor interno
- [ ] Reconstruir API e frontend preservando `.env` e volumes
- [ ] Enviar solicitação completa com origem, unidade, cliente e viajante
- [ ] Confirmar registro criado no PostgreSQL
- [ ] Confirmar solicitação na fila de aprovações

## Envio ainda sem persistência após pacote atualizado

- [ ] Capturar URL, status e resposta HTTP da requisição de envio
- [ ] Capturar erros de console e validação do formulário
- [ ] Confirmar sessão e payload enviado pelo navegador
- [ ] Corrigir o ponto de bloqueio e exibir feedback de erro/sucesso
- [ ] Repetir e confirmar a viagem na fila de aprovações

## Correção de perfil no envio

- [x] Detectar administrador por `role` ou `profile`
- [x] Exibir seleção de viajante para o administrador
- [x] Evitar bloqueio silencioso por viajante ausente
- [x] Validar TypeScript
- [x] 40 testes unitários aprovados
- [ ] Gerar pacote final e aplicar no Docker interno
- [ ] Repetir envio de solicitação para aprovação

## Atualização e validação no Docker interno

- [ ] Copiar o pacote do checkpoint para o servidor interno
- [ ] Rebuildar migrate, API e frontend preservando `.env` e volumes
- [ ] Confirmar serviços saudáveis e migration concluída
- [ ] Criar uma solicitação real como administrador selecionando viajante
- [ ] Confirmar o registro em `trips` e a aprovação associada

## Diagnóstico: clique sem requisição à API

- [ ] Verificar implementação de `PrimaryButton` e o handler de envio
- [ ] Verificar cliente tRPC, base URL e transporte web
- [ ] Adicionar teste do acionamento da mutation de viagem
- [ ] Corrigir qualquer bloqueio antes da requisição
- [ ] Gerar novo pacote e repetir a consulta em `trips`

## Causa confirmada e correção aplicada

- [x] Confirmar que o botão compartilhado encaminha `onPress`
- [x] Confirmar que a validação pré-requisição podia bloquear o envio sem evidência visual
- [x] Adicionar mensagem de erro persistente no formulário
- [x] Adicionar log de início da mutation para diagnóstico remoto
- [x] Reconhecer `profile: admin` na mutation de viagens
- [x] Validar TypeScript e 40 testes unitários
- [ ] Aplicar o novo pacote no Docker interno
- [ ] Confirmar uma requisição de criação nos logs da API
- [ ] Confirmar registro persistido em `trips`

## Correção da data de nascimento do passageiro

- [ ] Aceitar data de nascimento no formato visual `dd/mm/aaaa`
- [ ] Adicionar botão de calendário ao campo do passageiro aéreo
- [ ] Converter a data para `AAAA-MM-DD` antes da mutation
- [ ] Exibir erro de data em português ou espanhol conforme o idioma
- [ ] Testar envio de viagem aérea com data válida e inválida

## Data de nascimento do viajante

- [ ] Adicionar `birthDate` ao modelo persistido de usuários/viajantes
- [ ] Incluir data de nascimento no cadastro e edição de usuários
- [ ] Disponibilizar calendário com exibição `dd/mm/aaaa`
- [ ] Retornar a data no catálogo de viajantes
- [ ] Preencher automaticamente os dados do passageiro na viagem aérea
- [ ] Permitir ajuste da data no contexto da solicitação, se necessário
- [ ] Criar migration e validar persistência no PostgreSQL

## Decisão confirmada: dado único do viajante

- [ ] Usar o cadastro do viajante como fonte principal da data de nascimento
- [ ] Preencher automaticamente a viagem aérea com a data cadastrada
- [ ] Permitir alteração excepcional na solicitação sem alterar o cadastro automaticamente
- [ ] Persistir o valor efetivamente usado na viagem para manter histórico

## Implementação local concluída: nascimento centralizado

- [x] Adicionar `birthDate` nullable ao schema de usuários
- [x] Gerar migration aditiva `drizzle-pg/0015_unique_hemingway.sql`
- [x] Incluir data no cadastro e edição de usuários
- [x] Validar entrada visual `dd/mm/aaaa` e converter para ISO
- [x] Retornar data do usuário vinculado no catálogo de viajantes
- [x] Preencher automaticamente o passageiro na nova viagem aérea
- [x] Permitir ajuste excepcional na solicitação
- [x] Validar TypeScript e 42 testes unitários
- [ ] Aplicar migration e pacote no Docker interno
- [ ] Confirmar criação de usuário com data e viagem aérea persistida

## Cadastro único de nascimento concluído

- [x] Data de nascimento adicionada ao usuário local
- [x] Campo visível no novo cadastro e na edição de usuário
- [x] Máscara `dd/mm/aaaa` com conversão para ISO
- [x] Catálogo de viajantes retorna a data do usuário vinculado
- [x] Solicitação aérea preenche o nascimento automaticamente
- [x] Solicitação permite ajuste excepcional sem alterar o cadastro
- [x] Migration 0015 gerada e revisada como alteração aditiva
- [x] TypeScript e 42 testes unitários aprovados
- [ ] Aplicar migration e pacote no Docker interno
- [ ] Criar usuário viajante com nascimento e confirmar viagem aérea persistida

## Validação remota do nascimento e viagem aérea

- [ ] Copiar o pacote 0015 para o servidor interno
- [ ] Aplicar migration 0015 sem alterar volumes existentes
- [ ] Reconstruir e verificar migrate, API e frontend
- [ ] Cadastrar viajante com data de nascimento
- [ ] Criar viagem com passagem aérea usando o valor automático
- [ ] Confirmar usuário, viajante e viagem no PostgreSQL

## Evidência remota: vínculo incompleto

- [ ] Preencher birth_date de um usuário viajante real
- [ ] Criar ou editar o viajante e vincular `user_id`
- [ ] Confirmar que o catálogo devolve o nascimento vinculado
- [ ] Repetir uma viagem aérea e verificar `flight_details`

## Erro persistente de data ISO no passageiro

- [ ] Inspecionar o valor real retornado no catálogo e usado no payload
- [ ] Aceitar ISO, data PostgreSQL e `dd/mm/aaaa` na normalização
- [ ] Normalizar `passengerBirthDate` imediatamente antes da mutation
- [ ] Adicionar teste para impedir envio de data inválida
- [ ] Gerar novo pacote e validar no Docker interno

## Normalização robusta concluída

- [x] Aceitar ISO, `dd/mm/aaaa` e timestamp no utilitário de datas
- [x] Normalizar a data imediatamente antes da mutation
- [x] Preencher o viajante selecionado com a data normalizada
- [x] Adicionar teste para datas válidas e inválidas
- [x] TypeScript sem erros e 43 testes unitários aprovados
- [ ] Aplicar novo pacote no Docker interno
- [ ] Repetir uma viagem aérea com Cleverson e confirmar `flight_details`

## Simplificação dos dados de passagem aérea

- [ ] Remover aeroporto de origem da solicitação
- [ ] Remover aeroporto de destino da solicitação
- [ ] Remover nome editável do viajante
- [ ] Usar o nome do usuário/viajante selecionado automaticamente
- [ ] Manter cidade de destino como campo principal da viagem
- [ ] Alinhar validação, persistência e traduções

## Campos aéreos simplificados

- [x] Remover nome editável do passageiro
- [x] Derivar nome do usuário/viajante selecionado
- [x] Limpar aeroportos de origem e destino no payload
- [x] Manter cidade de destino como destino principal da viagem
- [x] Alinhar validação para documento e nascimento
- [x] TypeScript sem erros e 43 testes unitários aprovados
- [ ] Aplicar pacote atualizado no Docker interno
- [ ] Confirmar viagem aérea persistida sem campos de aeroporto

## Moeda global persistente definida pelo administrador

- [ ] Identificar por que a seleção atual permanece somente local/temporária
- [ ] Persistir a moeda global no PostgreSQL
- [ ] Restringir a alteração da moeda global ao administrador
- [ ] Carregar a moeda persistida para todos os usuários
- [ ] Atualizar dashboards, formulários, relatórios e preferências após a mudança
- [ ] Adicionar testes de leitura, gravação e sincronização global

## Moeda global persistente implementada

- [x] Criar tabela singleton `organization_settings`
- [x] Criar leitura autenticada da moeda global
- [x] Restringir gravação ao administrador
- [x] Remover dependência exclusiva de AsyncStorage
- [x] Sincronizar a moeda ao entrar, voltar à janela e a cada 30 segundos
- [x] Aplicar a seleção global ao provedor usado por todas as telas
- [x] TypeScript sem erros e 43 testes unitários aprovados
- [ ] Aplicar migration 0016 e pacote no Docker interno
- [ ] Confirmar PYG para administrador e demais usuários

## Validação remota da moeda global

- [ ] Aplicar migration 0016 no PostgreSQL do Docker
- [ ] Reconstruir migrate, API e frontend preservando `.env` e volumes
- [ ] Selecionar PYG como administrador
- [ ] Confirmar PYG após recarregar a sessão
- [ ] Confirmar PYG com outro usuário
- [ ] Consultar `organization_settings` no PostgreSQL

## Falha persistente: data aérea ainda fora de ISO

- [ ] Inspecionar o schema de entrada da mutation e o transformador tRPC
- [ ] Normalizar no backend ISO, `dd/mm/aaaa`, PostgreSQL e timestamp
- [ ] Buscar o nascimento persistido do usuário/viajante quando o campo vier inválido
- [ ] Rejeitar somente quando não houver uma data real e válida
- [ ] Testar diretamente a mutation com formatos compatíveis
- [ ] Gerar novo pacote e aplicar no Docker interno

## Normalização server-side da data aérea

- [x] Converter `dd/mm/aaaa` antes da validação do router
- [x] Aceitar prefixo ISO e timestamps PostgreSQL/JavaScript
- [x] Manter rejeição para datas realmente inválidas
- [x] Validar TypeScript sem erros
- [x] Executar 43 testes unitários aprovados
- [ ] Gerar pacote e aplicar no Docker interno
- [ ] Repetir solicitação aérea e confirmar persistência

## Viajante autenticado no formulário

- [ ] Exibir o usuário autenticado para perfis viajante em campo bloqueado
- [ ] Usar diretamente o `userId` autenticado quando não houver cadastro de viajante vinculado
- [ ] Manter seleção de viajante somente para administradores
- [ ] Preencher nome e data de nascimento a partir do usuário autenticado
- [ ] Exibir erro orientativo somente quando faltarem dados obrigatórios do usuário
- [ ] Testar criação de viagem por viajante e administrador

## Regra confirmada para solicitante viajante

- [ ] Exibir o usuário autenticado em campo bloqueado para perfis viajante
- [ ] Resolver automaticamente o `travelerId` pelo usuário autenticado
- [ ] Criar vínculo mínimo de viajante quando ainda não existir
- [ ] Manter seleção livre de viajante somente para administradores
- [ ] Reutilizar nome e data de nascimento do usuário no bloco aéreo
- [ ] Validar viagem comum e viagem com passagem aérea

## Solicitante autenticado implementado

- [x] Exibir o usuário autenticado em campo bloqueado para perfis viajante
- [x] Propagar `birthDate` no estado autenticado
- [x] Criar automaticamente vínculo mínimo em `travelers` quando necessário
- [x] Usar `ensureTravelerIdByUserId` na criação de viagens
- [x] Manter seleção de viajante para administradores
- [x] TypeScript sem erros e 43 testes unitários aprovados
- [ ] Aplicar pacote no Docker interno
- [ ] Criar viagem como viajante e confirmar persistência

## Validação remota do vínculo automático

- [ ] Aplicar pacote `b41b3201930a676536bfa3dcb584bac63fda2e5c8c0589bbb023819eb5fc2fb2`
- [ ] Recriar API e frontend sem remover volumes
- [ ] Entrar com usuário Viajante sem registro em `travelers`
- [ ] Enviar uma solicitação de viagem
- [ ] Confirmar vínculo automático e viagem persistida no banco

## Payload incorreto em viagem terrestre

- [ ] Enviar `flightDetails` apenas quando o transporte for `Passagem aérea`
- [ ] Usar nome, documento e nascimento do usuário autenticado em viagem aérea
- [ ] Não exigir dados aéreos para `Veículo próprio`, ônibus ou frota
- [ ] Corrigir a validação condicional de hotel e transporte
- [ ] Testar viagem terrestre e viagem aérea com payloads distintos

## Payload terrestre corrigido

- [x] Enviar `flightDetails` somente para Passagem aérea
- [x] Remover objeto de passageiro vazio de viagens terrestres
- [x] Manter nome e nascimento automáticos em viagens aéreas
- [x] Validar TypeScript e 43 testes unitários aprovados
- [ ] Gerar e aplicar pacote no Docker interno
- [ ] Repetir viagem própria e viagem aérea com persistência

## Revisão final do formulário de viagem

- [ ] Remover visualmente Cidade de origem
- [ ] Remover Cidade de origem do payload de criação/edição
- [ ] Tornar `flightDetails` ausente em qualquer transporte não aéreo
- [ ] Validar documento e nascimento somente para Passagem aérea
- [ ] Validar viagem terrestre e aérea separadamente
- [ ] Gerar pacote para rebuild no Docker

## Origem removida e validação aérea condicional

- [x] Remover Cidade de origem da interface
- [x] Enviar origem vazia para compatibilidade histórica do banco
- [x] Tornar origem opcional no schema da API
- [x] Enviar `flightDetails` somente para Passagem aérea
- [x] Validar documento e nascimento somente no transporte aéreo
- [x] TypeScript sem erros e 43 testes unitários aprovados
- [ ] Aplicar pacote no Docker interno
- [ ] Testar viagem terrestre e aérea após o rebuild

## Validação remota terrestre e aérea

- [ ] Aplicar pacote `b405d872a2aaa134eedb083a05e4b5aa8c3f68c7612a6bf3ddcc68b9ff0bf6b1`
- [ ] Rebuildar migrate, API e frontend preservando volumes
- [ ] Criar viagem terrestre sem `flight_details`
- [ ] Criar viagem aérea com `flight_details`
- [ ] Confirmar os dois registros no PostgreSQL

## Verificação do pacote efetivamente executado

- [ ] Conferir hash do pacote aplicado no servidor
- [ ] Conferir `ps` e imagens/containers de API e frontend
- [ ] Confirmar novo bundle sem Cidade de origem
- [ ] Criar nova viagem terrestre após a verificação
- [ ] Criar nova viagem aérea após a verificação

## Filtros e fila de aprovações

- [ ] Exibir filtros Desde e Hasta como `dd/mm/aaaa` com calendário
- [ ] Converter filtros para ISO apenas na consulta à API
- [ ] Verificar associação da solicitação ao aprovador responsável
- [ ] Corrigir a consulta da fila para aprovador por usuário, perfil e área
- [ ] Testar uma solicitação pendente visível para Cleverson

## Aprovações corrigidas

- [x] Filtros de histórico exibem `dd/mm/aaaa` com calendário
- [x] Filtros são convertidos para ISO somente na consulta
- [x] Perfil `approver` recebe solicitações pendentes
- [x] Perfil `traveler_approver` recebe solicitações pendentes
- [x] Decisão de aprovador é aceita para esses perfis
- [x] TypeScript sem erros e 43 testes unitários aprovados
- [ ] Gerar e aplicar pacote no Docker interno
- [ ] Confirmar solicitação pendente visível para Cleverson

## Validação remota da fila de aprovações

- [ ] Aplicar pacote `a723d056c11af95636dd87332446cd16f1d4025a3b686e8397fa146150679383`
- [ ] Reconstruir migrate, API e frontend preservando volumes
- [ ] Criar solicitação com status pendente
- [ ] Confirmar exibição para Cleverson
- [ ] Testar filtros `dd/mm/aaaa` por período
- [ ] Confirmar bloqueio sem comentário
- [ ] Confirmar decisão com comentário válido

## Calendário de aprovações legível

- [ ] Corrigir dias colados em sequência
- [ ] Renderizar grade real com 7 colunas
- [ ] Dar largura e altura às células individuais
- [ ] Exibir cabeçalhos localizados dos dias da semana
- [ ] Manter navegação mensal e seleção em `dd/mm/aaaa`
- [ ] Validar visualmente em desktop e smartphone

## Calendário de aprovações corrigido

- [x] Corrigir dias colados em sequência
- [x] Renderizar grade real com 7 colunas
- [x] Dar largura e altura às células individuais
- [x] Exibir cabeçalhos localizados em PT/ES
- [x] Manter navegação mensal e seleção ISO interna
- [x] TypeScript sem erros e 43 testes unitários aprovados
- [ ] Gerar e aplicar pacote no Docker interno
- [ ] Validar visualmente o calendário publicado em desktop e smartphone

## Validação remota do calendário e aprovações

- [ ] Aplicar pacote `d555d5bcffcd6d22d8ba0125efc4fdfbc7e65e03c253f34a297011a40ebde343`
- [ ] Rebuildar migrate, API e frontend preservando volumes
- [ ] Validar calendário em desktop
- [ ] Validar calendário em smartphone
- [ ] Confirmar solicitação pendente na fila de Cleverson
- [ ] Testar decisão sem comentário e com comentário válido

## Semântica revisada da fila de aprovações

- [ ] Renomear filtro geral para Pendiente quando aplicável
- [ ] Exibir solicitações Aprobada no histórico
- [ ] Exibir solicitações Rechazada no histórico
- [ ] Tratar Devuelta como pendência de correção
- [ ] Mostrar comentário de devolução junto à solicitação
- [ ] Permitir novo envio após correção
- [ ] Alinhar traduções PT/ES dos status e filtros

## Status e devolução revisados

- [x] Filtro inicial definido como Pendente
- [x] Filtros Aprovada e Rejeitada consultam histórico real
- [x] Pendiente inclui aguardando aprovação e devolvida para correção
- [x] Comentário de devolução aparece junto à solicitação
- [x] Devolvida recebe tom visual de pendência, não de rejeição
- [x] Traduções PT/ES adicionadas para os novos textos
- [x] TypeScript sem erros e 43 testes unitários aprovados
- [ ] Gerar e aplicar pacote no Docker interno
- [ ] Confirmar visualização de aprovada e devolvida no servidor

## Filtros de status e devolução concluídos

- [x] Exibir Pendiente, Aprobada e Rechazada como filtros principais
- [x] Mostrar aprovadas e rejeitadas no histórico
- [x] Incluir devolvidas na visão pendente
- [x] Exibir comentário da devolução
- [x] Identificar devolvida como aguardando correção
- [x] Ocultar ações de aprovação até a correção ser reenviada
- [x] Corrigir traduções PT/ES
- [x] TypeScript sem erros e 43 testes unitários aprovados
- [ ] Gerar e aplicar pacote no Docker interno
- [ ] Validar status e devolução no servidor
