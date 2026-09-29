export type MegIconName =
  | 'home' | 'plus' | 'wallet' | 'calendar' | 'trend' | 'up' | 'down' | 'file' | 'check'
  | 'food' | 'bolt' | 'search' | 'sliders' | 'list' | 'menu' | 'cashflow' | 'chart'
  | 'cart' | 'car' | 'wifi' | 'phone' | 'building' | 'play' | 'card'
  | 'banknote' | 'circle-dollar' | 'house' | 'fuel' | 'droplet' | 'heart-pulse'
  | 'graduation-cap' | 'ticket' | 'shopping-bag' | 'repeat' | 'landmark' | 'receipt'
  | 'piggy-bank' | 'briefcase' | 'arrow-up' | 'arrow-down' | 'arrows-right-left'
  | 'x' | 'chevron-right' | 'chevron-down' | 'check-line';

type IconProps = { name: MegIconName; size?: number; strokeWidth?: number; className?: string };

export function MegIcon({ name, size = 22, strokeWidth = 1.9, className }: IconProps) {
  const base = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true, className,
  };
  const key = name === 'up' ? 'arrow-up'
    : name === 'down' ? 'arrow-down'
    : name === 'food' ? 'utensils'
    : name === 'bolt' ? 'zap'
    : name === 'file' ? 'receipt'
    : name === 'card' ? 'credit-card'
    : name === 'cart' ? 'shopping-cart'
    : name === 'play' ? 'play-circle'
    : name === 'cashflow' ? 'arrows-right-left'
    : name;

  if (key === 'home') return <svg {...base}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>;
  if (key === 'plus') return <svg {...base}><path d="M12 5v14M5 12h14"/></svg>;
  if (key === 'wallet') return <svg {...base}><path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V7"/><path d="M16 14h.01"/></svg>;
  if (key === 'calendar') return <svg {...base}><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>;
  if (key === 'trend') return <svg {...base}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
  if (key === 'arrow-up') return <svg {...base}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>;
  if (key === 'arrow-down') return <svg {...base}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>;
  if (key === 'receipt') return <svg {...base}><path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2Z"/><path d="M8 9h8M8 13h6"/></svg>;
  if (key === 'check') return <svg {...base}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/></svg>;
  if (key === 'utensils') return <svg {...base}><path d="M3 2v7a3 3 0 0 0 6 0V2M6 2v20M15 2v8a3 3 0 0 0 3 3h1V2M18 13v9"/></svg>;
  if (key === 'zap') return <svg {...base}><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>;
  if (key === 'search') return <svg {...base}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if (key === 'sliders') return <svg {...base}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></svg>;
  if (key === 'list') return <svg {...base}><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>;
  if (key === 'menu') return <svg {...base}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
  if (key === 'arrows-right-left') return <svg {...base}><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>;
  if (key === 'chart') return <svg {...base}><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></svg>;
  if (key === 'shopping-cart') return <svg {...base}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.5 2h2l2.7 13.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6"/></svg>;
  if (key === 'car') return <svg {...base}><path d="m5 17-1 2v2M19 17l1 2v2"/><path d="M5 17h14l1-5-2-5H6l-2 5Z"/><path d="M7 13h.01M17 13h.01"/></svg>;
  if (key === 'wifi') return <svg {...base}><path d="M5 12.6a10 10 0 0 1 14 0M2 9a15 15 0 0 1 20 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 20h.01"/></svg>;
  if (key === 'phone') return <svg {...base}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>;
  if (key === 'building') return <svg {...base}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>;
  if (key === 'play-circle') return <svg {...base}><circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/></svg>;
  if (key === 'credit-card') return <svg {...base}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>;
  if (key === 'banknote') return <svg {...base}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10h.01M18 14h.01"/></svg>;
  if (key === 'circle-dollar') return <svg {...base}><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 6v12"/></svg>;
  if (key === 'house') return <svg {...base}><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-6h6v6"/></svg>;
  if (key === 'fuel') return <svg {...base}><path d="M3 22V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v18"/><path d="M2 22h15M6 6h7v5H6z"/><path d="m16 7 3 3v8a2 2 0 0 0 4 0v-5l-2-2"/></svg>;
  if (key === 'droplet') return <svg {...base}><path d="M12 2.7 6.3 9a8 8 0 1 0 11.4 0Z"/></svg>;
  if (key === 'heart-pulse') return <svg {...base}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/><path d="M3.5 12h4l1.5-3 3 6 1.5-3h7"/></svg>;
  if (key === 'graduation-cap') return <svg {...base}><path d="m2 10 10-5 10 5-10 5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5M22 10v6"/></svg>;
  if (key === 'ticket') return <svg {...base}><path d="M2 9a3 3 0 0 0 0 6v2h20v-2a3 3 0 0 0 0-6V7H2Z"/><path d="M13 7v2M13 15v2"/></svg>;
  if (key === 'shopping-bag') return <svg {...base}><path d="M6 2 3 6v16h18V6l-3-4Z"/><path d="M3 6h18M8 10a4 4 0 0 0 8 0"/></svg>;
  if (key === 'repeat') return <svg {...base}><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
  if (key === 'landmark') return <svg {...base}><path d="m3 10 9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/></svg>;
  if (key === 'piggy-bank') return <svg {...base}><path d="M19 5c-1.5-1-3-1.5-5-1.5C8.5 3.5 5 6.5 5 11c0 3.5 2 6 5 7v3h3v-2h3v2h3v-4c1.4-1 2-2.4 2-4h2v-3h-3c-.3-1-.8-2-1.5-2.8L19 5Z"/><path d="M9 8h.01"/></svg>;
  if (key === 'briefcase') return <svg {...base}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/></svg>;
  if (key === 'x') return <svg {...base}><path d="M18 6 6 18M6 6l12 12"/></svg>;
  if (key === 'chevron-right') return <svg {...base}><path d="m9 18 6-6-6-6"/></svg>;
  if (key === 'chevron-down') return <svg {...base}><path d="m6 9 6 6 6-6"/></svg>;
  if (key === 'check-line') return <svg {...base}><path d="m5 12 4 4L19 6"/></svg>;
  return <svg {...base}><circle cx="12" cy="12" r="9"/><path d="M9 12h6"/></svg>;
}

