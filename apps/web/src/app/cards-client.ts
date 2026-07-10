import { authorizedRequest } from './finance-client';
export type CardPurchase = { id:string; description:string; purchaseDate:string; totalAmount:number|string; installmentQty:number; isCancelled:boolean };
export type CreditCard = { id:string; name:string; issuer?:string|null; brand?:string|null; lastFour?:string|null; color:string; creditLimit:number|string; closingDay:number; dueDay:number; isActive:boolean; committed:number; availableLimit:number; purchases:CardPurchase[] };
export type Invoice = { cardId:string; cardName:string; dueDay:number; month:string; total:number; items:Array<{purchaseId:string;description:string;installment:number;quantity:number;amount:number}> };
export const cardsClient = {
  list: () => authorizedRequest<CreditCard[]>('/cards'),
  create: (data: object) => authorizedRequest<CreditCard>('/cards', { method:'POST', body:JSON.stringify(data) }),
  addPurchase: (id:string, data:object) => authorizedRequest<CardPurchase>(`/cards/${id}/purchases`, { method:'POST', body:JSON.stringify(data) }),
  invoices: (month:string) => authorizedRequest<Invoice[]>(`/cards/invoices?month=${month}`)
};
