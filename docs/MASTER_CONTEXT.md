# MEG Platform — Contexto Mestre

## Leitura obrigatória
1. `PRODUCT_VISION.md`
2. `BUSINESS_RULES.md`
3. `ARCHITECTURE.md`
4. `ROADMAP.md`

## Diretriz central
O MEG é um sistema de finanças pessoais e familiares. Não deve incorporar rotinas de gestão pública, contabilidade governamental ou tesouraria municipal.

## Estado do produto
Aplicação React + TypeScript, API Fastify, Prisma e autenticação JWT. Possui usuários aprovados pelo administrador, perfis, contas, categorias, formas de pagamento, receitas, despesas e contas a receber. O marco atual adiciona cartões de crédito e orçamento mensal persistente.

## Regras para contribuições
- Preservar isolamento dos dados por usuário.
- Não expor segredos no frontend ou no repositório.
- Toda rota financeira exige autenticação e autorização.
- Entregas devem incluir banco, API, interface e validação.
- Não declarar um marco concluído sem `npm run check` aprovado.
- Atualizar documentação quando regras de negócio mudarem.
