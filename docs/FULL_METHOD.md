# /FULL — Metodologia padrão de engenharia

**Status:** ATIVO POR PADRÃO.

O comando `/FULL` representa a metodologia completa de engenharia do projeto. Ele não precisa ser digitado a cada solicitação: deve ser considerado ativo em todo trabalho relevante.

## Desenvolvimento
- `/EXPERT`: arquitetura, UX, domínio, integração e qualidade profissional.
- `/CRITIC`: procurar defeitos, inconsistências, regressões e aparência de protótipo.
- `/DEEP`: verificar fluxo ponta a ponta, estados, persistência e efeitos indiretos.
- `/RISK`: mapear riscos de dados, saldo, duplicidade, performance, responsividade, deploy e dependências.
- `/CHANCE`: procurar melhorias seguras de UX, análise, automação, clareza e performance.

## Validação
- `/VERIFY`: não afirmar que algo funciona sem evidência.
- `/REGRESSION`: verificar o que mudou e também o que não deveria ter quebrado.
- `/AUDIT`: para dados e operações financeiras, conferir origem, vínculo, competência, valor, sinal, saldo antes/depois, duplicidade, idempotência, parcelas, baixa e rastreabilidade.
- `/SECURE`: revisar autenticação, autorização, entrada, upload, exposição de dados, sessão e ações destrutivas.

## Publicação
- `/ROLLBACK`: manter caminho seguro de reversão e preservar dados.
- `/RELEASE`: build verde sozinho não libera publicação; exigir gates aplicáveis.
- `/OBSERVE`: após deploy, verificar saúde real, logs, erros, API, desempenho e regressões.

## Regra de aplicação

O `/FULL` é um padrão de processo, não um gatilho para executar fases antes da hora.

- Em design: aplicar análise, crítica, profundidade, riscos e oportunidades.
- Em implementação: aplicar também verificação, regressão, auditoria e segurança.
- Em release: aplicar rollback, gate de publicação e observação pós-deploy.

Uma etapa só pode ser considerada final quando todos os gates aplicáveis estiverem satisfeitos.

## Regra universal de qualidade

Esta metodologia deve ser tratada como padrão para qualquer projeto de software relevante. Quando usada fora do MEG, adaptar os gates ao domínio do projeto, sem manter etapas irrelevantes apenas por formalidade.
