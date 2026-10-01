import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const users = readFileSync(new URL('./screens/PhoenixUsers.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('./PhoenixApp.tsx', import.meta.url), 'utf8');
const authClient = readFileSync(new URL('../app/auth-client.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('./meg-web-2026.css', import.meta.url), 'utf8');

assert.match(app, /PhoenixUsers data=\{data\} onDataCommitted=\{onDataCommitted\}/,
  'Administração de usuários deve reconciliar o snapshot global depois das mutações.');
assert.match(authClient, /usersAdminClient/,
  'Cliente autenticado deve expor administração oficial de usuários.');
assert.match(authClient, /\/auth\/users\/\$\{id\}\/access/,
  'Alterações de acesso devem usar a rota administrativa oficial.');
assert.match(authClient, /reset-password/,
  'Redefinição de senha deve usar a rota protegida existente.');
assert.match(authClient, /test-email/,
  'Teste de e-mail deve usar a rota protegida existente.');

for (const action of ['APPROVE','REJECT','BLOCK','ACTIVATE','UPDATE']) {
  assert.match(users, new RegExp(`performAccess\\('${action}'\\)`),
    `Tela de usuários deve expor ação administrativa: ${action}`);
}
assert.match(users, /loadPhoenixReadModel\(data\.month, \{ force: true \}\)/,
  'Depois da alteração a lista deve reler o snapshot oficial.');
assert.match(users, /megConfirm/,
  'Mudanças de acesso devem exigir confirmação MEG antes de chegar ao servidor.');
assert.match(users, /PRIMARY_ADMIN_CANNOT_BE_BLOCKED/,
  'Proteção do administrador principal deve possuir mensagem explícita.');
assert.match(users, /Redefinir senha/,
  'Administrador deve poder acionar a redefinição protegida sem revelar credenciais no Web.');
assert.match(users, /Testar e-mail/,
  'Administrador deve poder validar o canal de entrega do usuário.');
assert.doesNotMatch(users, /Somente leitura/,
  'Tela administrativa não pode continuar se declarando somente leitura quando o backend já permite ações.');
assert.doesNotMatch(users, /button type="button" disabled>\{actionLabel/,
  'Botões de gestão não podem permanecer artificialmente desabilitados.');

assert.match(css, /meg-web-user-access-overlay/,
  'Gestão de usuários deve usar modal canônico do MEG Web.');
assert.match(css, /meg-web-user-security-actions/,
  'Ações de segurança devem ficar visualmente separadas das permissões.');
assert.match(css, /meg-web-user-access-facts/,
  'Modal deve mostrar contexto do acesso antes da confirmação.');

console.log('Contrato operacional Web de usuários validado: acesso, perfis, segurança e snapshot oficial.');
