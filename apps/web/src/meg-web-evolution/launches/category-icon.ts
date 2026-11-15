import type {LaunchIconName} from './LaunchIcon';

/**
 * Associação VISUAL somente. Não altera classificação financeira:
 * usa o nome já fornecido pela API ou pela fixture; rótulos desconhecidos
 * recebem o ícone neutro, sem inventar categorias nem recalcular valores.
 */
const known:Record<string,LaunchIconName>={
 'supermercado':'grocery','mercado':'grocery','mercado de bairro':'grocery','compras de supermercado':'grocery',
 'saude':'health','farmacia':'health','medicamentos':'health','medico':'health','consultas medicas':'health','hospital':'health',
 'transporte':'transport','mobilidade':'transport','taxi':'transport','transporte publico':'transport',
 'combustivel':'fuel','abastecimento':'fuel','gasolina':'fuel',
 'casa':'home','moradia':'home','aluguel':'home','condominio':'home','habitacao':'home',
 'receitas':'income','receita':'income','salario':'income','salarios':'income','renda':'income','rendimentos':'income',
 'alimentacao':'food','refeicoes':'food','restaurante':'food','lanches':'food',
 'educacao':'education','escola':'education','cursos':'education','faculdade':'education',
 'lazer':'leisure','entretenimento':'leisure','viagens':'leisure',
 'servicos':'services','contas':'services','despesas fixas':'services','impostos':'services','taxas':'services',
 'assinaturas':'subscriptions','internet':'subscriptions','telefonia':'subscriptions','streaming':'subscriptions',
 'cartao':'card','cartao de credito':'card','faturas':'card',
 'beneficios':'gift','presentes':'gift',
 'trabalho':'work','negocios':'work'
};
export function launchCategoryIcon(category:string):LaunchIconName {
 const value=category.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
 return known[value]??'generic';
}
