import {useMemo} from 'react';
import {ExpenseForm,EMPTY_EXPENSE_DRAFT,normalizeEntryDate,type ExpenseCatalogs,type ExpenseDraft} from './ExpenseForm';
import {brlFromPasted,brlSignedDecimal} from './brl-money-mask';

/** Exclusivamente QA: snapshot fictício, sem writer e sem dados financeiros reais. */
export type EditExpenseSnapshot={
 source:'financial-event';financialScope:'monetary';type:'expense';
 id:string;
 description:string;notes:string;
 categoryId:string;categoryName:string;
 dateDisplay:string;amountDisplay:string;
 paymentMethodName:string;accountName:string;statusLabel:string;
};
export const QA_EDIT_EXPENSE_SNAPSHOT:EditExpenseSnapshot={
 source:'financial-event',financialScope:'monetary',type:'expense',
 id:'qa-edit-event-001',
 description:'COMPRA DE MATERIAL PARA CASA',
 notes:'LANÇAMENTO FICTÍCIO PARA REVISÃO VISUAL',
 categoryId:'qa-category-house',categoryName:'Casa',
 dateDisplay:'10/11/2026',amountDisplay:'R$ 125,49',
 paymentMethodName:'PIX',accountName:'Conta corrente fictícia',
 statusLabel:'Paga',
};

/** Adaptador de LEITURA da prévia. Reaproveita exatamente o formulário homologado.
 * Não calcula saldo, parcelas, faturas ou permissões de edição do backend.
 */
export function EditExpensePreview({snapshot,catalogs,onBack,onSimulatedSave}:{
 snapshot:EditExpenseSnapshot;
 catalogs:ExpenseCatalogs;
 onBack:()=>void;
 onSimulatedSave:()=>void;
}){
 const initialDraft=useMemo<ExpenseDraft>(()=>{
  const account=catalogs.accounts.find(a=>a.active&&a.kind==='monetary'&&a.name===snapshot.accountName);
  const method=catalogs.paymentMethods.find(m=>m.active&&m.kind==='ordinary'&&m.name===snapshot.paymentMethodName);
  const category=catalogs.categories.find(c=>c.active&&c.id===snapshot.categoryId);
  return {...EMPTY_EXPENSE_DRAFT,
   description:snapshot.description,
   notes:snapshot.notes,
   categoryId:category?.id??'',
   date:normalizeEntryDate(snapshot.dateDisplay,new Date().getFullYear())?.iso??'',
   amountInput:brlSignedDecimal(brlFromPasted(snapshot.amountDisplay))??'',
   paymentMethodId:method?.id??'',
   accountId:account?.id??'',
   requestedStatus:snapshot.statusLabel==='Paga'?'paid':'planned',
  };
 },[snapshot,catalogs]);
 if(snapshot.source!=='financial-event'||snapshot.financialScope!=='monetary'||snapshot.type!=='expense')return null;
 return <ExpenseForm mode="edit" initialDraft={initialDraft} catalogs={catalogs}
  saveEnabled={true} onRequestSave={onSimulatedSave} onBack={onBack}/>;
}
