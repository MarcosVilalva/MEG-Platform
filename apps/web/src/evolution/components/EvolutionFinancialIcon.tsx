export type EvolutionFinancialIconName=
  'home'|'plus'|'wallet'|'calendar'|'trend'|'up'|'down'|'receipt'|'check'|'food'|'bolt'|'search'|'sliders'|'list'|'menu'|
  'chart'|'cart'|'car'|'wifi'|'phone'|'card'|'banknote'|'house'|'fuel'|'droplet'|'heart-pulse'|'graduation-cap'|'ticket'|
  'shopping-bag'|'repeat'|'landmark'|'cup-soda'|'sandwich'|'gamepad'|'sparkles'|'appliance'|'arrows-right-left'|'x'|
  'chevron-left'|'chevron-right'|'chevron-down'|'check-line'|'note'|'target'|'settings'|'bell'|'gift'|'alert'|'eye'|'plane'|'clock'|'music';

type Props={name:EvolutionFinancialIconName;size?:number;strokeWidth?:number;className?:string};

export function EvolutionFinancialIcon({name,size=22,strokeWidth=1.9,className}:Props){
  const base={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true,className};
  if(name==='home')return <svg {...base}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>;
  if(name==='plus')return <svg {...base}><path d="M12 5v14M5 12h14"/></svg>;
  if(name==='wallet')return <svg {...base}><path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V7"/><path d="M16 14h.01"/></svg>;
  if(name==='calendar')return <svg {...base}><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>;
  if(name==='trend')return <svg {...base}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
  if(name==='up')return <svg {...base}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>;
  if(name==='down')return <svg {...base}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>;
  if(name==='receipt')return <svg {...base}><path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2Z"/><path d="M8 9h8M8 13h6"/></svg>;
  if(name==='check')return <svg {...base}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/></svg>;
  if(name==='food')return <svg {...base}><path d="M3 2v7a3 3 0 0 0 6 0V2M6 2v20M15 2v8a3 3 0 0 0 3 3h1V2M18 13v9"/></svg>;
  if(name==='bolt')return <svg {...base}><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>;
  if(name==='search')return <svg {...base}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if(name==='sliders')return <svg {...base}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></svg>;
  if(name==='list')return <svg {...base}><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>;
  if(name==='menu')return <svg {...base}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
  if(name==='arrows-right-left')return <svg {...base}><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>;
  if(name==='chart')return <svg {...base}><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></svg>;
  if(name==='cart')return <svg {...base}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.5 2h2l2.7 13.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6"/></svg>;
  if(name==='car')return <svg {...base}><path d="m5 17-1 2v2M19 17l1 2v2"/><path d="M5 17h14l1-5-2-5H6l-2 5Z"/><path d="M7 13h.01M17 13h.01"/></svg>;
  if(name==='wifi')return <svg {...base}><path d="M5 12.6a10 10 0 0 1 14 0M2 9a15 15 0 0 1 20 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 20h.01"/></svg>;
  if(name==='phone')return <svg {...base}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>;
  if(name==='card')return <svg {...base}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>;
  if(name==='banknote')return <svg {...base}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10h.01M18 14h.01"/></svg>;
  if(name==='house')return <svg {...base}><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-6h6v6"/></svg>;
  if(name==='fuel')return <svg {...base}><path d="M3 22V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v18"/><path d="M2 22h15M6 6h7v5H6z"/><path d="m16 7 3 3v8a2 2 0 0 0 4 0v-5l-2-2"/></svg>;
  if(name==='droplet')return <svg {...base}><path d="M12 2.7 6.3 9a8 8 0 1 0 11.4 0Z"/></svg>;
  if(name==='heart-pulse')return <svg {...base}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/><path d="M3.5 12h4l1.5-3 3 6 1.5-3h7"/></svg>;
  if(name==='graduation-cap')return <svg {...base}><path d="m2 10 10-5 10 5-10 5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5M22 10v6"/></svg>;
  if(name==='ticket')return <svg {...base}><path d="M2 9a3 3 0 0 0 0 6v2h20v-2a3 3 0 0 0 0-6V7H2Z"/><path d="M13 7v2M13 15v2"/></svg>;
  if(name==='shopping-bag')return <svg {...base}><path d="M6 2 3 6v16h18V6l-3-4Z"/><path d="M3 6h18M8 10a4 4 0 0 0 8 0"/></svg>;
  if(name==='repeat')return <svg {...base}><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
  if(name==='landmark')return <svg {...base}><path d="m3 10 9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/></svg>;
  if(name==='cup-soda')return <svg {...base}><path d="m6 8 1 13h10l1-13Z"/><path d="M5 8h14M8 4h8l-1 4"/></svg>;
  if(name==='sandwich')return <svg {...base}><path d="M4 11h16a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4Z"/><path d="M4 14h16M5 17h14l-2 3H7Z"/></svg>;
  if(name==='gamepad')return <svg {...base}><path d="M8 8h8a6 6 0 0 1 5.7 7.9l-.7 2.1a2.5 2.5 0 0 1-4.2.9L15 17H9l-1.8 1.9A2.5 2.5 0 0 1 3 18l-.7-2.1A6 6 0 0 1 8 8Z"/><path d="M7 12v4M5 14h4M17 13h.01M19 15h.01"/></svg>;
  if(name==='sparkles')return <svg {...base}><path d="m12 3 1.2 3.2L16.5 7.5l-3.3 1.3L12 12l-1.2-3.2-3.3-1.3 3.3-1.3Z"/><path d="m18 12 .8 2.2L21 15l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8Z"/></svg>;
  if(name==='appliance')return <svg {...base}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/><circle cx="8" cy="7" r=".7"/><circle cx="11" cy="7" r=".7"/><rect x="6" y="12" width="9" height="4" rx="1"/><path d="M18 12v4"/></svg>;
  if(name==='x')return <svg {...base}><path d="M18 6 6 18M6 6l12 12"/></svg>;
  if(name==='chevron-left')return <svg {...base}><path d="m15 18-6-6 6-6"/></svg>;
  if(name==='chevron-right')return <svg {...base}><path d="m9 18 6-6-6-6"/></svg>;
  if(name==='chevron-down')return <svg {...base}><path d="m6 9 6 6 6-6"/></svg>;
  if(name==='check-line')return <svg {...base}><path d="m5 12 4 4L19 6"/></svg>;
  if(name==='note')return <svg {...base}><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if(name==='target')return <svg {...base}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><path d="m15 9 6-6M17 3h4v4"/></svg>;
  if(name==='settings')return <svg {...base}><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.2.36.52.7 1 .96.33.18.72.28 1.1.29H21v4h-.09c-.38 0-.77.1-1.1.29-.4.23-.72.57-1 .96Z"/></svg>;
  if(name==='bell')return <svg {...base}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
  if(name==='gift')return <svg {...base}><path d="M4 10h16v10H4zM2 7h20v4H2zM12 7v13"/><path d="M12 7c-3 0-5-1.2-5-3 0-1.3 1-2 2.3-2C11 2 12 7 12 7ZM12 7s1-5 2.7-5C16 2 17 2.7 17 4c0 1.8-2 3-5 3Z"/></svg>;
  if(name==='alert')return <svg {...base}><path d="M12 3 2.5 20h19Z"/><path d="M12 9v5M12 17h.01"/></svg>;
  if(name==='eye')return <svg {...base}><path d="M2.5 12s3.7-6 9.5-6 9.5 6 9.5 6-3.7 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/></svg>;
  if(name==='plane')return <svg {...base}><path d="m3 11 18-8-7 18-2-7-6-3Z"/></svg>;
  if(name==='clock')return <svg {...base}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
  if(name==='music')return <svg {...base}><path d="M9 18V5l10-2v13M9 18a3 3 0 1 1-3-3M19 16a3 3 0 1 1-3-3"/></svg>;
  return <svg {...base}><circle cx="12" cy="12" r="9"/><path d="M9 12h6"/></svg>;
}

