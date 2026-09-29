import { useMemo, useState } from 'react';
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
  const [filter,setFilter]=useState<'all'|'income'|'expense'>('all');
  const events=useMemo(()=>data.events.items
    .filter(isPhoenixBenefitEvent)
    .filter((event)=>['paid','reconciled','confirmed'].includes(String(event.status)))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))),[data.events.items]);
  const credits=events.reduce((sum,event)=>sum+Math.max(0,signed(event)),0);
  const spent=events.reduce((sum,event)=>sum+Math.max(0,-signed(event)),0);
  const balance=Number(data.summary.benefitBalance||0);
  const visible=events.filter((event)=>filter==='all'||(filter==='income'?signed(event)>=0:signed(event)<0));
  const verocard=data.paymentMethods.find((method)=>method.isActive&&/verocard/i.test(method.name));

  return <div className="meg3-benefit-overlay" role="presentation">
    <section className="meg3-benefit-modal" role="dialog" aria-modal="true" aria-label="Benefício Alimentação">
      <header>
        <div><h2>Benefício Alimentação</h2><p>Seu saldo e movimentações do cartão benefício.</p></div>
        <button onClick={onClose} aria-label="Fechar"><MegIcon name="x" size={18}/></button>
      </header>

      <section className="meg3-benefit-card">
        <span><MegIcon name="food" size={28}/></span>
        <div><small>MEG BENEFÍCIO</small><strong>{verocard?.name || 'Verocard'}</strong><em>Alimentação</em></div>
        <b>••••</b>
      </section>

      <section className="meg3-benefit-balance">
        <small>Saldo disponível</small>
        <strong>{money.format(balance)}</strong>
        <span><em>Créditos</em><b>+{money.format(credits)}</b></span>
        <span><em>Consumo</em><b className="spent">-{money.format(spent)}</b></span>
      </section>

      <div className="meg3-benefit-actions">
        <button type="button" onClick={onOpenMovements}><MegIcon name="receipt" size={18}/>Ver extrato</button>
        <button type="button" onClick={onOpenMovements}><MegIcon name="card" size={18}/>Lançamentos</button>
      </div>

      <nav className="meg3-benefit-tabs" aria-label="Filtrar movimentações do benefício">
        <button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Todas</button>
        <button className={filter==='income'?'active':''} onClick={()=>setFilter('income')}>Entradas</button>
        <button className={filter==='expense'?'active':''} onClick={()=>setFilter('expense')}>Saídas</button>
      </nav>

      <section className="meg3-benefit-list" data-meg-scroll-region="true">
        {visible.map((event)=><article key={event.id}>
          <span className={signed(event)>=0?'icon credit':'icon spent'}><MegIcon name={signed(event)>=0?'banknote':'food'} size={18}/></span>
          <span className="copy"><strong>{event.description}</strong><small>{event.category?.name || 'Alimentação'} · {datePt(event.date)}</small></span>
          <b className={signed(event)>=0?'credit':'spent'}>{signed(event)>=0?'+':'-'}{money.format(Math.abs(signed(event)))}</b>
        </article>)}
        {!visible.length?<div className="meg3-benefit-empty">Nenhuma movimentação encontrada.</div>:null}
      </section>
    </section>
  </div>;
}
