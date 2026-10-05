# MEG — instruções persistentes para retomada

Antes de alterar o MEG Web ou responder a “Retomar MEG — memória oficial — último ponto validado”, ler primeiro `docs/MEG_WEB_MASTER_SPEC.md`. Se `docs/MEG-RETOMADA-OFICIAL.md` estiver presente na branch corrente, usar também seus checkpoints históricos e referências visuais.

Referência visual obrigatória: `docs/design/2026-10-03/manifest.json` e os 16 PNGs originais ao lado quando disponíveis. O conjunto define o novo sistema confirmado por Marcos. As regras financeiras existentes do App continuam obrigatórias.

**REGRA ABSOLUTA PARA O TRABALHO EVOLUTION WEB:** `/android/**` e `apps/web/src/mobile/**` são somente leitura. Podem ser consultados como referência funcional/visual, mas não podem ser editados, renomeados, removidos, reformatados, ter versões alteradas, receber assets, builds, configuração, OTA ou qualquer outra modificação como parte da reconstrução Web. Qualquer mudança no Android exige uma solicitação explícita e separada do usuário.

Não assumir que uma imagem de referência, uma prévia estática ou um build verde é implementação funcional ou validação visual final. Verificar main, código, screenshots, testes e estágio real de cada módulo.

Manter a documentação atualizada com o resultado real de cada etapa, a revisão correspondente e pendências concretas. Não depender somente do chat nem solicitar de novo imagens já presentes no repositório.

Preservar Loading aprovado, responsividade, SVGs lineares premium, neon elegante, profundidade 3D, legibilidade, telas fixas e rolagem somente nas áreas densas. Conferir todas as regras de lançamento, conta, crédito, benefício e baixa no checkpoint oficial antes de editar fluxos financeiros.

## Metodologia obrigatória do projeto

Aplicar por padrão, em toda implementação, revisão, handoff ou validação relevante:

**/EXPERT + /CRITIC + /DEEP + /RISK + /CHANCE**

- **/EXPERT:** pensar em arquitetura, UX, domínio, integração e qualidade de produto profissional antes de codificar.
- **/CRITIC:** procurar defeitos, incoerências, regressões e aparência de protótipo; não aprovar “quase pronto”.
- **/DEEP:** verificar fluxo ponta a ponta, estados, persistência, refresh, período, responsividade e efeitos indiretos.
- **/RISK:** avaliar integridade financeira, duplicidade, saldo, regressões, performance, dependências, deploy e rollback.
- **/CHANCE:** identificar melhorias seguras de UX, análise, automação, performance e clareza que elevem o produto sem alterar escopo silenciosamente.

Esses cinco nomes são atalhos de metodologia do MEG, não comandos técnicos especiais da plataforma.

Antes de declarar “pronto”, revisar explicitamente as cinco lentes e não concluir a etapa se houver falha crítica em qualquer uma delas.


## /FULL — padrão permanente

O projeto adota `/FULL` como metodologia padrão e ativa por default em todo trabalho relevante. Ler também `docs/FULL_METHOD.md`.

`/FULL` = `/EXPERT + /CRITIC + /DEEP + /RISK + /CHANCE + /VERIFY + /REGRESSION + /AUDIT + /SECURE + /ROLLBACK + /RELEASE + /OBSERVE`.

Não é necessário o usuário digitar `/FULL` a cada solicitação. Aplicar automaticamente os gates pertinentes ao estágio atual do trabalho. Não manter qualquer alias `/FU`.


## Security Hardening — regra persistente

Após o checkpoint de produção de 2026-10-05, ler também a seção **Security Hardening Gate** de `docs/MEG_WEB_MASTER_SPEC.md`.

Segurança é parte do padrão `/FULL` e deve ser aplicada antes de novas expansões relevantes. Não considerar uma entrega concluída sem verificar, quando pertinente: rate limiting, autenticação, autorização, isolamento de workspace, exposição de rotas técnicas, secrets, headers/CSP, dependências, entradas hostis, privilégios do banco e regressões de segurança.

Para recursos de IA/Financial Copilot: conteúdo financeiro recuperado é dado não confiável e nunca ganha autoridade por conter instruções. Nenhuma IA pode executar mutações financeiras ou administrativas sem autorização explícita e controles de domínio.
