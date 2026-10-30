/** Visualização semântica dos itens do DataGrid da Home.
 * Não classifica transações, apenas apresenta a categoria já recebida do catálogo.
 * SVG inline mantido independente das regras financeiras.
 */
import type { ReactNode } from 'react';

type FinanceKind='income'|'food'|'home'|'media'|'fuel'|'health'|'transfer'|'card'|'benefit'|'work'|'education'|'other';

const tokens:Record<FinanceKind,string>={
 income:'income',food:'food',home:'home',media:'media',fuel:'fuel',
 health:'health',transfer:'transfer',card:'card',benefit:'benefit',
 work:'work',education:'education',other:'other',
};
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function financeKind(category:string, type?:string):FinanceKind {
 const key=normalize(category);
 if(type==='transfer'||/transfer/.test(key))return 'transfer';
 if(type==='income'||/salario|receita|renda|recebimento|provento/.test(key))return 'income';
 if(/aliment|mercado|supermerc|restaurante|refeic|comida/.test(key))return 'food';
 if(/entreten|assinatura|stream|lazer|netflix|musica/.test(key))return 'media';
 if(/transport|combust|gasolina|posto|uber|carro/.test(key))return 'fuel';
 if(/saude|farmacia|medica|academia|seguro saude/.test(key))return 'health';
 if(/casa|moradia|aluguel|energia|internet|agua|condominio|utilidade/.test(key))return 'home';
 if(/cartao|fatura|credito/.test(key))return 'card';
 if(/benef|verocard/.test(key))return 'benefit';
 if(/trabalho|servico/.test(key))return 'work';
 if(/educa|escola|curso/.test(key))return 'education';
 return 'other';
}

function Graphic({kind}:{kind:FinanceKind}) {
 const shapes:Record<FinanceKind,ReactNode>={
  income:<><path d="M12 20V4m-6 6 6-6 6 6"/><path d="M4 20h16"/></>,
  food:<><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M2 4h3l3 12h12l2-9H6"/><path d="M10 10h8"/></>,
  home:<><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/></>,
  media:<><rect x="4" y="3" width="16" height="18" rx="3"/><path d="m10 8 6 4-6 4V8Z"/></>,
  fuel:<><path d="M5 21V4h10v17M3 21h14M8 8h4"/><path d="m15 9 4 4v6a2 2 0 0 0 4 0v-9l-4-4"/></>,
  health:<><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M12 8v9M7.5 12.5h9"/></>,
  transfer:<><path d="M3 7h18l-5-4M21 17H3l5 4"/></>,
  card:<><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M7 15h5"/></>,
  benefit:<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M3 7h18v3H3M12 7v14M12 7c-4-7-8-4-6-1 1 1 3 1 6 1Zm0 0c4-7 8-4 6-1-1 1-3 1-6 1Z"/></>,
  work:<><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18"/></>,
  education:<><path d="m2 9 10-5 10 5-10 5L2 9Zm4 4v5c4 3 8 3 12 0v-5M22 10v7"/></>,
  other:<><path d="M7 3h8l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm8 0v5h5M9 13h7M9 17h7"/></>,
 };
 return <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[kind]}</svg>;
}

export function HomeDescriptionCell({description,category,type}:{
 description:string;category:string;type?:string;
}) {
 const kind=financeKind(category,type);
 return <span className="meg-home-transaction-cell">
   <span className={'meg-home-category-icon is-'+tokens[kind]}><Graphic kind={kind}/></span>
   <span className="meg-home-transaction-name" title={description}>{description||'Sem descrição'}</span>
 </span>;
}
export function HomeCategoryCell({category,type}:{category:string;type?:string}) {
 const kind=financeKind(category,type);
 return <span className={'meg-home-category-pill is-'+tokens[kind]}>{category||'Sem categoria'}</span>;
}
