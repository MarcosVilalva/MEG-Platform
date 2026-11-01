import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(path, 'utf8');
const root = read('AGENTS.md');
const checkpoint = read('MEG-WEB-CONTINUIDADE-OFICIAL.md');
const protocol = read('docs/MEG-WEB-PROTOCOLO-DE-CONTINUIDADE.md');

assert.ok(root.length < 8000, 'AGENTS.md ultrapassou o tamanho operacional: usar documentos de apoio');
assert.ok(checkpoint.length < 8000, 'Checkpoint perdeu a concisão: arquivar detalhes em docs/historico/');
assert.ok(root.includes('MEG-WEB-CONTINUIDADE-OFICIAL.md'), 'AGENTS sem leitura obrigatória do checkpoint');
assert.ok(root.includes('MEG-WEB-FINANCIAL-AUTHORITY.md'), 'AGENTS sem referência financeira');
assert.ok(root.includes('MEG-WEB-REFERENCIAS-OFICIAIS-20261027.md'), 'AGENTS sem catálogo visual');
assert.ok(checkpoint.includes('Etapa autorizada'), 'Checkpoint não explicita etapa atual');
assert.ok(checkpoint.includes('Home 06 NÃO recebeu aceite visual explícito'), 'Checkpoint deve identificar ausência de homologação da Home');
assert.ok(checkpoint.includes('Foundation geral'), 'Checkpoint deve discriminar gate geral');
assert.ok(checkpoint.includes('Draft'), 'Checkpoint deve informar situação de PR');
assert.ok(protocol.includes('Duas correções fracassadas'), 'Protocolo sem regra de investigação');
assert.ok(protocol.includes('aprovação'), 'Protocolo sem aprovação humana');

const paths = [
  'docs/MEG-WEB-FINANCIAL-AUTHORITY.md',
  'docs/MEG-WEB-REFERENCIAS-OFICIAIS-20261027.md',
  'docs/MEG-WEB-PROTOCOLO-DE-CONTINUIDADE.md',
  'docs/historico/README.md'
];
for (const path of paths) assert.ok(existsSync(path), 'Arquivo obrigatório ausente: ' + path);

for (const path of ['docs/MEG_CURRENT_STATE.md','docs/MEG_WEB_MASTER_SPEC.md']) {
  assert.ok(read(path).startsWith('> [!WARNING]'), 'Documento histórico sem aviso de prioridade: ' + path);
}

// Git blob SHA garante cópia literal dos registros anteriores, sem perda de conteúdo.
const archived = {
  'docs/historico/MEG-WEB-CONTINUIDADE-MAIN-ATE-2026-11-01.md': '0b48f59cad5896b2226dcd70e4250dde4ef67956',
  'docs/historico/MEG-WEB-CONTINUIDADE-HOME06-ATE-2026-11-01.md': '1a6b2557c7e8e2bb23e86e3dbf580fe583ea8e7c',
  'docs/historico/AGENTS-HOME06-ATE-2026-11-01.md': 'd09fab0cd6522b2533bd97dec229bc78c17cfab1'
};
for (const [path, expected] of Object.entries(archived)) {
  const bytes=readFileSync(path);
  const actual=createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  assert.equal(actual,expected,'Arquivo histórico foi alterado ou truncado: '+path);
}

console.log('[MEG] Contrato documental de continuidade: PASSOU. Históricos preservados; fontes e checkpoint coerentes.');
