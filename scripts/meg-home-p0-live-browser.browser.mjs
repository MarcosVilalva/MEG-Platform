import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import Fastify from 'fastify';
import { chromium } from '@playwright/test';
import { prisma } from '@meg/database';
import { registerAuth } from '../apps/api/src/plugins/auth.ts';
import { authRoutes } from '../apps/api/src/modules/auth/routes.ts';
import { financeRoutes } from '../apps/api/src/modules/finance/routes.ts';

/**
 * Navegador → HTTP real → JWT real → GET canônico real → PostgreSQL 17 descartável.
 *
 * A Home autenticada usa somente a rota P0 real. As demais leituras do painel
 * recebem respostas auxiliares declaradamente fictícias no gateway local.
 * Nada é publicado e nenhuma operação financeira de escrita é exposta.
 */
const SAFE_DB = 'postgresql://meg_qa:meg_qa@127.0.0.1:5432/meg_home_p0_qa?schema=public';
const SAFE_JWT = 'meg-home-p0-qa-only-fictitious-jwt-secret-2026';
assert.equal(process.env.DATABASE_URL, SAFE_DB, 'Bloqueado: somente banco PostgreSQL QA local');
assert.equal(process.env.NODE_ENV, 'test', 'Bloqueado: somente NODE_ENV=test');
assert.equal(process.env.MEG_HOME_P0_HTTP_QA, '1', 'Bloqueado: flag QA exigida');
assert.equal(process.env.JWT_SECRET, SAFE_JWT, 'Bloqueado: JWT exclusivamente fictício');

const projectDir = process.cwd();
const buildDir = resolve(projectDir, 'apps/web/dist-fluxo-integrado-08');
const ownerA = 'p0-fixture-owner';
const ownerB = 'p0-fixture-other';
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};
const sample = {
  '/finance/summary': { month: '2026-11', income: 0, expense: 0, realizedResult: 0, projectedResult: 0, pendingCount: 0, pendingAmount: 0 },
  '/finance/cashflow': { month: '2026-11', days: [] },
  '/finance/benefit-summary': { month: '2026-11', balance: 0, credits: 0, used: 0 },
  '/finance/events/month': [],
  '/finance/accounts': [],
  '/finance/categories': [],
  '/finance/home-available': { date: '2026-11-11', available: 0, scope: 'monetary' },
  '/cards': [],
};
const audit = { officialReads: [], auxiliaryReads: [], invalidRequests: [], browserResponses: [] };
const api = Fastify({ logger: false });
let gateway;
let browser;

function respondJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

