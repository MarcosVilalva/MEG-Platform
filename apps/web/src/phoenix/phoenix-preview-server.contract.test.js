import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../../phoenix-preview-server.mjs', import.meta.url), 'utf8');

assert.match(server, /PREVIEW_READ_ONLY/,
  'Servidor do preview deve bloquear mutações fora das capacidades explicitamente habilitadas.');
assert.match(server, /allowedAuthPosts\s*=\s*new Set\(\[\s*'\/auth\/login',\s*'\/auth\/refresh',\s*'\/auth\/logout',\s*'\/auth\/register',\s*'\/auth\/forgot-password'\s*\]\)/,
  'Preview deve manter o ciclo explícito de login, sessão, cadastro e recuperação de acesso.');

assert.match(server, /simpleEventWriteEnabled\s*=\s*process\.env\.PHOENIX_SIMPLE_EVENT_WRITE\s*===\s*'enabled'/,
  'Evento financeiro simples deve exigir uma flag de ambiente deliberada.');
assert.match(server, /cardPurchaseWriteEnabled\s*=\s*process\.env\.PHOENIX_CARD_PURCHASE_WRITE\s*===\s*'enabled'/,
  'Compra no cartão deve exigir uma flag independente e deliberada.');
assert.match(server, /pendingWriteEnabled\s*=\s*process\.env\.PHOENIX_PENDING_WRITE\s*===\s*'enabled'/,
  'Baixa de pendências deve exigir uma flag de ambiente deliberada.');
assert.match(server, /bulkEventWriteEnabled\s*=\s*process\.env\.PHOENIX_BULK_EVENT_WRITE\s*===\s*'enabled'/,
  'Ações financeiras em lote devem exigir uma flag de ambiente deliberada.');

assert.match(server, /allowedFinancialPosts\s*=\s*new Set\(\['\/finance\/events'\]\)/,
  'Writer de evento simples deve continuar restrito ao endpoint exato de criação.');
assert.match(server, /allowedCardPurchasePosts\s*=\s*new Set\(\['\/cards\/purchases'\]\)/,
  'Criação de compra no cartão deve permanecer restrita ao endpoint exato.');
assert.match(server, /function isAllowedCardPurchaseWrite\(method, pathname\)/,
  'Mutações de compra no cartão devem passar por gate específico.');
assert.match(server, /if \(!cardPurchaseWriteEnabled\) return false;/,
  'Gate de cartão deve falhar fechado quando a capacidade estiver desligada.');
assert.match(server, /method === 'POST'.*allowedCardPurchasePosts\.has\(pathname\)/s,
  'POST de cartão deve continuar limitado à criação de compra.');
assert.match(server, /method === 'PATCH' \|\| method === 'DELETE'.*\^\\\/cards\\\/purchases\\\/\[\^\/\]\+\$/s,
  'Edição e exclusão de cartão devem ficar limitadas à compra identificada, sem abrir gestão ou faturas.');
assert.match(server, /allowedBulkEventPosts\s*=\s*new Set\(\[\s*'\/finance\/events\/bulk\/update',\s*'\/finance\/events\/bulk\/archive'\s*\]\)/,
  'Writer em lote deve possuir allowlist explícita somente para update e archive protegidos.');
assert.match(server, /simpleEventWriteEnabled\s*&&\s*allowedFinancialPosts\.has\(pathname\)/,
  'POST de evento simples deve depender simultaneamente da flag e da allowlist estreita.');
assert.match(server, /isAllowedCardPurchaseWrite\(method, pathname\)/,
  'Toda mutação de compra no cartão deve depender do gate estreito do domínio.');
assert.match(server, /bulkEventWriteEnabled\s*&&\s*allowedBulkEventPosts\.has\(pathname\)/,
  'POST em lote deve depender simultaneamente da flag e da allowlist estreita.');
assert.match(server, /if \(!pendingWriteEnabled\) return false;/,
  'Rotas de baixa devem falhar fechadas quando a capacidade estiver desligada.');
assert.match(server, /\^\\\/finance\\\/events\\\/\[\^\/\]\+\\\/settle\$.*\^\\\/payables\\\/\[\^\/\]\+\\\/payments\$/s,
  'Baixas permitidas devem ficar limitadas a FinancialEvent settle e Payable payments.');
assert.doesNotMatch(server, /allowedFinancialPosts\s*=\s*new Set\([^)]*(?:payables|cards|receivables|transfers)/,
  'Writer simples não pode ampliar implicitamente sua allowlist para outros domínios.');

assert.match(server, /capabilities:\s*\{\s*simpleEventWrite:\s*simpleEventWriteEnabled,\s*cardPurchaseWrite:\s*cardPurchaseWriteEnabled,\s*pendingWrite:\s*pendingWriteEnabled,\s*bulkEventWrite:\s*bulkEventWriteEnabled\s*\}/s,
  'Health do preview deve declarar todas as capacidades reais de escrita protegida.');
assert.match(server, /phoenix-bulk-event-write-gated-preview/,
  'Health deve distinguir quando o writer de lote está habilitado.');
assert.match(server, /phoenix-pending-write-gated-preview/,
  'Health deve distinguir quando o writer de pendências está habilitado.');
assert.match(server, /phoenix-card-purchase-write-gated-preview/,
  'Health deve distinguir quando o writer de compra no cartão está habilitado.');
assert.match(server, /phoenix-simple-event-write-gated-preview/,
  'Health deve distinguir quando somente o writer simples está habilitado.');
assert.match(server, /phoenix-finance-read-only-preview/,
  'Health deve manter estado explícito de leitura quando nenhuma capacidade estiver habilitada.');

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

console.log('Contrato do servidor Phoenix com writers financeiros protegidos por capacidade validado.');
