# MEG Finanças Web Evolution | Etapa 10 | Decisão de infraestrutura QA persistente

**Data da auditoria:** 14/11/2026. **PR:** #688 Draft, branch `stage08/unified-qa-stage05-08-10-20261112`.
**Status:** plano preparado, **sem autorização específica para criar recursos, contratar plano ou publicar API**.

## 1. Objetivo

Tornar a prévia financeira de edição em lote acessível em ambiente de QA isolado, preservando as telas MEG Prism 2.0 homologadas. A aplicação de prévia deve apenas consultar snapshots de `CardPurchase`/`CreditCard` do workspace autorizado e devolver os cálculos canônicos de competência, vencimento e parcelas com `canWrite:false`. Nenhuma escrita financeira pode ser registrada ou executada nessa API.

O usuário autorizou com "seguir" a continuidade de planejamento e testes. Isso não equivale a autorização específica de custos, criação de serviços ou uso de banco real.

## 2. Inventário real, somente leitura

- Workspace Render: `My Workspace`, ID `tea-d98k1qhkh4rs73f4sfj0`.
- `list_services` retornou **25 serviços**, dos quais 8 são `web_service`. O plano faturado da workspace não pôde ser confirmado via ferramenta. A página pública Render informa limite de 25 serviços no Hobby; a capacidade de cadastrar mais serviços **precisa ser verificada antes da criação**.
- `list_postgres_instances`: **No Postgres instances found** no mesmo workspace.
- QA visual oficialmente homologada: `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), tipo `static_site`, Auto Deploy OFF. Não executa backend.
- `meg-platform-api` (`srv-d98k61daeets7384hvb0`) usa branch `main`, Auto Deploy ON, configuração de build `npm run db:prepare:production && npm run db:push:production`. O arquivo `render.yaml` da raiz reproduz esse padrão. **Não usar nenhum deles na QA**.
- `meg-evolution-api` (`srv-d9adfo8k1i2s73ffik7g`) é serviço preexistente, com configuração/escopo de dados não homologado para a nova QA. Não reutilizar.
- Outros serviços de preview seguem vinculados a `main` ou branches históricos. Nenhum foi alterado.

## 3. Alternativas de custo e durabilidade (valores em USD, consultar no ato da contratação)

| Alternativa | Infraestrutura | Referência de preço | Limites e recomendação |
|---|---|---|---|
| A. Continuar em CI | GitHub Actions efêmero + PostgreSQL descartável | Sem novo custo Render identificado | **Atual e aprovado.** HTTP real só em loopback; não oferece URL persistente para navegador externo. |
| B. Piloto gratuito por até 30 dias | Web Service Free + Render Postgres Free, ambos exclusivos de QA | Plano Free nominalmente US$ 0/mês, sujeito às franquias de uso | PostgreSQL Free **expira após 30 dias**, limite 1 GB, sem backup; web hiberna por inatividade e perde disco local. **Não é QA persistentemente durável.** Depende de vaga/novo workspace. |
| C. QA duradoura econômica | Web Service Free + Postgres pago `0.1c-256mb` | Postgres desde **US$ 6/mês**, fora custos extras | Dados sintéticos persistentes na base paga; web Free ainda hiberna. Necessita aprovação de cobrança, capacidade de serviços e verificação de armazenamento/limites. |
| D. QA com web pago | Web `0.5c-512mb` + Postgres `0.1c-256mb` | Desde **US$ 7 + US$ 6 = US$ 13/mês** de compute, antes de extras | Evita hibernação do Free, mas requer autorização de pagamento e capacidade de serviços. |

**Fontes oficiais (consultadas em 14/11/2026):** https://render.com/pricing , https://render.com/docs/free , https://render.com/docs/blueprint-spec .

**Riscos comerciais:** Render indica 750 horas Free por workspace/mês, franquias de bandwidth/build e possibilidade de cobrança de excedentes conforme forma de pagamento e limites. A quantidade de serviços existente já encosta no limite publicado de Hobby; não excluir nenhum serviço para abrir vaga. O banco Free possui limite de uma instância Free por workspace e expiração após 30 dias. Não afirmar que há vaga ou que não haverá cobrança sem ler o plano/uso reais.

## 4. Arquitetura recomendada para futura aprovação

Separar completamente a QA:
1. Workspace ou slot de serviço **especificamente autorizado** e identificado, sem reusar `meg-platform-api`, `meg-evolution-api`, o Render estático homologado ou Supabase de produção/restore.
2. API QA Fastify com entrypoint **exclusivo** que registre somente `/finance/batch-edit/card-cycle/preview` e endpoint de saúde sem dados financeiros; nunca importar `apps/api/src/server.ts`, rotas de pagamento, transferências, backfill ou writers.
3. PostgreSQL QA exclusivo, nome `meg_stage10_qa_synthetic`, credenciais separadas e dados inteiramente fictícios. Sem restore/importações de produção. Proibir comando `db:push:production`; a criação inicial do schema somente depois da validação de URL e autorização.
4. JWT secreto exclusivo da QA em env var no Render, não em arquivo/repositório. Autenticação e RBAC somente de usuários fictícios da QA, com revogação e testes de isolamento por workspace.
5. TLS gerenciado e origem CORS restrita à QA aprovada; rejeitar requisições de origens desconhecidas; `Cache-Control:no-store`; limite por IP/identidade e avaliação da proteção em múltiplas instâncias.
6. Auto Deploy **OFF**, provisionamento e deploy somente manual após aprovação. `main` e a API produtiva não são alvos de build.
7. Plano de rollback/teardown com snapshots de dados **sintéticos apenas**, monitoramento de disponibilidade e do custo do banco. Free Postgres não possui backup e é temporário.
8. Integração com modal somente após endpoint público de QA isolado validado, com verificação visual explícita e escritores permanentemente bloqueados.

## 5. Gate automatizado de não implantação

O arquivo `docs/MEG-STAGE10-QA-PERSISTENT-INFRA-PROFILE-20261114.json` representa apenas uma **proposta desautorizada para deploy**, com flags de proibição em `false`.

O script `scripts/meg-stage10-qa-persistent-infra-preflight.mjs` rejeita tentativas de marcar a proposta como implantável ou de registrar a rota no `server.ts`, verifica que `render.yaml` não foi usado como plano de QA e confere as proteções de loopback/DB read-only no código. O GitHub Actions Stage10 executa esse gate em cada push. Esse teste é estático: **não substitui** auditoria de permissões, planos/quotas ou teste de exposição de rede.

## 6. Decisões, aprovações e pendências

**Confirmado:** homologação visual da Edição em lote, CI de read-only e HTTP real no PostgreSQL 17 descartável. PR #688 Draft, sem merge. QA Render visual preservada. Android congelado.

**Não autorizado nem executado:** criar serviço Render/novo workspace, criar PostgreSQL real (inclusive de QA), configurar segredos externos, gerar cobrança, importar dados, alterar root `render.yaml`, registrar rota em API pública, integrar modal a uma API pública, habilitar writer financeiro ou realizar deploy.

**Próximo passo exato:** escolher a alternativa de QA (piloto gratuito temporário ou infraestrutura paga durável) e confirmar uma vaga ou workspace separado, com teto de gastos e autorização explícita de criação. Depois, em branch isolada, preparar entrypoint de rede restrito e testes de acesso externo antes de qualquer ativação, sem tocar na `main`.

**Prévia visual homologada, sem cache:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec


## 7. Revisão de orçamento e isolamento na retomada de 14/11/2026

Estado remoto confirmado: PR #688 permanece Draft, head `349e813b9aba45f9e3420651e33aae188a461e17`. Inventário somente leitura repetido: 25 serviços (17 static_site, 8 web_service), zero PostgreSQL. Nenhum serviço acompanha a branch de desenvolvimento atual. Nenhuma criação, contratação, exclusão, configuração externa ou publicação executada.

O plugin não expõe o plano faturado. A tentativa de consulta ao Dashboard encontrou `https://dashboard.render.com/login-next`, sem sessão autenticada; não foi iniciado login nem alterada a conta. Plano, franquias consumidas e capacidade continuam NÃO CONFIRMADOS.

