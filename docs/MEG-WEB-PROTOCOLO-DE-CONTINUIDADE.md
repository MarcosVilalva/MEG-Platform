# MEG Web Evolution | Protocolo de continuidade e prevenção de retrabalho

**Versão:** 01/11/2026. **Finalidade:** reduzir perda de contexto, não alegar memória perfeita. Este documento formaliza o modo de trabalho e não altera escopo, telas ou regras financeiras.

## 1. Hierarquia e fontes

Autoridade em conflitos: **(1) regras de negócio existentes no repositório; (2) print oficial da tela; (3) Prompt Master; (4) checkpoint**. Regras financeiras canônicas detalhadas em `docs/MEG-WEB-FINANCIAL-AUTHORITY.md`. O conjunto atual de imagens oficiais está no Projeto, catalogado em `docs/MEG-WEB-REFERENCIAS-OFICIAIS-20261027.md`. O catálogo não substitui as imagens. Regras históricas do Android não definem visual Web. O PDF de Regras Consolidadas vale apenas nos itens 7–16, 18–19 e 21–22, ressalvada a exclusão posterior de Crediário; Autocomplete e Alimentação são obrigatórios.

`AGENTS.md` é o índice. `MEG-WEB-CONTINUIDADE-OFICIAL.md` é o registro operacional **curto**. Documentos antigos em `docs/historico/` são evidência de decisões passadas, não instruções para o estado atual. Divergências entre fontes atuais não devem ser resolvidas por dedução.

## 2. Primeira leitura de qualquer sessão

1. Ler o checkpoint curto e a autoridade financeira.
2. Identificar **etapa autorizada**, tela, branch, PR, SHA, estado do CI e último deploy efetivamente `live`. Comparar com GitHub/Render e anotar diferenças.
3. Conferir o print oficial da tela e os limites funcionais. Não carregar referências visuais reprovadas.
4. Definir os arquivos de alcance permitido e os componentes protegidos antes da implementação.
5. Se faltar dado que altera o comportamento financeiro ou a referência visual, sinalizar. Nunca inventar.

## 3. Loop de implementação controlado

1. Diagnosticar o defeito com evidência: screenshot, vídeo, logs, CSS computado, teste e versão observada. Distinguir bug do produto de falha do próprio harness.
2. Definir critério de aceite **observável** para cada comportamento.
3. Corrigir a menor unidade arquitetural adequada. **Não empilhar exceções de CSS** sobre uma base defeituosa.
4. Executar testes de caracterização financeiros pertinentes, testes estruturais, acessibilidade e verificações de navegador em desktop/tablet/mobile. Um teste que falha não deve ser ignorado nem ter baseline atualizado sem inspeção.
5. Comparar lado a lado com o print oficial e com telas relacionadas aprovadas. Capturas de teste não substituem o usuário.
6. Publicar preview sem cache **somente quando a revisão correspondente estiver efetivamente live**. Informar SHA do preview e SHA do commit.
7. Aguardar aprovação visual explícita antes de marcar a tela como validada ou autorizar merge quando aplicável.

## 4. Duas tentativas sem resolver o mesmo problema

Duas correções fracassadas para a mesma causa obrigam **investigação antes de nova mudança**, não necessariamente um novo chat automático. Documentar: sintomas, viewport, commits, mudanças tentadas, evidências, causa ainda incerta e o que foi descartado. Se o contexto estiver contaminado com hipóteses antigas ou mensagens contraditórias, abrir novo chat **da mesma etapa** e começar exclusivamente pelo checkpoint atualizado. Nunca mudar de tela só para escapar de um defeito.

## 5. Estados e aprovação

- `planejada`: no roteiro, mas **não autorizada** para implementação.
- `autorizada`: o usuário ou checkpoint atual permitiu iniciar **essa tela**.
- `implementação`: código em construção; testes não equivalem a aceite.
- `validação visual`: candidato disponível com SHA, evidências e link sem cache.
- `aprovada visualmente`: aprovação **explícita do usuário** para uma revisão específica, sem presumir aprovação funcional.
- `encerrada`: critérios técnicos, funcionais e visuais aplicáveis cumpridos, documentados e autorizados. PR de etapa seguinte não é consequência automática de um CI verde.

Toda reprovação posterior invalida o aceite da **revisão modificada**, mas não apaga a evidência da versão aprovada anteriormente. Registrar aceite literal/ID da evidência quando disponível.

## 6. Handoff compacto obrigatório

Após mudança material atualizar **apenas o quadro curto** no checkpoint (preferencialmente menos de 8 mil caracteres):

- Etapa/tela autorizada e última decisão.
- Base, branch, PR e SHA exato **verificados**.
- Último CI verde e falhas conhecidas; não confundir workflows independentes.
- Status do Render/live e link sem cache, se publicado.
- O que foi aprovado visualmente e para qual revisão; o que **não** foi aprovado.
- Arquivos alterados, dependências protegidas, divergências, pendências e próximo passo técnico **dentro da mesma etapa**.

Detalhes exaustivos vão ao histórico versionado com data, tópico e vínculo à PR; não anexar diários sucessivos ao checkpoint curto. Preservar histórico literal e a rastreabilidade de decisões corrigidas.

## 7. Release, rollback e segurança

Não alterar `android/**` ou `apps/web/src/mobile/**`. Não modificar API financeira, banco, operações atômicas e gates para caber em um desenho visual. Não misturar dados reais nos mocks de preview. Revalidar impacto cruzado quando alteração atingir arquivos protegidos. Nenhum merge por autonomia genérica substitui a autorização visual necessária. Se o deploy falhar, informar exatamente o último commit `live`; não divulgar URL antiga como se fosse revisão nova.

### Segurança permanente do projeto Evolution

Conforme o hardening registrado em 05/10/2026 para o Supabase `meg-evolution`, **manter RLS nas tabelas `public`** e não restaurar permissões de tabela, sequência ou função para `anon`/`authenticated` sem decisão arquitetural expressa. Não criar policies permissivas apenas para silenciar avisos. A Evolution API usa PostgreSQL diretamente, por `DATABASE_CONNECTION_URI`, conforme o histórico; **verificar a configuração atual antes de operar**. Em mudanças da API ou persistência, revalidar conexão e Security Advisor. O rollback histórico `docs/security/evolution-supabase-hardening-rollback-20261005.sql` não deve ser aplicado sem falha comprovada causada pelo hardening. Preservar segredos, isolamento e testes de autorização.

## 8. Checklist de revisão documental

- [ ] Fontes atuais identificadas e sem conflito não resolvido
- [ ] Etapa e último SHA conferidos contra o GitHub
- [ ] Nada no histórico antigo promovido a autoridade atual
- [ ] Falhas técnicas e visuais separadas
- [ ] Aprovações explícitas preservadas, sem novas homologações presumidas
- [ ] Android, API financeira e dados protegidos
- [ ] Próxima etapa NÃO iniciada sem autorização
