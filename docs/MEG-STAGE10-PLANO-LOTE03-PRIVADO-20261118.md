# Etapa 10 | Plano executável do lote mínimo privado e homologação Android

Data: 18/11/2026. PR #701 e PR #702 permanecem Draft. Este documento público não contém IDs, valores financeiros, hashes derivados da produção, credenciais, dados pessoais ou payloads reais.

## 1. Decisão sobre PostgreSQL 17 já disponível

Foi recuperado o histórico operacional do notebook com Windows/WSL Ubuntu 24.04: cluster PostgreSQL 17 denominado 17/meg_stage10_qa, banco meg_stage10_qa, porta 5448, somente socket Unix, role m_vil com autenticação peer, somente leitura por padrão, sem BYPASS_RLS e TCP desabilitado. Recebeu 6.576 eventos históricos por restauração seletiva de backup de 11/11/2026. Último registro de disponibilidade: cluster DOWN, portanto o estado atual não está verificado.

Este banco histórico NÃO é uma réplica atual do Supabase e NÃO dispõe de isolamento entre titulares adequado a API pública. Seu primeiro e único uso proposto nesta fase é consulta local somente leitura, sem iniciar cluster, restaurar, alterar schema, criar role, transferir registros ou executar writers. Nenhum dado será usado para testes de mutação até a autorização específica.

Recursos alternativos: Render sem Postgres, Supabase Free sem branch QA, sandbox Stage09 incompleto e reservado para recuperação, outro projeto Supabase inativo sem aprovação de reutilização; Vercel retornou 403 para inventário. Runner GitHub PostgreSQL 17 usa dados fictícios e não receberá dados reais. O runtime desta conversa não tem WSL local, servidor Postgres, Docker ou ADB físico.

Artefatos disponíveis:
* scripts/meg-stage10-local-qa-android-inventory.readonly.ps1: status local WSL, role/porta/socket e inventário ADB sem serial; não altera banco ou dispositivo.
* scripts/meg-stage10-lote03-fingerprint.readonly.psql: exige três IDs por parâmetros PRIVADOS, valida role/porta/DB/socket, usa BEGIN READ ONLY e ROLLBACK, registra APENAS marcadores e hashes de três eventos e dependências. NÃO FOI EXECUTADO no notebook.

## 2. Pré-condições e dados anteriores/propostos

O manifesto privado A/B/C foi confirmado por SELECT atual no Supabase em 18/11/2026, sem UPDATE ou transferência. Os IDs completos, valores e fingerprints foram reservados exclusivamente à conversa privada do titular. Um ID histórico errado do caso B foi descartado anteriormente.

A: despesa ordinária, paga, débito automático, categoria correspondente ao legado, uma ocorrência selecionada por ID.
B: despesa ordinária, paga, PIX, categoria correspondente ao legado, uma ocorrência selecionada por ID.
C: despesa ordinária, planejada, boleto, categoria correspondente ao legado, uma ocorrência selecionada por ID.

ANTERIOR em A/B/C: categoryId NULL, paymentMethodId NULL. PROPOSTO: categoryId exato do catálogo ativo e único de mesmo userId + name + group + type; paymentMethodId exato do cadastro ativo e único de mesmo userId + name. Valores de amount/signedAmount, date, status, competence, accountId, legacyTransactionId, sourcePayload, description, notes e frequência NÃO MUDAM; não há regra de recalcular saldo ou criar ledger por se alterar duas FKs.

Verificar imediatamente antes de qualquer futura escrita: 3 IDs existentes e únicos, archivedAt NULL, ONE_OFF, expense, A/B paid e C planned, amount positivo e signedAmount negativo, conta checking/savings/cash ativa do titular, escopo monetary, modalidade à vista, catálogos únicos e não creditícios, espelho AppState exatamente igual e único para cada legacyTransactionId, sem LedgerEntry, Receipt, PayablePayment ou ImportedRow. Registrar updatedAt/versão e recusar divergências ou concorrência. Nunca preencher por heurística receitas, cartões, benefício Verocard ou recorrências.

## 3. Gates executáveis, todos bloqueados para escrita até nova autorização

