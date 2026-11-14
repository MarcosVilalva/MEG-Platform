# MEG Finanças Web Evolution | Etapa 10 | Ativação HTTP exclusivamente no QA descartável

**Data:** 14/11/2026. **Repositório:** `MarcosVilalva/MEG-Platform`.
**PR:** [#688](https://github.com/MarcosVilalva/MEG-Platform/pull/688), Draft, sem merge.
**Branch:** `stage08/unified-qa-stage05-08-10-20261112`.

## Objetivo, autorização e limite

O responsável autorizou seguir para o próximo passo após o contrato HTTP read-only ser caracterizado. O passo delimitado era revisar as condições de ativação somente em QA isolada, usando autenticação e controles de segurança, preservando a interface homologada, writers bloqueados e os ambientes reais.

**Decisão:** ativar e verificar o endpoint apenas no runner GitHub Actions com PostgreSQL 17 **descartável** e servidor Fastify escutando `127.0.0.1` em porta efêmera. Não houve exposição pública, nova instância Render, comunicação com banco real ou registro no `apps/api/src/server.ts`.

## Verificação da infraestrutura disponível

O Render autorizado `meg-stage08-alerta-prism-pr685` (`srv-dbr00b56e07s738n62n0`), workspace `tea-d98k1qhkh4rs73f4sfj0`, é do tipo **static_site**, com branch `stage08/overdue-prism-warning-20261112`, Auto Deploy OFF e sem execução de API. Não pode fornecer endpoint HTTP Fastify. Não modificar o tipo desse serviço nem improvisar uma rota de backend no frontend. Não criar novo serviço Render sem autorização específica.

A rota `POST /finance/batch-edit/card-cycle/preview` continua **não registrada no servidor API principal**. O contrato é registrado apenas no processo do runner temporário. O formulário de edição em lote, homologado visualmente, permanece demonstrativo e não consome o endpoint.

## Implementação

Commit técnico: `f722ff104acbbac6922a4baa8d60a752a4b03571`.

| Arquivo | Alteração |
|---|---|
| `apps/api/src/modules/finance/stage10-qa-readonly-loopback.ts` | Novo host Fastify de QA que só inicia com `NODE_ENV=test`, `MEG_STAGE10_ISOLATED_PG=1`, `MEG_STAGE10_QA_HTTP_ENABLED=1` e `DATABASE_URL` PostgreSQL apontando para `127.0.0.1:5432/meg_stage10_sandbox?schema=public`. Registra JWT, cabeçalhos de segurança e **somente** a rota de prévia. Bind fixo `127.0.0.1`, porta 0. |
| `apps/api/src/modules/finance/stage10-qa-readonly-loopback.isolated.test.ts` | Novo teste de ponta a ponta HTTP local com token fictício, dados de usuários, workspace, cartões e compras fictícios; testa controles de ambiente, JWT, roles, isolamento de propriedade, mudanças de competência e centavos, caminhos de gravação inexistentes, integridade das parcelas e ausência de audit logs/mutation receipts gerados pelas leituras. |
| `apps/api/src/modules/finance/batch-edit-preview-adapter.ts` | Adicionada a instrução `SET TRANSACTION READ ONLY` como primeira operação da transação `RepeatableRead`. O próprio PostgreSQL impede INSERT, UPDATE e DELETE nessa transação. |
| `.github/workflows/meg-stage10-financial-readonly.yml` | Passo específico executa o teste HTTP em runner PostgreSQL efêmero com `NODE_ENV=test` e habilitação transitória; os demais gates financeiros continuam ativos. |

Nenhum arquivo do Android, UI da Web, backend writer, server.ts, Render, banco de produção ou schema real foi alterado.

## Testes e resultados comprovados

- [GitHub Actions financeiro #43595159986](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43595159986): **SUCCESS**, commit técnico `f722ff104acbbac6922a4baa8d60a752a4b03571`. Logs: `MEG_STAGE10_CARD_BATCH_READONLY_PREVIEW PASS`, `MEG_STAGE10_AUTHENTICATED_BATCH_READ_ADAPTER_POSTGRES PASS`, `MEG_STAGE10_HTTP_PREVIEW_AUTH_ZOD_RATE_READONLY PASS`, `MEG_STAGE10_QA_LOOPBACK_HTTP_POSTGRES_READONLY PASS`, verificação TypeScript da API aprovada.
- [GitHub Actions QA integrada #43595159996](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/43595159996): **SUCCESS**. Ações da Etapa 10 em 390, 640, 960, 1024 e 1366 px; Prism compacto paisagem em 820×360, 1024×450, 1366×768, 1920×1080/1200; editor wide em 1440×900, 1920×1080/1200, todos PASS.
- Requisições HTTP reais via `fetch` ao servidor loopback: login ausente 401, token inválido 401, VIEWER de mesmo workspace 200 com `canWrite:false`, usuário de outro workspace 403, campo `workspaceId` fornecido pelo cliente 400, data inválida 400, rotas de escrita 404, cálculo de parcela e vencimento pelo domínio canônico, e inexistência de alterações financeiras geradas pelas leituras.
- Travas de inicialização testadas contra `NODE_ENV=production`, guarda desativada, hostname remoto e banco diferente do nome descartável: todas rejeitadas.
- Dados criados pela **preparação da fixture de CI**, não pela rota nem pela função de leitura. Não extrapolar resultados para um endpoint público de produção.

## Gates, aprovações e riscos

- **Homologação visual prévia confirmada:** Nova Despesa, Editar Despesa, botão Ações e edição em lote MEG Prism 2.0 continuam preservados. Não há alteração visual nesta rodada e não foi necessário novo aceite de layout.
- **Validação funcional da rota:** aprovada apenas no **QA efêmero de CI**, não em ambiente público persistente. A integração da prévia com o modal ainda não foi realizada ou homologada.
- **Rate limiting:** o contrato usa limiter em memória por IP, adequado ao teste de instância única. Não garante limite agregado em múltiplas instâncias. Antes de publicar externamente, avaliar proteção distribuída/edge, proxy confiável, HTTPS, autenticação real, origem CORS, logs e segregação de credenciais.
- **Identidade:** no teste HTTP usa JWT sintético. A permissão de workspace é verificada novamente no banco pelo adaptador. Qualquer publicação externa exige infraestrutura de QA separada, usuários/segredos de QA e controles de acesso reais.
- **Dados:** não usar cópias de produção. Não importar dados MEG para QA. Sem endpoints de escrituração, pagamento, transferência, arquivamento, parcelamento ou baixa.
- **Convergência de regras:** benefícios, Verocard Alimentação, Payable, conversão de FinancialEvent para compra de cartão e qualquer writer de lote permanecem bloqueados ou sob autoridades próprias.
- **Pendência legada independente:** workflow Stage09 continua com o gate de hash da Home desatualizado, já existente antes desta rodada. Não adulterar/desativar a guarda.

## Estado da infraestrutura e próximos passos

- PR #688 **Draft, sem merge**.
- **Último Render visual homologado:** `dep-dbs3vijbc2fs73aggcn0` LIVE no código `01e55459aa6fba813984dc047470383c80eb54ec`, Auto Deploy OFF.
- **Preview visual sem cache:** https://meg-stage08-alerta-prism-pr685.onrender.com/meg-unificado-qa.html?visual=prism&tela=lancamentos&v=01e55459aa6fba813984dc047470383c80eb54ec
- **Não foi criado endereço público novo** para o endpoint read-only, porque a hospedagem autorizada é estática e não há backend QA persistente autorizado.
- **Próximo passo exato da Etapa 10:** definir e autorizar infraestrutura persistente de **API QA isolada**, sem modificar o serviço estático homologado, com segredo JWT e banco fictício próprios, limites de acesso e custos conhecidos. Só após isso registrar o contrato nela e validar HTTP real externo. A integração da resposta ao modal ocorrerá em gate separado e continuará sem writer.

**Proibições mantidas:** produção, Android, Supabase real, banco real, novos serviços sem autorização, merge, deploy produtivo, alteração de telas homologadas, habilitação de escrita financeira e Etapa 11.
