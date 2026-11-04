# Decisão funcional aprovada: Verocard como cartão benefício pré-pago

**Projeto:** MEG Finanças Web Evolution  
**Aprovação funcional:** conversa de 04/11/2026  
**Status técnico:** decisão documentada; integração operacional dos módulos de Cartões, Despesas e Benefícios ainda não implementada nesta prévia.

## Decisão
Verocard Alimentação será **apresentado como cartão** na experiência do usuário, inclusive no carrossel de Cartões. Sua **natureza financeira permanece Benefício pré-pago**, com saldo próprio, recarga e consumo. Não será tratado como cartão de crédito nem se tornará registro de `CreditCard` apenas para aparecer no carrossel.

## Regras vinculantes já existentes, preservadas
- A regra consolidada de **Alimentação** (item 12) determina: **Conta Benefício + Verocard + Pago**, vínculos automáticos/travados e nenhuma movimentação da conta monetária principal.
- `financial-policy.ts`: Verocard e contas BENEFIT pertencem ao escopo de benefício, excluído do resumo monetário comum.
- `benefit-event-mutation.ts`: `createBenefitEventProtected` e `updateBenefitEventProtected` são as autoridades de gravação; exigem conta do tipo BENEFIT e método Verocard, gravam status paid, verificam saldo insuficiente em consumo, preservam idempotência/atomicidade e auditoria.
- `/finance/benefit-events` deve ser usado para crédito/recarga e débito/consumo. O writer monetário comum e o writer de compras/faturas de crédito NÃO serão usados.
- `benefitBalanceAt` e `/finance/benefit-summary` são referências de saldo/leitura. Nenhuma tela calculará saldo com seus próprios filtros, arredondamentos ou somatórios.

## Comportamento aprovado
1. A **recarga recebida** aumenta o saldo da Conta Benefício. A periodicidade habitual mensal e o vínculo com o pagamento salarial são contexto de uso, **não** autorização para criar recarga automática ou duplicar remuneração. O valor e a data da recarga devem corresponder ao fato registrado.
2. Ao registrar **Despesa de Alimentação**, usar a classificação do item 12 e baixar o saldo do Verocard como pagamento realizado, obedecendo ao bloqueio por saldo insuficiente. Não reduzir saldo bancário.
3. No **carrossel de Cartões**, o Verocard será uma projeção visual do benefício, identificado como `Cartão alimentação · Pré-pago`, sem fatura, limite de crédito, fechamento, vencimento ou parcelamento de crédito.
4. No **detalhe do cartão**, exibir somente dados canônicos disponíveis: saldo do benefício, recargas, consumo e histórico. Não inventar número do cartão, bandeira, limite, valor de recarga ou data de crédito.
5. **Benefícios** continua sendo o módulo de gerenciamento/recarga; **Cartões** dá acesso visual ao mesmo recurso financeiro. Ambos devem apontar à MESMA autoridade e não abrir saldos independentes.

## Critérios de implementação e aceitação (para etapas correspondentes)
- Etapa atual Novo Lançamento: copy e identidade visual podem ser adaptadas; cartão Benefício continua indisponível no seletor da prévia até o writer protegido estar integrado. Não criar gravação simulada.
- Etapa Cartões/Home: carrossel compõe cartões de crédito + representação de benefício com **tipos distintos**, nunca injeta o Verocard em `CreditCard` nem reaproveita `statementAmount` como saldo.
- Etapa Despesas: selecionar Alimentação/Verocard deve respeitar os vínculos automáticos e o writer correto. Não habilitar por mera mudança de rótulo.
- Etapa Benefícios: recarga pela API canônica; sem lançamento duplicado como receita de salário.
- Testes de caracterização específicos: recarga, consumo, saldo insuficiente, repetição idempotente, mistura de cards no carrossel sem fatura, exclusão de movimentações do benefício do saldo monetário, histórico único e visual mobile.
- Imagem: há arte local ilustrativa `/assets/cards/verocard-alimentacao-v659.svg`. O arquivo é uma **representação visual**, não prova de que reproduz exatamente o cartão físico do usuário. Para substituição por imagem oficial/local de alta resolução, confirmar variante da operadora e direitos de uso. Referência de produto: https://verocard.com.br/usuario/

## Restrições de continuidade
O Android permanece congelado. Não alterar `financial-policy`, `benefit-event-mutation`, cartões de crédito, contas ou migrações sem nova auditoria + testes de caracterização. Esta decisão não homologou nenhuma tela visual e não autorizou merge.
