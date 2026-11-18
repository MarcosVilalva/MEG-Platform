# MEG Finanças Web Evolution | Etapa 10 | Protocolo de homologação do reenvio no Android QA

**Data:** 18/11/2026  
**Estado:** PREPARADO, NÃO EXECUTADO EM APARELHO FÍSICO  
**Escopo:** PR #701 Draft, referência do PR #697, com API candidata do PR #702 avaliada separadamente. Issue P0 #699.

## 1. Premissas obrigatórias

- O Android estável `br.com.megfinancas.app`, versão 2.0.708 e SHA-256 `1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6`, permanece intocado. A variante de QA usa **outro** pacote: `br.com.megfinancas.app.stage10qa` e assinatura de debug.
- A variante opt-in aponta somente para `http://127.0.0.1:3333`, acessado no aparelho via `adb reverse tcp:3333 tcp:3333`. **Nenhum domínio de produção ou credencial real** pode ser usado.
- O servidor de QA deve estar isolado em banco PostgreSQL 17 **descartável**, com titular, categorias, conta monetária, Conta Benefício, Verocard e saldo **fictícios**, sem conexão com o Supabase ou Render de produção. Não reutilizar backup real como fixture.
- Bloqueio de publicação: `node scripts/npm-security-audit.mjs --audit-level=high` sobre o inventário completo deve passar, além de build, testes financeiros e integridade do artefato. Não emitir APK distribuível enquanto o alerta `picomatch` persistir. Não reduzir a severidade ou ignorar GHSA-fc5q-39xc-vjpf.
- O workflow `.github/workflows/meg-stage10-android-confirmacao-qa.yml` coloca a auditoria antes de `upload-artifact`. O último ensaio em emulador provou apenas inicialização, WebView e requisição de login rejeitada. **Não** prova reenvio no aparelho.
- Proibidos: alterar a APK estável, publicar OTA, conectar a produção, tocar em dados reais, fazer merge, deploy ou piloto sem gates e autorizações próprias.

## 2. Pré-requisitos de evidência antes de instalar

1. CI completo da variante QA aprovado, com relatório de segurança sem alto/crítico e artefato disponível para download; registrar run, commit, SHA-256, nome do pacote, `versionCode` e certificado de **debug**.
2. Banco QA e API local preparados com usuário fictício e endpoints reais do contrato Phoenix. Verificar `/ready` e JWT no **servidor local**, nunca usar dados produtivos.
3. A ferramenta de injeção local `scripts/meg-stage10-qa-fault-proxy.mjs` encaminha o POST a uma API em `127.0.0.1:3334`, aguarda o HTTP 2xx e descarta **uma única resposta** antes de entregá-la ao Android. O contrato sintético `scripts/meg-stage10-qa-fault-proxy.test.mjs` passou (3/3) com backend HTTP fictício; **a integração com a API PostgreSQL 17 e o aparelho físico ainda não ocorreu**. A ferramenta só inicia com `MEG_STAGE10_ISOLATED_PG=1` e `MEG_STAGE10_QA_LOCAL_ONLY=1`.
4. Preparar consulta somente leitura de `FinancialEvent`, `LedgerEntry`, identificador da tentativa (`operationId`) e saldo derivado do writer canônico, escopada ao titular fictício. Gerar baseline antes de cada cenário.
5. Confirmar que o telefone selecionado por ADB é o esperado. Não executar comandos de limpeza, desinstalação ou reinicialização de dados de aplicativos.

## 3. Simulação local de perda de resposta (somente após os gates)

A API com banco QA exclusivamente fictício deve escutar em `127.0.0.1:3334`, e o proxy em `127.0.0.1:3333`. Inicie o proxy em PowerShell separado:

```powershell
$env:MEG_STAGE10_ISOLATED_PG = '1'
$env:MEG_STAGE10_QA_LOCAL_ONLY = '1'
$env:MEG_STAGE10_QA_DROP_PATH = '/finance/events'
node scripts/meg-stage10-qa-fault-proxy.mjs
```

Para o caso de benefício, interrompa o proxy e inicie novamente com `MEG_STAGE10_QA_DROP_PATH='/finance/benefit-events'`. A falha é consumida apenas após a primeira resposta 2xx no endpoint escolhido; rejeições 4xx são encaminhadas ao cliente. Guarde o marcador `QA_FAULT_DROP_AFTER_COMMIT` sem registrar corpo ou JWT. O script nunca deve encaminhar para endereço não local. Executar `node --test scripts/meg-stage10-qa-fault-proxy.test.mjs` verifica apenas o contrato do proxy, não o cenário fim a fim financeiro.

## 4. Conexão no Windows PowerShell (somente após os gates)

