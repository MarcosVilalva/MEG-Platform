import { useMemo } from 'react';
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
  return <div className="meg3-benefit-overlay" role="presentation">
    <section className="meg3-benefit-modal" role="dialog" aria-modal="true" aria-label="Benefício Alimentação">
      <header><div><small>BENEFÍCIO ALIMENTAÇÃO</small><h2>Acompanhamento</h2><p>Saldo e movimentações do período.</p></div><button onClick={onClose}>×</button></header>
      <section className="meg3-benefit-kpis">
        <article><small>Saldo inicial</small><strong>{money.format(opening)}</strong></article>
        <article className="credit"><small>Créditos</small><strong>{money.format(credits)}</strong></article>
        <article className="spent"><small>Consumo</small><strong>{money.format(spent)}</strong></article>
        <article className="balance"><small>Saldo atual</small><strong>{money.format(balance)}</strong></article>
      </section>
      <section className="meg3-benefit-list" data-meg-scroll-region="true">
        {events.map((event)=><article key={event.id}><span><strong>{event.description}</strong><small>{datePt(event.date)} · {event.paymentMethod?.name || 'Verocard'}</small></span><b className={signed(event)>=0?'credit':'spent'}>{signed(event)>=0?'+':'-'}{money.format(Math.abs(signed(event)))}</b></article>)}
        {!events.length?<div className="meg3-benefit-empty">Nenhuma movimentação encontrada.</div>:null}
      </section>
      <footer><button className="secondary" onClick={onClose}>Fechar</button><button className="primary" onClick={onOpenMovements}>Ver lançamentos</button></footer>
    </section>
  </div>;
}
