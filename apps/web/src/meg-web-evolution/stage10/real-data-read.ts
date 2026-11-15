/**
 * Etapa 10: ponte de LEITURA para a QA consolidada, opt-in e fail closed.
 * Nenhum writer, fixture, valor derivado de negocio ou segredo vive neste modulo.
 * ATENCAO: NAO habilitar no Render ate auditar efeitos colaterais dos GETs
 * e autorizar a origem no backend sem modificar producao silenciosamente.
 */
import {readSession,refreshAuthSession} from '../../app/auth-client';
import type {Account,Category,PaymentMethod,FinancialEvent,FinanceSummary} from '../../app/finance-client';
import {buildReadOnlyData} from '../launches/OperationalLaunches';
import type {HomeFinancialData} from '../home/HomeDashboard';
import type {ExpenseCatalogs,InstallmentSchedule} from './ExpenseForm';
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

/** O JWT HMAC de login nunca e enviado a API QA RS256.
 * Uma troca no emissor canonico (AINDA NAO PUBLICADO) deve fornecer token
 * dedicado e curto. O refresh opaco permanece SOMENTE na origem canonica.
 */
type QaTokenResponse={
 kind:'stage10-qa-read-token-v1';canWrite:false;actorId:string;
 accessToken:string;expiresAt:number;
};
async function exchangeStage10QaToken(session:NonNullable<ReturnType<typeof readSession>>,
 signal:AbortSignal):Promise<string>{
 const origin=strictHttpsOrigin(import.meta.env.VITE_API_URL||'');
 if(!origin||origin===window.location.origin)
  throw new Error('Origem canonica de autenticacao indisponivel.');
 if(!session.accessToken||!session.refreshToken)
  throw new Error('Sessao canonica incompleta.');
 const response=await fetch(origin+'/auth/stage10-qa/exchange',{
  method:'POST',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',
  referrerPolicy:'no-referrer',signal,
  headers:{Authorization:'Bearer '+session.accessToken,'Content-Type':'application/json'},
  body:JSON.stringify({refreshToken:session.refreshToken}),
 });
 if(!response.ok){
  const error=new Error('Troca segura de token QA indisponivel (HTTP '+response.status+').');
  throw Object.assign(error,{status:response.status});
 }
 if(!/^application\/json(?:\s*;|\s*$)/i.test(response.headers.get('content-type')||''))
  throw new Error('Emissor QA nao retornou JSON autorizado.');
 if(!/\bno-store\b/i.test(response.headers.get('cache-control')||''))
  throw new Error('Emissor QA nao garantiu resposta sem cache.');
 const data=await response.json() as QaTokenResponse;
 const now=Math.floor(Date.now()/1000);
 if(!data||data.kind!=='stage10-qa-read-token-v1'||data.canWrite!==false||
  data.actorId!==session.user.id||typeof data.accessToken!=='string'||
  data.accessToken.length>12000||data.accessToken.split('.').length!==3||
  !/^[A-Za-z0-9._-]+$/.test(data.accessToken)||
  !Number.isSafeInteger(data.expiresAt)||data.expiresAt<=now||
  data.expiresAt>now+300)
  throw new Error('Contrato de emissao QA invalido.');
 if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
 if(readSession()?.user.id!==session.user.id)
  throw new Error('Identidade alterada durante a troca de token QA.');
 return data.accessToken;
}
/** Somente GET autenticado com o JWT QA de chave publica. */
async function readStage10Snapshot<T>(path:string,signal:AbortSignal):Promise<T>{
 const origin=strictHttpsOrigin(import.meta.env.VITE_MEG_STAGE10_READONLY_API_URL||'');
 const auth=strictHttpsOrigin(import.meta.env.VITE_API_URL||'');
 if(!origin||!auth||origin===auth||origin===window.location.origin)
  throw new Error('Origem QA somente leitura nao autorizada.');
 if(!path.startsWith('/finance/stage10-readonly/snapshot?month=')&&
    !path.startsWith('/finance/stage10-readonly/card-preview?'))
  throw new Error('Rota de consulta QA nao autorizada.');
 const send=(token:string)=>fetch(origin+path,{
  method:'GET',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',
  referrerPolicy:'no-referrer',signal,headers:{Authorization:'Bearer '+token},
 });
 const initial=readSession();
 if(!initial?.accessToken)throw new Error('Sessao autenticada obrigatoria.');
 let session=initial;
 let qaToken:string;
 try{
  qaToken=await exchangeStage10QaToken(session,signal);
 }catch(error){
  if((error as {status?:number})?.status!==401)throw error;
  const renewed=await refreshAuthSession();
  if(!renewed||renewed.user.id!==initial.user.id)
   throw new Error('Sessao nao autorizada para leitura financeira.');
  session=renewed;
  qaToken=await exchangeStage10QaToken(session,signal);
 }
 let response=await send(qaToken);
 if(response.status===401){
  // Revogacao/expiracao: rotacionar sessao SOMENTE na API canonica
  // e obter novo QA token; nunca mandar HMAC/refresh ao backend QA.
  const renewed=await refreshAuthSession();
  if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
  if(!renewed||renewed.user.id!==initial.user.id)
   throw new Error('Sessao nao autorizada para leitura financeira.');
  qaToken=await exchangeStage10QaToken(renewed,signal);
  response=await send(qaToken);
 }
 if(!response.ok)
  throw new Error('Consulta financeira QA indisponivel (HTTP '+response.status+').');
 if(!/^application\/json(?:\s*;|\s*$)/i.test(response.headers.get('content-type')||''))
  throw new Error('Resposta da API financeira QA nao possui formato JSON autorizado.');
 const current=readSession();
 if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
 if(!current||current.user.id!==initial.user.id)
  throw new Error('A identidade da sessao mudou durante a consulta.');
 return await response.json() as T;
}

