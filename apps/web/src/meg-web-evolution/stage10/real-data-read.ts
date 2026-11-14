/**
 * Etapa 10: ponte de LEITURA para a QA consolidada, opt-in e fail closed.
 * Nenhum writer, fixture, valor derivado de negocio ou segredo vive neste modulo.
 * ATENCAO: NAO habilitar no Render ate auditar efeitos colaterais dos GETs
 * e autorizar a origem no backend sem modificar producao silenciosamente.
 */
import {readSession,validateSession,refreshAuthSession} from '../../app/auth-client';
import type {Account,Category,PaymentMethod,FinancialEvent,FinanceSummary} from '../../app/finance-client';
import {buildReadOnlyData} from '../launches/OperationalLaunches';
import type {HomeFinancialData} from '../home/HomeDashboard';
import type {ExpenseCatalogs} from './ExpenseForm';
import type {HistorySnapshot} from './autocomplete-history';

export type Stage10RealRead={
  userId:string;
  userName:string;
  home:null;
  launches:HomeFinancialData;
  catalogs:ExpenseCatalogs;
  history:HistorySnapshot;
  events:readonly FinancialEvent[];
  supportsFilteredSummary:boolean;
};

function strictHttpsOrigin(input:string):string|null{
 try{
  const api=new URL(input);
  if(api.protocol!=='https:'||api.username||api.password||api.search||api.hash||
     api.pathname!=='/'||api.href!==api.origin+'/')return null;
  return api.origin;
 }catch{return null;}
}

export function stage10RealReadGate(env:{
 enabled?:string;
 apiUrl?:string;
 readonlyApiUrl?:string;
},pageOrigin:string):{allowed:boolean;reason:string}{
 if(env.enabled!=='true')return {allowed:false,reason:'A leitura real ainda nao foi liberada nesta build da QA.'};
 const authOrigin=env.apiUrl?strictHttpsOrigin(env.apiUrl):null;
 const dataOrigin=env.readonlyApiUrl?strictHttpsOrigin(env.readonlyApiUrl):null;
 const page= strictHttpsOrigin(pageOrigin+'/');
 if(!authOrigin||!dataOrigin||!page||authOrigin===page||dataOrigin===page||
    authOrigin===dataOrigin){
  return {allowed:false,reason:'Origens HTTPS distintas de autenticacao e leitura nao configuradas.'};
 }
 return {allowed:true,reason:''};
}

/** A API QA so recebe GET e um JWT ja emitido na API canonica. */
async function readStage10Snapshot<T>(path:string,signal:AbortSignal):Promise<T>{
 const origin=strictHttpsOrigin(import.meta.env.VITE_MEG_STAGE10_READONLY_API_URL||'');
 const auth=strictHttpsOrigin(import.meta.env.VITE_API_URL||'');
 if(!origin||!auth||origin===auth||origin===window.location.origin)
  throw new Error('Origem QA somente leitura nao autorizada.');
 if(!path.startsWith('/finance/stage10-readonly/snapshot?month='))
  throw new Error('Rota de consulta QA nao autorizada.');
 const send=(token:string)=>fetch(origin+path,{
  method:'GET',mode:'cors',credentials:'omit',cache:'no-store',signal,
  headers:{Authorization:'Bearer '+token},
 });
 const initial=readSession();
 if(!initial?.accessToken)throw new Error('Sessao autenticada obrigatoria.');
 let response=await send(initial.accessToken);
 if(response.status===401){
  // Refresh acontece exclusivamente na API canonica, nunca no backend QA.
  const refreshed=await refreshAuthSession();
  if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
  if(!refreshed||refreshed.user.id!==initial.user.id)
   throw new Error('Sessao nao autorizada para leitura financeira.');
  response=await send(refreshed.accessToken);
 }
 if(!response.ok){
  // Nenhum HTML, redirecionamento ou mensagem de origem nao confiavel e exibido.
  throw new Error('Consulta financeira QA indisponivel (HTTP '+response.status+').');
 }
 const current=readSession();
 if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
 if(!current||current.user.id!==initial.user.id)
  throw new Error('A identidade da sessao mudou durante a consulta.');
 return await response.json() as T;
}

