# Auditoria V15 × Phoenix atual

Referência visual: `MEG_validacao_cadastros_v15(1).html` validada pelo usuário.

Objetivo: impedir que a migração seja tratada apenas como troca de aparência. Cada tela deve preservar as regras reais do MEG e, ao mesmo tempo, recuperar ou superar a experiência validada na V15.

## Critérios

- **Consolidado**: estrutura e leitura real já estão compatíveis para homologação.
- **Em evolução**: a base existe, mas ainda há comportamento/UX relevante a fechar.
- **Pendente**: não deve ser considerado concluído.
- Nenhum dado demonstrativo da V15 pode virar dado financeiro hardcoded no Phoenix.
- Escrita financeira continua bloqueada até gate específico de segurança, auditoria e idempotência.

## Tela a tela

| Área | V15 validada | Phoenix atual | Estado | Próxima ação |
| --- | --- | --- | --- | --- |
| Login | Entrada, recuperação e acesso | Login premium, cadastro e recuperação ligados ao contrato real; mobile corrigido | Consolidado para homologação | Migrar recuperação para token/código antes do corte final |
| Menu Lateral MEG | Navegação compacta, busca por comando, rail recolhido | Seções Principal/Gestão/Inteligência/Sistema, busca real, rail com scroll, tooltips e ícones distintos | Consolidado neste lote | Validação visual final do usuário em expandido/retraído |
| Topbar | Período, sincronização, tema, usuário, sair | Período real, status, tema, avatar e saída | Consolidado | Lapidação visual após validação geral |
| Home | Saldo, diagnóstico, métricas, histórico e agenda agrupada | Mesma espinha dorsal com dados reais; saldo atual/horizonte/Tudo; card principal compactado; agenda enriquecida | Em evolução | Drawer de vencimentos, ações na própria Home e densidade/expansão dos cards |
| Lançamentos | Tabela, filtros, novo lançamento e detalhes | Grid MEG + drawer V15 + dados reais; escrita ainda bloqueada | Consolidado em leitura | Gate de escrita seletiva somente depois da homologação |
| Histórico | Feed de auditoria | Auditoria financeira real quando disponível + compatibilidade operacional | Consolidado em leitura | Continuar ampliando cobertura de antes/depois sem inventar dados |
| Pendentes | Contas agrupadas e baixa | Leitura real + compatibilidade legada sem duplicação | Em evolução | Integrar drawer/seleção da Home e depois baixa segura |
| Cartões | Identidade visual, faturas, fechamento e parcelas | Paridade de fatura líquida e identidades reais dos cartões | Consolidado em leitura | Refinar ações e escrita depois do gate |
| Cadastros | Contas, classificações, grupos, formas e cartões | Grid e cadastros reais em leitura | Consolidado em leitura | Restringir Receita às formas reais validadas e liberar escrita por fluxo |
| Usuários | Perfis, permissões e administração | Pendentes/ativos/bloqueados, dados reais; avatar visual do usuário | Em evolução | Persistência de foto/avatar no backend e ações administrativas após gate |
| Configurações | Preferências, segurança, sincronização, backup, dispositivos | Meu perfil, Aparência/Home, Segurança e Sistema; dashboard personalizável; microinterações V15 | Em evolução | Ligar somente controles que tiverem contrato operacional real |
| Análises | Inteligência, gráficos, indicadores e recomendações | KPIs, período anterior, evolução mensal, classificação, forma de pagamento e Leitura MEG | Em evolução | Fechar visão decisória, tendências, alertas e critérios transparentes do Índice MEG |
| Orçamentos e metas | Planejamento | Tela existe na navegação real | Pendente de auditoria funcional | Revisar regra por regra antes de considerar pronta |
| Conciliação | Área Web completa | Leitura disponível conforme contrato atual | Em evolução | Manter sem inventar dado e validar UX específica |
| Responsividade | Reflow por área útil | Desktop, tela dividida e mobile tratados em várias telas | Em evolução | Varredura final por viewport após fechamento das telas |
| Tema | Claro/escuro | Auditoria global aplicada | Consolidado | Conferência visual final por tela |

## Lote atual — decisões consolidadas

### Menu Lateral MEG

1. A navegação central é a única área rolável; topo e saída permanecem estáveis.
2. Scrollbar permanece disponível também no rail retraído.
3. Busca expandida usa o símbolo de comando `⌘` como identidade visual; lupa e letras do atalho não ficam expostas.
4. Busca retraída vira botão circular centralizado com `⌘`.
5. Ícones não podem receber quadrados, placeholders ou camadas residuais.
6. Tooltips aparecem no rail retraído para identificar cada módulo.
7. Perfil não se repete no rodapé; o usuário fica na topbar.

### Home

1. O saldo monetário continua sendo informação dominante, mas não deve desperdiçar uma coluna inteira vazia.
2. O primeiro card usa composição horizontal em desktop e reorganiza em coluna em larguras menores.
3. Agenda deve funcionar como **Centro de Ações Financeiras**.
4. Contas vencidas, faturas e próximos vencimentos permanecem separados.
5. Faturas são resumidas por identidade do cartão e vencimento quando houver vínculo seguro.
6. Nenhum agrupamento pode unir lançamentos apenas por semelhança textual.
7. Próxima etapa: detalhe em drawer na própria Home, com seleção e preparação para pagamento/edição sem liberar escrita prematuramente.

### Perfil e avatares

1. Usuário pode manter iniciais, enviar foto ou escolher avatar ilustrado.
2. Presets deixam de ser apenas blocos de cor e passam a ter personagem/rosto ilustrado.
3. Preferência continua local por usuário nesta fase; não afirmar sincronização entre dispositivos até existir campo/contrato oficial no backend.

### Cards do dashboard

Direção aprovada para a próxima evolução:
- densidade global `Compacta / Normal / Ampla`;
- expansão individual nos cards que comportam detalhe;
- expansão não pode quebrar a grade ou alterar silenciosamente métricas oficiais;
- preferências devem ficar em Configurações e persistir de modo explícito.

## Prioridade de fechamento

1. Validar Menu Lateral MEG final.
2. Validar nova distribuição do primeiro card da Home e agenda agrupada.
3. Fechar drawer de vencimentos/contas na Home.
4. Implementar densidade/expansão dos cards.
5. Fechar Análises Financeiras como ferramenta de decisão.
6. Fechar Configurações V15 com animações e apenas controles reais.
7. Auditar Orçamentos e Metas.
8. Fazer varredura final V15 × Phoenix por desktop, tela dividida, mobile, claro e escuro.
9. Só depois avançar nos gates de escrita seletiva.
