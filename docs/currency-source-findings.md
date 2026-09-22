# Fontes de cotação — achados preliminares

A página oficial de cotizações da DNIT apresenta histórico mensal com colunas de **Compra** e **Venta** para DÓLAR e REAL, entre outras moedas. A tabela é organizada por dia do mês; no acesso de 26/08/2026, a página exibia Agosto de 2026. A DNIT é uma fonte adequada para a cotação aduaneira/fiscal publicada em relação ao Guarani, mas ainda é necessário confirmar o mecanismo de consulta automatizável e o significado operacional da taxa para o relatório.

Fonte consultada: https://www.dnit.gov.py/en/web/portal-institucional/cotizaciones

O Banco Central del Paraguay publica uma cotação referencial diária. A página informa que USD/PYG é calculada pela média ponderada de operações interbancárias no mercado spot, e que moedas diferentes do dólar são obtidas por arbitragem em relação ao USD/PYG. A tabela consultada em 25/08/2026 inclui USD e BRL, com a coluna `₲ / ME`; há também opção de selecionar data e baixar PDF.

Fonte consultada: https://www.bcp.gov.py/webapps/web/cotizacion/monedas

Conclusão preliminar: para limites e reembolsos, o sistema deve guardar a fonte e o tipo de taxa (`venda DNIT` ou `referencial BCP`) junto com a cotação. A DNIT atende melhor ao requisito de cotação de venda; o BCP é uma alternativa oficial referencial e pode servir como fallback ou comparação, desde que a política administrativa escolha uma única taxa para cada fechamento.
