# MEG Finanças Web Evolution | Etapa 10 | Bloqueio externo de picomatch

**Data da verificação:** 18/11/2026  
**Escopo:** consulta de fontes oficiais e manifestos; sem mudança de código financeiro, pacotes, CI, Android ou produção.  
**Situação:** SEGURANÇA GLOBAL BLOQUEADA. NÃO DECLARAR ETAPA 10 CONCLUÍDA.

## 1. Evidência verificável

- O candidato da API é o [PR #702 Draft](https://github.com/MarcosVilalva/MEG-Platform/pull/702), branch `stage10/api-identidades-release-20261118`, commit `19aaa96b508f3d4db2a38ef0866ca5622b377200`. O CI de API com inventário isolado já está aprovado no [run #44303920824](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44303920824); o CI geral [#44303935997](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44303935997) continua com bloqueio de alto risco em `picomatch`.
- No `package-lock.json` desse commit, `picomatch@4.0.4` é instalado por `vite@6.4.4` e `tinyglobby@0.2.17`. A versão npm `latest` de `picomatch` verificada em 18/11 é `4.0.7`.
- O [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), CVE-2026-112366, abrange o pacote até 4.0.7, sem versão oficial corrigida publicada.
- O [PR upstream #238](https://github.com/micromatch/picomatch/pull/238) não foi mesclado e uma [revisão pública no PR](https://github.com/micromatch/picomatch/pull/238) aponta casos ainda lentos e alteração de semântica. Portanto, NÃO promover o commit da proposta a remediação validada.
- A [linha Vite 8 no manifesto upstream](https://github.com/vitejs/vite/blob/main/packages/vite/package.json) também declara `picomatch`, então um upgrade de major não elimina esse pacote por si só.
- A auditoria do monorepo (`scripts/npm-security-audit.mjs --audit-level=high`) não deve ser reduzida, mascarada, excluída por caminho, substituída por código HTTP fictício, nem aprovada por interpretação do risco sem correção comprovada.
- O build isolado da API comprovadamente não depende de `picomatch` instalado e não tem alerta alto/crítico no inventário efetivo [CI #44303920824](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44303920824). Essa evidência **não** substitui os gates de liberação do monorepo.

## 2. Alternativas descartadas ou não autorizadas

1. Override para 4.0.7: permanece afetada; não passa no gate.
2. Git commit não publicado de PR #238: revisão incompleta, sem versão oficial, sem garantia de compatibilidade; não adotar.
3. Migrar Vite 6 para Vite 8 apenas para eliminar picomatch: o Vite 8 continua a declará-lo.
4. Ignorar advisory, reduzir audit-level ou liberar APK sem gate: proibido.
5. Trocar toolchain de build inteiro para atender auditoria: exigiria caracterizar saída Web/Android, assets, compatibilidade e segurança; não autorizado nem proporcional enquanto há correção upstream pendente.

## 3. Gatilhos de retomada técnica

**Condição A:** versão oficial de `picomatch` publicada, com comunicado de correção e intervalo de vulnerabilidade no advisory atualizado para excluí-la.  
**Condição B:** retirada formal do advisory por autoridade competente, documentada, sem relaxamento arbitrário da auditoria.  
**Condição C:** substituição funcional provada e auditada do pacote em toda a árvore de dependências, com compatibilidade da Web, API e APK e aprovação específica. NÃO presumir que exista.

Após alguma condição:
1. Abrir mudança isolada de dependências e atualizar o lockfile reprodutível, sem mexer em dados reais, Android estável ou UI homologada.
2. Executar auditoria integral **no lockfile efetivo**, conferindo níveis alto/crítico, npm e OSV, e confirmar integridade/inventário da API.
3. Rodar CI geral, financeira, CORS, build/API e Android QA e comparar contratos; publicar somente APK debug no pacote `br.com.megfinancas.app.stage10qa` após todos os gates.
4. Homologar no aparelho físico com API e PostgreSQL 17 fictícios a persistência do `operationId`, reenvio pós-commit, reinício/reabertura e writers monetário/benefício.
5. Verificar no Render, sem acionar rollback, elegibilidade do artefato anterior `dep-dbm92b17lnhs738s0jr0`, e observar que a reversão do escritor antigo é aceitável **apenas antes de vincular registros reais**. Depois de piloto, somente correção direta preservando IDs/vínculos, sem restauração do writer que recria IDs.
6. Obter autorização explícita específica antes de merge, deploy, mutação real ou piloto por ID. Manter issues #691, #698, #699 e #700 até critérios concluídos.

## 4. Evidência de segurança do Render

- Serviço `meg-platform-api`, pacote Free, branch `main`, autoDeploy desativado; build vigente `dep-dbm92b17lnhs738s0jr0`/commit `28703a9` permanece `live` (consulta do conector Render em 18/11).
- A [documentação de Rollbacks](https://render.com/docs/rollbacks) condiciona reversão à disponibilidade de artefato retido. A [documentação do plano Free](https://render.com/docs/free) admite rollback para os **dois deploys anteriores mais recentes**. Isso é uma regra de elegibilidade por plano, **não prova da retenção do artefato específico depois de uma futura publicação**.
- O conector Render só informa a existência/status do deploy. Sem leitura da opção de rollback do alvo após nova publicação, a disponibilidade futura continua NÃO COMPROVADA.
- Rollback do código não desfaz alterações de dados nem garante que o escritor antigo preserve IDs no cenário pós-piloto.

## 5. Acompanhamento e limites

- Há uma automação de consulta diária da versão oficial e do GHSA, sem alteração automática de PR, lockfile, CI, API ou Render. ID de controle: `6afdac9b76988191bf76e39504601a59`.
- Nenhuma ação no Supabase, Render, Android estável, produção, main ou Etapa 11.
- Indicador formal do projeto permanece 5/10 marcos técnicos e 0% saneamento produtivo. CI verde isolado não equivale a aprovação de publicação.
- Saúde do chat nesta revisão: **normal**. Em risco de perda de contexto, preparar checkpoint obrigatório antes de recomendar novo chat.
