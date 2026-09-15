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

const automaticPremiumPalettes = [
  'linear-gradient(145deg,#10192f 0%,#172341 52%,#070d19 100%)',
  'linear-gradient(145deg,#092f35 0%,#0d4a48 52%,#071719 100%)',
  'linear-gradient(145deg,#252936 0%,#111827 58%,#070a10 100%)',
  'linear-gradient(145deg,#30223e 0%,#1c152a 55%,#09070d 100%)',
  'linear-gradient(145deg,#2f251b 0%,#1c1712 58%,#090806 100%)',
  'linear-gradient(145deg,#12253b 0%,#173e55 48%,#07111d 100%)',
  'linear-gradient(145deg,#2f1b25 0%,#1c1017 56%,#08070a 100%)',
  'linear-gradient(145deg,#26302c 0%,#15221e 54%,#07100d 100%)'
];

function hashCard(card: CreditCard) {
  const source = `${normalized(card.name)}|${normalized(card.issuer)}|${normalized(card.brand)}|${card.id || ''}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function automaticBackground(card: CreditCard) {
  const accent = String(card.color || '').trim();
  if (accent) {
    return `linear-gradient(145deg,${accent} 0%,color-mix(in srgb,${accent} 52%,#101827) 48%,#070b12 100%)`;
  }
  return automaticPremiumPalettes[hashCard(card) % automaticPremiumPalettes.length];
}

function automaticMiniLabel(card: CreditCard) {
  const value = normalized(card.name || card.issuer || 'MEG').replace(/[^A-Z0-9]/g, '');
  return (value || 'MEG').slice(0, 6);
}

/**
 * Resolvedor visual único dos cartões Phoenix.
 *
 * A regra é automática: produto/emissor conhecidos recebem uma identidade específica;
 * qualquer cartão novo cai no template premium genérico, com paleta determinística,
 * bandeira inferida e nome do cadastro. Assim, cadastrar um novo cartão não exige
 * criar CSS ou imagem manual para que ele fique apresentável.
 *
 * Arte fotográfica só é usada quando existe um ativo oficial já validado. A bandeira
 * nunca define sozinha o produto visual, evitando atribuir a mesma arte a cartões
 * diferentes do mesmo banco.
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
      background: 'linear-gradient(145deg,#252d3a 0%,#171d27 54%,#070a0e 100%)', brandAsset: asset || 'visa'
    };
  }
  if (name.includes('AZUL')) {
    return {
      key: 'azul', label: 'AZUL', miniLabel: 'AZUL',
      background: 'linear-gradient(145deg,#101a38 0%,#17264e 52%,#080e1d 100%)',
      brandAsset: asset || 'mastercard'
    };
  }
  if (name.includes('RIACHUELO') || issuer.includes('MIDWAY')) {
    return {
      key: 'riachuelo', label: 'RIACHUELO', miniLabel: 'RIACHU',
      background: 'linear-gradient(145deg,#202124 0%,#111214 54%,#050506 100%)',
      brandAsset: asset || 'mastercard'
    };
  }
  if (combined.includes('NUBANK')) return { key: 'nubank', label: 'Nubank', miniLabel: 'NU', background: 'linear-gradient(145deg,#8a05be,#3f0458)', brandAsset: asset || 'mastercard' };
  if (combined.includes('SANTANDER')) return { key: 'santander', label: 'Santander', miniLabel: 'SANT', background: 'linear-gradient(145deg,#a40f18 0%,#5b0b12 54%,#180508 100%)', brandAsset: asset };
  if (combined.includes('BANCO DO BRASIL') || /(^|\s)BB(\s|$)/.test(combined)) return { key: 'bb', label: 'Ourocard', miniLabel: 'BB', background: 'linear-gradient(145deg,#d6b914 0%,#284a77 52%,#0d1d32 100%)', brandAsset: asset };
  if (combined.includes('CAIXA')) return { key: 'caixa', label: 'CAIXA', miniLabel: 'CAIXA', background: 'linear-gradient(145deg,#0f6292 0%,#0d4267 54%,#071726 100%)', brandAsset: asset };
  if (/(^|\s)BV(\s|$)/.test(combined) || combined.includes('BANCO BV')) return { key: 'bv', label: 'Banco BV', miniLabel: 'BV', background: 'linear-gradient(145deg,#163372 0%,#352064 55%,#0c0b21 100%)', brandAsset: asset };
  if (combined.includes('ITAU')) return { key: 'itau', label: card.name || 'Itaú', miniLabel: 'ITAÚ', background: 'linear-gradient(145deg,#182542 0%,#27365a 52%,#0a101d 100%)', brandAsset: asset || 'mastercard' };

  return {
    key: 'generic',
    label: card.name || card.issuer || 'MEG',
    miniLabel: automaticMiniLabel(card),
    background: automaticBackground(card),
    brandAsset: asset || 'generic'
  };
}
