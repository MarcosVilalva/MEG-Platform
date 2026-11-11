/**
 * Adaptador de leitura da Home P0. Os estados, valores e vínculos vêm exclusivamente
 * da API canônica; este arquivo NÃO decide vencimentos ou saldos financeiros.
 */
export type CanonicalCommitment={
  id:string;source:'financialEvent'|'payable';sourceId:string;
  dueAt:string;dueDate:string;description:string;
  amount:string;status:string;dueState:'overdue'|'due_today'|'upcoming';
};
export type CanonicalCommitmentPage={
  asOf:string;
  items:CanonicalCommitment[];
  hasMore:boolean;
  nextCursor:string|null;
};
export type LoadedCommitments={
  items:CanonicalCommitment[];
  hasMore:boolean;
  nextCursor:string|null;
  asOf:string;
};
export type CommitmentRequest=(path:string,init:{cache:'no-store'})=>Promise<unknown>;

const isoDay=/^\d{4}-\d{2}-\d{2}$/;
const decimal=/^\d+\.\d{2}$/;
export function decodeCommitmentPage(data:unknown):CanonicalCommitmentPage{
  if(!data||typeof data!=='object')throw Error('INVALID_COMMITMENTS_RESPONSE');
  const page=data as Partial<CanonicalCommitmentPage>;
  if(!isoDay.test(page.asOf??'')||!Array.isArray(page.items)||typeof page.hasMore!=='boolean'
    ||(page.nextCursor!==null&&typeof page.nextCursor!=='string')
    ||(page.hasMore&&(!page.nextCursor||page.nextCursor.length>512))
    ||(!page.hasMore&&page.nextCursor!==null)){
    throw Error('INVALID_COMMITMENTS_RESPONSE');
  }
  const ids=new Set<string>();
  for(const item of page.items){
    if(!item||typeof item!=='object'||typeof item.id!=='string'
      ||!['financialEvent','payable'].includes(item.source)
      ||item.id!==item.source+':'+item.sourceId
      ||typeof item.sourceId!=='string'||!item.sourceId
      ||typeof item.description!=='string'||!isoDay.test(item.dueDate)
      ||typeof item.dueAt!=='string'||!item.dueAt.startsWith(item.dueDate+'T')
      ||!decimal.test(item.amount)||typeof item.status!=='string'
      ||!['overdue','due_today','upcoming'].includes(item.dueState)
      ||ids.has(item.id))throw Error('INVALID_COMMITMENTS_RESPONSE');
    ids.add(item.id);
  }
  return page as CanonicalCommitmentPage;
}

/**
 * Em uma abertura, faz no máximo 4 requisições com limite 8 cada.
 * Continua quando os primeiros eventos são cartão/benefício e a página vem vazia.
 * Quando ainda há dados, entrega nextCursor e permite carregar manualmente mais.
 * Um erro interrompe a leitura: nunca o converte em "sem compromissos".
 */
export async function loadCanonicalCommitments(
  request:CommitmentRequest,
  cursor:string|null=null,
  requested=8,
  maxPages=4,
):Promise<LoadedCommitments>{
  if(!Number.isInteger(requested)||requested<1||requested>50
    ||!Number.isInteger(maxPages)||maxPages<1||maxPages>8)throw Error('INVALID_COMMITMENT_CLIENT_LIMIT');
  let nextCursor=cursor;
  let hasMore=true;
  let asOf='';
  const items:CanonicalCommitment[]=[];
  const ids=new Set<string>();
  const usedCursors=new Set<string>();
  for(let round=0;round<maxPages&&hasMore&&items.length<requested;round++){
    const key=nextCursor??'initial';
    if(usedCursors.has(key))throw Error('REPEATED_COMMITMENTS_CURSOR');
    usedCursors.add(key);
    const url='/finance/home-commitments?limit='+requested+(nextCursor?'&cursor='+encodeURIComponent(nextCursor):'');
    const page=decodeCommitmentPage(await request(url,{cache:'no-store'}));
    if(asOf&&asOf!==page.asOf)throw Error('CHANGED_COMMITMENTS_REFERENCE_DAY');
    asOf=page.asOf;
    for(const item of page.items){
      if(ids.has(item.id))throw Error('DUPLICATED_COMMITMENTS_ROW');
      ids.add(item.id);
      items.push(item);
    }
    hasMore=page.hasMore;
    nextCursor=page.nextCursor;
    if(hasMore&&usedCursors.has(nextCursor!))throw Error('REPEATED_COMMITMENTS_CURSOR');
  }
  return {items,hasMore,nextCursor,asOf};
}

/** Formatação apenas de exibição, sem transformar Decimal da API em float. */
export function displayCommitmentAmount(amount:string,hidden:boolean):string{
  if(hidden)return 'R$ •••••';
  if(!decimal.test(amount))return '—';
  const [whole,cents]=amount.split('.');
  return 'R$ '+whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+cents;
}
