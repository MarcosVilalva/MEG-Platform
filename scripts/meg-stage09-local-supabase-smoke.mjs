/**
 * Etapa 09: smoke isolado de Supabase Auth + Storage.
 * Runner descartavel, nenhuma origem, tokens ou dados reais.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

assert.equal(process.env.CI, 'true', 'Requer CI');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Requer GitHub Actions');
assert.equal(process.env.SUPABASE_ACCESS_TOKEN || '', '', 'Token remoto proibido');
assert.equal(process.env.DATABASE_URL || '', '', 'DATABASE_URL externo proibido');
assert.equal(process.argv.length, 3, 'Arquivo local de credenciais requerido');
assert.match(process.argv[2], /stage09-local-status\.env$/);

const local = {};
for (const line of readFileSync(process.argv[2], 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z_]+)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if (value.length >= 2 && ((value[0] === '"' && value.at(-1) === '"') ||
    (value[0] === "'" && value.at(-1) === "'"))) value = value.slice(1, -1);
  local[match[1]] = value;
}
const url = new URL(local.API_URL || local.SUPABASE_URL);
assert.equal(url.protocol, 'http:');
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Endpoint remoto proibido');
assert.equal(url.port, '54321', 'Porta inesperada');
const gateway = 'http://127.0.0.1:54321';
const anon = local.ANON_KEY;
const service = local.SERVICE_ROLE_KEY;
assert.ok(anon && service, 'Chaves locais nao encontradas');
assert.notEqual(anon, service);

async function call(path, { method = 'GET', bearer = anon, body, type = 'application/json' } = {}) {
  assert.ok(path.startsWith('/') && !path.startsWith('//'), 'Caminho invalido');
  const headers = { apikey: bearer === service ? service : anon, Authorization: 'Bearer ' + bearer };
  if (body !== undefined) headers['Content-Type'] = type;
  const payload = body === undefined ? undefined : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  return fetch(gateway + path, { method, headers, body: payload, redirect: 'manual', signal: AbortSignal.timeout(12000) });
}
const settings = await call('/auth/v1/settings');
assert.equal(settings.status, 200, 'Auth local indisponivel');

const suffix = randomUUID().replaceAll('-', '');
const email = 'stage09-synthetic-' + suffix + '@example.invalid';
const password = 'MEG_Stage09_Local!' + suffix.slice(0, 12);
const created = await call('/auth/v1/admin/users', {
  method: 'POST', bearer: service, body: { email, password, email_confirm: true },
});
assert.ok([200, 201].includes(created.status), 'Create Auth user HTTP ' + created.status);
const user = await created.json();
assert.ok(user.id, 'Fixture Auth sem ID');

const signedIn = await call('/auth/v1/token?grant_type=password', {
  method: 'POST', body: { email, password },
});
assert.equal(signedIn.status, 200, 'Auth password grant falhou');
const tokens = await signedIn.json();
assert.ok(tokens.access_token, 'JWT local ausente');
const who = await call('/auth/v1/user', { bearer: tokens.access_token });
assert.equal(who.status, 200, 'Auth getUser falhou');
assert.equal((await who.json()).id, user.id, 'Sessao diferente do usuario ficticio');

const badPassword = await call('/auth/v1/token?grant_type=password', {
  method: 'POST', body: { email, password: 'SENHA_INVALIDA' },
});
assert.ok([400, 401, 422].includes(badPassword.status), 'Senha errada aceita');

const bucket = 'stage09-local-' + suffix.slice(0, 16);
const bucketResponse = await call('/storage/v1/bucket', {
  method: 'POST', bearer: service, body: { id: bucket, name: bucket, public: false },
});
assert.ok([200, 201].includes(bucketResponse.status), 'Bucket privado HTTP ' + bucketResponse.status);
const data = Buffer.from('MEG_STAGE09_SYNTHETIC_ONLY_' + suffix, 'utf8');
const object = 'fixture.txt';
const uploaded = await call('/storage/v1/object/' + bucket + '/' + object, {
  method: 'POST', bearer: service, body: data, type: 'text/plain',
});
assert.ok([200, 201].includes(uploaded.status), 'Upload ficticio HTTP ' + uploaded.status);
const retrieved = await call('/storage/v1/object/authenticated/' + bucket + '/' + object, { bearer: service });
assert.equal(retrieved.status, 200, 'Download privado de servico falhou');
assert.deepEqual(Buffer.from(await retrieved.arrayBuffer()), data, 'Bytes divergentes');
const anonRead = await call('/storage/v1/object/authenticated/' + bucket + '/' + object);
assert.notEqual(anonRead.status, 200, 'Anonimo leu arquivo privado');
const userRead = await call('/storage/v1/object/authenticated/' + bucket + '/' + object, { bearer: tokens.access_token });
assert.notEqual(userRead.status, 200, 'Usuario sem Storage policy leu arquivo privado');
const publicRead = await call('/storage/v1/object/public/' + bucket + '/' + object);
assert.notEqual(publicRead.status, 200, 'URL publica expôs arquivo privado');

console.log(JSON.stringify({
  marker: 'MEG_STAGE09_SUPABASE_LOCAL_AUTH_STORAGE_SMOKE_PASS',
  stack: 'supabase_cli_local_disposable',
  auth_login_real_http: true,
  bad_password_rejected: true,
  jwt_user_identity_checked: true,
  storage_private_fixture_integrity: true,
  storage_anon_user_public_denied: true,
  remote_supabase_access: false,
  managed_cloud_dr_gate: 'NOT_VALIDATED',
  real_data: false,
}));
