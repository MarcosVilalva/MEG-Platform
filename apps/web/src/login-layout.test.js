import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cloud = readFileSync(new URL('./legacy-cloud.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./meg-design-system.css', import.meta.url), 'utf8');

assert.match(cloud, /Seu dinheiro organizado por eventos, não por improvisos/);
assert.match(cloud, /Solicitar acesso/);
assert.match(cloud, /Novos usuários só podem acessar após aprovação do administrador/);
assert.doesNotMatch(cloud, /<strong>Ambiente de testes<\/strong>/);
assert.match(styles, /\.auth-shell\s*\{[\s\S]*height:\s*100dvh/);
assert.match(styles, /\.auth-card-inner/);
assert.match(styles, /overflow:\s*hidden/);
assert.match(styles, /@media \(max-width: 980px\)/);

console.log('Login MEG: identidade, proporção e responsividade aprovadas.');
