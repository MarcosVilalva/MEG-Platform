import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../../phoenix-preview-server.mjs', import.meta.url), 'utf8');

assert.match(server, /PREVIEW_READ_ONLY/,
  'Servidor do preview deve bloquear qualquer mutação fora das rotas explícitas de sessão.');
assert.match(server, /allowedAuthPosts\s*=\s*new Set\(\['\/auth\/login', '\/auth\/refresh', '\/auth\/logout'\]\)/,
  'Preview deve permitir POST somente para login, refresh e logout.');
assert.match(server, /return method === 'POST' && allowedAuthPosts\.has\(pathname\)/,
  'POST deve ser recusado fora das operações de sessão permitidas.');
assert.doesNotMatch(server, /allowedAuthPosts[^\n]*(?:register|forgot-password)/,
  'Preview não deve liberar cadastro ou recuperação de senha como mutações auxiliares.');
assert.match(server, /hopByHopHeaders[^\n]*'origin'[^\n]*'referer'/,
  'Proxy deve remover Origin e Referer antes da chamada servidor-a-servidor.');
assert.match(server, /PHOENIX_API_ORIGIN/,
  'Destino da API deve ser configurável no ambiente do preview.');
assert.match(server, /pathname === '\/preview-health'/,
  'Serviço isolado deve ter health check próprio sem depender da API financeira.');
assert.match(server, /pathname === '\/' \? '\/phoenix\.html'/,
  'Raiz do serviço deve abrir exclusivamente a entrada Phoenix.');
assert.doesNotMatch(server, /index\.html/,
  'Servidor do preview não deve redirecionar para a interface atual de produção.');

console.log('Contrato do servidor Phoenix somente leitura validado.');
