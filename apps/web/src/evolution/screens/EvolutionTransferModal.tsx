import {useEffect,useMemo,useState} from 'react';
import {financeClient,type Account} from '../../app/finance-client';
import {EvolutionFinancialIcon} from '../components/EvolutionFinancialIcon';
import '../styles/utility-modals.css';

const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const normalize=(value:unknown)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const isBenefit=(account:Account)=>/benef|verocard|aliment/.test(normalize(account.name+' '+account.type+' '+(account.institution||'')));
const operationId=()=>globalThis.crypto?.randomUUID?.()||('evo-transfer-'+Date.now()+'-'+Math.random().toString(16).slice(2));
const parseAmount=(value:string)=>{const n=Number(value.replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.abs(n):0};
const formatCurrencyInput=(raw:string)=>{const digits=raw.replace(/\D/g,'').replace(/^0+(?=\d)/,'');if(!digits)return '';return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(digits)/100)};

export function EvolutionTransferModal({qaMode=false,onClose,onSaved}:{qaMode?:boolean;onClose:()=>void;onSaved:()=>void}){
  const qaAccounts:Account[]=[
    {id:'qa-source',name:'Conta corrente principal',type:'checking',institution:'MEG Finanças',openingBalance:3049.15,isActive:true},
    {id:'qa-invest',name:'Conta investimento',type:'investment',institution:'MEG Finanças',openingBalance:12540,isActive:true}
  ];
  const [accounts,setAccounts]=useState<Account[]>(qaMode?qaAccounts:[]);
  const [sourceId,setSourceId]=useState(qaMode?'qa-source':'');
  const [destinationId,setDestinationId]=useState(qaMode?'qa-invest':'');
  const [date,setDate]=useState(today());
  const [value,setValue]=useState('');
  const [description,setDescription]=useState('');
  const [scheduled,setScheduled]=useState(false);
  const [balance,setBalance]=useState<{status:'idle'|'loading'|'ready'|'error';available:number}>({status:'idle',available:0});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(qaMode)return;
    void financeClient.listAccounts().then(items=>{
      const usable=items.filter(item=>item.isActive&&!isBenefit(item));
      setAccounts(usable);
      setSourceId(current=>current||usable.find(item=>/principal/.test(normalize(item.name)))?.id||usable[0]?.id||'');
      setDestinationId(current=>current||usable.find(item=>/invest/.test(normalize(item.name+' '+item.type)))?.id||usable[1]?.id||usable[0]?.id||'');
    }).catch(()=>setMessage('Não foi possível carregar as contas.'));
  },[qaMode]);

  useEffect(()=>{
    if(!sourceId){setBalance({status:'idle',available:0});return}
    if(qaMode){setBalance({status:'ready',available:3049.15});return}
    let active=true;
    setBalance(current=>({status:'loading',available:current.available}));
    void financeClient.getMonetaryBalance(sourceId,date)
      .then(result=>{if(active)setBalance({status:'ready',available:Number(result.available||0)})})
      .catch(()=>{if(active)setBalance({status:'error',available:0})});
    return()=>{active=false};
  },[sourceId,date,qaMode]);

  const source=accounts.find(item=>item.id===sourceId);
  const destination=accounts.find(item=>item.id===destinationId);
  const amount=parseAmount(value);
  const missing=balance.status==='ready'?Math.max(0,amount-balance.available):0;
  const after=balance.status==='ready'?balance.available-amount:0;
  const valid=Boolean(sourceId&&destinationId&&sourceId!==destinationId&&amount>0&&balance.status==='ready'&&!missing);

  async function save(){
    if(!valid||busy)return;
    setBusy(true);setMessage('');
    try{
      if(!qaMode)await financeClient.createTransfer({
        operationId:operationId(),
        sourceAccountId:sourceId,
        destinationAccountId:destinationId,
        amount,
        date,
        description:description.trim().toLocaleUpperCase('pt-BR')||undefined,
        notes:scheduled?'TRANSFERÊNCIA AGENDADA':undefined
      });
      onSaved();
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível salvar a transferência.')}
    finally{setBusy(false)}
  }

  return <div className="evo-utility-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
    <section className="evo-transfer-modal" role="dialog" aria-modal="true" aria-label="Nova transferência">
      <header><button onClick={onClose}><EvolutionFinancialIcon name="chevron-left" size={25}/></button><div><h2>Nova transferência</h2><p>Transfira valores entre suas contas com segurança.</p></div><button onClick={onClose}><EvolutionFinancialIcon name="x" size={24}/></button></header>
      <div className="evo-transfer-body">
        <section className="form">
          <label><span><EvolutionFinancialIcon name="wallet" size={18}/>Conta de origem</span><select value={sourceId} onChange={event=>setSourceId(event.target.value)}>{accounts.map(item=><option value={item.id} key={item.id}>{item.name} · {item.institution||item.type}</option>)}</select><small>Saldo disponível: <b>{balance.status==='ready'?money.format(balance.available):'Validando…'}</b></small></label>
          <label><span><EvolutionFinancialIcon name="wallet" size={18}/>Conta de destino</span><select value={destinationId} onChange={event=>setDestinationId(event.target.value)}>{accounts.filter(item=>item.id!==sourceId).map(item=><option value={item.id} key={item.id}>{item.name} · {item.institution||item.type}</option>)}</select></label>
          <div className="grid2"><label><span><EvolutionFinancialIcon name="calendar" size={18}/>Data da transferência</span><input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><label><span><EvolutionFinancialIcon name="banknote" size={18}/>Valor da transferência</span><div className="money"><b>R$</b><input inputMode="numeric" value={value} onChange={event=>setValue(formatCurrencyInput(event.target.value))} placeholder="0,00"/></div></label></div>
          <label><span><EvolutionFinancialIcon name="note" size={18}/>Descrição <small>(opcional)</small></span><input maxLength={300} value={description} onChange={event=>setDescription(event.target.value)} placeholder="Ex.: Aplicação em CDB"/></label>
          <button className={'schedule '+(scheduled?'active':'')} type="button" onClick={()=>setScheduled(value=>!value)}><EvolutionFinancialIcon name="clock" size={22}/><span><strong>Agendar transferência</strong><small>Registre a transferência para a data informada.</small></span><i/></button>
          {sourceId===destinationId&&<div className="warning">A conta de origem e a conta de destino precisam ser diferentes.</div>}
          {missing>0&&<div className="warning">Saldo insuficiente. Faltam {money.format(missing)}.</div>}
          {balance.status==='error'&&<div className="warning">Não foi possível validar o saldo da conta de origem.</div>}
          {message&&<div className="warning">{message}</div>}
        </section>
        <aside className="summary"><header><EvolutionFinancialIcon name="receipt" size={23}/><h3>Resumo da transferência</h3></header><dl>
          <div><dt><EvolutionFinancialIcon name="landmark" size={20}/>Conta de origem</dt><dd><b>{source?.name||'—'}</b><small>{source?.institution||source?.type||'—'}</small></dd></div>
          <div><dt><EvolutionFinancialIcon name="trend" size={20}/>Conta de destino</dt><dd><b>{destination?.name||'—'}</b><small>{destination?.institution||destination?.type||'—'}</small></dd></div>
          <div><dt><EvolutionFinancialIcon name="calendar" size={20}/>Data da transferência</dt><dd><b>{date.split('-').reverse().join('/')}</b><small>{scheduled?'Agendada':'Transferência imediata'}</small></dd></div>
          <div><dt><EvolutionFinancialIcon name="banknote" size={20}/>Valor da transferência</dt><dd><b>{money.format(amount)}</b></dd></div>
          <div><dt><EvolutionFinancialIcon name="tag" size={20}/>Tarifa</dt><dd><em>Gratuita</em><small>Transferências entre contas MEG</small></dd></div>
          <div className={'after '+(missing>0?'invalid':'')}><dt><EvolutionFinancialIcon name="banknote" size={23}/>Saldo após transferência</dt><dd><b>{balance.status==='ready'?money.format(Math.max(0,after)):'—'}</b><small>Saldo na conta de origem</small></dd></div>
        </dl></aside>
      </div>
      <footer><button className="back" onClick={onClose}><EvolutionFinancialIcon name="chevron-left" size={20}/>Voltar</button><button className="save" disabled={!valid||busy} onClick={()=>void save()}><EvolutionFinancialIcon name="check-line" size={21}/>{busy?'Salvando…':'Salvar transferência'}</button></footer>
    </section>
  </div>;
}
