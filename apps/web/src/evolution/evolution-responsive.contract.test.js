import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const login = readFileSync(new URL('./styles/login.css', import.meta.url), 'utf8');
const system = readFileSync(new URL('./styles/system.css', import.meta.url), 'utf8');

assert.doesNotMatch(
  login,
  /\.evo-login-story h1 br:last-child\s*\{\s*display\s*:\s*none\s*\}/,
  'O título mobile não pode remover a quebra entre "clareza para" e "decidir".'
);

assert.match(
  system,
  /@media\(max-width:720px\)[\s\S]*\.benefit \.meg-benefit-top\s*\{[\s\S]*max-height\s*:\s*none/,
  'Benefícios mobile deve remover o teto que recortava o hero.'
);

assert.match(
  system,
  /\.benefit \.meg-benefit-top>\.meg-benefit-banner\s*\{[\s\S]*min-height\s*:\s*92px/,
  'Hero de Benefícios mobile deve reservar altura mínima legível.'
);

console.log('Contrato responsivo 430 px do Evolution validado.');
