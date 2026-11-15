# MEG Finanças Web Evolution | Etapa 09
## Proposta de isolamento do Gate 1 após auditoria Work em 12/11/2026

**STATUS: PROPOSTA DOCUMENTAL, NÃO IMPLEMENTADA. Gate 1 PARCIAL; Gate 2/3/4 NO-GO.**  
PR #666 Draft, branch `stage09/backup-recovery-kit-20261110`. Teto financeiro autorizado: R$ 0,00. Não há autorização para alterar configurações do Supabase nem implementar fixtures.

### Alvos e governança
- **Exclusivo:** `meg-stage09-restore-sandbox-20261112` / `oxwmqbzeuiibdlkcbjzv`.
- **Protegidos, sem escrita ou consultas novas:** Supabase produção `ugbiqzaqnrhulhetevby`; projeto inativo `dmrauztnozvxirbydtho`; Android, Web homologada, Render, banco PostgreSQL WSL restaurado `meg_restore_drill`.
- Issues #674 (LedgerEntry em Payable) e #676 (pg_net/watchdog) devem permanecer abertas. Autoridade financeira canônica não pode ser modificada para acomodar o ensaio.
- Fonte primária da auditoria gerenciada: seção final de `MEG-WEB-CONTINUIDADE-OFICIAL.md` no commit `9bdf1d4e1bc393d2acff9068945d86ebfdeb38f7`. Inspeção Work foi exclusivamente visual/read-only, sem consultas SQL.
- Complementação nesta rodada: conector Supabase realizou **um SELECT read-only somente no sandbox**, consultando exclusivamente contagens. Nenhuma linha de usuário/segredo/objeto ou valor financeiro foi lida.

### 1. Reconciliação verificável: contagens do banco versus estimativa do Dashboard

| Indicador | Observação Work no Dashboard | SELECT direto no banco do sandbox | Conclusão |
| --- | --- | ---: | --- |
| `auth.users` | “10 users (estimated)” | **0** | Contagem exata atual é zero; origem da estimativa não comprovada; não assumir dez identidades |
| `auth.identities` | Não observado | **0** | Sem identidades associadas atualmente |
| `auth.sessions` | Não observado | **0** | Sem sessões registradas atualmente |
| `storage.buckets` | Files indisponível por `exceed_egress_quota` | **0** | Zero buckets no catálogo SQL nesta consulta; a API/UI Storage segue operacionalmente restrita |
| `storage.objects` | Não verificável em Files | **0** | Zero objetos no catálogo SQL; bytes/API não testados |
| `vault.secrets` | Não verificado nesta visita | **0** | Zero linhas de segredos no destino |
| Publicações de tabelas | Realtime com zero tabelas no Dashboard | **0** | Sem tabelas publicadas, não é prova de canais WebSocket desativados |
| Extensões e `public` | Evidências anteriores | **0** `pg_net`, **0** `pg_cron`, **0** relações `public` | Sem objetos MEG importados nem extensão de HTTP/cron no banco nesta consulta |

**Limite:** zero nas tabelas comprova somente o ponto no tempo consultado. Não comprova ausência de serviços externos na plataforma, negação de acesso aos endpoints ou disponibilidade de Auth/Storage para clientes. Não foi identificada tecnicamente a origem do indicador estimado “10 users”. O conector `get_project` ainda informou `ACTIVE_HEALTHY` enquanto o Work viu `Unhealthy / Services restricted`, portanto a saúde **operacional** não deve ser declarada aprovada.

### 2. Riscos específicos e proposta sem execução

**A. Auth / email**
- **Work observou:** Email habilitado; signup habilitado; confirmação de e-mail habilitada; SMTP customizado desligado; templates padrão. Phone/Anonymous/OAuth/OIDC/SAML desabilitados, hooks ausentes.
- **Risco confirmado como possibilidade:** cadastro futuro pode tentar enviar e-mail através do serviço padrão. Segundo a documentação Supabase, o SMTP padrão em projetos hosted pode entregar mensagens para endereços autorizados de integrantes da organização mesmo sem SMTP customizado. Desabilitar o SMTP customizado **não** é equivalente a bloquear a entrega de mensagens.
- **Proposta prioritária para futuro sub-gate de configuração, com autorização expressa:** impedir novos cadastros pelo fluxo de Email enquanto os testes não forem desenhados para não disparar mensagens. Avaliar desabilitar signup (preservando autenticação existente quando pertinente) ou desabilitar temporariamente o provedor Email no sandbox, após conferir impacto no objetivo do Gate 2. Para caracterização funcional de Auth no Gate 2, planejar contas fictícias com canal de entrega controlado e **zero destinatários reais**. Não usar e-mail pessoal/da equipe, nem chamar envio para comprovar isolamento.
- Phone desabilitado não comprova ausência de credenciais SMS já salvas; confirmar apenas presença de fornecedor por inspeção read-only quando acessível.