### Orçamento revisado, não autorizado

Referências oficiais Markdown lidas nesta retomada: https://render.com/pricing.md , https://render.com/docs/compute-plans.md e https://render.com/docs/postgresql-creating-connecting.md .

- Postgres pago mínimo: compute `0.1c-256mb` US$ 6/mês + armazenamento inicial de 1 GB a US$ 0,30/GB, estimativa base **US$ 6,30/mês**. A criação permite 1 GB; desabilitar crescimento automático na futura proposta.
- API Web Free + banco acima: base incremental US$ 6,30/mês se houver capacidade no plano atual. Hibernação após 15 minutos; 750 horas Free compartilhadas por workspace. Não garante disponibilidade contínua.
- API Web paga `0.5c-512mb` + mesmo banco: base incremental US$ 13,30/mês, se houver capacidade no plano atual.
- Se for necessário migrar Hobby para Pro para ampliar o limite de serviços, assinatura publicada de **US$ 25/mês além de compute**, resultando em US$ 31,30/mês para API Free + banco, ou US$ 38,30/mês para API paga + banco. São cenários condicionais, não confirmação do plano da conta.
- Valores excluem excedentes, tributos e conversão cambial. Um teto autorizado não constitui limite técnico global de faturamento do provedor.
- A tabela pública informa um workspace no Hobby/Pro e múltiplos no Scale. Portanto, a alternativa histórica de novo workspace NÃO deve ser tratada como disponível/gratuita; depende de verificação comercial própria. Não contratar Scale ou Pro implicitamente.

