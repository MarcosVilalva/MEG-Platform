/**
 * Etapa 10: ponte de LEITURA para a QA consolidada, opt-in e fail closed.
 * Nenhum writer, fixture, valor derivado de negocio ou segredo vive neste modulo.
 * ATENCAO: NAO habilitar no Render ate auditar efeitos colaterais dos GETs
 * e autorizar a origem no backend sem modificar producao silenciosamente.
 */
import {readSession,validateSession,authenticatedRequest} from '../../app/auth-client';
import {financeClient,type Account,type Category,type PaymentMethod,type FinancialEvent,type FinanceSummary} from '../../app/finance-client';
import {readSmartAuthorizedHistory} from '../launches/authorized-history';
import {buildReadOnlyData} from '../launches/OperationalLaunches';
import {readHome,type HomeFinancialData} from '../home/HomeDashboard';
import type {ExpenseCatalogs} from './ExpenseForm';
import type {HistorySnapshot} from './autocomplete-history';

export type Stage10RealRead={
  userId:string;
  userName:string;
  revision:string;
  home:HomeFinancialData;
  launches:HomeFinancialData;
  catalogs:ExpenseCatalogs;
  history:HistorySnapshot;
  events:readonly FinancialEvent[];
  supportsFilteredSummary:boolean;
};

export function stage10RealReadGate(env:{
  enabled?:string;
  apiUrl?:string;
},pageOrigin:string):{allowed:boolean;reason:string}{
  if(env.enabled!=='true')return {allowed:false,reason:'A leitura real ainda nao foi liberada nesta build da QA.'};
  if(!env.apiUrl)return {allowed:false,reason:'Origem da API autenticada nao configurada.'};
  try{
    const api=new URL(env.apiUrl);
    const page=new URL(pageOrigin);
    if(api.protocol!=='https:'||page.protocol!=='https:'||api.username||api.password||
       api.search||api.hash||api.pathname!=='/'||api.origin===page.origin){
      return {allowed:false,reason:'Origem da API nao atende ao isolamento HTTPS exigido.'};
    }
  }catch{
    return {allowed:false,reason:'Origem da API invalida.'};
  }
  return {allowed:true,reason:''};
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

export async function loadStage10RealRead(month:string,signal:AbortSignal):Promise<Stage10RealRead>{
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Periodo de leitura invalido.');
  const session=readSession();
  if(!session?.user?.id)throw new Error('Sessao autenticada obrigatoria.');
  const identity=await validateSession(session);
  if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
  if(identity.user.id!==session.user.id||!identity.user.isActive||identity.user.status!=='ACTIVE')
    throw new Error('Sessao nao autorizada para leitura financeira.');
  const before=await financeClient.getSyncStatus();
  if(typeof before.token!=='string'||!before.token)
    throw new Error('A API nao confirmou a versao dos dados financeiros.');
  const page=(number:number,size:number,s:AbortSignal)=>financeClient.listEvents(number,size,'',s);
  const eventRead=readSmartAuthorizedHistory(s=>financeClient.getHistorySnapshot(s),page,signal);
  const [home,events,summary,accounts,categories,methods]=await Promise.all([
    readHome(month),
    eventRead,
    authenticatedRequest<FinanceSummary>('/finance/summary?month='+encodeURIComponent(month),{cache:'no-store',signal}),
    authenticatedRequest<Account[]>('/finance/accounts',{cache:'no-store',signal}),
    authenticatedRequest<Category[]>('/finance/categories',{cache:'no-store',signal}),
    authenticatedRequest<PaymentMethod[]>('/finance/payment-methods',{cache:'no-store',signal}),
  ]);
  if(signal.aborted)throw new DOMException('Consulta cancelada.','AbortError');
  const after=await financeClient.getSyncStatus();
  if(!after.token||before.token!==after.token)
    throw new Error('Os dados mudaram durante a consulta. Nenhum resultado parcial foi exibido.');
  const current=readSession();
  if(!current||current.user.id!==session.user.id)
    throw new Error('A identidade da sessao mudou durante a consulta.');
  if(!Array.isArray(events)||!Array.isArray(accounts)||!Array.isArray(categories)||!Array.isArray(methods))
    throw new Error('A API retornou um catalogo financeiro incompleto.');
  return {
    userId:session.user.id,userName:identity.user.name,revision:before.token,
    home,launches:buildReadOnlyData(events,summary,accounts,categories,methods),
    catalogs:catalogsFromReal(accounts,categories,methods),
    history:{protocol:'financial-history-v1',kind:'complete',items:events},
    events,supportsFilteredSummary:before.capabilities?.filteredSummaryV1===true,
  };
}
