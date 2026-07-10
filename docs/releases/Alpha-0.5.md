# Alpha 0.5 — Marco Financeiro

## Objetivo

Consolidar uma versão utilizável de finanças pessoais, reduzindo dependência de dados de exemplo.

## Incluído no marco

- autenticação e aprovação de usuários;
- perfis e autorização;
- contas, categorias e formas de pagamento;
- receitas e despesas persistidas;
- contas a receber;
- Dashboard e Analytics conectados progressivamente a dados reais;
- auditoria inicial.

## Para concluir o marco

- substituir integralmente dados de exemplo;
- completar contas a pagar;
- transferências;
- cartões e faturas;
- fluxo de caixa real;
- orçamento mensal;
- recuperação de senha;
- cobertura de testes das regras críticas;
- API hospedada para a versão pública.

## Critérios de aceite

```powershell
npm run check
```

Além disso:

- banco atualiza sem perda não documentada;
- novo usuário depende de aprovação;
- cada usuário vê somente os próprios dados;
- perfis respeitam a matriz de autorização;
- frontend e API funcionam localmente;
- documentação reflete o estado real.
