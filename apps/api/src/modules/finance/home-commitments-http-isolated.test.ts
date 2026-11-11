import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { prisma } from '@meg/database';
import { registerAuth } from '../../plugins/auth';
import { financeRoutes } from './routes';

/**
 * E2E HTTP real: Fastify + JWT oficial + rota financeira real + PostgreSQL 17
 * DESCARTÁVEL. Não carrega server.ts: aquele entrypoint pode iniciar tarefas
 * de manutenção, que não pertencem a um ensaio estritamente read-only.
 */
const SAFE_DB = 'postgresql://meg_qa:meg_qa@127.0.0.1:5432/meg_home_p0_qa?schema=public';
const SAFE_JWT = 'meg-home-p0-qa-only-fictitious-jwt-secret-2026';
assert.equal(process.env.DATABASE_URL, SAFE_DB,
  'BLOQUEADO: endereço do PostgreSQL QA deve ser local e exato');
assert.equal(process.env.NODE_ENV, 'test',
  'BLOQUEADO: HTTP QA exige NODE_ENV=test');
assert.equal(process.env.MEG_HOME_P0_HTTP_QA, '1',
  'BLOQUEADO: HTTP QA exige habilitação explícita');
assert.equal(process.env.JWT_SECRET, SAFE_JWT,
  'BLOQUEADO: chave JWT deve ser exclusivamente fictícia');
const owner = 'p0-fixture-owner';
const another = 'p0-fixture-other';

