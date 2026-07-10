# Sprint 013 — Movimentações pessoais persistentes

## Objetivo

Substituir a tela de movimentações baseada em dados locais por receitas e despesas persistidas na API e no banco.

## Entregas

- criação de receitas e despesas;
- vínculo com conta, categoria e forma de pagamento;
- status previsto, pago e conciliado;
- arquivamento lógico para administradores e gerentes;
- listagem e busca de movimentações reais;
- isolamento dos lançamentos por usuário;
- sincronização do razão quando o evento é pago ou conciliado;
- remoção do uso da categoria como conta contábil no razão;
- respeito aos perfis de leitura, operação e administração.

## Regras

- cada usuário consulta apenas seus próprios lançamentos;
- perfil VIEWER não cria ou altera movimentações;
- ADMIN e MANAGER podem arquivar;
- lançamentos previstos não afetam o razão;
- lançamentos pagos ou conciliados afetam a conta vinculada;
- arquivamento remove o efeito do lançamento no razão.
