# QA isolado: unificação somente leitura Home + Lançamentos (11/11/2026)

**Situação:** experimento de integração em PR Draft, sem merge/deploy e sem acesso a banco real. Origem: Home P0 #669 (\`c85e0e4d\`); doadora: API Stage09 #663 (\`99d20ffa\`). Ainda não integra UI de Lançamentos #656.

## Alterações de código
- Mantém intacto o endpoint \`GET /finance/home-commitments\` e seus contratos.
- Acrescenta as rotas somente leitura \`GET /finance/events/history-snapshot\` e \`GET /finance/events/filtered-summary\` da #663, usando a autoridade financeira, transação Repeatable Read, titular do workspace e limite declarado.
- Acrescenta revisão dos eventos ativos ao \`sync-status\` e capacidades explícitas, sem ignorar alterações de histórico.
- Usa a implementação **mais recente** de \`history-filter.ts\`, que recupera rótulos históricos de \`sourcePayload\` e \`importedRow.rawData\`; não sobrescreve comportamento antigo por uma branch paralela.
- Preserva o conteúdo existente de \`service.ts\` e \`routes.ts\` na Home; as novas funções são aditivas.
- Adiciona CI exclusiva em PostgreSQL 17 fictício, gate de alterações de arquivos e builds sem deploy.

## Gates de bloqueio
1. A CI da nova branch deve terminar COMPLETED/SUCCESS antes de qualquer outra intervenção. Erros de compilação ou regressões devem ser corrigidos sem afrouxar testes.
2. Reconciliar UI de Lançamentos #656 em outra intervenção isolada, preservando Home #9, ações rápidas, alertas, navegação e logout. A implementação da UI **ainda não aconteceu** neste experimento.
3. Backup e recuperação reais seguem no outro chat / PR #666. Este branch não pode executar dump, migração produtiva, ou modificar Supabase.
4. Configuração da API Render mantém build perigoso com \`db:prepare:production\` e \`db:push:production\` e Auto Deploy ON; não acionar merge, deploy ou alteração de Settings até gates operacionais e autorização independente.
5. Testes em banco sintético e preview não substituem a homologação operacional autenticada ou visual.

**Arquivos proibidos:** Android, UI, schema Prisma, writers financeiros e infraestrutura de produção. **Etapa 09 continua aberta.**
