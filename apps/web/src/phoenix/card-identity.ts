import type { CreditCard } from '../app/cards-client';

export type PhoenixCardIdentity = {
  key: 'latam' | 'mercado' | 'azul' | 'riachuelo' | 'nubank' | 'santander' | 'bb' | 'caixa' | 'bv' | 'itau' | 'generic';
  label: string;
  miniLabel: string;
  background: string;
  artwork?: string;
  brandAsset?: string;
};

function normalized(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function brandAsset(card: CreditCard) {
  const value = `${normalized(card.brand)} ${normalized(card.name)}`;
  if (value.includes('MASTER')) return 'mastercard';
  if (value.includes('AMEX') || value.includes('AMERICAN')) return 'amex';
  if (value.includes('HIPER')) return 'hipercard';
  if (value.includes('ELO')) return 'elo';
  if (value.includes('VISA')) return 'visa';
  return undefined;
}

/**
 * A arte nunca é inferida apenas pela bandeira. Primeiro identificamos o produto
 * e o emissor reais; a bandeira entra somente como marca auxiliar. Isso impede
 * que produtos diferentes do mesmo banco compartilhem uma arte incorreta.
 */
export function resolvePhoenixCardIdentity(card: CreditCard): PhoenixCardIdentity {
  const name = normalized(card.name);
  const issuer = normalized(card.issuer);
  const combined = `${name} ${issuer}`;
  const asset = brandAsset(card);

  if (combined.includes('LATAM')) {
    return {
      key: 'latam', label: 'LATAM PASS', miniLabel: 'LATAM',
      background: 'linear-gradient(145deg,#756d62,#403a34)',
      artwork: 'assets/cards/latam-pass-platinum.webp', brandAsset: asset
    };
  }
  if (combined.includes('MERCADO LIVRE') || combined.includes('MERCADO PAGO') || /(^|\s)MELI(\s|$)/.test(combined) || /(^|\s)ML(\s|$)/.test(combined)) {
    return {
      key: 'mercado', label: 'Mercado Pago', miniLabel: 'MELI',
      background: 'linear-gradient(145deg,#141719,#020303)', brandAsset: asset || 'visa'
    };
  }
  if (name.includes('AZUL')) return { key: 'azul', label: 'AZUL', miniLabel: 'AZUL', background: 'linear-gradient(145deg,#2558a6 0%,#163f78 48%,#071a35 100%)', brandAsset: asset };
  if (name.includes('RIACHUELO') || issuer.includes('MIDWAY')) return { key: 'riachuelo', label: 'Riachuelo', miniLabel: 'RIACHU', background: 'linear-gradient(145deg,#4c1e29 0%,#1d1117 52%,#08090b 100%)', brandAsset: asset };
  if (combined.includes('NUBANK')) return { key: 'nubank', label: 'Nubank', miniLabel: 'NU', background: 'linear-gradient(145deg,#8a05be,#3f0458)', brandAsset: asset };
  if (combined.includes('SANTANDER')) return { key: 'santander', label: 'Santander', miniLabel: 'SANT', background: 'linear-gradient(145deg,#d71920,#65090c)', brandAsset: asset };
  if (combined.includes('BANCO DO BRASIL') || /(^|\s)BB(\s|$)/.test(combined)) return { key: 'bb', label: 'Ourocard', miniLabel: 'BB', background: 'linear-gradient(145deg,#f5d316,#1e4d92)', brandAsset: asset };
  if (combined.includes('CAIXA')) return { key: 'caixa', label: 'CAIXA', miniLabel: 'CAIXA', background: 'linear-gradient(145deg,#1279b9,#0b3764)', brandAsset: asset };
  if (/(^|\s)BV(\s|$)/.test(combined) || combined.includes('BANCO BV')) return { key: 'bv', label: 'Banco BV', miniLabel: 'BV', background: 'linear-gradient(145deg,#173d8d,#4f1d92)', brandAsset: asset };
  if (combined.includes('ITAU')) return { key: 'itau', label: card.name || 'Itaú', miniLabel: 'ITAÚ', background: 'linear-gradient(145deg,#e56f13,#153f74)', brandAsset: asset };

  const accent = card.color || '#0e6f68';
  return {
    key: 'generic',
    label: card.name || card.issuer || 'MEG',
    miniLabel: (card.name || 'MEG').slice(0, 6).toUpperCase(),
    background: `linear-gradient(135deg,${accent},#092338)`,
    brandAsset: asset
  };
}
