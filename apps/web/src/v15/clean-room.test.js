import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../v15.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('./services/api.ts', import.meta.url), 'utf8');
const sourceCss = [1, 2, 3, 4, 5, 6].map((part) => readFileSync(new URL(`./styles/v15-source-${String(part).padStart(2, '0')}.css`, import.meta.url), 'utf8')).join('');

assert.match(html, /src="\/src\/v15\/main\.tsx"/);
assert.match(main, /v15-source-01\.css/);
assert.match(main, /v15-source-06\.css/);
assert.match(main, /phoenix\.css/);
assert.doesNotMatch(`${main}\n${app}`, /global\.css|meg-v15\.css|v15-contract\.css|AppShell|layouts\//);
assert.doesNotMatch(app, /modules\//);
assert.match(api, /app-state-client/);
assert.match(api, /auth-client/);
assert.match(app, /⌘ Buscar no MEG/);
assert.match(app, /className="premium-balance"/);
assert.match(sourceCss, /\.premium-balance/);
assert.match(sourceCss, /\.nav-btn/);

const sourceHash = createHash('sha256').update(sourceCss).digest('hex');
assert.equal(sourceHash, '9f4743bda0bc7a37812966013e09c010d291468d9f81ef7f468806083d9b0519', 'O CSS canônico da V15 foi alterado ou reordenado. Faça ajustes somente em phoenix.css.');

console.log('V15 Phoenix clean-room validada.');
