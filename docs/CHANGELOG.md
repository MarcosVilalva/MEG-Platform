# Changelog
## 2026-07-19 - Confirmacao obrigatoria para exclusoes

- Toda exclusao iniciada pela interface exige confirmacao explicita antes de alterar os dados.
- A protecao cobre lancamentos, cadastros, contas, cartoes, compras, destinatarios de notificacao e acessos de usuarios.
- A mensagem identifica o registro quando possivel e alerta quando a acao nao pode ser desfeita.
- Cancelar a confirmacao preserva os dados e encerra a operacao sem efeitos colaterais.

## 2026-07-19 - Gerenciamento de modalidades

- A aba Cadastros passa a ter um painel exclusivo para criar, editar, desativar, reativar e remover modalidades.
- Formas de pagamento agora selecionam uma modalidade cadastrada, evitando nomes divergentes e erros de digitação.
- Modalidades desativadas deixam de aparecer em novos lancamentos e ocultam suas formas de pagamento, sem alterar o historico existente.
- A exclusao e bloqueada quando a modalidade ainda estiver vinculada a formas de pagamento ou lancamentos.

## 2026-07-19 - Cadastros editaveis e desativacao segura

- Contas, grupos, classificacoes, formas de pagamento e cartoes passam a oferecer as acoes Editar e Desativar/Reativar.
- Itens desativados deixam de aparecer nas listas de novos lancamentos, orcamentos, contas e cartoes operacionais.
- O historico financeiro continua preservado e lancamentos antigos podem ser abertos com o cadastro desativado original.
- A aba Cadastros informa separadamente quantos itens estao ativos e desativados em cada categoria.

## 2026-07-19 - Rolagem do menu lateral web

- O menu lateral da versão web passa a ter rolagem vertical própria pela roda do mouse.
- A barra de rolagem fica discreta e aparece ao passar o mouse ou navegar pelo teclado no menu.
- A rolagem do menu não movimenta nem bloqueia o conteúdo principal da tela.

## 2026-07-19 - Cartões ativos e edição segura de parcelamentos

- Ao escolher a modalidade crédito, o cartão utilizado aparece imediatamente e seu cadastro calcula o vencimento da fatura.
- Cartões podem ser desabilitados sem apagar o histórico; deixam de aparecer em novos lançamentos, na Central de Cartões e no limite disponível.
- Cartões vinculados a lançamentos não podem ser removidos por engano e devem ser desabilitados.
- A edição de uma compra parcelada permite atualizar somente a parcela atual, a atual e as futuras ou todas as parcelas pendentes.
- Ao trocar cartão ou data da compra, os vencimentos pendentes são recalculados conforme o número original de cada parcela, sem concentrá-los na data atual.
- Parcelas já pagas permanecem intactas durante alterações da série.

## 2026-07-18 - Carteira digital e projeção de faturas

- Cartões agora registram emissor, nome comercial, bandeira, final e tema visual sem alterar lançamentos financeiros existentes.
- Identidade visual automática para Itaú, LATAM PASS, Nubank, Santander, Banco do Brasil, CAIXA, Mercado Pago, Magalu, Azul, BV, Riachuelo e KaBuM.
- Bandeiras Visa, Mastercard, Elo, American Express e Hipercard usam recursos locais, evitando dependência de imagens externas.
- A Central de Cartões passa a projetar as faturas dos próximos seis meses e continua respeitando o filtro global.
- Cadastros antigos permanecem compatíveis e recebem identidade visual inferida pelo nome quando os novos campos estiverem vazios.

## 2026-07-17 - Conciliacao do saldo monetario

- Adicionada conciliacao entre o saldo calculado pelos lancamentos e o saldo real informado pelo usuario.
- A diferenca passa a ser mostrada antes da confirmacao e registrada como ajuste financeiro auditavel.
- Incluido teste de regressao para o caso real de R$ 62,55 no livro-caixa, R$ 152,89 no banco e diferenca de R$ 90,34.

## 2026-07-15 - Analises responsivas e saldo historico projetado

