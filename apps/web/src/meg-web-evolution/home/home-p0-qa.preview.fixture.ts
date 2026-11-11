import type {HomeFinancialData} from './HomeDashboard';
import type {CanonicalHomeCommitment} from './home-commitments-read';
import {homePreviewFixture} from './preview.fixture';

/**
 * Exclusivamente prévia ESTÁTICA de validação visual P0.
 * Amostras correspondem aos cenários sintéticos aprovados no PostgreSQL de CI.
 * Não é API, não é autenticação, não contém dado financeiro real nem implementa
 * qualquer regra monetária. Os status/dueState já chegam classificados.
 */
const commitment=(
  source:CanonicalHomeCommitment['source'],
  sourceId:string,
  dueDate:string,
  description:string,
  amount:string,
  status:string,
  dueState:CanonicalHomeCommitment['dueState'],
):CanonicalHomeCommitment=>({
  id:source+':'+sourceId,
  source,sourceId,dueDate,dueAt:dueDate+'T00:00:00.000Z',
  description,amount,status,dueState,
});

export const homeP0QaPreviewFixture:HomeFinancialData={
 ...homePreviewFixture,
 summary:homePreviewFixture.summary
  ? {...homePreviewFixture.summary,month:'2026-11'}:null,
 cashflow:homePreviewFixture.cashflow
  ? {...homePreviewFixture.cashflow,month:'2026-11',
    days:homePreviewFixture.cashflow.days.map(day=>({
      ...day,date:day.date.replace(/^2026-10/,'2026-11'),
    }))}:null,
 benefit:homePreviewFixture.benefit
  ? {...homePreviewFixture.benefit,month:'2026-11'}:null,
 available:homePreviewFixture.available
  ? {...homePreviewFixture.available,date:'2026-11-11'}:null,
 transactions:homePreviewFixture.transactions.map(event=>({
  ...event,
  date:event.date.replace(/^2026-10/,'2026-11'),
 })),
 canonicalCommitments:[
  commitment('financialEvent','p0-old','2026-07-05',
   'Obrigação fictícia vencida','43.20','planned','overdue'),
  commitment('payable','p0-linked-payable','2026-10-01',
   'Conta fictícia com pagamento parcial','27.07','partial','overdue'),
  commitment('financialEvent','p0-same-a','2026-11-10',
   'Parcela fictícia A','43.20','planned','overdue'),
  commitment('financialEvent','p0-same-b','2026-11-10',
   'Parcela fictícia B','43.20','planned','overdue'),
  commitment('financialEvent','p0-today','2026-11-11',
   'Obrigação fictícia que vence hoje','43.20','planned','due_today'),
  commitment('payable','p0-partial','2026-11-11',
   'Parcialmente pago, saldo aberto fictício','12.03','partial','due_today'),
  commitment('financialEvent','p0-future','2026-12-01',
   'Obrigação futura fictícia','43.20','planned','upcoming'),
  commitment('financialEvent','p0-bulk-event-00000','2027-01-01',
   'Planejamento futuro fictício','43.20','planned','upcoming'),
 ],
 payables:[],
};
