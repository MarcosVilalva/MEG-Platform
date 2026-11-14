# MEG Finanças Web Evolution | Etapa 09 | Avaliador offline do Gate 1

**Estado: candidato técnico. Não comprova isolamento funcional do Supabase. Não faz rede nem usa tokens.**

## Limite de segurança

- Escopo fixo: sandbox `oxwmqbzeuiibdlkcbjzv`, jamais produção `ugbiqzaqnrhulhetevby` ou projeto inativo `dmrauztnozvxirbydtho`.
- O avaliador `scripts/meg-stage09-sandbox-gate1-evaluator.mjs` lê um **arquivo JSON sanitizado local**, fornecido por um operador, e somente classifica evidências. Nenhum GET, POST, PUT, SQL, login, upload, autenticação, comunicação externa, conexão com o Supabase ou restore.
- Nunca colocar PAT, senha, URL com credenciais, token, segredo, cabeçalhos, IP, e-mails, dados de usuários ou payload de API nesse JSON. O parser aceita apenas chaves fixas e respostas `SIM`, `NAO`, `NAO_VERIFICADO`. Não imprime o conteúdo enviado ou caminho do arquivo se houver erro.
- Os resultados são sinalizadores de **NO-GO** ou **REVISÃO MANUAL OBRIGATÓRIA**. Nenhum arquivo local pode conceder `Gate 1 PASS`, autorizar Gate 2, importação, merge ou deploy.
- O serviço de Auth padrão pode enviar e-mails mesmo com SMTP custom desligado. Realtime desabilitado não significa egress universal bloqueado. Um HTTP 200 não homologa o endpoint; HTTP 402 impede considerar disponibilidade funcional.

## Exemplo fictício, sem segredos

Crie um JSON local fora do repositório, usando os indicadores **agregados** de um relatório previamente sanitizado. Exemplo fictício reproduzindo as contagens agregadas de 14/11. Não representa nova coleta nem confirmação das configurações gerenciadas:

```json
{
  "schema_version": 1,
  "project_ref": "oxwmqbzeuiibdlkcbjzv",
  "evidence_source": "synthetic-fixture",
  "observed_at": "2026-11-14T14:00:00Z",
  "http": {
    "auth": {"200": 1, "402": 6},
    "storage": {"200": 0, "402": 2},
    "other": {"200": 3, "402": 2}
  },
  "controls": {
    "auth_email_delivery_blocked": "NAO_VERIFICADO",
    "sms_delivery_blocked": "NAO_VERIFICADO",
    "custom_auth_providers_disabled": "NAO_VERIFICADO",
    "auth_hooks_disabled": "NAO_VERIFICADO",
    "storage_external_connections_absent": "NAO_VERIFICADO",
    "realtime_disabled_or_private": "NAO_VERIFICADO",
    "external_egress_isolated": "NAO_VERIFICADO",
    "operational_services_verified": "NAO_VERIFICADO"
  }
}
```

## Uso local (sem PowerShell)

```bash
node scripts/meg-stage09-sandbox-gate1-evaluator.mjs --input /caminho/privado/observacoes-sanitizadas.json
node --test tests/meg-stage09-sandbox-gate1-evaluator.test.mjs
```

A aplicação retorna somente campos permitidos: contagens HTTP 200/402, controles faltantes, motivos, `gate1=PARCIAL` e `gate2/3/4=NO_GO`. Falha fechada (código 3) para JSON inválido, chaves extras, referência protegida ou indicadores ausentes. Não salva relatório nem copia resultados para qualquer serviço.

## Critérios pendentes

1. Inspecionar **somente no Dashboard autenticado do sandbox** os campos gerenciados ainda indisponíveis via conector, conforme `docs/MEG-STAGE09-SANDBOX-GATE1-CONTROLES-GERENCIADOS-20261112.md`. Não captar campos sensíveis.
2. Confirmar ausência comprovada de comunicação externa real por Auth/SMS, callbacks, integrações e Storage, sem confiar na indisponibilidade temporária por quota como controle permanente. Alterações em configurações exigem autorização específica.
3. Exigir evidência de disponibilidade operacional sem upgrade ou ultrapassar R$ 0,00. Se HTTP 402 persistir, não iniciar testes funcionais hospedados.
4. Após cumprir os controles, realizar revisão humana de segurança e aceite expresso do Gate 1. Esse aceite não autoriza automaticamente Gate 2.
5. Recuperação integral de Auth/Storage/Vault/Realtime e importação remota continuam fora de execução. Build seguro #692 continua Draft, sem aplicação no Render.

## Regras conservadoras de interpretação (14/11/2026)

- A data `observed_at` deve ser UTC válida. Como política **local de precaução** deste avaliador, observações com mais de **24 horas** ou mais de **5 minutos no futuro** são classificadas `NO_GO`. Esses limites não são RPO/RTO nem garantias oficiais Supabase; impedem apenas promover evidência potencialmente desatualizada.
- HTTP 200 nas rotas `other` não substitui HTTP 200 observado separadamente em `auth` e `storage`. A ausência de HTTP 200 significa **insuficiência de evidência nessa amostra**, não prova de indisponibilidade absoluta. Mesmo HTTP 200 observado em ambos não comprova operação funcional de Auth/Storage.
- A fonte `aggregated-logs` **não comprova configurações gerenciadas**: qualquer controle `SIM` baseado nessa fonte permanece `NO_GO`. O operador deve usar evidências independentes e sanitizadas do Dashboard quando autorizadas.
- A fonte `synthetic-fixture` permanece `NO_GO`, inclusive com todos os indicadores favoráveis. A fonte `sanitized-dashboard` com indicadores positivos e atualizados permite somente `REVISAO_MANUAL_OBRIGATORIA`, nunca um `PASS` ou restore.
- O relógio dos testes unitários fica fixo para assegurar reproduções futuras; a CLI sempre usa o relógio real da execução.

## CI

`.github/workflows/meg-stage09-sandbox-gate1-offline.yml` usa somente Node.js, fixtures sintéticas e teste local. Não recebe segredos, API keys, DB, Supabase ou Render. `SUCCESS` significa apenas que a lógica conservadora do avaliador passou, não que o sandbox esteja isolado.