export type FinancialIconContext = {
  type?: string | null;
  signedAmount?: number | null;
  categoryName?: string | null;
  categoryGroup?: string | null;
  sourceGroup?: string | null;
  description?: string | null;
  paymentName?: string | null;
};

function normalize(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function classifyText(value: string): MegIconName | null {
  if (/combust|gasolina|etanol|diesel|posto/.test(value)) return 'fuel';
  if (/mercado|supermercado|hortifruti|mercearia/.test(value)) return 'cart';
  if (/aliment|refeicao|restaurante|lanche|ifood|comida|verocard/.test(value)) return 'food';
  if (/moradia|aluguel|condominio|habitacao|casa|apartamento/.test(value)) return 'house';
  if (/energia|eletric|cpfl|luz/.test(value)) return 'bolt';
  if (/agua|saneamento|sabesp/.test(value)) return 'droplet';
  if (/internet|wifi|fibra|banda larga/.test(value)) return 'wifi';
  if (/telefone|celular|movel|telefonia/.test(value)) return 'phone';
  if (/transporte|uber|99|carro|veiculo|estacionamento|pedagio/.test(value)) return 'car';
  if (/saude|farmacia|remedio|medic|consulta|hospital|odont/.test(value)) return 'heart-pulse';
  if (/educacao|escola|faculdade|curso|mensalidade escolar|livro/.test(value)) return 'graduation-cap';
  if (/lazer|cinema|viagem|evento|show|entretenimento/.test(value)) return 'ticket';
  if (/assinatura|stream|netflix|spotify|youtube/.test(value)) return 'repeat';
  if (/roupa|vestuario|compra|loja|shopping/.test(value)) return 'shopping-bag';
  if (/imposto|tribut|taxa|tarifa|iptu|ipva|irpf/.test(value)) return 'receipt';
  if (/emprest|financiamento|credito pessoal|consignado/.test(value)) return 'landmark';
  if (/invest|aplicacao|poupanca/.test(value)) return 'piggy-bank';
  if (/trabalho|empresa|negocio|profissional/.test(value)) return 'briefcase';
  if (/transfer|ted|doc/.test(value)) return 'arrows-right-left';
  if (/cartao|credito|fatura/.test(value)) return 'card';
  return null;
}

export function resolveFinancialIcon(context: FinancialIconContext): MegIconName {
  const type = normalize(context.type);
  const signed = Number(context.signedAmount || 0);

  // Receita tem prioridade absoluta. A classificação não pode transformar entrada em ícone de despesa.
  if (type === 'income' || type === 'redemption' || signed > 0) return 'banknote';

  // Primeiro a classificação contábil/financeira real.
  const classification = normalize([context.categoryName, context.categoryGroup, context.sourceGroup].filter(Boolean).join(' '));
  const byClassification = classifyText(classification);
  if (byClassification) return byClassification;

  // Forma de pagamento só entra depois da categoria/grupo.
  const payment = normalize(context.paymentName);
  if (/cartao|credito/.test(payment)) return 'card';
  if (/pix|transfer|ted|doc/.test(payment)) return 'arrows-right-left';

  // Descrição é apenas último recurso para registros antigos sem classificação.
  const byDescription = classifyText(normalize(context.description));
  return byDescription || 'receipt';
}
