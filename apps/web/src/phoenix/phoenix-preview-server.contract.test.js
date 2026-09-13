import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../../phoenix-preview-server.mjs', import.meta.url), 'utf8');

assert.match(server, /PREVIEW_READ_ONLY/,
  'Servidor do preview deve bloquear mutações fora das rotas explícitas de autenticação.');
assert.match(server, /allowedAuthPosts\s*=\s*new Set\(\[\s*'\/auth\/login',\s*'\/auth\/refresh',\s*'\/auth\/logout',\s*'\/auth\/register',\s*'\/auth\/forgot-password'\s*\]\)/,
  'Preview deve permitir somente o ciclo explícito de login, sessão, cadastro e recuperação de acesso.');
assert.match(server, /return method === 'POST' && allowedAuthPosts\.has\(pathname\)/,
  'POST deve ser recusado fora das operações de autenticação permitidas.');
assert.doesNotMatch(server, /allowedAuthPosts[\s\S]{0,300}(?:finance|payables|cards|receivables)/,
  'Preview não pode liberar mutações financeiras pela allowlist de autenticação.');
assert.match(server, /hopByHopHeaders[^\n]*'origin'[^\n]*'referer'/,
  'Proxy deve remover Origin e Referer antes da chamada servidor-a-servidor.');
assert.match(server, /PHOENIX_API_ORIGIN/,
  'Destino da API deve ser configurável no ambiente do preview.');
assert.match(server, /periodEventsPath\s*=\s*'\/finance\/phoenix-preview\/events'/,
  'Preview deve possuir agregador isolado para o histórico completo de homologação.');
assert.match(server, /fetchEventPage\(headers, 1\)/,
  'Agregador deve iniciar pela leitura oficial paginada da API atual.');
assert.match(server, /page \+= 8/,
  'Paginação servidor-a-servidor deve usar lotes controlados em vez de disparar tudo sem limite.');
assert.match(server, /PERIOD_EVENTS_TTL\s*=\s*60_000/,
  'Histórico agregado deve possuir cache curto por sessão para evitar dezenas de chamadas repetidas.');
assert.match(server, /createHash\('sha256'\)/,
  'Chave do cache não deve armazenar token ou cookie em texto puro.');
assert.match(server, /if \(url\.pathname === periodEventsPath\)/,
  'Agregador deve ser tratado antes do proxy genérico para não depender de rota inexistente na API principal.');
assert.match(server, /pathname === '\/preview-health'/,
  'Serviço isolado deve ter health check próprio sem depender da API financeira.');
assert.match(server, /pathname === '\/' \? '\/phoenix\.html'/,
  'Raiz do serviço deve abrir exclusivamente a entrada Phoenix.');
assert.doesNotMatch(server, /requested = pathname === '\/' \? '\/index\.html'/,
  'Servidor do preview não deve redirecionar para a interface atual de produção.');
assert.match(server, /allowedStaticFiles\s*=\s*new Set\(\['\/phoenix\.html'\]\)/,
  'Preview deve servir somente a entrada Phoenix como HTML navegável.');
assert.match(server, /allowedStaticPrefixes\s*=\s*\['\/assets\/', '\/brand\/'\]/,
  'Preview deve limitar arquivos estáticos aos assets e identidade visual necessários.');
assert.match(server, /if \(!isAllowedStaticPath\(decoded\)\)/,
  'Arquivos fora da allowlist estática devem ser recusados antes do acesso ao dist.');
assert.match(server, /x-frame-options[^\n]*DENY/i,
  'Preview deve impedir incorporação em frames de terceiros.');
assert.match(server, /permissions-policy[^\n]*camera=\(\), microphone=\(\), geolocation=\(\)/,
  'Preview deve desabilitar permissões de navegador que não são necessárias para validação.');

console.log('Contrato do servidor Phoenix com finanças somente leitura validado.');
