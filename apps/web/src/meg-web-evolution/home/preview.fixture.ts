import type {HomeFinancialData} from './HomeDashboard';

/* Apenas para a PRÉVIA pública isolada. Nunca importar no fluxo autenticado. */
export const homePreviewFixture:HomeFinancialData={
 summary:{month:'2026-10',income:9250.70,expense:6887.71,projectedResult:2362.99,realizedResult:1980.52,pendingCount:5,pendingAmount:532.18},
 cashflow:{month:'2026-10',days:[
  {date:'2026-10-01',income:2100,expense:890,net:1210},{date:'2026-10-03',income:0,expense:390,net:-390},
  {date:'2026-10-05',income:180,expense:700,net:-520},{date:'2026-10-07',income:650,expense:480,net:170},
  {date:'2026-10-09',income:0,expense:365,net:-365},{date:'2026-10-11',income:550,expense:230,net:320},
  {date:'2026-10-13',income:760,expense:300,net:460},{date:'2026-10-15',income:320,expense:760,net:-440},
  {date:'2026-10-17',income:140,expense:570,net:-430},{date:'2026-10-19',income:850,expense:250,net:600},
  {date:'2026-10-21',income:480,expense:950,net:-470},{date:'2026-10-23',income:720,expense:670,net:50},
  {date:'2026-10-25',income:1850,expense:470,net:1380},{date:'2026-10-27',income:325,expense:600,net:-275},
  {date:'2026-10-29',income:215,expense:260,net:-45},{date:'2026-10-30',income:110,expense:300,net:-190}
 ]},
 available:{date:'2026-10-30',available:12480.75,scope:'monetary'},
 benefit:{month:'2026-10',balance:1250,credits:1480,used:230},
 accounts:[{id:'bank',name:'Conta principal',type:'checking'},{id:'benefit',name:'Benefício Alimentação',type:'benefit'}],
 categories:[{id:'c1',name:'Supermercado'},{id:'c2',name:'Saúde'},{id:'c3',name:'Transporte'},{id:'c4',name:'Receitas'},{id:'c5',name:'Casa'}],
 cards:[{id:'one',name:'Cartão de crédito',issuer:'Banco Exemplo',lastFour:'1234',statementAmount:980.55,payableStatementAmount:980.55,creditLimit:4200,availableLimit:2260,dueDay:12},
        {id:'two',name:'Cartão de compras',issuer:'Banco Fictício',lastFour:'5678',statementAmount:245.80,payableStatementAmount:245.80,creditLimit:2600,availableLimit:1900,dueDay:20},
        {id:'three',name:'Cartão adicional',issuer:'Instituição fictícia',lastFour:'9012',statementAmount:89.40,payableStatementAmount:89.40,creditLimit:1800,availableLimit:1150,dueDay:25}],
 transactions:[
  {id:'e1',date:'2026-10-29',description:'Supermercado',status:'paid',type:'expense',amount:210.40,signedAmount:-210.40,categoryId:'c1',accountId:'benefit'},
  {id:'e2',date:'2026-10-28',description:'Remuneração',status:'paid',type:'income',amount:3250,signedAmount:3250,categoryId:'c4',accountId:'bank'},
  {id:'e3',date:'2026-10-28',description:'Farmácia',status:'paid',type:'expense',amount:89.90,signedAmount:-89.90,categoryId:'c2',accountId:'bank'},
  {id:'e4',date:'2026-10-27',description:'Mensalidade de serviços',status:'paid',type:'expense',amount:39.90,signedAmount:-39.90,categoryId:'c5',accountId:'bank'},
  {id:'e5',date:'2026-10-26',description:'Combustível',status:'paid',type:'expense',amount:180,signedAmount:-180,categoryId:'c3',accountId:'bank'},
  {id:'e6',date:'2026-10-25',description:'Mercado de bairro',status:'paid',type:'expense',amount:95.50,signedAmount:-95.50,categoryId:'c1',accountId:'benefit'},
  {id:'e7',date:'2026-10-25',description:'Crédito recebido',status:'paid',type:'income',amount:4850,signedAmount:4850,categoryId:'c4',accountId:'bank'},
  {id:'e8',date:'2026-10-24',description:'Pagamento de serviços',status:'paid',type:'expense',amount:250,signedAmount:-250,categoryId:'c5',accountId:'bank'},
  {id:'e9',date:'2026-11-02',description:'Conta de internet',status:'planned',type:'expense',amount:120,signedAmount:-120,categoryId:'c5',accountId:'bank'},
  {id:'e10',date:'2026-11-06',description:'Energia elétrica',status:'planned',type:'expense',amount:214.85,signedAmount:-214.85,categoryId:'c5',accountId:'bank'},
  {id:'e11',date:'2026-11-11',description:'Seguro',status:'planned',type:'expense',amount:189,signedAmount:-189,categoryId:'c3',accountId:'bank'}
 ],
 payables:[{id:'p1',description:'Fatura do cartão',dueDate:'2026-11-04',status:'open',openAmount:980.55,categoryId:'c5'},
           {id:'p2',description:'Condomínio',dueDate:'2026-11-09',status:'open',openAmount:850,categoryId:'c5'}]
};
