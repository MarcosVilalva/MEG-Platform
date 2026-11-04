# MEG Web Evolution | Benefícios multioperadora e cartões pré-pagos

**Decisão aprovada:** 04/11/2026, após a decisão de Verocard como pré-pago.
**Escopo:** regra de produto para evolução comercial e referência visual do Novo Lançamento.
**Situação:** direção de produto aprovada; a ampliação da API para múltiplas operadoras **não está implementada**.

## Separação entre conceito e instância
- **Benefício** é o conceito genérico do produto. Sua tela e ícone não devem usar Verocard, Ticket, Alelo, VR ou qualquer operadora como marca-padrão.
- **Cartão benefício pré-pago** é o tipo de instrumento financeiro com saldo, recarga e consumo. Ele não se confunde com cartão de crédito/fatura.
- **Cartão cadastrado** é uma instância de titularidade do usuário, com emissor/operadora, identidade visual, dados e saldo vindos exclusivamente do cadastro e do serviço financeiro. Verocard é **um exemplo**, não uma regra universal.

## Aplicação visual
1. Novo Lançamento: título **Benefício**, subtítulo **Usar ou recarregar cartão benefício**, ilustração genérica de supermercado, compras/alimentação e instrumento pré-pago sem logotipo de empresa. Chips Saldo/Recarga/Consumo. Não habilitar a opção por mudança cosmética.
2. Cadastro de Cartões: prever tipo **Benefício pré-pago** separado de **Crédito**; registrar a operadora escolhida e uma referência explícita de arte de cartão quando disponível. Não inferir bandeira por nomes parecidos ou usar marca aleatória.
3. Carrossel na Home e centro de Cartões: projetar cartões de crédito e benefícios cadastrados na mesma experiência, distinguindo seus domínios. Exibir imagem específica somente para cadastro real com emissor e asset verificados; caso contrário usar cartão genérico. Não gerar uma conta ou cartão de crédito fictício para isso.
4. Cada cartão benefício deve consultar a fonte de saldo do domínio benefício. Não exibir fatura, limite de crédito ou parcelamento. O controle do benefício continua no módulo de Benefícios, compartilhando o mesmo dado de origem com o carrossel.

## Autoridade financeira atual e restrição de compatibilidade
- A regra de negócio já consolidada para **Alimentação** usa **Conta Benefício + Verocard + Pago** (itens vigentes do documento de regras). **Não removê-la silenciosamente**.
- `apps/api/src/modules/finance/financial-policy.ts` reconhece explicitamente o método de pagamento **VEROCARD** e a conta BENEFIT; `benefit-event-mutation.ts` exige método Verocard na mutação. Portanto, **outros emissores não podem ser tratados como operacionais hoje apenas por estarem no seletor visual**.
- Para torná-lo multioperadora será necessária auditoria dos catálogos, vínculos account/paymentMethod, writer do benefício, leitores de saldo, filtros monetários, migrations e testes de compatibilidade. Não mudar essa política durante o acabamento visual.
- Permanecem obrigatórios escritor de benefício dedicado, saldo suficiente, atomicidade/idempotência, situação paga conforme regras, e segregação de saldos bancários e do benefício. Não duplicar recarga com salário.
- A decisão histórica "Verocard pré-pago" permanece válida **para a instância Verocard** e como caracterização do domínio, **não** como marca global.
- A arte local anterior `verocard-alimentacao-v659.svg` pode ser candidata de identidade quando o usuário efetivamente cadastrar Verocard; exige validação visual/correspondência da versão. Não mostrá-la no seletor genérico.

## Gates de aceite futuro
- Testes que comprovem Verocard legado sem regressão e mais uma operadora real isolada por cadastro.
- Dois usuários com operadoras diferentes não podem compartilhar marca, saldo, histórico ou vínculo.
- Refletir recargas e consumo da mesma fonte nos módulos Cartões e Benefícios.
- Ativos de imagem ligados ao cadastro; fallback genérico de identidade.
- Nenhuma tela poderá calcular saldo, fatura, categoria ou status.
- Aprovação visual por tela e CI verde antes do merge. Android permanece congelado.

## Implementação desta revisão
A PR #654 muda **somente** o subtítulo/arte do card genérico Benefício, teste visual e documentação. Não altera a Home, o cadastro de cartões, a API, o Android ou a regra financeira vigente.
