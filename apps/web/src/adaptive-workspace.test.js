import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./adaptive-workspace.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./meg-design-system.css', import.meta.url), 'utf8');
const entry = readFileSync(new URL('./legacy-entry.js', import.meta.url), 'utf8');

assert.match(entry, /initializeAdaptiveWorkspace\(\)/);
assert.match(source, /initializeStickyHeadings/);
assert.match(source, /initializeCatalogWorkspace/);
assert.match(source, /initializeInvalidFieldFocus/);
assert.match(source, /calculateBestPurchaseDay/);
assert.match(styles, /\.meg-page-sticky-header/);
assert.match(styles, /\.meg-catalog-tabs/);
assert.match(styles, /\.meg-catalog-editor-open/);
assert.match(styles, /overflow-wrap: break-word/);
assert.doesNotMatch(styles, /overflow-wrap:\s*anywhere/);

console.log('Workspace adaptativo: cabeçalhos, cadastros e proteção visual preservados.');