function normalize(value:unknown){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')}

export function resolveEvolutionFinancialIcon(context:{type?:string|null;signedAmount?:number|null;categoryName?:string|null;categoryGroup?:string|null;description?:string|null;paymentName?:string|null}):EvolutionFinancialIconName{
  const type=normalize(context.type);
  if(type==='income'||Number(context.signedAmount||0)>0)return 'banknote';
  const value=normalize([context.categoryName,context.categoryGroup,context.description].filter(Boolean).join(' '));
  if(/combust|gasolina|etanol|diesel|posto/.test(value))return 'fuel';
  if(/bebida|refrigerante|suco|cerveja|vinho/.test(value))return 'cup-soda';
  if(/fast ?food|hamburg|lanche|lanchonete/.test(value))return 'sandwich';
  if(/mercado|supermercado|hortifruti|mercearia/.test(value))return 'cart';
  if(/aliment|refeicao|restaurante|ifood|comida|verocard/.test(value))return 'food';
  if(/moradia|imovel|aluguel|condominio|habitacao|casa|apartamento/.test(value))return 'house';
  if(/energia|eletric|cpfl|luz/.test(value))return 'bolt';
  if(/agua|saneamento|sabesp/.test(value))return 'droplet';
  if(/internet|wifi|fibra|banda larga/.test(value))return 'wifi';
  if(/telefone|celular|movel|telefonia|comunicacao/.test(value))return 'phone';
  if(/transporte|uber|99|carro|veiculo|estacionamento|pedagio/.test(value))return 'car';
  if(/saude|farmacia|remedio|medic|consulta|hospital|odont/.test(value))return 'heart-pulse';
  if(/educacao|escola|faculdade|curso|livro/.test(value))return 'graduation-cap';
  if(/game ?pass|xbox|playstation|steam|nintendo|jogo/.test(value))return 'gamepad';
  if(/cabelo|cosmetic|beleza|perfume|maquiagem|salao/.test(value))return 'sparkles';
  if(/microondas|eletrodomest|geladeira|freezer|fogao|air ?fryer|lavadora/.test(value))return 'appliance';
  if(/shopee|amazon|mercado livre|aliexpress|magalu|presente|roupa|vestuario|shopping/.test(value))return 'shopping-bag';
  if(/lazer|cinema|viagem|evento|show|entretenimento/.test(value))return 'ticket';
  if(/assinatura|stream|netflix|spotify|youtube/.test(value))return 'repeat';
  const payment=normalize(context.paymentName);
  if(/cartao|credito/.test(payment))return 'card';
  if(/pix|transfer|ted|doc/.test(payment))return 'arrows-right-left';
  return 'receipt';
}
