import fs from 'node:fs';
import assert from 'node:assert/strict';

const auth = fs.readFileSync(new URL('./screens/WebNextAuth.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./styles/auth.css', import.meta.url), 'utf8');
const preview = fs.readFileSync(new URL('../phoenix/preview-main.tsx', import.meta.url), 'utf8');

assert.match(preview, /WebNextAuth/);
assert.match(preview, /if \(!MEG_MOBILE_RUNTIME\) return <WebNextAuth/);
assert.match(auth, /data-web-next-screen="auth"/);
assert.match(auth, /Sua vida financeira/);
assert.match(auth, /Bem-vindo de <em>volta/);
assert.match(auth, /Entrar no MEG/);
assert.match(auth, /Criar conta/);
assert.doesNotMatch(auth, /Phoenix V15|Ambiente de validação/);
assert.doesNotMatch(auth, /phoenix-.*\.css|preview-auth-flow\.css/);
assert.match(css, /#071321/);
assert.match(css, /#53cf8d/);
assert.match(css, /#71dda4/);
assert.match(css, /#4bbac7/);
assert.match(css, /overflow:hidden/);
assert.match(css, /@media\(max-width:960px\)/);

console.log('Web Next Auth contract OK');
