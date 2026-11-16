import {cardStatementDueDate} from '../finance/card-statement-canonical';

/** Autoridade única de competência da compra, compartilhada entre create, PATCH e prévia. */
export function cardPurchaseStatementMonth(purchaseDate:string,closingDay:number,installmentNumber=1):string{
 const day=new Date(purchaseDate).getUTCDate();
 const [year,month]=purchaseDate.slice(0,7).split('-').map(Number);
 const offset=(day>closingDay?1:0)+installmentNumber-1;
 return new Date(Date.UTC(year,month-1+offset,1)).toISOString().slice(0,7);
}

/** Repete em centavos a distribuição canônica histórica das parcelas. */
export function cardPurchaseInstallmentRows(input:{
 purchaseDate:string;totalAmount:number;installments:number;closingDay:number;
}){
 const totalCents=Math.round(input.totalAmount*100);
 const baseCents=Math.floor(totalCents/input.installments);
 const remainder=totalCents-baseCents*input.installments;
 return Array.from({length:input.installments},(_,index)=>({
  number:index+1,
  amount:(baseCents+(index<remainder?1:0))/100,
  statementMonth:cardPurchaseStatementMonth(input.purchaseDate,input.closingDay,index+1),
 }));
}

/** Apenas projeção de leitura, sem banco ou write. Não calcular isto na Web. */
export function cardPurchaseCyclePreview(input:{
 purchaseDate:string;totalAmount:number;installments:number;closingDay:number;dueDay:number;
}){
 return cardPurchaseInstallmentRows(input).map(entry=>({
  ...entry,
  dueDate:cardStatementDueDate(entry.statementMonth,input.closingDay,input.dueDay),
 }));
}