GATE 0, inventário local. Operador conecta o aparelho Android por USB para diagnóstico ADB e executa uma vez o script PowerShell versionado; o mesmo script consulta status WSL. Nenhuma instalação de APK ou mudança de configuração é efetuada pelo script. Só prosseguir com banco quando QA_GUARD=PASS. Se cluster DOWN, decidir separadamente sobre início local seguro; NÃO reiniciar automaticamente.

GATE 1, fidelidade histórica sem transferência. Executar no banco meg_stage10_qa a consulta SQL read-only parametrizada com os três IDs privados do manifesto, somente após confirmação do ambiente local. Comparar fingerprints de evento integral sem updatedAt, conta, categoria, meio de pagamento e sourcePayload com os fingerprints atuais produzidos por SELECT no Supabase. É obrigatório obter elegibilidade PASS para A, B e C e todos os hashes iguais. Guardar resultados APENAS no chat privado ou estação local; nunca versionar. Qualquer divergência impede tratar o backup histórico como amostra fiel. Mesmo com tudo igual, a prova limita-se a estes campos e não converte o banco histórico em réplica integral da produção.

GATE 2, preparação de QA gravável SOMENTE COM NOVA AUTORIZAÇÃO. Criar DB/cluster PostgreSQL 17 descartável e separado na mesma estação, por socket local e sem rede pública. Restaurar um snapshot previamente validado dessa QA. Transferir apenas recorte mínimo por canal privado cifrado/autenticado autorizado: User sanitizado preservando o ID, Workspace e associação de titular, Account, Category, PaymentMethod, os três FinancialEvent, três itens espelhados no AppState e dependências necessárias à autenticação QA. Nunca copiar senha, token ou sessão real. Uma fixture AppState reduzida pode perder a compatibilidade do fingerprint global de normalized-primary; se isso acontecer, bloquear e pedir revisão de escopo, não falsificar reconciled nem atualizar metadados arbitrariamente.

GATE 3, ensaio SQL QA. Somente na QA descartável, com autorização e backup restaurado, usar transação serializável, locks condicionalmente por ID e updatedAt, e UPDATE restrito a categoryId/paymentMethodId dos três IDs. Exigir exatamente três linhas afetadas e seis FKs preenchidas, sem outro campo de negócio alterado. Executar primeiro um ensaio com ROLLBACK; depois um ensaio commitado SOMENTE na QA descartável. Antes/depois comparar IDs, montantes e sinais, status/date, sourcePayload, contagem de eventos, LedgerEntry, Receipt, PayablePayment, ImportedRow e saldos canônicos derivados sobre o MESMO recorte. O saldo absoluto de uma amostra reduzida NÃO prova o saldo global da produção. Validar /finance/events/history-snapshot e /app-state usando API QA, sem publicar API.

GATE 4, reversão QA pós-commit. Guardar em destino privado o estado original e o conjunto exato de FKs/updatedAt. Reverter atomicamente categoryId/paymentMethodId às condições anteriores apenas se os seis FKs ainda corresponderem aos valores implantados, não tiver ocorrido writer legítimo/concorrência e demais invariantes persistirem. Exigir exatamente três linhas afetadas, restauração do estado anterior e novas verificações. Qualquer diferença bloqueia rollback automático; PROIBIDO deleteMany/createMany e apagar eventos/ledger. O ensaio de rollback em QA não autoriza rollback produtivo.

GATE 5, proposta produtiva futura. Requer API protegida PR #702 homologada e publicação autorizada separadamente, compatibilidade com Android legado instalado, backup produtivo ATUAL com restauração comprovada, Gates 1-4, validação funcional e visual Web, e autorização explícita por ID para qualquer UPDATE. Apresentar versão do plano e valores old/new privados ao titular antes de executar; não confundir CI com homologação.

## 4. Android instalado versus variante QA

