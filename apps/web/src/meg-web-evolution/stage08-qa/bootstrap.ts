import {homeP0QaPreviewFixture} from '../home/home-p0-qa.preview.fixture';

// Exclusivo da QA estática da Etapa 08. O main.tsx autenticado NÃO é alterado.
// Os tokens são marcadores fictícios, sem validade em qualquer backend.
const user={
  id:'qa-stage08-user',name:'Usuário fictício QA',email:'qa-stage08@example.invalid',
  role:'VIEWER',status:'ACTIVE',isActive:true,
};
const session={
  user,accessToken:'QA-STAGE08-NO-REAL-AUTH',
  refreshToken:'QA-STAGE08-NO-REAL-REFRESH',
  refreshExpiresAt:'2099-12-31T23:59:59.000Z',
};
const fixture=homeP0QaPreviewFixture;
const parts=new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',
}).formatToParts(new Date());
const part=(type:string)=>parts.find(value=>value.type===type)?.value||'01';
const month=part('year')+'-'+part('month');
const asOf=month+'-'+part('day');
const summary={...fixture.summary!,month};
const cashflow={...fixture.cashflow!,month};
const benefit={...fixture.benefit!,month};
const accounts=fixture.accounts.map(account=>({
  ...account,openingBalance:'0.00',isActive:true,
}));
const categories=fixture.categories.map(category=>({...category,isActive:true}));
const paymentMethods=[
  {id:'qa-pix',name:'PIX',type:'pix',isActive:true},
  {id:'qa-debito',name:'Cartão de débito',type:'debit',isActive:true},
];
const events=fixture.transactions.map((item,index)=>({
  ...item,
  date:month+'-'+String((index%25)+1).padStart(2,'0')+'T12:00:00.000Z',
  competence:month,
  amount:item.amount.toFixed(2),
  signedAmount:item.signedAmount.toFixed(2),
  paymentMethodId:'qa-pix',
  paymentMethod:{id:'qa-pix',name:'PIX'},
  account:accounts.find(account=>account.id===item.accountId)||null,
  category:categories.find(category=>category.id===item.categoryId)||null,
  notes:'Registro exclusivamente fictício da prévia estática',
  sourcePayload:null,
  updatedAt:'2026-11-12T09:00:00.000Z',
}));
const canonical=fixture.canonicalCommitments?.map(item=>item.dueState==='due_today'
  ? {...item,dueDate:asOf,dueAt:asOf+'T12:00:00.000Z'} : item) ?? [];

const nativeFetch=window.fetch.bind(window);
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
});
const deny=(status:number,reason:string)=>json({error:reason},status);
const localOrigin=window.location.origin;

window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const path=typeof input==='string'||input instanceof URL?String(input):input.url;
  const url=new URL(path,window.location.href);
  // Bloqueio completo de API externa ou não listada. Sem rede financeira real.
  if(url.origin!==localOrigin)return deny(403,'QA_EXTERNAL_REQUEST_BLOCKED');
  const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
  if(init?.signal?.aborted)throw new DOMException('Consulta cancelada','AbortError');
  if(url.pathname==='/auth/me'&&method==='GET')return json({user});
  if(url.pathname==='/auth/logout'&&method==='POST')return new Response(null,{status:204});
  if(method!=='GET')return deny(405,'QA_READ_ONLY');
  if(url.pathname==='/finance/summary')return json(summary);
  if(url.pathname==='/finance/cashflow')return json(cashflow);
  if(url.pathname==='/finance/benefit-summary')return json(benefit);
  if(url.pathname==='/finance/events/month')return json({items:events});
  if(url.pathname==='/finance/home-available')return json(fixture.available);
  if(url.pathname==='/finance/home-commitments')return json({
    asOf,items:canonical,hasMore:false,nextCursor:null,
  });
  if(url.pathname==='/finance/accounts')return json(accounts);
  if(url.pathname==='/finance/categories')return json(categories);
  if(url.pathname==='/finance/payment-methods')return json(paymentMethods);
  if(url.pathname==='/cards')return json(fixture.cards);
  if(url.pathname==='/finance/sync-status')return json({
    token:'qa-stage08-immutable',
    changedAt:null,mutationType:null,
    capabilities:{historySnapshotV1:true,filteredSummaryV1:false},
  });
  if(url.pathname==='/finance/events/history-snapshot')return json({
    kind:'complete',protocol:'financial-history-v1',
    consistency:'repeatable-read',items:events,total:events.length,
  });
  if(url.pathname==='/finance/events'){
    const page=Number(url.searchParams.get('page')||1);
    const pageSize=Number(url.searchParams.get('pageSize')||100);
    return json({
      items:events.slice((page-1)*pageSize,page*pageSize),
      total:events.length,page,pageSize,
    });
  }
  return deny(404,'QA_ENDPOINT_NOT_AVAILABLE');
};

// Sessão fictícia sempre substitui qualquer sessão anterior neste domínio QA.
sessionStorage.setItem('meg.auth.session',JSON.stringify(session));
localStorage.removeItem('meg.auth.session');
// O bundle da aplicação real é carregado somente após isolar todas as chamadas.
await import('../main');

// A referência é mantida somente para demonstrar que a QA não usa a rede real.
void nativeFetch;
