// Fonte Única de Dados da Etapa 02, em modo exclusivamente ilustrativo.
// Valores copiados da referência visual oficial "Tela principal.png"; NÃO são dados reais,
// NÃO são enviados ao backend e NÃO podem ser reutilizados em produção.
// Todos os componentes da Home recebem esta mesma fonte, sem valores no JSX.
import { createMegDataSource } from '../src/evolution/data/data.js';

const categories=[
  {id:'cat-salario',name:'Receita'},{id:'cat-alimentacao',name:'Alimentação'},
  {id:'cat-entretenimento',name:'Entretenimento'},{id:'cat-transporte',name:'Transporte'},
  {id:'cat-transferencia',name:'Transferência'},{id:'cat-cartao',name:'Cartão de crédito'},
  {id:'cat-casa',name:'Casa'},{id:'cat-saude',name:'Saúde'},
];
const transactions=[
 {id:'demo1',date:'2026-10-01',description:'Salário',categoryId:'cat-salario',type:'income',status:'paid',amount:4850,signedAmount:4850},
 {id:'demo2',date:'2026-10-01',description:'Supermercado Extra',categoryId:'cat-alimentacao',type:'expense',status:'paid',amount:342.50,signedAmount:-342.50},
 {id:'demo3',date:'2026-09-30',description:'Netflix',categoryId:'cat-entretenimento',type:'expense',status:'paid',amount:55.90,signedAmount:-55.90},
 {id:'demo4',date:'2026-09-30',description:'Posto Ipiranga',categoryId:'cat-transporte',type:'expense',status:'paid',amount:180,signedAmount:-180},
 {id:'demo5',date:'2026-09-29',description:'Transferência Nubank',categoryId:'cat-transferencia',type:'transfer',status:'paid',amount:500,signedAmount:-500},
];
const payables=[
 {id:'demo-pay1',description:'Fatura Nubank',dueDate:'2026-10-03',status:'open',totalAmount:532.18,openAmount:532.18,categoryId:'cat-cartao'},
 {id:'demo-pay2',description:'Internet Vivo',dueDate:'2026-10-05',status:'open',totalAmount:129.90,openAmount:129.90,categoryId:'cat-casa'},
 {id:'demo-pay3',description:'Energia Elétrica',dueDate:'2026-10-08',status:'open',totalAmount:214.85,openAmount:214.85,categoryId:'cat-casa'},
 {id:'demo-pay4',description:'Academia Smart Fit',dueDate:'2026-10-10',status:'open',totalAmount:99.90,openAmount:99.90,categoryId:'cat-saude'},
 {id:'demo-pay5',description:'Seguro Auto',dueDate:'2026-10-12',status:'open',totalAmount:189,openAmount:189,categoryId:'cat-transporte'},
];
const demoFlow=[
 [1,910,0],[2,0,650],[3,930,0],[4,0,500],[5,310,210],[6,930,0],
 [7,0,720],[8,200,280],[9,0,830],[10,650,200],[11,1000,0],
 [12,120,920],[13,320,0],[14,1400,0],[15,1245,832],[16,520,160],
 [17,350,0],[18,0,650],[19,100,0],[20,1250,0],[21,0,820],
 [22,810,300],[23,370,0],[24,0,580],[25,310,0],[26,1500,820],
 [27,0,300],[28,290,0],[29,0,690],[30,650,0],[31,650,0],
].map(([d,income,expense])=>({date:'2026-10-'+String(d).padStart(2,'0'),income,expense,net:income-expense,realizedBalance:3000+d*18}));
const source=createMegDataSource({
 meta:{mode:'mock',month:'2026-10',sources:['home-visual-official-reference']},
 categories,transactions,payables,
 cards:[{id:'demo-card',name:'Nubank'},{id:'demo-card2',name:'Cartão 2'}],
 readModels:{
  summary:{month:'2026-10',availableBalance:3049.15,income:9205.70,expense:6887.71,projectedResult:2317.99,realizedIncome:9205.70,realizedExpense:6887.71,realizedResult:2317.99,eventCount:31,pendingCount:5,pendingAmount:532.18},
  cashflow:{month:'2026-10',openingBalance:0,realizedClosing:3049.15,totalIncome:9205.70,totalExpense:6887.71,days:demoFlow},
  analytics:{month:'2026-10'},
 },
});
export const homeVisualFixture={
 ...source,
 previewMetrics:{pay:1245.80,invoice:864.32,paid:4792.66,payCount:3,invoiceCount:2,paidCount:12},
};
