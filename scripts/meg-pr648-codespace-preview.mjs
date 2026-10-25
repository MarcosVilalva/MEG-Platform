#!/usr/bin/env node
/**
 * MEG Web Evolution / PR #648: homologação local no Codespaces.
 * API Fastify + PostgreSQL descartável + Vite. Não toca em produção.
 * Pré-requisitos: Node 22, npm, Docker, git e portas 3334/5174/5548 livres.
 */
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const BRANCH = 'feature/meg-web-new-launch-visual-official';
const POSTGRES_NAME = 'meg-pr648-preview-db';
const DB_URL = 'postgresql://megpreview:megpreview-local@127.0.0.1:5548/meg_preview';
const API = 'http://127.0.0.1:3334';
const WEB = 'http://127.0.0.1:5174';
const EMAIL = 'preview-admin@meg.invalid';
const STATE = join(homedir(), '.local', 'state', 'meg-pr648-preview');
const CREDS = join(STATE, 'credenciais.txt');
const children = [];
let stopping = false;

function command(bin, args, env = process.env) {
  execFileSync(bin, args, { cwd: ROOT, env, stdio: 'inherit' });
}
function output(bin, args) {
  return execFileSync(bin, args, { cwd: ROOT, encoding: 'utf8' }).trim();
}
function fail(message) { throw new Error(message); }

// Se outra API/Vite ficou órfã de uma execução anterior, não podemos tratá-la
// como se fosse a instância iniciada agora. Nunca encerre um PID desconhecido.
async function assertPortFree(port, label) {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', error => {
      reject(new Error(label + ' bloqueado: porta ' + port
        + ' ocupada (' + (error.code || 'UNKNOWN') + ').'
        + ' Identifique o processo com lsof -nP -iTCP:' + port
        + ' -sTCP:LISTEN, encerre somente se confirmado e reinicie.'));
    });
    probe.listen({ host: '127.0.0.1', port }, () => probe.close(resolve));
  });
}
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) continue;
    try {
      // Linux Codespaces: encerra também npm -> shell -> tsx/vite.
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      try { child.kill('SIGTERM'); } catch { /* Já encerrado. */ }
    }
  }
}
function spawnManaged(label, args, env) {
  const child = spawn('npm', args, {
    cwd: ROOT, env, stdio: 'inherit', detached: true,
  });
  children.push(child);
  child.on('error', error => {
    if (stopping) return;
    console.error('[MEG preview] ' + label + ' não iniciou:', error.message);
    stop();
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error('[MEG preview] ' + label + ' encerrou inesperadamente ('
      + (signal || 'code ' + code) + '). Preview não homologado.');
    stop();
    process.exitCode = 1;
  });
  return child;
}
process.on('SIGINT', () => { stop(); process.exit(130); });
process.on('SIGTERM', () => { stop(); process.exit(143); });
process.on('exit', stop);