const app = Fastify({ logger: false });
let requests = 0;
try {
  // Este teste não prepara schema, cria dados ou executa nenhum writer.
  // O step anterior preparou 2 workspaces e 3.500+ registros fictícios.
  assert.equal(await prisma.user.count(), 2,
    'O teste HTTP exige exclusivamente os 2 usuários fictícios criados na CI');
  assert.equal(await prisma.workspace.count(), 2,
    'O teste HTTP exige exclusivamente os 2 workspaces fictícios da CI');
  assert.ok(await prisma.financialEvent.count() >= 2500,
    'Fixture financeira do PostgreSQL de QA não foi carregada');
  assert.ok(await prisma.payable.count() >= 1000,
    'Fixture de contas a pagar do QA não foi carregada');

  await registerAuth(app);
  // Rota verdadeira, com o mesmo middleware de produção.
  await app.register(financeRoutes, { prefix: '/finance' });
  await app.ready();
  const listening = await app.listen({ host: '127.0.0.1', port: 0 });
  const endpoint = new URL(listening);
  assert.equal(endpoint.hostname, '127.0.0.1',
    'BLOQUEADO: o servidor HTTP de QA não pode escutar IP público');

  const tokenA = app.jwt.sign({
    sub: owner, role: 'VIEWER', email: 'p0-a@example.invalid',
  }, { expiresIn: '5m' });
  const tokenB = app.jwt.sign({
    sub: another, role: 'VIEWER', email: 'p0-b@example.invalid',
  }, { expiresIn: '5m' });
  const invalidRole = app.jwt.sign({
    sub: owner, role: 'GUEST' as 'VIEWER', email: 'p0-a@example.invalid',
  }, { expiresIn: '5m' });

  const send = async (path: string, token?: string) => {
    requests++;
    assert.ok(path.startsWith('/finance/home-commitments'),
      'HTTP QA só pode solicitar rota financeira de leitura autorizada');
    return fetch(new URL(path, listening), {
      method: 'GET',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      redirect: 'error',
    });
  };
  const success = async (path: string, token: string) => {
    const response = await send(path, token);
    assert.equal(response.status, 200, path + ' deveria responder HTTP 200');
    assert.equal(response.headers.get('cache-control'), 'private, no-store',
      'Respostas autenticadas não podem ser armazenadas em caches compartilhados');
    return response.json() as Promise<{
      asOf: string;
      items: Array<{
        id: string; sourceId: string; amount: string; dueDate: string;
        dueState: string; status: string;
      }>;
      hasMore: boolean;
      nextCursor: string | null;
    }>;
  };

  assert.equal((await send('/finance/home-commitments?limit=8')).status, 401,
    'Rota sem token JWT deve retornar 401');
  assert.equal((await send('/finance/home-commitments?limit=8', 'not-a-valid-jwt')).status, 401,
    'Rota com token inválido deve retornar 401');
  assert.equal((await send('/finance/home-commitments?limit=8', invalidRole)).status, 403,
    'Papel não autorizado deve retornar 403');

  for (const path of [
    '/finance/home-commitments?limit=0',
    '/finance/home-commitments?limit=51',
    '/finance/home-commitments?limit=3.5',
    '/finance/home-commitments?limit=2&cursor=invalid',
  ]) {
    assert.equal((await send(path, tokenA)).status, 400,
      'Rota deve rejeitar parâmetro de leitura inválido: ' + path);
  }

  const a = await success('/finance/home-commitments?limit=16', tokenA);
  assert.match(a.asOf, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(a.hasMore && a.nextCursor, 'Fonte com volume deve paginar');
  assert.equal(a.items.length, 16);
  const ids = a.items.map(item => item.id);
  assert.ok(ids.includes('financialEvent:p0-old'),
    'Vencido do mês anterior precisa chegar pela rota real');
  assert.ok(ids.includes('payable:p0-partial'),
    'Parcial deve chegar pela rota real');
  assert.ok(ids.includes('financialEvent:p0-same-a')
    && ids.includes('financialEvent:p0-same-b'),
    'Obrigações distintas de mesmo valor e dia não podem ser colapsadas');
  assert.equal(a.items.find(item => item.id === 'payable:p0-partial')?.amount, '12.03');
  assert.equal(a.items.find(item => item.id === 'financialEvent:p0-old')?.amount, '43.20');
  for (const excluded of [
    'financialEvent:p0-benefit', 'financialEvent:p0-credit',
    'financialEvent:p0-linked-event', 'payable:p0-paid-payable',
    'financialEvent:p0-secret-b', 'payable:p0-secret-payable-b',
  ]) assert.ok(!ids.includes(excluded), 'Origem não elegível exposta via HTTP: ' + excluded);

  const next = await success(
    '/finance/home-commitments?limit=16&cursor=' + encodeURIComponent(a.nextCursor!),
    tokenA,
  );
  assert.equal(next.asOf, a.asOf, 'Paginação deve ter referência do mesmo dia');
  assert.equal(new Set([...ids, ...next.items.map(item => item.id)]).size,
    ids.length + next.items.length, 'Cursor HTTP não pode repetir compromissos');

  const b = await success('/finance/home-commitments?limit=16', tokenB);
  assert.deepEqual(b.items.map(item => item.id),
    ['financialEvent:p0-secret-b', 'payable:p0-secret-payable-b'],
    'Workspace B recebeu compromissos de outro proprietário');
  assert.equal(b.hasMore, false);

  // Cliente REAL da Home lendo a rota real sobre socket HTTP local.
  let uiCalls = 0;
  const requestA = async <T>(path: string): Promise<T> => {
    uiCalls++;
    const response = await send(path, tokenA);
    if (!response.ok) throw new Error('HTTP_' + response.status);
    return response.json() as Promise<T>;
  };
  // Importação dinâmica evita que o TSConfig da API compile fontes da Web:
  // os contratos de compilação dos dois workspaces permanecem independentes.
  const webReadPath = new URL(
    '../../../../web/src/meg-web-evolution/home/home-commitments-read.ts',
    import.meta.url,
  ).href;
  const webModule = await import(webReadPath) as {
    readCanonicalHomeCommitments: (
      request: <T>(path: string) => Promise<T>,
    ) => Promise<Array<{ id: string; sourceId: string; amount: string; dueState: string }>>;
  };
  const visible = await webModule.readCanonicalHomeCommitments(requestA);
  assert.equal(visible.length, 8, 'A Home deve exibir janela de oito compromissos');
  assert.ok(visible.some(item => item.id === 'financialEvent:p0-old'));
  assert.ok(visible.some(item => item.id === 'payable:p0-partial'));
  assert.ok(uiCalls >= 1 && uiCalls <= 4,
    'Home não pode varrer o histórico inteiro');
  assert.equal(visible[0]?.id, 'financialEvent:p0-old');

  const countAfter = await prisma.financialEvent.count();
  assert.ok(countAfter >= 2500, 'A leitura HTTP não deve destruir eventos');
  console.log(JSON.stringify({
    test: 'MEG Home P0 HTTP real + JWT + PostgreSQL 17 local + consumidor Web',
    result: 'PASS',
    auth: { missing: 401, invalid: 401, unauthorizedRole: 403 },
    validation: 400,
    workspaces: 2,
    events: countAfter,
    apiPageSize: a.items.length,
    nextPageSize: next.items.length,
    visibleCommitments: visible.length,
    uiCalls,
    totalReadRequests: requests,
  }));
} finally {
  await app.close();
  await prisma.$disconnect();
}
