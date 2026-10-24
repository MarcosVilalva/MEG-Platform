import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadAuthorizedEventHistory, toEventGridRows } from './history';
import type { FinancialEvent, FinancialEventPage } from '../../app/finance-client';

function row(index: number): FinancialEvent {
  return {
    id: 'event-' + index,
    description: 'Registro ' + index,
    date: '2026-09-01T00:00:00.000Z',
    competence: '2026-09',
    type: index % 2 ? 'expense' : 'income',
    status: 'paid',
    amount: '42.50',
    signedAmount: index % 2 ? '-42.50' : '42.50',
    account: { id:'account-one',name:'Conta de Teste',type:'checking',openingBalance:'0',isActive:true },
    category: null,
    paymentMethod: null,
  };
}
function pageSource(count: number) {
  const rows = Array.from({ length: count }, (_v, i) => row(i));
  const requested: number[] = [];
  return {
    requested,
    loader: async (page: number, pageSize: number, _search: string, _signal: AbortSignal): Promise<FinancialEventPage> => {
      requested.push(page);
      return { page, pageSize, total: rows.length, revision: 'rev-'+rows.length, items: rows.slice((page-1)*pageSize, page*pageSize) };
    },
  };
}

test('consulta vazia só publica histórico completo vazio', async () => {
  const source = pageSource(0);
  const result = await loadAuthorizedEventHistory(source.loader, new AbortController().signal);
  assert.deepEqual(result, []);
  assert.deepEqual(source.requested, [1,1]);
});

test('consulta integral 251 lançamentos de quatro páginas? são três, sem recorte de 100', async () => {
  const source = pageSource(251);
  const seen: number[] = [];
  const events = await loadAuthorizedEventHistory(source.loader, new AbortController().signal, v => seen.push(v.loaded));
  assert.equal(events.length, 251);
  assert.deepEqual(source.requested,[1,2,3,1]);
  assert.deepEqual(seen,[100,200,251]);
  assert.equal(events[250].id,'event-250');
  const mapped = toEventGridRows(events);
  assert.equal(mapped[250].date,'2026-09-01');
  assert.equal(mapped[250].account,'Conta de Teste');
  assert.equal(mapped[1].signedAmount,-42.5);
});

test('os mesmos filtros sobre todas as páginas incluem resultados fora da primeira página',async()=>{
  const source=pageSource(201);
  const events=await loadAuthorizedEventHistory(source.loader,new AbortController().signal);
  assert.equal(events.filter(r=>r.id==='event-200').length,1);
  assert.equal(events.filter(r=>r.type==='income').length,101);
});

test('não publica histórico com total divergente entre páginas',async()=>{
  const src=pageSource(201);
  let calls=0;
  await assert.rejects(loadAuthorizedEventHistory(async(...args)=>{
    const next=await src.loader(...args);
    calls++;
    if(calls===2)return {...next,total:202};
    return next;
  },new AbortController().signal),/histórico mudou/i);
});

test('não publica páginas repetidas, incompletas ou sem IDs',async()=>{
  const src=pageSource(150);
  await assert.rejects(loadAuthorizedEventHistory(async(...args)=>{
    const data=await src.loader(...args);
    if(args[0]===2)return {...data,items:[row(0),...data.items.slice(1)]};
    return data;
  },new AbortController().signal),/repetidos/i);

  const src2=pageSource(150);
  await assert.rejects(loadAuthorizedEventHistory(async(...args)=>{
    const data=await src2.loader(...args);
    return args[0]===2?{...data,items:data.items.slice(0,5)}:data;
  },new AbortController().signal),/incompletos/i);
});

test('abortar consulta evita publicar resultados após logout',async()=>{
  const source=pageSource(201);
  const controller=new AbortController();
  await assert.rejects(loadAuthorizedEventHistory(async(...args)=>{
    const data=await source.loader(...args);
    if(args[0]===1)controller.abort();
    return data;
  },controller.signal),/cancelada/i);
});

test('valores do servidor são preservados para exibição sem recalcular saldo',()=>{
  const mapped=toEventGridRows([row(1),row(2)]);
  assert.equal(mapped[0].amount,42.5);
  assert.equal(mapped[0].signedAmount,-42.5);
  assert.equal(mapped[1].signedAmount,42.5);
  assert.equal(mapped[0].competence,'2026-09');
});

test('não publica quando uma escrita altera a versão sem alterar contagem',async()=>{
  const src=pageSource(201);
  await assert.rejects(loadAuthorizedEventHistory(async (...args)=>{
    const data=await src.loader(...args);
    return args[0]===2?{...data,revision:'rev-after-write'}:data;
  },new AbortController().signal),/mudaram durante/i);
});

test('revalida versão na saída mesmo quando todas as páginas têm a mesma revisão',async()=>{
  const src=pageSource(201);
  let calls=0;
  await assert.rejects(loadAuthorizedEventHistory(async (...args)=>{
    const data=await src.loader(...args);
    calls++;
    return calls===4?{...data,revision:'rev-after-write'}:data;
  },new AbortController().signal),/mudou antes da confirmação/i);
  assert.deepEqual(src.requested,[1,2,3,1]);
});

test('rejeita resposta sem revisão transacional mesmo no histórico vazio',async()=>{
  const src=pageSource(0);
  await assert.rejects(loadAuthorizedEventHistory(async (...args)=>{
    const data=await src.loader(...args);
    return {...data,revision:undefined};
  },new AbortController().signal),/Resposta inválida/i);
});
