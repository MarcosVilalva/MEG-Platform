import { useMemo } from 'react';
import { MegIcon } from './MegMobileIcon';
import type { PhoenixReadModel } from '../phoenix/contracts';
import { isPhoenixBenefitEvent } from '../phoenix/home-period-summary';
import './meg-mobile-benefit.css';

const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

function signed(event: PhoenixReadModel['events']['items'][number]) {
  const value = Number(event.signedAmount || 0);
  if (Number.isFinite(value) && value !== 0) return value;
  const amount = Math.abs(Number(event.amount || 0));
  return event.type === 'income' ? amount : -amount;
}
function datePt(value:string){
  const [y,m,d]=String(value||'').slice(0,10).split('-');
  return y&&m&&d?`${d}/${m}/${y}`:value;
}

export function MegMobileBenefitModal({data,onClose,onOpenMovements}:{data:PhoenixReadModel;onClose:()=>void;onOpenMovements:()=>void}) {
  const events=useMemo(()=>data.events.items.filter(isPhoenixBenefitEvent).filter((event)=>['paid','reconciled','confirmed'].includes(String(event.status))).sort((a,b)=>String(b.date).localeCompare(String(a.date))),[data.events.items]);
  const credits=events.reduce((sum,event)=>sum+Math.max(0,signed(event)),0);
  const spent=events.reduce((sum,event)=>sum+Math.max(0,-signed(event)),0);
  const balance=Number(data.summary.benefitBalance||0);
  const opening=balance-credits+spent;
  const chronological=useMemo(()=>[...events].sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id))),[events]);
  const evolution=useMemo(()=>{
    let running=opening;
    return [
      {key:'opening',label:'Início',date:'',balance:opening},
      ...chronological.map((event)=>{
        running+=signed(event);
        return {key:event.id,label:event.description,date:event.date,balance:running};
      }),
    ];
  },[chronological,opening]);
  const trend=useMemo(()=>{
    const source=evolution.length>18?[evolution[0],...evolution.slice(-17)]:evolution;
    const values=source.map((item)=>item.balance);
    const min=Math.min(...values);
    const max=Math.max(...values);
    const span=Math.max(1,max-min);
    const width=300;
    const height=72;
    const pad=6;
    const points=source.map((item,index)=>{
      const x=pad+(source.length===1?0:index*(width-pad*2)/(source.length-1));
      const y=height-pad-((item.balance-min)/span)*(height-pad*2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return {points,min,max,count:source.length};
  },[evolution]);
  return <div className="meg3-benefit-overlay" role="presentation">
    <section className="meg3-benefit-modal" role="dialog" aria-modal="true" aria-label="Benefício Alimentação">
      <header><div><small>BENEFÍCIO ALIMENTAÇÃO</small><h2>Acompanhamento</h2><p>Saldo e movimentações do período.</p></div><button onClick={onClose}><MegIcon name="x" size={18}/></button></header>
      <section className="meg3-benefit-kpis">
        <article><small>Saldo inicial</small><strong>{money.format(opening)}</strong></article>
        <article className="credit"><small>Créditos</small><strong>{money.format(credits)}</strong></article>
        <article className="spent"><small>Consumo</small><strong>{money.format(spent)}</strong></article>
        <article className="balance"><small>Saldo atual</small><strong>{money.format(balance)}</strong></article>
      </section>
      <section className="meg3-benefit-evolution" aria-label="Evolução do saldo do benefício">
        <header><div><small>EVOLUÇÃO DO SALDO</small><strong>{money.format(balance)}</strong></div><span>{events.length} movimentação{events.length===1?'':'ões'}</span></header>
        <div className="meg3-benefit-chart" role="img" aria-label={`Saldo evoluiu de ${money.format(opening)} para ${money.format(balance)} no período`}>
          <svg viewBox="0 0 300 72" preserveAspectRatio="none" aria-hidden="true">
            <line x1="6" y1="66" x2="294" y2="66" className="grid"/>
            <line x1="6" y1="36" x2="294" y2="36" className="grid"/>
            <polyline points={trend.points} className="line"/>
          </svg>
          <div className="meg3-benefit-chart-range"><span>{money.format(trend.min)}</span><span>{money.format(trend.max)}</span></div>
        </div>
        <footer><span><small>Saldo inicial</small><b>{money.format(opening)}</b></span><span><small>Saldo atual</small><b>{money.format(balance)}</b></span></footer>
      </section>
      <section className="meg3-benefit-list" data-meg-scroll-region="true">
        {events.map((event)=><article key={event.id}><span><strong>{event.description}</strong><small>{datePt(event.date)} · {event.paymentMethod?.name || 'Verocard'}</small></span><b className={signed(event)>=0?'credit':'spent'}>{signed(event)>=0?'+':'-'}{money.format(Math.abs(signed(event)))}</b></article>)}
        {!events.length?<div className="meg3-benefit-empty">Nenhuma movimentação encontrada.</div>:null}
      </section>
      <footer><button className="secondary" onClick={onClose}>Fechar</button><button className="primary" onClick={onOpenMovements}>Ver lançamentos</button></footer>
    </section>
  </div>;
}
