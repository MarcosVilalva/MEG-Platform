/** Metadados da escolha do tipo, sem DOM, sem CSS e sem lógica financeira. */
export type NewLaunchType = 'expense' | 'income' | 'transfer' | 'benefit';
export type LaunchOption = {
 type: NewLaunchType;
 title: string;
 description: string;
 tags: readonly string[];
};
export const NEW_LAUNCH_TYPES: readonly LaunchOption[] = [
 {type:'expense',title:'Despesa',description:'Saídas, compras e gastos',tags:['Conta','Cartão','Parcelas']},
 {type:'income',title:'Receita',description:'Entradas e recebimentos',tags:['Conta','Recorrência']},
 {type:'transfer',title:'Transferência',description:'Mover entre contas',tags:['Origem e destino','Entre contas']},
 {type:'benefit',title:'Benefício',description:'Usar ou recarregar Verocard',tags:['Saldo','Consumo']},
];