- Reestruturada a aba Analises para caber integralmente em celulares, com leitura vertical e textos sem cortes.
- Graficos de periodos longos agora possuem rolagem horizontal propria, sem alargar a pagina.
- A memoria de calculo passa a exibir saldo anterior + receitas - todas as despesas do periodo, incluindo pagas e pendentes.
- O saldo disponivel antes das pendencias permanece destacado separadamente para nao confundir caixa atual com compromissos futuros.
- O historico acumulado passa a considerar o mes corrente completo, incluindo todas as contas pagas e pendentes ate o ultimo dia do mes.
- Adicionado teste automatizado para impedir que despesas pendentes do fim do mes sejam omitidas do saldo historico projetado.

## 2026-07-15 - Datas e vencimentos no fuso de Sao Paulo

- Corrigida a Central de Alertas para nao transformar contas de amanha em contas de hoje apos 21h.
- Padronizada a data de negocio em `America/Sao_Paulo` nos alertas, agenda financeira, lancamentos, pagamentos, recebimentos e cartoes.
- Operacoes de calendario agora sao independentes da conversao UTC e seguras em viradas de mes e ano.
- Adicionados testes para o caso real de 15/07/2026 as 22:54, quando 16/07 deve ser classificado como amanha.

## 2026-07-15 - Central de cartões de crédito

- Criada uma aba exclusiva para acompanhar cartões, limites, faturas e compras.
- Adicionados indicadores de limite total, utilizado, disponível e compras no período.
- Incluídos filtros dinâmicos por cartão, situação e texto, além de ranking das maiores compras e concentração por grupo.
- A fatura detalhada permite abrir qualquer compra diretamente para edição.
- O cadastro de cartões passa a registrar Visa, Mastercard, Elo, American Express, Hipercard ou outra bandeira.
- Cada bandeira recebe automaticamente uma apresentação visual própria na carteira digital.
- O cálculo do limite comprometido considera todas as despesas de crédito ainda em aberto, enquanto as análises da fatura respeitam o período selecionado.

## 2026-07-15 - Finalização dos cadastros

- Adicionado botão **Editar** em grupos, classificações, formas de pagamento e cartões cadastrados.
- A alteração de nomes em cadastros passa a atualizar também os lançamentos históricos, orçamentos e regras de cartão relacionados.
- Padronizados os avisos positivos ao desfazer pagamentos e reabrir faturas.
- Mantidos o backup completo, a restauração e o encerramento da sessão após dois minutos de inatividade.

## Segurança, confirmações e backup — 2026-07-15

### Adicionado
- Avisos visuais de sucesso ao salvar, excluir, importar e administrar acessos.
- Encerramento automático da sessão após 2 minutos sem atividade, com aviso 30 segundos antes.
- Backup completo em JSON com lançamentos, orçamentos, cadastros e regras de cartões.
- Restauração do backup com validação do arquivo e confirmação antes de substituir a base.
- Exportação CSV mantida como opção complementar.

### Segurança
- O backup não inclui senhas, tokens nem segredos de integração.
- Após o encerramento por inatividade, a tela de entrada informa claramente o motivo.
## Experiência rápida web e Android — 2026-07-14

### Melhorado
- Abertura imediata com a última base segura do dispositivo e sincronização em segundo plano.
- Compressão das respostas da API para reduzir o tráfego de bases com milhares de lançamentos.
- Renderização sob demanda: cada módulo pesado passa a ser calculado somente quando aberto.
- Nova entrada com apresentação clara do propósito, benefícios e segurança do MEG.
- Aplicativo Android com navegação operacional inferior para painel, novo lançamento e contas a pagar.
- Layout móvel mais compacto, respeitando áreas seguras e mantendo os módulos completos no menu.

### Preservado
- A versão web continua oferecendo todos os recursos gerenciais.
- As regras financeiras e a base real não foram alteradas por esta entrega.

## Sprint 004 — Project Phoenix

### Adicionado
- API Fastify em `apps/api`.
- Prisma + SQLite em `packages/database`.
- Schema inicial com User, Account, Category, PaymentMethod, FinancialEvent, LedgerEntry, Budget e AuditLog.
- Seed inicial.
- Endpoints financeiros.
- Swagger em `/docs`.
- ADR-001 Ledger Financeiro.
- ADR-002 API Fastify.
- ADR-003 Prisma + SQLite.
- Documentação de banco e API.

### Estratégia
- LocalStorage deixa de ser a arquitetura-alvo.
- Banco e API passam a ser a fonte futura da verdade.
