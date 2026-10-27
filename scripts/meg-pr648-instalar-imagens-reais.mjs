#!/usr/bin/env node
/**
 * Instala SOMENTE as cinco imagens WebP da tela de seleção da PR #648.
 * Uso: node scripts/meg-pr648-instalar-imagens-reais.mjs [arquivo.zip]
 * Nunca altera banco, API, regras financeiras, Android nem branch main.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(new URL('..', import.meta.url).pathname);
const branch = execFileSync('git', ['branch', '--show-current'], {
  cwd: repo, encoding: 'utf8',
}).trim();
if (branch !== 'feature/meg-web-new-launch-visual-official') {
  throw new Error('Instalação bloqueada fora da branch isolada PR #648. Atual: ' + branch);
}

const zip = resolve(process.argv[2] || repo + '/MEG_PR648_IMAGENS_REAIS.zip');
if (!existsSync(zip)) {
  throw new Error('Não encontrei ' + zip + '. Faça upload do ZIP no Explorador do Codespaces.');
}

const python = String.raw`
import sys, zipfile, pathlib, os
root=pathlib.Path(sys.argv[1]).resolve()
source=pathlib.Path(sys.argv[2]).resolve()
destination=root/'apps/web/public/meg-assets'
names=('hero.webp','expense.webp','income.webp','transfer.webp','benefit.webp')
prefix='apps/web/public/meg-assets/'
with zipfile.ZipFile(source) as pack:
    got=set(pack.namelist())
    expected={prefix+name for name in names}
    if got != expected:
        raise SystemExit('Pacote rejeitado: contém nomes ausentes ou inesperados: '+repr(sorted(got ^ expected)))
    prepared=[]
    for name in names:
        buf=pack.read(prefix+name)
        if len(buf)<30 or not (buf[:4]==b'RIFF' and buf[8:12]==b'WEBP'):
            raise SystemExit('Conteúdo WebP inválido: '+name)
        if len(buf)>3_000_000:
            raise SystemExit('Imagem maior que limite permitido: '+name)
        prepared.append((name, buf))
    destination.mkdir(parents=True,exist_ok=True)
    for name,buf in prepared:
        tmp=destination/(name+'.tmp')
        tmp.write_bytes(buf)
        tmp.replace(destination/name)
    print('Assets de Novo Lançamento instalados com segurança:')
    for name,buf in prepared:
        print(' - '+str(destination/name)+' ('+str(len(buf))+' bytes)')
print('Os arquivos são apenas imagens. Nenhum lançamento foi modificado.')
`;
execFileSync('python3', ['-c', python, repo, zip], { cwd: repo, stdio: 'inherit' });