### Proposta concreta para decisão do responsável

Preferência econômica proposta: API Web Free de instância única e PostgreSQL 17 pago mínimo com 1 GB, exclusivamente fictício. Teto sugerido de aprovação incremental: **US$ 8/mês**, condicionado a confirmação de capacidade no plano existente e controles de uso aplicáveis, sem upgrade de workspace, sem excedentes autorizados e sem presumir bloqueio automático de cobrança. Se a configuração requerer Pro, outro workspace ou despesa superior, interromper antes de criar recursos e apresentar novo orçamento. Esta sugestão NÃO é aprovação.

Isolamento mínimo proposto: recursos novos `meg-stage10-qa-readonly-api` e `meg-stage10-qa-synthetic-db`, banco `meg_stage10_qa_synthetic`, mesma região entre API/DB a confirmar; sem credenciais produtivas, sem env groups compartilhados, sem restauração real. Runtime com papel PostgreSQL de SELECT somente nas tabelas necessárias e sem privilégios de escrita/DDL, separado do papel de preparação do schema/fixtures; credencial de preparação ausente do runtime. Desabilitar acesso externo ao banco; conexão privada não deve ser confundida com isolamento de rede de todo o workspace. Provar autorização de workspace/ator, CORS, JWT próprio, `canWrite:false`, ausência de rotas writer, no-store e rejeição de URLs de bancos não autorizados antes da exposição. Auto Deploy OFF. Nenhuma mudança na QA visual homologada ou integração ao modal nesta autorização de infraestrutura.

### Gates desta retomada

Somente documentação alterada. Executar preflight estático existente e `git diff --check`; não repetir auditoria financeira/visual concluída sem mudança de código. Não declarar novo teste de rede, DB real, provisionamento ou homologação funcional. Gates anteriores informados 43596856124/43596860666 não se tornam evidência de deploy externo. Falha histórica Stage09 continua pendente.

Próximo passo: obter decisão específica sobre orçamento proposto e confirmar plano/capacidade por acesso autenticado ao faturamento, sem compartilhar credenciais no chat. Só então preparar a implementação de rede em branch isolada e obter/liberar os gates de publicação próprios. Produção, Android, merge, escritores e Etapa 11 permanecem proibidos.