function catalogsFromReal(
  accounts:readonly Account[],categories:readonly Category[],methods:readonly PaymentMethod[],
):ExpenseCatalogs{
  return {
    // Nao promover cartoes visuais ou Verocard a CreditCard sem contrato tipado.
    creditCards:[],
    categories:categories.map(item=>({id:item.id,name:item.name,active:item.isActive,group:item.group??undefined})),
    accounts:accounts.filter(item=>['checking','benefit','investment'].includes(item.type))
      .map(item=>({id:item.id,name:item.name,active:item.isActive,
        kind:(item.type==='checking'?'monetary':item.type) as 'monetary'|'benefit'|'investment'})),
    paymentMethods:methods.map(item=>{
      const type=typeof item.type==='string'?item.type.toLowerCase():'';
      // Verocard historico e beneficio, mesmo se o cadastro diz "credit".
      const kind=/verocard/i.test(item.name)?'benefit':type==='benefit'?'benefit':type==='credit'?'credit':'ordinary';
      return {id:item.id,name:item.name,active:item.isActive,kind};
    }),
  };
}

type Stage10HistoryLimit={
 kind:'stage10-financial-history-limit-v1';
 canWrite:false;
 limit:number;
 total:number;
};
type Stage10Snapshot={
 kind:'stage10-financial-readonly-snapshot-v1';
 canWrite:false;consistency:'repeatable-read';
 actorId:string;workspaceId:string;dataOwnerId:string;total:number;
 events:FinancialEvent[];accounts:Account[];categories:Category[];
 paymentMethods:PaymentMethod[];
 cards:Array<{id:string;name:string;isActive:boolean;closingDay:number;dueDay:number}>;
 summary:FinanceSummary;
 cashflow:NonNullable<HomeFinancialData['cashflow']>;
};
export async function loadStage10RealRead(month:string,signal:AbortSignal):Promise<Stage10RealRead>{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Periodo de leitura invalido.');
 const session=readSession();
 if(!session?.user?.id)throw new Error('Sessao autenticada obrigatoria.');
 const identity=await validateSession(session);
 if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
 if(identity.user.id!==session.user.id||!identity.user.isActive||identity.user.status!=='ACTIVE')
  throw new Error('Sessao nao autorizada para leitura financeira.');
 // Uma unica rota isolada: nunca chamar GET financeiro legado.
 const data=await readStage10Snapshot<Stage10Snapshot|Stage10HistoryLimit>(
  '/finance/stage10-readonly/snapshot?month='+encodeURIComponent(month),signal);
 if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
 if(data?.kind==='stage10-financial-history-limit-v1'){
  if(data.canWrite!==false||!Number.isSafeInteger(data.total)||
     !Number.isSafeInteger(data.limit)||data.limit!==5000||data.total<=data.limit)
   throw new Error('Resposta de limite do historico invalida.');
  throw new Error('O historico completo supera o limite seguro de 5.000 lancamentos. A consulta real foi bloqueada sem apresentar dados parciais.');
 }
 if(!data||data.kind!=='stage10-financial-readonly-snapshot-v1'||data.canWrite!==false
   ||data.consistency!=='repeatable-read'||data.actorId!==session.user.id
   ||!data.workspaceId||!data.dataOwnerId
   ||!Number.isSafeInteger(data.total)||data.total<0||data.total>5000
   ||!Array.isArray(data.events)||data.total!==data.events.length
   ||!Array.isArray(data.accounts)||!Array.isArray(data.categories)
   ||!Array.isArray(data.paymentMethods)||!Array.isArray(data.cards)
   ||!data.summary||!data.cashflow||data.summary.month!==month||data.cashflow.month!==month){
  throw new Error('Snapshot financeiro real incompleto ou nao autorizado.');
 }
 const ids=new Set<string>();
 for(const item of data.events){
  if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id)){
   throw new Error('Historico real contem identificadores invalidos ou repetidos.');
  }
  ids.add(item.id);
 }
 const current=readSession();
 if(!current||current.user.id!==session.user.id||current.accessToken!==session.accessToken)
  throw new Error('A identidade da sessao mudou durante a consulta.');
 return {
  userId:session.user.id,userName:identity.user.name,
  home:null,
  launches:buildReadOnlyData(data.events,data.summary,data.accounts,data.categories,data.paymentMethods),
  catalogs:catalogsFromReal(data.accounts,data.categories,data.paymentMethods),
  history:{protocol:'financial-history-v1',kind:'complete',items:data.events},
  events:data.events,supportsFilteredSummary:false,
 };
}
