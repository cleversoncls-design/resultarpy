# Design do aplicativo — Controle de Viagens

## Direção do produto

O aplicativo será uma ferramenta corporativa de uso frequente, desenhada para decisões rápidas em deslocamento e para lançamentos precisos após cada gasto. A experiência seguirá padrões de interação de primeira parte do iOS: hierarquia tipográfica clara, navegação por abas, cartões discretos, folhas modais para ações contextuais, feedback de toque e suporte nativo aos temas claro, escuro e automático.

A primeira versão prioriza uma experiência navegável e coerente com os papéis **Viajante**, **Aprovador** e **Administrativo**. Os dados demonstrativos ficam organizados por domínio para que a camada de persistência possa ser conectada ao Supabase posteriormente sem redesenhar as telas.

## Lista de telas

| Tela | Conteúdo principal | Função essencial |
|---|---|---|
| Acesso | Marca, e-mail, senha, seleção de idioma e acesso de demonstração | Entrar no ambiente e escolher o perfil para explorar a experiência |
| Início do viajante | Saudação, próxima viagem, status, totais e ações rápidas | Consultar a situação atual e iniciar solicitação ou despesa |
| Minhas viagens | Lista filtrável por status e período | Acompanhar solicitações e acessar detalhes |
| Nova solicitação | Formulário dividido em etapas | Criar uma solicitação com destino, datas, cliente, adiantamento, hotel e transporte |
| Detalhe da viagem | Linha do tempo de status, dados da viagem e ações | Consultar, editar quando permitido e acessar despesas |
| Despesas da viagem | Resumo, lista de lançamentos e saldo do adiantamento | Lançar despesas, revisar pendências e enviar fechamento |
| Nova despesa | Formulário de gasto e comprovante | Informar data, cidade, cliente, conceito, quantidade, valor e forma de pagamento |
| Aprovações | Solicitações aguardando decisão | Aprovar ou rejeitar viagens da equipe |
| Preparação administrativa | Fila de viagens aprovadas e checklist | Controlar adiantamento, veículo, hotel e liberação |
| Painel administrativo | Indicadores, filas e atalhos de cadastros | Acompanhar o ambiente e encontrar pendências críticas |
| Cadastros | Seções para usuários, áreas, clientes, cidades, conceitos e limites | Gerenciar dados de referência do sistema |
| Relatórios | Analítico de despesas e resumo por cliente | Consultar diferenças de limite, faturamento e agrupamentos |
| Perfil e preferências | Usuário atual, idioma, tema e encerramento | Personalizar a experiência e sair com segurança |

## Navegação e composição

A navegação principal usará abas inferiores adaptadas ao papel ativo. Para o viajante, as abas serão **Início**, **Viagens** e **Perfil**. Para o aprovador, serão **Início**, **Aprovações**, **Viagens** e **Perfil**. Para o administrativo, serão **Painel**, **Operação**, **Relatórios** e **Perfil**. A ação primária de cada tela ficará posicionada na região inferior ou superior direita, sempre acessível com uma mão.

Os detalhes e formulários usarão navegação empilhada. Formulários longos serão quebrados em etapas curtas, com indicador de progresso e persistência local do rascunho. Ações destrutivas ou irreversíveis exigirão confirmação em folha modal. Status serão representados simultaneamente por texto e cor, evitando dependência exclusiva de cor.

## Fluxos principais

### Solicitar uma viagem

1. O usuário abre **Nova solicitação** a partir da tela inicial ou da lista de viagens.
2. Informa área, unidade, cidade de destino e datas.
3. Escolhe se a viagem é para cliente, se exige adiantamento e se precisa de hotel.
4. Seleciona o transporte; quando escolher passagem aérea, preenche os dados adicionais do passageiro.
5. Revisa o resumo, salva o rascunho ou envia para aprovação.
6. O aplicativo exibe a linha do tempo com o estado **Aguardando aprovação**.

### Aprovar ou rejeitar

1. O aprovador abre **Aprovações** e seleciona uma solicitação.
2. Consulta dados da viagem, cliente, valor de adiantamento e observações.
3. Escolhe **Aprovar** ou **Rejeitar**.
4. Em caso de rejeição, informa o motivo obrigatório.
5. A solicitação retorna ao viajante ou avança para a fila administrativa.

### Preparar a viagem

1. O administrativo abre a fila de viagens aprovadas.
2. Marca o adiantamento como liberado, registra veículo e reserva de hotel quando necessários.
3. Usa o checklist para confirmar os itens pendentes.
4. Libera a viagem para o viajante, que passa a ver o estado **Liberada para viagem**.

### Lançar e fechar despesas

1. O viajante abre a viagem liberada e toca em **Adicionar despesa**.
2. Registra data, cidade, cliente, conceito, quantidade, valor unitário e indicador de adiantamento.
3. Anexa foto ou fatura; o fluxo prevê compressão antes do armazenamento e formatos comuns, incluindo HEIC.
4. Salva o item e acompanha limites e diferenças calculadas.
5. Envia o fechamento para o administrativo.
6. O administrativo aprova o fechamento ou devolve itens específicos com observação contextual.
7. O viajante corrige os itens retornados e reenvia.

## Direção visual

A marca usará **azul petróleo** como cor de confiança operacional, com **verde esmeralda** para estados concluídos e **âmbar** para atenção ou pendência. O fundo claro será um branco azulado muito suave, e o tema escuro usará grafite profundo com superfícies elevadas. Os cartões terão cantos de 16 a 20 pontos, bordas leves e sombra mínima. A tipografia seguirá uma escala inspirada no iOS, com títulos fortes, subtítulos compactos e números de indicadores em destaque.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| Primária | `#0F5C67` | `#55C2C8` | Ações principais, links e navegação ativa |
| Fundo | `#F5F8F8` | `#10191B` | Fundo geral |
| Superfície | `#FFFFFF` | `#182528` | Cartões, folhas e campos |
| Texto | `#132225` | `#EDF5F5` | Conteúdo principal |
| Muted | `#6E7F82` | `#9FB3B5` | Apoio e metadados |
| Sucesso | `#168A63` | `#4DD19A` | Aprovado, finalizado e liberado |
| Atenção | `#B97814` | `#F2B94B` | Pendente, limite e revisão |
| Erro | `#C64C4C` | `#FF8F8F` | Rejeição e inconsistência |

## Acessibilidade e comportamento responsivo

O layout será pensado para orientação retrato 9:16 e uso com uma mão. Alvos de toque terão área confortável, campos manterão rótulos visíveis e o teclado não deverá esconder a ação primária. Em telas mais largas, o conteúdo ficará limitado a uma coluna central para preservar a leitura. Componentes de lista serão preparados para `FlatList`, e todas as ações terão estados de pressionado e feedback visual.

## Modelo de domínio inicial

Os principais agregados serão `User`, `Area`, `ServiceUnit`, `City`, `Client`, `ExpenseConcept`, `ExpenseGroup`, `BillingRule`, `CityLimit`, `UnitPriceRule`, `TripRequest`, `TripPreparation`, `Expense` e `ExpenseReview`. Cada solicitação manterá sua própria linha do tempo de status e cada despesa poderá carregar observações de revisão e referência ao comprovante.

## Integração planejada

A camada de dados será isolada por serviços, permitindo começar com estado local demonstrativo e substituir os adaptadores por Supabase Auth, PostgreSQL e Storage. Uploads deverão passar por seleção, compressão e validação de extensão/MIME; a aplicação não deve tratar o URI local como permanente. Regras de permissão serão aplicadas tanto na interface quanto na camada de dados, especialmente para impedir que um viajante acesse cadastros administrativos.
