# Changelog

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
