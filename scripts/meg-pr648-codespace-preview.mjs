#!/usr/bin/env node
/**
 * MEG Web Evolution / PR #648: homologação local no Codespaces.
 * API Fastify + PostgreSQL descartável + Vite. Não toca em produção.
 * Pré-requisitos: Node 22, npm, Docker, git e portas 3334/5174/5548 livres.
 */
import { execFileSync, spawn } from 'node:child_process';
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

function command(bin, args, env = process.env) {
  execFileSync(bin, args, { cwd: ROOT, env, stdio: 'inherit' });
}
function output(bin, args) {
  return execFileSync(bin, args, { cwd: ROOT, encoding: 'utf8' }).trim();
}
function fail(message) { throw new Error(message); }
function stop() {
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
}
process.on('SIGINT', () => { stop(); process.exit(130); });
process.on('SIGTERM', () => { stop(); process.exit(143); });
process.on('exit', stop);

async function waitUrl(url, timeoutMs = 120000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
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

  const apiChild = spawn('npm', ['--workspace', 'apps/api', 'run', 'start'],
    { cwd: ROOT, env: safeEnv, stdio: 'inherit' });
  children.push(apiChild);
  await waitUrl(API + '/ready');

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

  const webEnv = { ...safeEnv, VITE_API_URL: '/api' };
  const webChild = spawn('npm', ['--workspace', 'apps/web', 'run', 'dev', '--',
      '--config', 'vite.codespace-preview.config.ts'],
    { cwd: ROOT, env: webEnv, stdio: 'inherit' });
  children.push(webChild);
  await waitUrl(WEB + '/web-evolution.html');

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
