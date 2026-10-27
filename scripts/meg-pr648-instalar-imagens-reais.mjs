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

const zip = resolve(process.argv[2] || repo + '/MEG_PR648_ARTES_FIEIS.zip');
if (!existsSync(zip)) {
  throw new Error('Não encontrei ' + zip + '. Faça upload do ZIP no Explorador do Codespaces.');
}

const python = String.raw`
import sys, zipfile, pathlib, hashlib
root=pathlib.Path(sys.argv[1]).resolve()
source=pathlib.Path(sys.argv[2]).resolve()
destination=root/'apps/web/public/meg-assets'
names=('hero.webp','expense.webp','income.webp','transfer.webp','benefit.webp')
prefix='apps/web/public/meg-assets/'
sha256={
    'hero.webp': 'b4c843057e1c4544a7d3d4c6deb0d5a7b792fe84d40c5d9bb7770ebe9a877658',
    'expense.webp': '3dadef3bab4a5421eee327c07cac01694fd9bf78c23ae8bc4832410722b6e922',
    'income.webp': 'c4e63aaa79c2cff6104c9958bedf7d1eaa7257be8b49ebdb913ba7af5190a489',
    'transfer.webp': 'd8d417a12c40f132a241be118782fa11a4c0c53c6c50f764cd0f33cbc6244c9e',
    'benefit.webp': '657c4ac95f94dfe315ebd9c8cabd20097c76611943b16dc44baaaf108a25865d',
}
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
        actual=hashlib.sha256(buf).hexdigest()
        if actual != sha256[name]:
            raise SystemExit('Imagem de versao incorreta: '+name+'. Use MEG_PR648_ARTES_FIEIS.zip.')
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
