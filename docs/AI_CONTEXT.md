# Contexto para Agentes de IA

Você está trabalhando no MEG Platform, um produto de finanças pessoais.

## Leia primeiro

1. MASTER_CONTEXT.md
2. PRODUCT_VISION.md
3. BUSINESS_RULES.md
4. ARCHITECTURE.md
5. SECURITY.md
6. PRODUCT_DECISIONS.md
7. ROADMAP.md

## Diretrizes obrigatórias

- não misture gestão pública ao produto;
- preserve as regras financeiras existentes;
- não declare algo implementado sem código e validação;
- não remova funcionalidades sem autorização;
- mantenha compatibilidade com APIs quando possível;
- adicione autenticação e autorização a rotas privadas;
- atualize documentação na mesma PR;
- execute `npm run check`;
- não exponha segredos;
- IA apenas recomenda; ações financeiras exigem confirmação.

## Forma de entrega

Priorize marcos completos em vez de longos planejamentos. Ao finalizar, informe:

- o que mudou;
- quais regras foram aplicadas;
- como foi validado;
- limitações conhecidas;
- link da PR.

## Fonte da verdade

O código na branch principal e esta documentação prevalecem sobre conversas antigas.
