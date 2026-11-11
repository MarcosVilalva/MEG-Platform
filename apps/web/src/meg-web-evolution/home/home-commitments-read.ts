import {authenticatedRequest} from '../../app/auth-client';

export type CanonicalHomeCommitment={
 id:string;
 source:'financialEvent'|'payable';
 sourceId:string;
 dueAt:string;
 dueDate:string;
 description:string;
 amount:string;
 status:string;
 dueState:'overdue'|'due_today'|'upcoming';
};
type CommitmentPage={
 asOf:string;
 items:CanonicalHomeCommitment[];
 hasMore:boolean;
 nextCursor:string|null;
};
const VISIBLE_LIMIT=8;
const PAGE_LIMIT=16;
const MAX_PAGES=4;

function validPage(value:unknown):value is CommitmentPage{
 if(!value||typeof value!=='object')return false;
 const page=value as Partial<CommitmentPage>;
 return typeof page.asOf==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(page.asOf)
  && Array.isArray(page.items)
  && typeof page.hasMore==='boolean'
  && (page.nextCursor===null||typeof page.nextCursor==='string')
  && page.items.every(item=>item&&typeof item.id==='string'&&item.id.length>0
   && (item.source==='financialEvent'||item.source==='payable')
   && typeof item.sourceId==='string'&&typeof item.description==='string'
   && typeof item.dueDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)
   && typeof item.amount==='string'&&/^\d+\.\d{2}$/.test(item.amount)
   && Number.isFinite(Number(item.amount))
   && typeof item.status==='string'
   && ['overdue','due_today','upcoming'].includes(item.dueState));
}

/**
 * A interface não decide vencimentos nem quantias: consome valores e status
 * canônicos da API. Páginas vazias com hasMore não equivalem a saldo zerado.
 *
 * Limite duro: 4 páginas x 16 candidatos (2 queries limitadas no servidor).
 * Se o limite for atingido antes de formar a janela, FALHAR EM VEZ DE
 * exibir um quadro parcial como se todas as pendências fossem conhecidas.
 */
export async function readCanonicalHomeCommitments(
 request: <T>(path:string,init?:RequestInit)=>Promise<T> = authenticatedRequest,
):Promise<CanonicalHomeCommitment[]>{
 const items:CanonicalHomeCommitment[]=[];
 const ids=new Set<string>();
 const seenCursors=new Set<string>();
 let cursor:string|null=null;
 let referenceDay:string|null=null;

 for(let pageIndex=0;pageIndex<MAX_PAGES;pageIndex++){
  const query='/finance/home-commitments?limit='+PAGE_LIMIT
   +(cursor?'&cursor='+encodeURIComponent(cursor):'');
  const page=await request<CommitmentPage>(query,{cache:'no-store'});
  if(!validPage(page))throw new Error('HOME_COMMITMENTS_INVALID_RESPONSE');
  if(referenceDay!==null&&referenceDay!==page.asOf)throw new Error('HOME_COMMITMENTS_REFERENCE_DAY_CHANGED');
  referenceDay=page.asOf;
  for(const item of page.items){
   if(ids.has(item.id))throw new Error('HOME_COMMITMENTS_DUPLICATE_ID');
   ids.add(item.id);
   if(items.length<VISIBLE_LIMIT)items.push(item);
  }
  if(items.length===VISIBLE_LIMIT||!page.hasMore)return items;
  if(!page.nextCursor||seenCursors.has(page.nextCursor))throw new Error('HOME_COMMITMENTS_INVALID_CURSOR');
  seenCursors.add(page.nextCursor);
  cursor=page.nextCursor;
 }
 throw new Error('HOME_COMMITMENTS_PAGE_LIMIT_EXCEEDED');
}
