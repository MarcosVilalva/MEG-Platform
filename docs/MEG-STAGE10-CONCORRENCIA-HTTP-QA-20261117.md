# MEG Finanças Web Evolution | Etapa 10 | Gate HTTP paralelo e concorrência real em QA
**Data:** 17/11/2026
**Escopo:** marco 5 de saneamento/compatibilidade, PR #697 Draft, issue #699 P0.
**Indicador:** 40% técnico (4 de 10 marcos); 0% de migração em produção.

## Protocolo ensaiado
Dois processos Node/Fastify realmente executados em paralelo em GitHub Actions, cada um vinculado exclusivamente a `127.0.0.1` numa porta efêmera e conectado ao PostgreSQL 17 descartável `meg_stage10_sandbox` com seu próprio usuário de banco e esquema Prisma:
- `stage10_cohort_android_login` no schema `stage10_cohort_android`, apenas uma **coorte fictícia**, não APK.
- `stage10_cohort_web_login` no schema `stage10_cohort_web`, outra coorte fictícia, não serviço publicado.

O runner inicializa os schemas com duas credenciais distintas e executa os processos simultaneamente, controlados por barreiras em três pontos: ambos `ready`, ambos com lançamentos fictícios `inserted` e ambos com lançamentos `updated`. `fetch` HTTP de loopback (não `Fastify.inject`) efetua `PATCH /app-state/transactions` e `GET /app-state` em cada serviço. Os mecanismos reais de rota, ORM, transação e revisão são usados, mas a autenticação de sessão continua **simulada**.

## Verificações automatizadas no PostgreSQL 17
1. Cada processo cria e edita apenas o lançamento de seu schema sem mudar `FinancialEvent.id`, valor nem chave histórica.
2. Cada credencial recebe rejeição de acesso SQL para `SELECT` e `UPDATE` no schema da outra coorte, enquanto ambas as instâncias estão vivas.
3. Em cada serviço, dois `PATCH` HTTP simultâneos com a **mesma revisão** e descrições concorrentes têm resultados exatos: um **200** e outro **409 STATE_CONFLICT**; o estado final guarda a descrição do vencedor, revision 4, uma única linha e o mesmo ID, valor e tenant.
4. O runner destrói schemas e roles fictícios após os dois processos terminarem, e verifica ausência de resíduos. Nenhum dos serviços foi publicado em Render ou ligado a Supabase real.
5. A proteção de caminhos Android/legado permanece no CI via comparação `git diff` contra o baseline PR #696.

## Evidência e correção incidental
- Run [#44091761244](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44091761244): **FAIL** exclusivamente na verificação estática TS2345 de `barrierDir: string | undefined`. Testes PostgreSQL/Fastify de execução paralela haviam passado.
- Correção de typing no commit `929f68f8135459c0bb382444c991c81d01a5c5c1`.
- Run [#44092200586](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44092200586): **SUCCESS** 27 etapas, incluindo dois `PATCH` concorrentes sobre a mesma revisão.
- Run [#44092660163](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44092660163): **SUCCESS** 27 etapas, agora com **dois servidores HTTP locais por loopback**, concorrência e Prisma real, além de regressões financeiras, TypeScript e limpeza do QA.
- Código HTTP validado no commit `edc1240ef50a0507809ce66f17200aacc772482b` do PR #697.

## Limites decisivos: marco 5 AINDA ABERTO
- O serviço fictício chamado `android` não é o aplicativo instalado: não houve APK real nem teste de dois dispositivos com outbox físico.
- Os processos têm schemas **separados** e não compartilham um mesmo financeiro real; isolamento não equivale a reconciliação/cutover de lançamentos ou manutenção de saldos unificados.
- A API utiliza autenticação simulada; nenhuma autorização JWT real ou prova de RLS do ambiente hospedado foi executada.
- A issue #699 persiste: código congelado em `apps/web/src/instant-persistence.js` ignora `retryable:false`, reenvia 409 permanente e agenda reenvio mesmo quando HTTP 422. Não há prova causal de restauração automática segura.
- Não houve homologação visual, publicação de preview, deploy, custos, alteração de Android, migração produtiva ou merge.

## Próximo gate seguro
Verificar a origem de API da **APK efetivamente instalada** e exercitar seu contrato, sem alterar o Android, contra QA isolado e cenário autorizado. Planejar a estratégia de eventual convivência de dados, reconciliação por IDs, sincronização offline, backup e reversão sem duas autoridades financeiras conflitantes. Antes de qualquer ligação a dados reais, exigir autorização específica e ensaio de rollback em ambiente descartável.

**Status final:** CI verde em QA; **marco 5 não encerrado**, indicador 40% técnico, produção 0%.