A APK estável br.com.megfinancas.app 2.0.708 possui o backend de produção embutido na compilação histórica. O comando adb reverse tcp:3333 tcp:3333 somente redireciona aplicações que JÁ utilizam 127.0.0.1:3333; NÃO muda automaticamente o endpoint do app estável. Um teste da variante br.com.megfinancas.app.stage10qa em loopback com contas fictícias é possível após os gates, mas NÃO é prova de comportamento do binário estável instalado.

Primeiro passo indispensável: obter inventário físico ADB read-only com versão e pacote reais, sem listar serial e sem extrair dados pessoais. Em etapa ulterior, com consentimento, comparar assinatura/hash do APK efetivamente instalado com artefato estável; não desinstalar, limpar dados, reconfigurar URL ou autenticar a conta real em QA. Para teste funcional, isolar API e banco totalmente fictícios do cluster de backup e rodar casos HTTP 409 permanente, concorrência transitória, resposta pós-commit perdida, reabertura e operação repetida, observando operationId, UX, contagens de eventos e ledgers.

A compatibilidade do cliente antigo ainda é P0: correções implementadas na branch QA NÃO corrigem retroativamente uma APK já instalada. O fluxo antigo pode continuar reencaminhando 409 permanente. Retornar HTTP 200 falso ou substituir 409 por 422 não resolve. Não publicar API candidata antes de provar caminho seguro de coexistência/atualização autorizado, e aprovação física/visual quando aplicável.

## 5. Backup e restrições

Backup cifrado restaurado de 11/11/2026 comprova RECUPERAÇÃO HISTÓRICA, não disponibilidade de snapshot recuperável imediatamente anterior ao piloto produtivo. Os ensaios PG17 sintéticos já verdes permanecem válidos somente para fixture. Sem transferência autorizada, não exportar novo dump, nem usar o sandbox de recuperação como QA. Nenhum merge, deploy, DML na produção, mudança no Android estável, custos ou Etapa 11 foram autorizados.

Próxima ação do usuário, única: conectar e autorizar o Android por USB/ADB no computador Windows, executar apenas o diagnóstico PowerShell read-only e devolver a saída sanitizada. Isso permite simultaneamente confirmar cluster WSL e APK instalada sem pedir arquivos financeiros ou credenciais.

## 6. Diagnóstico recebido em 18/11/2026 e correção do inventário

O primeiro diagnóstico local retornou `QA_CLUSTER=QUERY_ERROR`, `ADB=NOT_AVAILABLE`, `PRODUCAO_ACESSADA=NAO`, `BANCO_MODIFICADO=NAO`, `ANDROID_MODIFICADO=NAO` e `CLIPBOARD=OK`.

**Interpretação:** `QUERY_ERROR` era uma exceção capturada sem código nem causa; não comprova banco ausente ou parado. `ADB=NOT_AVAILABLE` significava apenas ausência de `adb.exe` no PATH, não ausência do Android SDK.

**Correção de código:** `scripts/meg-stage10-local-qa-android-inventory.readonly.ps1` SHA de commit `e4bb30aa3d36bffac62296ead810cdfcc6a5166f`. Agora captura código de saída de comandos externos sem expor stderr, consulta primeiro o registro Windows para confirmar a distribuição Ubuntu-24.04 sem abrir WSL interativamente, diferencia falha de listagem da falha psql e busca ADB também em locais usuais do Android SDK. Não altera PostgreSQL, APK ou produção.