**B. Realtime**
- **Work observou:** Realtime habilitado, `Allow public access to channels` habilitado, publicação `supabase_realtime` sem tabelas; Inspector não exibia canal ativo no instante da visita.
- **Risco:** público permitido para Broadcast/Presence não requer tabela de usuário publicada. Não assumir ausência de acesso externo a partir de publicação vazia ou inspector momentâneo.
- **Proposta para futuro sub-gate de configuração:** preferencialmente desabilitar o serviço Realtime durante preflight e demais testes que não precisam de canais. Para ensaio específico de Realtime, restringir a **canais privados com autorização explícita** via RLS em `realtime.messages`, topic exclusivo e usuário fictício, sem conexão a clientes reais; retirar configuração de teste após avaliação. **Mudanças na página Settings desconectam clientes**, conforme documentação oficial, razão adicional para restringir a projeto-alvo e exigir aprovação. Nenhuma dessas medidas foi aplicada.
- Desabilitar `Allow public access` **sem** criar políticas adequadas não comprova que a funcionalidade pretendida tenha sido testada; autorização para criar políticas só poderá ser dada no sub-gate isolado de fixtures.

**C. Egress / estado operacional**
- Work verificou `Services restricted` / `Unhealthy` com `exceed_egress_quota` na página Storage. O conector reportou `ACTIVE_HEALTHY`, mas status de infraestrutura não equivale a endpoint de produto disponível.
- **Proposta:** sem upgrade, custo, reinício, pausa, troca de plano ou recriação. Registrar limite e consultar apenas métricas da organização quando houver autorização específica que contemple o escopo org. Caso a restrição impeça testes, **Gate 2 segue NO-GO** até serviço funcional comprovado, sem presumir data de normalização.
- Conforme documentação Supabase, egress é registrado por múltiplos serviços (Database, Auth, Storage, Functions, Realtime) e a cobrança/limite pode ser no escopo da organização. Não inferir que o sandbox vazio causou o excesso ou que liberar um projeto isoladamente resolve a cota.

**D. Integrações externas**
- Nenhuma integração registrada no Dashboard, nenhum hook ou FDW/pg_net/cron no banco. Isto **não exclui** clientes que usem uma URL/API key por fora do Dashboard.
- **Proposta:** guardar referências e chaves do sandbox exclusivamente para ambiente de teste, não colocar em Render/Web/Android/production CI, não publicar URL de webhook, não criar Secrets de infraestrutura conectados a sistemas reais. Inspecionar read-only eventual link com aplicações externas, sem apresentar chaves ao chat.
- `Site URL=localhost` e redirect list vazia são condições positivas, mas não substituem os demais controles.

### 3. Ordem exata para fechar Gate 1, sem executar nesta rodada

1. **Documentar a reconciliação de inventários:** a contagem real de usuários, identidades, sessões, buckets e objetos é zero no momento da consulta PostgreSQL. Preservar a divergência de estimativa como anotação de interface, não como dez usuários reais. Não ler perfis nem conteúdo.
2. **Preflight de segurança para Auth:** conferir novamente os estados de signup e e-mail; escolher uma configuração com garantia de não disparar notificações reais nos testes futuros. Mudança requer autorização expressa **somente para o sandbox**; usar rollback documentado e verificar estado final sem enviar mensagens.
3. **Preflight de segurança Realtime:** escolher entre desabilitar temporariamente Realtime ou exigir canais privados mais RLS para ensaio específico. Toda alteração requer aprovação separada; nenhum envio ou assinatura de cliente real.
4. **Verificar capacidade operacional do destino:** obter evidência de que os endpoints necessários estão acessíveis sem custos/upgrade, ou manter Gate 2 bloqueado se a quota impedir o serviço. Leitura SQL bem-sucedida não satisfaz sozinha o gate operacional.
5. **Revisão final das ligações externas e SMS:** confirmar que nenhuma integração produtiva/endereço real será utilizado durante Gate 2. Não criar e-mail/SMS/autorizações/credenciais.
6. **Somente após evidência e autorização:** registrar `GATE1=PASS` com limites técnicos e eventual autorização pontual de fixtures 100% fictícias. Gate 2 não começa automaticamente. Gate 3 de restore real e Gate 4 de aceite permanecem NO-GO.

### 4. Situação e proibições
- **Atendido:** reconciliação exata de contagens PostgreSQL sem dados pessoais; estado PR e CI do SHA Work revalidados; proposta de isolamento registrada.
- **Não atendido:** configuração efetiva de bloqueio de cadastro/e-mail e canais públicos, confirmação de fornecedor SMS, funcionamento do Storage API com egress restrito, disponibilidade operacional geral, isolamento da rede/integrações externas, Gate 1 aprovado.
- **Operações NÃO executadas:** alteração Supabase, SQL de escrita, criação de usuário, fixtures, SMTP/SMS, uso de webhook, restore, Vault GET/PUT, troca de plano, merge, deploy, alteração de regra financeira ou Android.
- **CI:** PR #666 no SHA `9bdf1d4e1bc393d2acff9068945d86ebfdeb38f7` confirmou 4 workflows SUCCESS e Foundation SKIPPED. Commit posterior de documentação não herda esse estado automaticamente.

### 5. Referências oficiais
- [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Realtime Settings](https://supabase.com/docs/guides/realtime/settings)
- [Supabase SMTP padrão e limitações](https://supabase.com/docs/guides/auth/auth-smtp)
- [Egress de serviços Supabase](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [Billing FAQ por organização](https://supabase.com/docs/guides/platform/billing-faq)