async function waitUrl(url, child, timeoutMs = 120000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (child.exitCode !== null || child.signalCode !== null) {
      fail('Serviço morreu antes de ficar disponível: ' + url);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (response.ok) return response;
    } catch { /* Serviço ainda iniciando. */ }
    await delay(1000);
  }
  fail('Serviço não respondeu: ' + url);
}
async function request(path, init = {}, token) {
  const response = await fetch(API + path, {
    ...init,
    headers: { 'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}), ...init.headers },
    signal: AbortSignal.timeout(20000),
  });
  const value = await response.json().catch(() => ({}));
  return { response, value };
}

async function main() {
  const actual = output('git', ['branch', '--show-current']);
  if (actual !== BRANCH) fail('Branch incorreta: ' + actual + '. Execute apenas no clone isolado da PR #648.');
  const remote = output('git', ['remote', 'get-url', 'origin']);
  if (!remote.includes('MarcosVilalva/MEG-Platform')) fail('Repositório inesperado; operação interrompida.');

  // Um .env herdado poderia redirecionar chamadas ou usar segredos de produção.
  for (const file of ['.env', 'apps/api/.env', 'packages/database/.env', 'apps/web/.env']) {
    if (existsSync(join(ROOT, file))) fail('Arquivo ' + file + ' presente. Use um clone novo sem configurações reais.');
  }
  await assertPortFree(3334, 'API local');
  await assertPortFree(5174, 'Vite de homologação');
  command('docker', ['info']);
  mkdirSync(STATE, { recursive: true, mode: 0o700 });

  let exists = false;
  try { output('docker', ['inspect', POSTGRES_NAME]); exists = true; } catch { /* Primeiro uso. */ }
  if (!exists) {
    command('docker', ['run', '-d', '--name', POSTGRES_NAME,
      '-e', 'POSTGRES_DB=meg_preview', '-e', 'POSTGRES_USER=megpreview',
      '-e', 'POSTGRES_PASSWORD=megpreview-local',
      '-p', '127.0.0.1:5548:5432', 'postgres:16']);
  } else {
    const inspection = JSON.parse(output('docker', ['inspect', POSTGRES_NAME]))[0];
    const flags = inspection.Config.Env;
    const binding = inspection.HostConfig.PortBindings?.['5432/tcp']?.[0];
    if (!flags.includes('POSTGRES_DB=meg_preview')
      || !flags.includes('POSTGRES_USER=megpreview')
      || binding?.HostIp !== '127.0.0.1' || binding?.HostPort !== '5548') {
      fail('Existe um contêiner com o mesmo nome, mas configuração diferente. Não será reutilizado.');
    }
    if (!inspection.State.Running) command('docker', ['start', POSTGRES_NAME]);
  }

  let databaseReady = false;
  for (let n = 0; n < 40; n++) {
    try {
      execFileSync('docker', ['exec', POSTGRES_NAME, 'pg_isready', '-U', 'megpreview', '-d', 'meg_preview'], { stdio: 'ignore' });
      databaseReady = true;
      break;
    } catch { await delay(1000); }
  }
  if (!databaseReady) fail('PostgreSQL de homologação não respondeu.');

  // Não repassar chaves, URLs ou variáveis de serviços de produção ao backend.
  const safeEnv = {
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: homedir(), USER: process.env.USER || 'codespace',
    NODE_ENV: 'development', LOG_LEVEL: 'warn',
    DATABASE_URL: DB_URL, PORT: '3334', HOST: '127.0.0.1',
    MEG_PR648_PREVIEW_LOCAL_DB: '1',
    ADMIN_EMAIL: EMAIL,
    CORS_ORIGINS: ['http://localhost:5174', 'http://127.0.0.1:5174',
      ...(process.env.CODESPACE_NAME ? ['https://' + process.env.CODESPACE_NAME + '-5174.app.github.dev'] : [])].join(','),
  };
  const secretFile = join(STATE, 'jwt-secret');
  if (!existsSync(secretFile)) {
    writeFileSync(secretFile, randomBytes(48).toString('hex'), { mode: 0o600 });
  }
  safeEnv.JWT_SECRET = readFileSync(secretFile, 'utf8').trim();

  console.log('Instalando dependências e preparando SOMENTE o banco de homologação...');
  command('npm', ['ci'], safeEnv);
  command('npm', ['run', 'db:generate'], safeEnv);
  command('npm', ['run', 'db:push'], safeEnv);

  const apiChild = spawnManaged('API local',
    ['--workspace', 'apps/api', 'run', 'start'], safeEnv);
  await waitUrl(API + '/ready', apiChild);

  let password;
  if (existsSync(CREDS)) {
    const match = readFileSync(CREDS, 'utf8').match(/^Senha: (.+)$/m);
    if (!match) fail('Arquivo de credenciais inválido; não será sobrescrito.');
    password = match[1];
  } else {
    password = randomBytes(18).toString('hex');
    writeFileSync(CREDS, 'E-mail: ' + EMAIL + '\nSenha: ' + password + '\n',
      { mode: 0o600 });
    chmodSync(CREDS, 0o600);
  }

  const credentials = { email: EMAIL, password };
  let auth = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  if (!auth.response.ok) {
    const signup = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Homologação MEG', ...credentials, confirmPassword: password,
        phone: '11999999999', accountType: 'REQUEST_ACCESS',
      }),
    });
    if (signup.response.status !== 201 || !signup.value.accessToken)
      fail('Cadastro de homologação não foi autorizado: HTTP ' + signup.response.status
        + ' (' + (signup.value.error || signup.value.status || 'desconhecido') + ')');
    auth = signup;
  }
  const token = auth.value.accessToken;
  if (!token) fail('Login de homologação não retornou token.');

  // O primeiro cadastro cria o workspace depois da rotina comercial de startup.
  // O writer exige licença ACTIVE/TRIAL: repetir a rotina canônica no banco
  // local resolve a ordem de inicialização sem desativar qualquer proteção.
  command('npm', ['exec', '--', 'tsx', 'scripts/meg-pr648-preview-commercial.ts'], safeEnv);

  // Na primeira instalação vazia, o boot da API tenta reconciliar antes de
  // a fonte normalizada ter sido ativada. Usar o contrato ADMIN existente,
  // nunca inserir marcadores no banco ou relaxar a proteção do writer.
  const normalization = await request('/app-state/normalization-preview', {}, token);
  if (!normalization.response.ok || !normalization.value?.source || !normalization.value?.normalized) {
    fail('Não foi possível verificar a fonte financeira normalizada no banco descartável.');
  }
  const n = normalization.value;
  if (n.mode === 'app-state-rollback') {
    fail('Base de homologação em rollback administrativo: ativação automática proibida.');
  }
  if (!n.primary) {
    if (n.source.validCount !== 0 || n.source.invalidCount !== 0 || n.normalized.count !== 0 || !n.reconciled) {
      fail('Fonte financeira não está vazia/reconciliada. Não realizar cutover automático; exige auditoria.');
    }
    const activated = await request('/app-state/normalization-cutover', {
      method: 'POST',
      body: JSON.stringify({
        action: 'activate',
        expectedRevision: n.revision,
        confirmation: 'ATIVAR_BASE_NORMALIZADA',
      }),
    }, token);
    if (!activated.response.ok || !activated.value?.primary || !activated.value?.reconciled) {
      fail('Ativação canônica da fonte financeira falhou: HTTP ' + activated.response.status
        + ' (' + (activated.value?.error || 'sem confirmação') + ').');
    }
    console.log('Fonte financeira vazia ativada e reconciliada pela API canônica.');
  } else if (!n.reconciled || n.source.invalidCount !== 0) {
    fail('Fonte financeira primária inconsistente. Preview bloqueado até auditoria.');
  }
  const financialHealth = await request('/health');
  if (!financialHealth.response.ok || financialHealth.value?.financialReady !== true) {
    fail('API sem autoridade financeira confirmada (health.financialReady não é true).');
  }
  console.log('GATE FINANCEIRO: API financialReady=true.');

  for (const [path, desired] of [
    ['/finance/accounts', [
      { name: 'Conta de teste', type: 'checking', institution: 'Banco fictício', openingBalance: 0 },
    ]],
    ['/finance/categories', [
      { name: 'Receita de teste', group: 'Homologação', type: 'income' },
      { name: 'Despesa de teste', group: 'Homologação', type: 'expense' },
    ]],
    ['/finance/payment-methods', [
      { name: 'PIX de teste', type: 'instant' },
      { name: 'Boleto de teste', type: 'bill' },
    ]],
  ]) {
    const list = await request(path, {}, token);
    if (!list.response.ok || !Array.isArray(list.value))
      fail('Falha ao consultar catálogo canônico ' + path + ': HTTP ' + list.response.status);
    for (const item of desired) {
      if (list.value.some(value => value.name === item.name)) continue;
      const created = await request(path, { method: 'POST',
        body: JSON.stringify({ ...item, operationId: randomUUID() }) }, token);
      if (created.response.status !== 201)
        fail('Falha ao criar catálogo de teste ' + item.name + ': HTTP '
          + created.response.status + ' (' + (created.value.error || 'desconhecido') + ')');
    }
  }

  // A configuracao do proxy confere a origem do browser contra CODESPACE_NAME.
  // Nao basta passar essa variavel para a API: o processo Vite tambem precisa
  // recebe-la explicitamente, pois safeEnv deliberadamente filtra o ambiente.
  const webEnv = {
    ...safeEnv,
    VITE_API_URL: '/api',
    CODESPACE_NAME: process.env.CODESPACE_NAME || '',
  };
  const webChild = spawnManaged('Vite de homologação',
    ['--workspace', 'apps/web', 'run', 'dev', '--',
      '--config', 'vite.codespace-preview.config.ts'], webEnv);
  await waitUrl(WEB + '/web-evolution.html', webChild);
  if (apiChild.exitCode !== null || apiChild.signalCode !== null
    || webChild.exitCode !== null || webChild.signalCode !== null) {
    fail('API ou Vite encerrado durante a inicialização. Preview não homologado.');
  }
  const finalHealth = await request('/health');
  if (!finalHealth.response.ok || finalHealth.value?.financialReady !== true) {
    fail('Autoridade financeira indisponível após iniciar frontend. Preview não homologado.');
  }

  // A entrada é pela rota Web Evolution, não pelo index legado Phoenix.
  const landing = await fetch(WEB + '/', { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  if (landing.status !== 302 || !String(landing.headers.get('location') || '').startsWith('/web-evolution.html')) {
    fail('Porta 5174 não direcionou para a Web Evolution. Preview bloqueado.');
  }
  const webDocument = await fetch(WEB + '/web-evolution.html', { signal: AbortSignal.timeout(10000) });
  if (!webDocument.ok || !(await webDocument.text()).includes('meg-web-evolution-root')) {
    fail('Documento oficial da nova Web não foi servido na porta 5174.');
  }
  const viaProxyHealth = await fetch(WEB + '/api/health', { signal: AbortSignal.timeout(10000) });
  const proxyHealthValue = await viaProxyHealth.json().catch(() => ({}));
  if (!viaProxyHealth.ok || proxyHealthValue.financialReady !== true) {
    fail('Proxy do navegador não aponta para a API financeira local pronta.');
  }
  const viaProxySession = await fetch(WEB + '/api/auth/me', {
    headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000),
  });
  const proxySessionValue = await viaProxySession.json().catch(() => ({}));
  if (!viaProxySession.ok || proxySessionValue.user?.email !== EMAIL) {
    fail('Validação autenticada /api/auth/me via navegador falhou: HTTP '
      + viaProxySession.status + '.');
  }
  // A verificacao de /auth/me nao cobre o POST do formulario.
  // Simular Origin e Sec-Fetch-Site do navegador sem forjar Host, pois o
  // encaminhamento publico do Codespaces pode reescrever esse cabecalho.
  // Este gate LOCAL nao substitui o teste no navegador publico.
  const browserOrigin = process.env.CODESPACE_NAME
    ? 'https://' + process.env.CODESPACE_NAME + '-5174.app.github.dev'
    : WEB;
  const browserLogin = await fetch(WEB + '/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: browserOrigin,
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
    },
    body: JSON.stringify(credentials),
    signal: AbortSignal.timeout(20000),
  });
  const browserLoginValue = await browserLogin.json().catch(() => ({}));
  if (!browserLogin.ok || browserLoginValue?.user?.email !== EMAIL
    || typeof browserLoginValue?.accessToken !== 'string') {
    fail('Login do navegador pelo proxy Codespaces falhou: HTTP '
      + browserLogin.status + '. Preview bloqueado até corrigir a origem/CORS.');
  }
  // O tunel publico pode alterar Origin mesmo com Sec-Fetch-Site same-origin.
  // Testar explicitamente esse cenario, que antes passou despercebido porque
  // todos os testes usavam a Origin exata que o proprio script esperava.
  const forwardedLogin = await fetch(WEB + '/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://origin-encaminhada.invalid',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
    },
    body: JSON.stringify(credentials),
    signal: AbortSignal.timeout(20000),
  });
  const forwardedValue = await forwardedLogin.json().catch(() => ({}));
  if (!forwardedLogin.ok || forwardedValue?.user?.email !== EMAIL
    || typeof forwardedValue?.accessToken !== 'string') {
    fail('GATE LOGIN: proxy nao tolera Origin encaminhada em solicitacao '
      + 'same-origin: HTTP ' + forwardedLogin.status);
  }

  // Uma resposta 200/204 ao OPTIONS nao autoriza CORS por si so.
  // O navegador verifica Access-Control-Allow-Origin, nao response.ok.
  // Os testes abaixo nao expõem token nem senha a servidores externos.
  const foreignOrigin = 'https://origem-nao-autorizada.invalid';
  const isCorsAllowed = (response) => {
    const value = response.headers.get('access-control-allow-origin');
    return value === '*' || value === foreignOrigin;
  };
  const untrustedPreflight = await fetch(WEB + '/api/auth/login', {
    method: 'OPTIONS',
    headers: {
      Origin: foreignOrigin,
      'Sec-Fetch-Site': 'cross-site',
      'Access-Control-Request-Method': 'POST',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (isCorsAllowed(untrustedPreflight)) {
    fail('GATE CORS: preflight libera a origem externa (Access-Control-Allow-Origin).');
  }

  // A mesma origem externa nao pode ser convertida artificialmente numa
  // chamada local: confirmar que a API rejeita o GET com Origin cross-site.
  const untrustedGet = await fetch(WEB + '/api/health', {
    headers: {
      Origin: foreignOrigin,
      'Sec-Fetch-Site': 'cross-site',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (untrustedGet.ok || isCorsAllowed(untrustedGet)) {
    fail('GATE CORS: requisicao cross-site ignorou a restricao da API.');
  }
  console.log('GATE LOGIN LOCAL: sessao, POST com Origin encaminhada e bloqueio cross-site OK.');
  console.log('ATENCAO: ainda e obrigatoria a verificacao funcional no navegador publico Codespaces.');

  const revision = output('git', ['rev-parse', '--short=9', 'HEAD']);
  const host = process.env.CODESPACE_NAME
    ? 'https://' + process.env.CODESPACE_NAME + '-5174.app.github.dev'
    : WEB;
  console.log('\nMEG HOMOLOGAÇÃO DISPONÍVEL (sem cache):\n' +
    host + '/web-evolution.html?v=' + revision + '&nocache=' + Date.now());
  console.log('Credenciais fictícias: ' + CREDS +
    '\nPorta 5174: manter PRIVATE no painel Ports do Codespaces.');
  console.log('API em 127.0.0.1:3334; PostgreSQL descartável em 127.0.0.1:5548.');
  console.log('Para encerrar os servidores, pressione Ctrl+C.');
  await new Promise(() => {});
}

main().catch(error => { console.error('[MEG preview]', error.message); stop(); process.exitCode = 1; });
