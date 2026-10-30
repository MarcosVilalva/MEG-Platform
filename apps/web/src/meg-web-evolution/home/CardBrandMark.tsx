/** Bandeira exibida somente quando o cadastro canônico informa uma bandeira conhecida. */
export function CardBrandMark({brand}:{brand?:string|null}){
 const scheme=brand?.trim().toLowerCase()??'';
 if(scheme.includes('mastercard')||scheme.includes('master card'))return <svg className="pano-scheme pano-scheme-mastercard" role="img" aria-label="Mastercard" viewBox="0 0 76 48" width="68" height="43"><circle cx="29" cy="24" r="18" fill="#eb001b"/><circle cx="47" cy="24" r="18" fill="#f79e1b"/><path d="M38 9.4A18 18 0 0 1 38 38.6 18 18 0 0 1 38 9.4" fill="#ff5f00"/></svg>;
 if(scheme==='visa'||scheme.includes('visa'))return <svg className="pano-scheme pano-scheme-visa" role="img" aria-label="Visa" viewBox="0 0 100 40" width="75" height="32"><text x="4" y="30" fill="white" fontFamily="Arial,sans-serif" fontSize="31" fontWeight="900" fontStyle="italic" letterSpacing="-3">VISA</text></svg>;
 if(scheme==='elo'||scheme.includes('elo'))return <span className="pano-scheme pano-scheme-elo" aria-label="Bandeira Elo">elo</span>;
 if(scheme.includes('american express')||scheme==='amex')return <span className="pano-scheme pano-scheme-amex" aria-label="American Express">AMEX</span>;
 // Não adivinhar bandeira usando nome do banco, cartão, números ou cores.
 return <span className="pano-scheme-unavailable" aria-label="Bandeira não informada">MEG</span>;
}