**CI real:** [GitHub Actions Windows #44389043326](https://github.com/MarcosVilalva/MEG-Platform/actions/runs/44389043326) `SUCCESS` no commit `6f90e4732cbb036e993e9aeadd5b3db9ec3413ba`. `MEG_STAGE10_INVENTORY_PS_PARSE=PASS`, `MEG_STAGE10_INVENTORY_NON_DESTRUCTIVE_STATIC=PASS`, `MEG_STAGE10_INVENTORY_WINDOWS_SYNTAX=PASS`. Limite expresso: `MEG_STAGE10_INVENTORY_WSL_RUNTIME=NOT_TESTED` e `MEG_STAGE10_INVENTORY_ANDROID_PHYSICAL=NOT_TESTED`. Não usar runners hospedados para afirmar a saúde do notebook.

**Única ação externa:** executar uma vez o script corrigido por URL imutável no Windows e retornar somente o relatório sanitizado. Se `QA_GUARD=PASS`, avançar para comparação privada de três fingerprints em READ ONLY; se o cluster estiver down, não iniciá-lo automaticamente. Se ADB não for encontrado também no Android SDK, investigar instalação oficial de platform-tools sem mexer no app estável.

## 7. Investigação do WSL por histórico e distinção do ambiente (sem script novo)

**Novo retorno do operador:** `WSL=FOUND`, `QA_CLUSTER=WSL_DISTRO_NOT_REGISTERED`, `ADB=NOT_FOUND_IN_PATH_OR_COMMON_SDK_PATHS`, integridade do relatório `CLIPBOARD=OK` e zero alterações em produção/banco/Android. Esses dois marcadores são conclusões do **inventário de busca** e não provas de perda de PostgreSQL nem de ausência absoluta do SDK.

**Evidência histórica concreta de 15/11/2026:** a execução anterior ocorreu em uma instalação Windows com host e usuário identificados em conversa privada, WSL `Ubuntu-24.04`, Linux `m_vil`, PostgreSQL 17.12 cluster `17/meg_stage10_qa`, porta 5448, dono `postgres`, dados `/var/lib/postgresql/17/meg_stage10_qa`, log `/var/log/postgresql/postgresql-17-meg_stage10_qa.log` e socket `/var/run/postgresql/.s.PGSQL.5448`. O cluster foi observado `down` em uma inspeção anterior. Houve etapa de restauração seletiva concluída com 6.576 eventos e role QA somente leitura, em instantes registrados separadamente. Não inferir que `down` apagou dados; tampouco inferir que o Windows atual é o mesmo Windows/perfil usado em 15/11.

**Causa não determinada:** o inventário consultou `HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss` do perfil Windows **atual**. O comando `WSL=FOUND` só prova que `wsl.exe` existe no PATH, não que `Ubuntu-24.04` esteja registrada nesse perfil. Possibilidades por verificar: (1) host Windows diferente; (2) usuário/SID do Windows diferente; (3) distro registrada sob nome distinto; (4) registro não acessível ou distribuição não registrada. Não escolher uma dessas hipóteses sem a consulta do próprio Windows.

**Verificação inicial simples, somente leitura, sem script novo:** executar `hostname`, `whoami` e `wsl.exe --list --verbose` numa mesma janela PowerShell e comparar os dois primeiros ao host/perfil privado de 15/11. O terceiro comando apenas lista as distros registradas para o contexto atual. Se o host/perfil não corresponder, procurar no Windows original antes de qualquer intervenção. Se corresponder e a distro estiver listada com outro nome, localizar por esse nome sem iniciar cluster. Se não estiver listada, investigar posteriormente existência de `ext4.vhdx`/backup no disco original, apenas com autorização e sem reimportar ou inicializar por tentativa.

**ADB:** a pesquisa anterior cobriu PATH e diretórios usuais. Se houver Android Studio, consultar `SDK Manager` e o campo `Android SDK Location`, procurando **somente** `<SDK Location>\platform-tools\adb.exe`; não instalar Android SDK, platform-tools, driver nem alterar app, permissões ou depuração sem necessidade. ADB do notebook antigo/novo pode não existir no host atual.

**Avanço remoto independente de notebook:** no Render, `meg-platform-api` permanece plano Free com `autoDeployTrigger=off`, branch `main` e deploy LIVE `dep-dbm92b17lnhs738s0jr0` no commit `28703a95310c9b9b5f193ef4f3a0cbe80e121f07`. Foram listados deployments históricos, porém os anteriores estão `deactivated`. Isso **não comprova** rollback rápido/seguro, nem que artefato antigo esteja imediatamente reativável. PRs #701 e #702 continuam Draft. Não houve reexecução de testes anteriores, alteração remota ou tentativa de rollback.

**Situação do lote:** amostra privada PG17 com três registros não foi verificada; fingerprints, backup atual restaurado e reversão após commit continuam pendentes. Sem merge, deploy, SQL de escrita, transferência de dados, custo e Etapa 11.
