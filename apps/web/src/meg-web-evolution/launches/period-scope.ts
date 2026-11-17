import {monthBounds} from './saved-filters';

/**
 * Escopo temporal de leitura. Nao altera competencia, saldo, evento ou regra
 * financeira; apenas seleciona quais eventos da API poderao ser mostrados.
 */
export type LaunchPeriod = {
 mode:'month'|'year'|'range'|'all';
 month:string;
 start:string;
 end:string;
};

const validMonth=(month:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(month);
export function validDay(day:string):boolean {
 if(!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(day))return false;
 const value=new Date(day+'T12:00:00Z');
 return !Number.isNaN(value.valueOf())&&value.toISOString().slice(0,10)===day;
}
export function periodForMonth(month:string):LaunchPeriod {
 if(!validMonth(month))throw new Error('Mes de consulta invalido.');
 const {start,end}=monthBounds(month);
 return {mode:'month',month,start,end};
}
export function periodBounds(period:LaunchPeriod):{start:string;end:string}|null {
 if(!validMonth(period.month))throw new Error('Mes de referencia invalido.');
 if(period.mode==='all')return null;
 if(period.mode==='month')return monthBounds(period.month);
 if(period.mode==='year'){
  const year=period.month.slice(0,4);
  return {start:year+'-01-01',end:year+'-12-31'};
 }
 if(period.mode==='range'&&validDay(period.start)&&validDay(period.end)&&period.start<=period.end){
  return {start:period.start,end:period.end};
 }
 throw new Error('Intervalo personalizado invalido.');
}
export function filterEventsForPeriod<T extends {date:string}>(events:T[],period:LaunchPeriod):T[] {
 const bounds=periodBounds(period);
 const ids=new Set<string>();
 return events.filter(event=>{
  const date=typeof event?.date==='string'?event.date.slice(0,10):'';
  if(!validDay(date))throw new Error('Historico contem data invalida.');
  const id='id' in event?String((event as T&{id:unknown}).id):'';
  if(id){if(ids.has(id))throw new Error('Historico com registro duplicado.');ids.add(id);}
  return !bounds||(date>=bounds.start&&date<=bounds.end);
 });
}
export function periodLabel(period:LaunchPeriod):string {
 const bounds=periodBounds(period);
 if(!bounds)return 'Todo o historico ativo';
 if(period.mode==='year')return 'Ano de '+period.month.slice(0,4);
 if(period.mode==='range'){
  const pt=(date:string)=>date.slice(8,10)+'/'+date.slice(5,7)+'/'+date.slice(0,4);
  return pt(bounds.start)+' a '+pt(bounds.end);
 }
 const value=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'})
  .format(new Date(bounds.start+'T12:00:00Z'));
 return value.slice(0,1).toLocaleUpperCase('pt-BR')+value.slice(1);
}
