import {useCallback,useEffect,useRef,useState} from 'react';
import {authenticatedRequest} from '../../app/auth-client';
import {DataGrid} from '../datagrid/DataGrid';
import type {DataGridColumn} from '../datagrid/types';
import {
  isCanonicalHomeCommitmentPage,
  type CanonicalHomeCommitment,
  type CommitmentPage,
} from './home-commitments-read';

const PAGE_LIMIT=16;
const PAGES_PER_ACTION=4;
type Rows=Record<string,unknown>[];
type CursorState={
 cursor:string|null;
 asOf:string|null;
 seenCursors:Set<string>;
 seenIds:Set<string>;
 complete:boolean;
};
type Props={
 columns:DataGridColumn<Record<string,unknown>>[];
 mapRows:(items:CanonicalHomeCommitment[])=>Rows;
 preview:boolean;
 previewRows:Rows;
 onDismiss:()=>void;
};

/**
 * Lista sob demanda, sem limite artificial de oito itens.
 * Nenhuma consulta ocorre até abrir o diálogo. A API é a autoridade exclusiva
 * para elegibilidade, valor aberto, data e urgência; a UI não conta obrigações
 * que ainda não consultou nem declara o total sem conhecer o fim do cursor.
 */
export function HomeCommitmentsFullList({columns,mapRows,preview,previewRows,onDismiss}:Props){
 const dialogRef=useRef<HTMLDialogElement|null>(null);
 const stateRef=useRef<CursorState>({
  cursor:null,asOf:null,seenCursors:new Set(),seenIds:new Set(),complete:false,
 });
 const generationRef=useRef(0);
 const pendingRef=useRef(false);
 const [rows,setRows]=useState<Rows>(preview?previewRows:[]);
 const [loading,setLoading]=useState(false);
 const [hasMore,setHasMore]=useState(!preview);
 const [error,setError]=useState<string|null>(null);
 const [emptyBatch,setEmptyBatch]=useState(false);

 const loadMore=useCallback(async()=>{
  if(preview||pendingRef.current||stateRef.current.complete)return;
  pendingRef.current=true;
  setLoading(true);
  setError(null);
  setEmptyBatch(false);
  const generation=generationRef.current;
  try{
   let cursor=stateRef.current.cursor;
   let asOf=stateRef.current.asOf;
   let seenCursors=new Set(stateRef.current.seenCursors);
   let seenIds=new Set(stateRef.current.seenIds);
   let complete=false;
   const collected:CanonicalHomeCommitment[]=[];
   let searched=0;
   for(;searched<PAGES_PER_ACTION;searched++){
    const query='/finance/home-commitments?limit='+PAGE_LIMIT+
      (cursor?'&cursor='+encodeURIComponent(cursor):'');
    const page=await authenticatedRequest<CommitmentPage>(query,{cache:'no-store'});
    if(!isCanonicalHomeCommitmentPage(page)||page.items.length>PAGE_LIMIT){
     throw new Error('HOME_COMMITMENTS_INVALID_RESPONSE');
    }
    if(asOf!==null&&page.asOf!==asOf){
     throw new Error('HOME_COMMITMENTS_REFERENCE_DAY_CHANGED');
    }
    asOf=page.asOf;
    for(const item of page.items){
     if(seenIds.has(item.id))throw new Error('HOME_COMMITMENTS_DUPLICATE_ID');
     seenIds.add(item.id);
     collected.push(item);
    }
    if(page.hasMore){
     if(!page.nextCursor||seenCursors.has(page.nextCursor)){
      throw new Error('HOME_COMMITMENTS_INVALID_CURSOR');
     }
     seenCursors.add(page.nextCursor);
     cursor=page.nextCursor;
    }else{
     complete=true;
     cursor=null;
    }
    // Páginas filtradas podem estar vazias. Prosseguir de forma limitada,
    // mas nunca afirmar que a lista acabou se a API ainda tem cursor.
    if(collected.length>0||complete)break;
   }
   if(generationRef.current!==generation)return;
   stateRef.current={cursor,asOf,seenCursors,seenIds,complete};
   setRows(previous=>[...previous,...mapRows(collected)]);
   setEmptyBatch(collected.length===0&&!complete);
   setHasMore(!complete);
  }catch{
   if(generationRef.current===generation){
    setError('Não foi possível continuar a consulta. Os registros já carregados foram preservados. Tente novamente.');
   }
  }finally{
   if(generationRef.current===generation){
    pendingRef.current=false;
    setLoading(false);
   }
  }
 },[mapRows,preview]);

 useEffect(()=>{
  const node=dialogRef.current;
  const generation=++generationRef.current;
  if(node&&!node.open)node.showModal();
  if(!preview)void loadMore();
  return ()=>{
   if(generationRef.current===generation){
    generationRef.current++;
    pendingRef.current=false;
   }
   if(node?.open)node.close();
  };
 },[loadMore,preview]);

 return <dialog ref={dialogRef} className="pano-commitments-dialog"
  aria-labelledby="pano-commitments-full-title" onCancel={onDismiss}
  onClose={onDismiss}>
  <div className="pano-commitments-dialog__header">
   <div>
    <h2 id="pano-commitments-full-title">Todos os compromissos</h2>
    <p>Compromissos monetários em aberto, incluindo vencidos de meses anteriores.</p>
   </div>
   <button type="button" onClick={onDismiss} aria-label="Fechar lista de compromissos">Fechar</button>
  </div>
  <p className="pano-commitments-dialog__summary" role="status">
   {preview?'Demonstração: dados fictícios. ' : ''}
   {rows.length===0&&loading?'Consultando compromissos...':
    rows.length+' compromisso'+(rows.length===1?' carregado':'s carregados')+
    (hasMore?'. Há mais páginas para consultar.':'. Consulta concluída.')}
  </p>
  {error&&<p role="alert" className="pano-commitments-dialog__error">{error}</p>}
  {emptyBatch&&<p className="pano-commitments-dialog__notice">
   Nenhum compromisso elegível nas páginas consultadas nesta tentativa. A busca pode continuar.
  </p>}
  {rows.length>0?
   <div className="pano-grid pano-grid--commitments pano-commitments-dialog__grid">
    <DataGrid data={rows} columns={columns} rowKey="id" pageSize={10}
     pageSizeOptions={[10,25,50]} ariaLabel="Todos os compromissos carregados"/>
   </div>:
   !loading&&!error&&!hasMore?
    <p className="pano-commitments-dialog__empty">Nenhum compromisso em aberto foi encontrado.</p>:null}
  <div className="pano-commitments-dialog__footer">
   {hasMore&&!preview&&<button type="button" disabled={loading}
    onClick={()=>void loadMore()} aria-label="Carregar próximos compromissos">
     {loading?'Consultando...':'Carregar próximos compromissos'}
   </button>}
   {hasMore&&<span>Os itens carregados não representam o total.</span>}
   {!hasMore&&rows.length>0&&<span>Fim dos compromissos encontrados.</span>}
  </div>
 </dialog>;
}
