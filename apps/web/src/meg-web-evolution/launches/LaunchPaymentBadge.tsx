import {launchPaymentPresentation} from './payment-presentation';
import {PrismStrokeIcon} from '../components/PrismStrokeIcon';

/** Miniaturas ilustrativas de forma de pagamento. Texto real nunca é trocado. */
export function LaunchPaymentBadge({method}:{method:string}){
 const item=launchPaymentPresentation(method);
 const prism=typeof document!=='undefined'&&document.documentElement.dataset.megPrismUi==='true';
 const PaymentSymbol=prism?PrismStrokeIcon:'svg';
 return <span className="meg-l09-payment-badge" data-method-kind={item.kind} data-method-tone={item.tone} title={method}>
  <span className="meg-l09-method-mark" aria-hidden="true">
   {item.kind==='card'
    ?<span className="meg-l09-mini-card"><i className="meg-l09-mini-chip"/><b>{item.initials}</b></span>
    :<PaymentSymbol viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" data-payment-prism={prism?'true':undefined}>
     {item.kind==='pix'&&<><path d="m12 2 5 5-5 5-5-5 5-5Zm0 10 5 5-5 5-5-5 5-5ZM2 12l5-5 5 5-5 5-5-5Zm10 0 5-5 5 5-5 5-5-5Z" strokeWidth="1.5"/></>}
     {item.kind==='boleto'&&<><rect x="3" y="2" width="18" height="20" rx="2"/><path d="M6 7v8m3-8v8m3-8v8m3-8v8m3-8v8M6 18h12" strokeWidth="1.3"/></>}
     {item.kind==='money'&&<><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="12" cy="12" r="4"/><path d="M6 9h1m10 6h1"/></>}
     {item.kind==='deposit'&&<><path d="m3 10 9-6 9 6v2H3v-2Zm2 3v6m5-6v6m5-6v6m4-6v6M2 21h20"/></>}
     {item.kind==='automatic'&&<><path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5"/><path d="m9 12 2 2 4-4"/></>}
     {item.kind==='unknown'&&<><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 11h10"/></>}
    </PaymentSymbol>}
  </span>
  <span className="meg-l09-method-label">{method}</span>
 </span>;
}
