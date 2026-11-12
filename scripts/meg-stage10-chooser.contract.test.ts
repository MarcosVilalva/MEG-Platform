import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NEW_LAUNCH_TYPES} from '../apps/web/src/meg-web-evolution/stage10/launch-type-options';

const read=(name:string)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const modal=read('apps/web/src/meg-web-evolution/stage10/LaunchTypeChooser.tsx');
const styles=read('apps/web/src/meg-web-evolution/stage10/LaunchTypeChooser.css');
const qa=read('apps/web/src/meg-web-evolution/stage10/preview.tsx');
const vite=read('apps/web/vite.config.ts');
test('quatro opções seguem tipos do contrato visual, sem crediário',()=>{
 assert.deepEqual(NEW_LAUNCH_TYPES.map(item=>item.type),['expense','income','transfer','benefit']);
 assert.deepEqual(NEW_LAUNCH_TYPES.map(item=>item.title),['Despesa','Receita','Transferência','Benefício']);
 assert.equal(NEW_LAUNCH_TYPES.some(item=>item.title==='Crediário'),false);
});
test('modal escolhe tipo sem executar mutação de dados',()=>{
 assert.match(modal,/onSelect\(option\.type\)/);
 assert.doesNotMatch(modal,/fetch\(|authenticatedRequest|createFinancialEventProtected|createCardPurchaseProtected|createBenefitEventProtected|\.post\(|\.patch\(|\.delete\(/);
});
test('semântica modal, foco, Escape e retorno ao elemento anterior',()=>{
 for(const marker of ['role="dialog"','aria-modal="true"','aria-labelledby','aria-describedby','event.key===\'Escape\'','event.key!==\'Tab\'','previous?.focus()','window.addEventListener(\'focusin\',keepFocusInside,true)','event.stopPropagation()','observer.observe(document.body,{childList:true})','for(const [element,inert] of priorInert)element.inert=inert'])assert.ok(modal.includes(marker),marker);
});
test('preview separado reutiliza Home e Shell aprovados sem writers ou rotas de produção',()=>{
 assert.match(qa,/import \{AppShell\}/);
 assert.match(qa,/import \{HomeDashboard\}/);
 assert.match(qa,/homeP0QaPreviewFixture/);
 assert.match(qa,/data-no-real-writers="true"/);
 assert.match(vite,/stage10Qa: path\.resolve/);
});
test('estilo encapsulado e responsivo, sem seletores globais do Shell',()=>{
 assert.match(styles,/@media\(max-width:1023px\)/);
 assert.match(styles,/@media\(max-width:639px\)/);
 assert.match(styles, /prefers-reduced-motion/);
 assert.doesNotMatch(styles,/^\.meg-shell|^\.meg-sidebar|^\.meg-topbar/m);
});
