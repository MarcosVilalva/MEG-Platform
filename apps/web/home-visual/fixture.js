// PRÉVIA VISUAL DA HOME: todos os valores abaixo são exemplos fictícios,
// inspirados somente na arte de referência aprovada. NUNCA migram ao banco/API.
// Fonte única de dados preservada; nenhuma regra financeira é calculada no JSX.
import { createMegDataSource } from '../src/evolution/data/data.js';

const categories = [
 {id:'receita',name:'Receita'}, {id:'alimentacao',name:'Alimentação'},
 {id:'utilidades',name:'Utilidades'}, {id:'transferencias',name:'Transferência'},
 {id:'saude',name:'Saúde'}, {id:'cartao',name:'Cartão'},
 {id:'moradia',name:'Moradia'}, {id:'seguros',name:'Seguros'},
];
const accounts=[{id:'conta-a',name:'Conta A'},{id:'conta-b',name:'Conta B'}];
const transactions=[
 {id:'m1',date:'2026-10-26',description:'Supermercado',categoryId:'alimentacao',accountId:'conta-a',type:'expense',status:'paid',amount:156.32,signedAmount:-156.32},
 {id:'m2',date:'2026-10-25',description:'Recebimento',categoryId:'receita',accountId:'conta-b',type:'income',status:'paid',amount:5000,signedAmount:5000},
 {id:'m3',date:'2026-10-24',description:'Energia elétrica',categoryId:'utilidades',accountId:'conta-a',type:'expense',status:'paid',amount:123.45,signedAmount:-123.45},
 {id:'m4',date:'2026-10-23',description:'Transferência interna',categoryId:'transferencias',accountId:'conta-b',type:'transfer',status:'paid',amount:500,signedAmount:-500},
 {id:'m5',date:'2026-10-22',description:'Academia',categoryId:'saude',accountId:'conta-a',type:'expense',status:'paid',amount:89.90,signedAmount:-89.90},
];
const payables=[
 {id:'p1',description:'Fatura de cartão',dueDate:'2026-10-28',status:'open',totalAmount:1245.80,openAmount:1245.80,categoryId:'cartao'},
 {id:'p2',description:'Internet',dueDate:'2026-10-30',status:'open',totalAmount:129.90,openAmount:129.90,categoryId:'utilidades'},
 {id:'p3',description:'Condomínio',dueDate:'2026-11-02',status:'open',totalAmount:450.00,openAmount:450.00,categoryId:'moradia'},
 {id:'p4',description:'Seguro',dueDate:'2026-11-05',status:'open',totalAmount:189.90,openAmount:189.90,categoryId:'seguros'},
];
const demoDays=[
 [1,410,0],[2,0,250],[3,570,0],[4,0,170],[5,330,210],[6,700,0],[7,0,380],[8,280,0],[9,740,120],[10,0,360],
 [11,470,0],[12,900,200],[13,350,100],[14,0,540],[15,420,170],[16,0,370],[17,780,0],[18,0,200],[19,450,140],
 [20,0,280],[21,350,200],[22,780,89.90],[23,500,500],[24,210,123.45],[25,5000,0],[26,0,156.32],
 [27,440,100],[28,300,0],[29,150,200],[30,0,240],[31,220,0],
].map(([d,income,expense])=>({date:'2026-10-'+String(d).padStart(2,'0'),income,expense,net:income-expense,realizedBalance:9000+d*85}));

export const homeVisualFixture=createMegDataSource({
 meta:{mode:'mock',month:'2026-10',sources:['home-approved-image-reference-fictitious']},
 categories,accounts,transactions,payables,
 cards:[{id:'card-1',name:'Cartão A'},{id:'card-2',name:'Cartão B'}],
 readModels:{
  summary:{month:'2026-10',availableBalance:0,income:8927.45,expense:6314.20,projectedResult:2613.25,realizedIncome:8927.45,realizedExpense:6314.20,realizedResult:2613.25,eventCount:28,pendingCount:5,pendingAmount:532.18},
  cashflow:{month:'2026-10',openingBalance:8500,realizedClosing:12345.67,totalIncome:8927.45,totalExpense:6314.20,days:demoDays},
  benefitSummary:{month:'2026-10',balance:1890.32,credits:2150.00,used:259.68},
  homeOverview:{month:'2026-10',effectiveAt:'2026-10-28',available:12345.67,payables:{openAmount:1245.80,count:3},cards:{openAmount:864.32,count:2},paid:{count:12}},
 },
});