try {
  assert.equal(await prisma.user.count(), 2, 'Fixture deve ter apenas os dois usuários QA');
  assert.equal(await prisma.workspace.count(), 2, 'Fixture deve ter apenas dois workspaces QA');
  assert.ok(await prisma.financialEvent.count() >= 2500, 'Fixture PostgreSQL financeira ausente');
  assert.ok(await prisma.payable.count() >= 1000, 'Fixture PostgreSQL Payable ausente');

  await registerAuth(api);
  await api.register(authRoutes, { prefix: '/auth' });
  await api.register(financeRoutes, { prefix: '/finance' });
  const apiUrl = await api.listen({ host: '127.0.0.1', port: 0 });
  assert.equal(new URL(apiUrl).hostname, '127.0.0.1');

  const user = (id, email) => ({
    id, email, name: id === ownerA ? 'Usuário fictício A' : 'Usuário fictício B',
    role: 'VIEWER', status: 'ACTIVE', isActive: true,
  });
  const sessionFor = (id) => {
    const u = user(id, id === ownerA ? 'p0-a@example.invalid' : 'p0-b@example.invalid');
    return {
      user: u,
      accessToken: api.jwt.sign({ sub: u.id, role: u.role, email: u.email }, { expiresIn: '10m' }),
      refreshToken: 'qa-only-refresh-token-never-sent',
      refreshExpiresAt: '2030-01-01T00:00:00.000Z',
    };
  };
  const sessions = { A: sessionFor(ownerA), B: sessionFor(ownerB) };
  const allowedTokens = new Set([sessions.A.accessToken, sessions.B.accessToken]);

  gateway = createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        audit.invalidRequests.push({ path: req.url, method: req.method });
        return respondJson(res, 405, { error: 'QA_READ_ONLY' });
      }
      const parsed = new URL(req.url || '/', 'http://127.0.0.1');
      const pathname = parsed.pathname;
      if (pathname.startsWith('/auth/') || pathname.startsWith('/finance/') || pathname === '/cards') {
        const bearer = req.headers.authorization;
        if (!allowedTokens.has(String(bearer || '').replace(/^Bearer /, ''))) {
          audit.invalidRequests.push({ path: pathname, reason: 'TOKEN_MISSING_OR_UNKNOWN' });
          return respondJson(res, 401, { error: 'UNAUTHORIZED' });
        }
        if (pathname === '/auth/me' || pathname === '/finance/home-commitments') {
          const forwarded = await fetch(new URL(parsed.pathname + parsed.search, apiUrl), {
            headers: { Authorization: String(bearer) },
            redirect: 'error',
          });
          const data = Buffer.from(await forwarded.arrayBuffer());
          res.writeHead(forwarded.status, {
            'Content-Type': forwarded.headers.get('content-type') || 'application/json',
            'Cache-Control': forwarded.headers.get('cache-control') || 'no-store',
          });
          res.end(data);
          audit.officialReads.push({ path: pathname + parsed.search, status: forwarded.status });
          return;
        }
        if (Object.hasOwn(sample, pathname)) {
          audit.auxiliaryReads.push(pathname);
          return respondJson(res, 200, sample[pathname]);
        }
        audit.invalidRequests.push({ path: pathname, reason: 'ENDPOINT_NOT_ALLOWED' });
        return respondJson(res, 404, { error: 'QA_ENDPOINT_NOT_ALLOWED' });
      }

      let decoded;
      try { decoded = decodeURIComponent(pathname); } catch { return respondJson(res, 400, { error: 'PATH_INVALID' }); }
      const target = resolve(buildDir, '.' + decoded);
      if (!target.startsWith(buildDir + sep)) return respondJson(res, 403, { error: 'INVALID_PATH' });
      const mime = contentTypes[extname(target).toLowerCase()];
      if (!mime) return respondJson(res, 404, { error: 'ASSET_NOT_ALLOWED' });
      try {
        const body = await readFile(target);
        res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
        res.end(req.method === 'HEAD' ? undefined : body);
      } catch { respondJson(res, 404, { error: 'ASSET_NOT_FOUND' }); }
    } catch (error) {
      audit.invalidRequests.push({ error: String(error) });
      if (!res.headersSent) respondJson(res, 500, { error: 'QA_GATEWAY_FAILED' });
    }
  });
  await new Promise((ok, fail) => {
    gateway.once('error', fail);
    gateway.listen(0, '127.0.0.1', ok);
  });
  const frontendBase = 'http://127.0.0.1:' + gateway.address().port;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  });
  await mkdir('artifacts/meg-home-p0-live', { recursive: true });

  async function runCase(name, session, width, height, expected) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const jsErrors = [];
    const apiResponses = [];
    page.on('pageerror', e => jsErrors.push(String(e)));
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.pathname === '/finance/home-commitments') {
        apiResponses.push(response);
        audit.browserResponses.push({ name, status: response.status(), path: url.pathname + url.search });
      }
    });
    await page.addInitScript(value => sessionStorage.setItem('meg.auth.session', JSON.stringify(value)), session);
    try {
      await page.goto(frontendBase + '/web-evolution.html', { waitUntil: 'domcontentloaded' });
      const dueGrid = page.locator('.pano-panel.pano-grid').filter({ hasText: 'Próximos compromissos' });
      await dueGrid.waitFor({ timeout: 30000 });
      await dueGrid.getByText(expected, { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 30000 });
      assert.ok(apiResponses.length >= 1 && apiResponses.length <= 4, 'Cliente não pode varrer histórico ilimitado');
      for (const response of apiResponses) {
        assert.equal(response.status(), 200, 'GET real canônico deve retornar 200');
        assert.equal(response.request().headers().authorization, 'Bearer ' + session.accessToken);
        assert.equal(response.headers()['cache-control'], 'private, no-store');
        const payload = await response.json();
        assert.ok(Array.isArray(payload.items), 'Resposta deve ser payload real canônico');
      }
      assert.equal(jsErrors.length, 0, 'Erro JavaScript não esperado: ' + jsErrors.join('; '));
      assert.equal(await page.getByRole('alert').count(), 0, 'Não renderizar erro financeiro após sucesso');
      assert.equal(await page.locator('.pano-grid').count(), 2, 'Geometria homologada preservada');
      const viewport = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, screen: innerWidth }));
      assert.ok(viewport.page <= viewport.screen, 'Rolagem horizontal da página é proibida: ' + JSON.stringify(viewport));
      if (name.startsWith('A')) {
        assert.ok(await dueGrid.getByText('Obrigação fictícia p0-old', { exact: false }).filter({ visible: true }).count() > 0,
          'Compromisso vencido deve aparecer na UI');
        assert.ok(await dueGrid.getByText('Conta fictícia p0-partial', { exact: false }).filter({ visible: true }).count() > 0,
          'Compromisso parcial deve aparecer na UI');
        assert.equal(await dueGrid.getByText('Conta fictícia p0-secret-payable-b', { exact: false }).count(), 0,
          'Home A não pode mostrar dados da B');
        assert.ok(await dueGrid.locator('[aria-label*="Vencido"]').count() > 0,
          'Urgência vencida deve vir do servidor e permanecer acessível');
      } else {
        assert.equal(await dueGrid.getByText('Obrigação fictícia p0-old', { exact: false }).count(), 0,
          'Home B não pode mostrar dados da A');
      }
      await dueGrid.screenshot({
        path: 'artifacts/meg-home-p0-live/' + name + '-compromissos.png',
        animations: 'disabled',
      });
      await page.screenshot({
        path: 'artifacts/meg-home-p0-live/' + name + '-home.png',
        fullPage: true, animations: 'disabled',
      });
      return { name, width, apiCalls: apiResponses.length, horizontalOverflow: false };
    } finally {
      await context.close();
    }
  }

  const cases = [];
  cases.push(await runCase('A-desktop-1366', sessions.A, 1366, 900, 'Obrigação fictícia p0-old'));
  cases.push(await runCase('A-mobile-375', sessions.A, 375, 812, 'Obrigação fictícia p0-old'));
  cases.push(await runCase('B-mobile-375', sessions.B, 375, 812, 'Obrigação fictícia p0-secret-b'));
  assert.equal(audit.invalidRequests.length, 0, 'Requisições fora das rotas permitidas: ' + JSON.stringify(audit.invalidRequests));
  const commitments = audit.officialReads.filter(x => x.path.startsWith('/finance/home-commitments'));
  const auth = audit.officialReads.filter(x => x.path === '/auth/me');
  assert.ok(commitments.length >= 3, 'Compromissos precisam vir da API real em todas as sessões');
  assert.ok(auth.length >= 3, 'Autenticação precisa vir da rota oficial');
  assert.ok(audit.auxiliaryReads.length > 0, 'Leituras secundárias devem ser explicitamente simuladas em QA');
  console.log(JSON.stringify({
    test: 'MEG Home P0 Browser -> HTTP real/JWT -> Prisma/PostgreSQL 17',
    result: 'PASS',
    cases,
    realCommitmentRequests: commitments.length,
    realAuthRequests: auth.length,
    auxiliaryFictitiousRequests: audit.auxiliaryReads.length,
    blockedRequests: audit.invalidRequests.length,
  }));
} finally {
  await browser?.close();
  if (gateway) await new Promise(resolve => gateway.close(resolve));
  await api.close();
  await prisma.$disconnect();
}
