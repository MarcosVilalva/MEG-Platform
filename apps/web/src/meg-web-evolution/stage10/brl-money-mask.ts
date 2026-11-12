/** Digitação monetária BRL em centavos, sem cálculos de saldo ou parcelas.
 * Estado de entrada é inteiro decimal em string, jamais float.
 * O sinal negativo representa estorno/reversão e permanece separado dos dígitos.
 */
export type BRLInput={digits:string;negative:boolean};
export const EMPTY_BRL_INPUT:BRLInput={digits:'',negative:false};
export function brlDigit(state:BRLInput,digit:string):BRLInput {
 if(!/^[0-9]$/.test(digit))return state;
 return {...state,digits:(state.digits+digit).replace(/^0+(?=\d)/,'').slice(-13)};
}
export function brlBackspace(state:BRLInput):BRLInput{
 return {...state,digits:state.digits.slice(0,-1)};
}
export function brlToggleSign(state:BRLInput):BRLInput{return {...state,negative:!state.negative};}
export function brlFromPasted(value:string):BRLInput{
 const digits=value.replace(/\D/g,'').replace(/^0+(?=\d)/,'').slice(-13);
 return {digits,negative:/-/.test(value)||/\(/.test(value)&&/\)/.test(value)};
}
export function brlFormatted(state:BRLInput):string{
 const normalized=state.digits.replace(/^0+(?=\d)/,'');
 const full=(normalized||'0').padStart(3,'0');
 const whole=full.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
 return (state.negative?'-':'')+whole+','+full.slice(-2);
}
export function brlSignedDecimal(state:BRLInput):string|null {
 if(!state.digits||!/[1-9]/.test(state.digits))return null;
 const full=state.digits.padStart(3,'0');
 return (state.negative?'-':'')+full.slice(0,-2)+'.'+full.slice(-2);
}
