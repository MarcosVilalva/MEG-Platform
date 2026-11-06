import {normalizeCategoryLabel} from './category-presentation';

/**
 * Aparência do texto de forma de pagamento autorizado pela API/importação.
 * NÃO relaciona PaymentMethod a CreditCard por semelhança de nome; miniaturas
 * são pictogramas estilizados, não reproduções de cartões nem marcas oficiais.
 */
export type PaymentKind='card'|'pix'|'boleto'|'money'|'deposit'|'automatic'|'unknown';
export type PaymentTone='blue'|'purple'|'green'|'amber'|'teal'|'slate'|'coral'|'neutral';
export type PaymentPresentation={kind:PaymentKind;tone:PaymentTone;initials:string};
const appearance:Record<string,PaymentPresentation>={
 'boleto':{kind:'boleto',tone:'amber',initials:''},
 'pix':{kind:'pix',tone:'teal',initials:''},
 'dinheiro':{kind:'money',tone:'green',initials:''},
 'deposito bancario':{kind:'deposit',tone:'blue',initials:''},
 'debito automatico':{kind:'automatic',tone:'slate',initials:''},
 'cartao debito':{kind:'card',tone:'teal',initials:'DB'},
 'cartao azul':{kind:'card',tone:'blue',initials:'AZ'},
 'cartao bb':{kind:'card',tone:'blue',initials:'BB'},
 'cartao bv':{kind:'card',tone:'slate',initials:'BV'},
 'cartao itau':{kind:'card',tone:'amber',initials:'IT'},
 'cartao kabum':{kind:'card',tone:'purple',initials:'KB'},
 'cartao magalu':{kind:'card',tone:'blue',initials:'MG'},
 'cartao ml':{kind:'card',tone:'amber',initials:'ML'},
 'cartao nubank':{kind:'card',tone:'purple',initials:'NU'},
 'cartao riachuelo':{kind:'card',tone:'purple',initials:'RC'},
 'riachuelo':{kind:'card',tone:'purple',initials:'RC'},
 'verocard':{kind:'card',tone:'green',initials:'VC'},
 // Rótulo preservado no histórico, mesmo não estando no cadastro atual.
 'cartao latam pass':{kind:'card',tone:'blue',initials:'LP'},
};
export function launchPaymentPresentation(label:string):PaymentPresentation{
 const key=normalizeCategoryLabel(label);
 return Object.prototype.hasOwnProperty.call(appearance,key)
  ? appearance[key]
  : {kind:'unknown',tone:'neutral',initials:''};
}
