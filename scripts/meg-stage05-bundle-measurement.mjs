import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const dist = path.resolve('apps/web/dist');
const assets = path.join(dist, 'assets');
const output = path.resolve('artifacts/datagrid-stage05/bundle-sizes.json');
const all = (await fs.readdir(assets)).filter((name) => name.endsWith('.js'));
const pdfChunks = all.filter((name) => /jspdf|autotable|datagrid-pdf/i.test(name));
if (pdfChunks.length < 2) {
  throw new Error('Chunks separados de jsPDF/AutoTable não identificados: ' + JSON.stringify(all));
}
const html = await fs.readFile(path.join(dist, 'datagrid-harness.html'), 'utf8');
const initial = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => path.basename(match[1]));
if (initial.some((name) => pdfChunks.includes(name))) {
  throw new Error('PDF carregado estaticamente pelo HTML do DataGrid');
}
const rows = [];
for (const name of pdfChunks) {
  const buffer = await fs.readFile(path.join(assets, name));
  rows.push({
    file: name,
    raw_bundle_bytes: buffer.byteLength,
    minified_bytes: buffer.byteLength,
    gzip_bytes: gzipSync(buffer, { level: 9 }).byteLength,
    brotli_bytes: brotliCompressSync(buffer).byteLength,
    loading: 'async',
  });
}
const result = {
  method: 'Vite production assets: bundle already minified. Bruto = emitted chunk bytes; minificado = same emitted minified file.',
  initial_scripts: initial,
  pdf_chunks: rows,
  initial_chunk_contains_pdf_library: false,
  pdfjs_dist_in_browser: all.some((name) => /pdfjs/i.test(name)),
};
if (result.pdfjs_dist_in_browser) throw new Error('pdfjs-dist de testes apareceu no bundle Web');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
