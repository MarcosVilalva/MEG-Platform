import { authorizedRequest } from './finance-client';
export type BudgetStatus = { id:string; month:string; group:string; amount:number|string; spent:number; remaining:number };
export const planningClient = {
  list: (month:string) => authorizedRequest<BudgetStatus[]>(`/planning/budgets?month=${month}`),
  save: (month:string, group:string, amount:number) => authorizedRequest(`/planning/budgets/${encodeURIComponent(group)}`, { method:'PUT', body:JSON.stringify({month,amount}) }),
  remove: (id:string) => authorizedRequest<void>(`/planning/budgets/${id}`, { method:'DELETE' })
};
