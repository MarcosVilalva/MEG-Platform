import assert from 'node:assert/strict';
import { isAllowedOrigin } from './cors';

const webOrigins = ['https://marcosvilalva.github.io'];

assert.equal(isAllowedOrigin(undefined, webOrigins), true);
assert.equal(isAllowedOrigin('https://marcosvilalva.github.io', webOrigins), true);
assert.equal(isAllowedOrigin('https://localhost', webOrigins), true);
assert.equal(isAllowedOrigin('capacitor://localhost', webOrigins), true);
assert.equal(isAllowedOrigin('https://site-malicioso.example', webOrigins), false);

console.log('MEG CORS tests passed.');