type Stage10CardPreviewResponse={
 kind:'stage10-card-installments-preview-v1';canWrite:false;source:'canonical';
 cardId:string;purchaseDate:string;amountDecimal:string;installments:number;
 rows:Array<{sequence:number;dueDate:string;competence:string;amountDecimal:string}>;
};
/** A Web apenas apresenta o que a autoridade de cartões calcular no backend QA.
 * Nenhum cálculo de competência, parcela ou vencimento existe na tela.
 */
export async function loadStage10CardPreview(
 cardId:string,purchaseDate:string,amountDecimal:string,installments:number,
 signal:AbortSignal,
):Promise<InstallmentSchedule>{
 if(!cardId||cardId.length>256||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(purchaseDate)||
  !/^(?:0|[1-9][0-9]{0,10})\.[0-9]{2}$/.test(amountDecimal)||
  !Number.isInteger(installments)||installments<1||installments>48)
  throw new Error('Parâmetros para projeção canônica do cartão inválidos.');
 const params=new URLSearchParams({cardId,purchaseDate,amountDecimal,installments:String(installments)});
 const data=await readStage10Snapshot<Stage10CardPreviewResponse>(
  '/finance/stage10-readonly/card-preview?'+params.toString(),signal,
 );
 if(!data||data.kind!=='stage10-card-installments-preview-v1'||
  data.canWrite!==false||data.source!=='canonical'||data.cardId!==cardId||
  data.purchaseDate!==purchaseDate||data.amountDecimal!==amountDecimal||
  data.installments!==installments||!Array.isArray(data.rows)||
  data.rows.length!==installments||
  !data.rows.every((r,i)=>r.sequence===i+1&&
   /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(r.dueDate)&&
   /^[0-9]{4}-[0-9]{2}$/.test(r.competence)&&
   /^(?:0|[1-9][0-9]*)\.[0-9]{2}$/.test(r.amountDecimal)))
  throw new Error('Resposta canônica de parcelamento inválida.');
 return {
  source:'canonical',cardId,purchaseDate,amountDecimal,installments,
  rows:data.rows,
 };
}

function catalogsFromReal(
  accounts:readonly Account[],categories:readonly Category[],methods:readonly PaymentMethod[],
  cards:readonly Stage10Snapshot['cards'][number][],
):ExpenseCatalogs{
  return {
    // Os cartoes reais do snapshot sao opcoes de selecao, jamais beneficio/Verocard.
    creditCards:cards.filter(item=>item.isActive).map(item=>({
      id:item.id,name:item.name,active:item.isActive,
      closingDay:item.closingDay,dueDay:item.dueDay,
    })),
    categories:categories.map(item=>({id:item.id,name:item.name,active:item.isActive,group:item.group??undefined})),
    // Sao monetarias apenas as contas reconhecidas pela financial-policy canônica.
    accounts:accounts.filter(item=>['checking','savings','cash','benefit','investment'].includes(item.type.toLowerCase()))
      .map(item=>({id:item.id,name:item.name,active:item.isActive,
        kind:(['checking','savings','cash'].includes(item.type.toLowerCase())?'monetary':
          item.type.toLowerCase()) as 'monetary'|'benefit'|'investment'})),
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
 // A autorizacao real ocorre no backend QA, dentro da transacao READ ONLY.
 // Nao chamar /auth/me canonico: resolveWorkspaceContext pode reparar dados.
 if(!session.user.isActive||session.user.status!=='ACTIVE')
  throw new Error('Sessao nao autorizada para leitura financeira.');
 if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
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
 if(!current||current.user.id!==session.user.id||
    !current.accessToken||!current.refreshToken)
  throw new Error('A identidade da sessao mudou durante a consulta.');
 return {
  userId:session.user.id,userName:session.user.name,
  home:null,
  launches:buildReadOnlyData(data.events,data.summary,data.accounts,data.categories,data.paymentMethods),
  catalogs:catalogsFromReal(data.accounts,data.categories,data.paymentMethods,data.cards),
  history:{protocol:'financial-history-v1',kind:'complete',items:data.events},
  events:data.events,supportsFilteredSummary:false,
 };
}