```powershell
$ErrorActionPreference = 'Stop'
adb devices -l
adb reverse tcp:3333 tcp:3333
adb reverse --list
adb shell pm list packages | Select-String 'br.com.megfinancas.app'
```

Guardar a saída dos comandos como evidência. Ela deve mostrar a regra `tcp:3333` e os pacotes distintos. A instalação da variante `stage10qa` só é permitida após SHA e assinatura conferidos com o artefato aprovado, em caminho local explicitamente selecionado pelo operador. Não instalar artefatos obtidos de jobs cuja auditoria falhou.

## 5. Matriz de homologação (não executada)

| Caso | Ação no aplicativo de QA | Evidência obrigatória no servidor fictício | Resultado exigido |
| --- | --- | --- | --- |
| A. Sucesso normal, despesa | Criar despesa fictícia via Novo Lançamento e aguardar releitura | Um `FinancialEvent` e um `LedgerEntry`, mesmo ID após releitura | HTTP aceito não vira `PHOENIX_WRITE_NOT_CONFIRMED`; interface confirma sem novo POST |
| B. Perda de resposta após commit, despesa | Criar, cortar resposta **depois** do commit, tentar confirmar, fechar/reabrir drawer e reiniciar aplicativo | Mesmo `operationId` na repetição do mesmo payload, mesmo ID de evento, uma entrada de ledger e valor original | Nenhuma duplicidade, nenhuma nova chave ao reabrir para a mesma tentativa |
| C. Sucesso/reenvio de benefício | Repetir A e B usando Conta Benefício + Verocard com dados fictícios | Um evento de benefício e um lançamento contábil correspondente por tentativa; conta monetária principal intacta | Sem confundir benefício com cartão de crédito ou dinheiro comum |
| D. Conflito transitório | Simular conflito de revisão resolúvel, mantendo payload/usuário | Registro sem duplicação; identificador de tentativa retido | Retry controlado e mensagem coerente |
| E. Rejeição definitiva | Enviar caso financeiro inválido validado pelo domínio, sem commit | Nenhum evento nem ledger criado | Rejeição clara, sem retry infinito ou sucesso falso |
| F. Isolamento de titulares | Alternar entre dois usuários **fictícios** com tentativas distintas | Nenhum `operationId` e vínculo compartilhado entre titulares | Isolamento mantido e acesso negado a IDs de outro titular |
| G. Ciclo de vida | Suspender e retomar app, reabrir drawer e testar nova sessão | Preservação da chave apenas para a mesma intenção; sem reaproveitar para payload diferente | Reenvio idempotente sem misturar operações |

**Atenção:** uma tentativa aprovada não comprova todas as demais. Cada caso exige registro separado de resultados e artefatos. Para cada cenário, registrar payload sintético sem credenciais, hash/ID de operação, status HTTP, contagens de eventos e ledger, IDs persistidos, saldos antes/depois e comportamento visual. Valores reais, JWTs, senhas e cookies nunca entram no relatório.

## 6. Gates de saída

- Segurança de dependências geral verde, sem exceção, e CI técnico aplicável verde.
- APK QA aprovada, hash e assinatura conferidos; Android estável ainda instalado e inalterado.
- Todos os cenários exigidos executados no aparelho físico com dados fictícios e evidências reproduzíveis. Comparar com testes já caracterizados, sem repeti-los sem necessidade.
- Reconciliação pelo writer canônico, status, competência e saldo; `operationId` persistente apenas para mesma intenção.
- Validação funcional e visual explícitas do operador. Um run em emulador não substitui homologação física.
- Separadamente, compatibilidade da API de release, reversão operacional no Render, gates de merge e autorização do piloto por ID. **Nenhuma mutação produtiva é autorizada por este documento.**

## 7. Estado e próximo passo

No momento do preparo, o npm publica `picomatch@4.0.7` como versão mais recente, ainda atingida por GHSA-fc5q-39xc-vjpf. A versão travada no monorepo é `4.0.4`, exigida por `vite@6.4.4` e `tinyglobby@0.2.17`. Não existe correção publicada e verificada para aplicar com segurança. O PR upstream micromatch/picomatch#238 é proposta **aberta**, não release, e não pode ser usado como prova de remediação.

**Próximo passo real:** quando existir versão oficial corrigida ou substituição comprovada e compatível, atualizar lock e testar o gate integral; publicar somente o artefato QA aprovado e então executar este roteiro em aparelho com API/banco fictícios. O proxy de falha controlada já está caracterizado por teste sintético, mas a montagem da API fictícia e a prova de reenvio no aparelho ainda são gates reais. Manter PR #701 e PR #702 Draft, sem produção e sem Etapa 11.
