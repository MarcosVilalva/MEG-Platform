# MEG Finanças Web Evolution | orientação operacional vigente

> Atualizado em 01/11/2026. Este arquivo é um **índice curto**, não o histórico do projeto.
> Se outra documentação se declarar "fonte oficial" mas registrar etapa, prints ou PR antigos, prevalecem as decisões atuais verificadas conforme a hierarquia abaixo. Nunca substituir instruções explícitas atuais do usuário por conteúdo histórico.

## Leitura obrigatória, nesta ordem, antes de alterar código

1. `MEG-WEB-CONTINUIDADE-OFICIAL.md`: estado atual, etapa autorizada, branch, PR, bloqueios e próxima ação.
2. `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`: autoridades e regras financeiras que não podem ser alteradas.
3. `docs/MEG-WEB-REFERENCIAS-OFICIAIS-20261027.md` e **as imagens oficiais atuais do Projeto**: identificar o print específico da tela.
4. `PROMPT-MASTER.txt` do Projeto e regras de negócio selecionadas do PDF de Regras Consolidadas: itens 7–16, 18–19 e 21–22, com exclusão de Crediário pelo aceite posterior; preservar Autocomplete e Alimentação.
5. `docs/MEG-WEB-PROTOCOLO-DE-CONTINUIDADE.md`: testes, retrabalho, handoff, gestão de conflito e homologação.
6. `docs/FULL_METHOD.md` e detalhes de segurança somente quando pertinentes à alteração.

**Ordem de autoridade em caso de conflito: regras de negócio existentes no repositório → print oficial vigente → Prompt Master → checkpoint operacional**. A referência de imagens é soberana para decisões visuais; documentos históricos não a substituem. Quando as decisões atuais explicitamente conflitarem, parar, registrar e pedir decisão, sem inventar regra.

## Regras inegociáveis

- **Android congelado:** `android/**` e `apps/web/src/mobile/**` somente leitura. Não alterar builds, OTA, dependências ou UI Android no trabalho Web.
- **Nova Web isolada:** não reutilizar UI/CSS visual legado nem protótipos reprovados. Proteger Shell, autenticação, DataGrid e camadas aprovadas. Trabalhar apenas a etapa/tela autorizada no checkpoint e no chat.
- **Finanças:** nenhuma UI calcula saldo, competência, parcela, limite, fatura, liquidação, baixa ou status por conta própria. Consumir autoridades canônicas da API e dados únicos. Preservar centavos, idempotência, atomicidade, saldo disponível, benefício separado e regras de cartão/pagamento. Divergência financeira exige investigação antes de qualquer mudança.
- **Visual:** apenas prints oficiais atuais. Preservar simetria entre telas, protagonismo da marca MEG, legibilidade, responsividade mobile-first e breakpoints principais de 640/1024px. Nenhum corte/sobreposição/scroll horizontal da página. Ajustes ao print só por informação funcional, negócio, responsividade, acessibilidade ou requisito explícito.
- **Validação:** build, CI, deploy, captura e revisão por IA **não são aprovação visual do usuário**. Não escrever "homologado" sem aceite explícito e referência da versão. Não fazer merge de mudanças visuais sem gates técnicos relevantes verdes e validação visual quando exigida.
- **Segurança:** não executar mutações financeiras/administrativas sem autorização e proteções. Proteger RLS, acesso, segredos, autenticação, autorização, headers/CSP e validação de entradas. Não introduzir migrações destrutivas ou credenciais em preview.
- **Entrega:** informar arquivos alterados, escopo atendido/não atendido, divergências, pendências e link sem cache apenas quando o SHA estiver realmente publicado. Não inventar deploys.
- Aplicar `/FULL` como metodologia de revisão, sem interpretar aliases como comandos executáveis.

## Continuidade sem perda de contexto

- Antes de cada intervenção, comparar checkpoint com **GitHub real**: branch, PR, último SHA, checks, imagens e status do deploy. Se divergir, corrigir registro antes de implementar.
- Evitar acumular tentativas CSS. Após **duas correções sem resolver a mesma causa**, investigar geometria/arquitetura, rever evidências e testes; reconstruir somente a camada necessária.
- Registrar em `MEG-WEB-CONTINUIDADE-OFICIAL.md` **somente o estado operacional curto**; guardar relato detalhado e decisões anteriores em `docs/historico/`. Não acrescentar novos diários intermináveis ao checkpoint.
- Documentos `docs/MEG_CURRENT_STATE.md`, `docs/MEG_WEB_MASTER_SPEC.md` e `docs/MEG-RETOMADA-OFICIAL.md` são fontes históricas ou de contratos ainda aplicáveis, **não autoridades sobre etapa/prints atuais**.

## Escopo desta orientação

Ela organiza a continuidade de todas as etapas, **sem autorizar avançar para novas telas, alterar regras financeiras ou fazer merge**. Se o checkpoint indicar a Home 06 em validação, continuar somente a Home 06. Uma PR documental pode auditar a governança sem autorizar próxima tela.
