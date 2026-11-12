/** Etapa 10: uma fixture sintética instanciada pela fonte única da Web (Etapa 02).
 * Sem contas, registros ou saldos reais. Proibido usá-la para requisições à API.
 */
import {createMegDataSource} from '../../../evolution/data/data.js';
export const stage10Fixture = createMegDataSource({
 meta:{mode:'mock',month:'2026-11',sources:['stage10-visual-only']},
 accounts:[
  {id:'qa-current',name:'Conta corrente de demonstração',type:'checking',isActive:true},
  {id:'qa-benefit',name:'Conta Benefício (fictícia)',type:'benefit',isActive:true},
 ],
 categories:[
  {id:'qa-food',name:'Alimentação',group:'Variável',type:'expense',isActive:true},
  {id:'qa-home',name:'Casa',group:'Variável',type:'expense',isActive:true},
  {id:'qa-transport',name:'Transporte',group:'Variável',type:'expense',isActive:true},
  {id:'qa-health',name:'Saúde',group:'Variável',type:'expense',isActive:true},
  {id:'qa-shopping',name:'Compras',group:'Variável',type:'expense',isActive:true},
  {id:'qa-fixed',name:'Fixo',group:'Fixo',type:'expense',isActive:true},
  {id:'qa-salary',name:'Salário',group:'Receitas',type:'income',isActive:true},
 ],
 paymentMethods:[
  {id:'qa-pix',name:'PIX',type:'instant',isActive:true},
  {id:'qa-money',name:'Dinheiro',type:'cash',isActive:true},
  {id:'qa-debit',name:'Débito',type:'debit',isActive:true},
  {id:'qa-auto',name:'Débito automático',type:'debit',isActive:true},
  {id:'qa-boleto',name:'Boleto',type:'boleto',isActive:true},
  {id:'qa-credit',name:'Cartão de crédito',type:'credit',isActive:true},
  {id:'qa-verocard',name:'Verocard',type:'benefit',isActive:true},
 ],
 cards:[{id:'qa-card',name:'Cartão de demonstração (fictício)',closingDay:10,dueDay:20,isActive:true}],
 transactions:[
  {id:'qa-history-1',description:'Conta de energia (fictícia)',type:'expense',categoryId:'qa-home',accountId:'qa-current',paymentMethodId:'qa-pix',date:'2026-11-10',amount:'187.65',status:'planned'},
  {id:'qa-history-2',description:'Refeição (fictícia)',type:'expense',categoryId:'qa-food',accountId:'qa-benefit',paymentMethodId:'qa-verocard',date:'2026-11-08',amount:'45.90',status:'paid'},
  {id:'qa-history-3',description:'Transporte (fictício)',type:'expense',categoryId:'qa-transport',accountId:'qa-current',paymentMethodId:'qa-debit',date:'2026-11-07',amount:'25.00',status:'paid'},
  {id:'qa-history-4',description:'Salário (fictício)',type:'income',categoryId:'qa-salary',accountId:'qa-current',paymentMethodId:'qa-pix',date:'2026-11-03',amount:'100.00',status:'paid'},
 ]
});
