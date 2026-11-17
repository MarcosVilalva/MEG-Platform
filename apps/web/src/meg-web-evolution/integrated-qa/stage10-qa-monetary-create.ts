import type {ExpenseDraft,ExpenseCatalogs} from '../stage10/ExpenseForm';
import type {FinancialEventInput} from '../../app/finance-client';

const MONETARY_TYPES = new Set(['checking','savings','cash']);

export function stage10LocalQaWriteOptIn(){
  if (!import.meta.env.DEV || import.meta.env.VITE_STAGE10_QA_WEB_WRITE !== 'true') return false;
  if (typeof window === 'undefined' || !['localhost','127.0.0.1'].includes(window.location.hostname)) return false;
  try {
    const api=new URL(String(import.meta.env.VITE_API_URL || ''));
    return api.protocol==='http:' && ['localhost','127.0.0.1'].includes(api.hostname);
  } catch {return false;}
}

function ordinaryMethod(name:string){
  const key=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  return !/CREDITO|CARTAO|VEROCARD/.test(key);
}

export function approvedQaCatalogs(data:{
  categories:readonly {id:string;name:string;isActive:boolean;type?:string|null;group?:string|null}[];
  accounts:readonly {id:string;name:string;isActive:boolean;type:string}[];
  methods:readonly {id:string;name:string;isActive:boolean;type?:string|null}[];
}):ExpenseCatalogs{
  return {
    categories:data.categories.filter(x=>!x.type||x.type==='expense').map(x=>({
      id:x.id,name:x.name,active:x.isActive,group:x.group??undefined,
    })),
    accounts:data.accounts.flatMap(x=>MONETARY_TYPES.has(x.type)
      ? [{id:x.id,name:x.name,active:x.isActive,kind:'monetary' as const}]:[]),
    paymentMethods:data.methods.map(x=>({
      id:x.id,name:x.name,active:x.isActive,
      kind:x.type==='credit'?'credit' as const:
        x.type==='benefit'||!ordinaryMethod(x.name)?'benefit' as const:'ordinary' as const,
    })),
  };
}

/**
 * Apenas conversao de formulario para contrato da API. Nao calcula saldo,
 * status canonico, parcela, fatura nem faz alteracoes fora do writer central.
 */
export type QaMonetaryExpenseInput=FinancialEventInput & {
 type:'expense';status:'paid'|'planned';
 accountId:string;categoryId:string;paymentMethodId:string;
};

export function toQaMonetaryExpense(draft:ExpenseDraft,catalogs:ExpenseCatalogs):QaMonetaryExpenseInput {
  if (draft.modality!=='cash' || draft.creditCardId || draft.installmentsInput!=='1'
    || draft.firstInstallmentDate) throw new Error('STAGE10_QA_CARTAO_NAO_SUPORTADO');
  const category=catalogs.categories.find(x=>x.active&&x.id===draft.categoryId);
  const method=catalogs.paymentMethods.find(x=>x.active&&x.id===draft.paymentMethodId&&x.kind==='ordinary');
  const account=catalogs.accounts.find(x=>x.active&&x.id===draft.accountId&&x.kind==='monetary');
  if (!category||!method||!account) throw new Error('STAGE10_QA_CATALOGO_INVALIDO');
  if (!ordinaryMethod(method.name))throw new Error('STAGE10_QA_METODO_ESPECIAL');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)
    || new Date(draft.date+'T12:00:00Z').toISOString().slice(0,10)!==draft.date) {
    throw new Error('STAGE10_QA_DATA_INVALIDA');
  }
  if (!/^-?(?:0|[1-9]\d*)\.\d{2}$/.test(draft.amountInput))throw new Error('STAGE10_QA_VALOR_INVALIDO');
  const amount=Number(draft.amountInput);
  if (!Number.isFinite(amount)||amount===0)throw new Error('STAGE10_QA_VALOR_ZERO');
  const description=draft.description.trim();
  if (!description||description.length>160||draft.notes.length>1000)throw new Error('STAGE10_QA_TEXTO_INVALIDO');
  return {
    description,type:'expense',status:draft.requestedStatus,date:draft.date,
    amount,categoryId:category.id,paymentMethodId:method.id,accountId:account.id,
    notes:draft.notes.trim(),
  };
}
