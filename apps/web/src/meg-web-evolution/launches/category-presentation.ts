import {launchCategoryIcon} from './category-icon';
import type {LaunchIconName} from './LaunchIcon';

/**
 * Apenas aparência, nunca classificação ou inferência de tipo financeiro.
 * Correspondência EXATA de nomes conhecidos, com normalização de acentos,
 * maiúsculas e espaços. Sem "includes" que transforme palavras parecidas
 * em categorias diferentes. Categorias novas continuam neutras.
 *
 * Preferências futuras de cor/ícone usarão o ID canônico da categoria,
 * em uma API de preferências separada dos movimentos financeiros.
 */
export type CategoryTone=
 'amber'|'rose'|'blue'|'violet'|'apricot'|'mint'|'teal'|'lavender'|
 'slate'|'gold'|'aqua'|'green'|'neutral';

type Appearance={icon:LaunchIconName;tone:CategoryTone};
const alias:Record<string,Appearance>={
 // Compras de supermercado: carrinho, não cesta genérica.
 'supermercado':{icon:'marketCart',tone:'amber'},
 'mercado':{icon:'marketCart',tone:'amber'},
 'mercado de bairro':{icon:'marketCart',tone:'amber'},
 'compras de supermercado':{icon:'marketCart',tone:'amber'},
 'hortifruti':{icon:'marketCart',tone:'amber'},
 // Coração com pulso, sem reproduzir o emblema da Cruz Vermelha.
 'saude':{icon:'health',tone:'rose'},
 'farmacia':{icon:'health',tone:'rose'},
 'medicamentos':{icon:'health',tone:'rose'},
 'medico':{icon:'health',tone:'rose'},
 'consultas medicas':{icon:'health',tone:'rose'},
 'hospital':{icon:'health',tone:'rose'},
 'plano de saude':{icon:'health',tone:'rose'},
 'unimed':{icon:'health',tone:'rose'},
 // Carro e moto distintos: não deduzir a partir de "transporte".
 'carro':{icon:'transport',tone:'blue'},
 'carros':{icon:'transport',tone:'blue'},
 'automovel':{icon:'transport',tone:'blue'},
 'veiculo':{icon:'transport',tone:'blue'},
 'manutencao do carro':{icon:'transport',tone:'blue'},
 'seguro automotivo':{icon:'transport',tone:'blue'},
 'moto':{icon:'motorcycle',tone:'violet'},
 'motos':{icon:'motorcycle',tone:'violet'},
 'motocicleta':{icon:'motorcycle',tone:'violet'},
 'motocicletas':{icon:'motorcycle',tone:'violet'},
 'manutencao da moto':{icon:'motorcycle',tone:'violet'},
 // Pets identificáveis sem logotipos de empresas.
 'pet':{icon:'petPaw',tone:'apricot'},
 'pets':{icon:'petPaw',tone:'apricot'},
 'animais de estimacao':{icon:'petPaw',tone:'apricot'},
 'veterinario':{icon:'petPaw',tone:'apricot'},
 'veterinaria':{icon:'petPaw',tone:'apricot'},
 'pet shop':{icon:'petPaw',tone:'apricot'},
 'petshop':{icon:'petPaw',tone:'apricot'},
 'racao':{icon:'petPaw',tone:'apricot'},
 // Demais exemplos aprovados e rótulos históricos reais conhecidos.
 'alimentacao':{icon:'food',tone:'mint'},
 'refeicoes':{icon:'food',tone:'mint'},
 'restaurante':{icon:'food',tone:'mint'},
 'lanches':{icon:'food',tone:'mint'},
 'dinheiro':{icon:'income',tone:'teal'},
 'receita':{icon:'income',tone:'teal'},
 'receitas':{icon:'income',tone:'teal'},
 'salario':{icon:'income',tone:'teal'},
 'salarios':{icon:'income',tone:'teal'},
 'renda':{icon:'income',tone:'teal'},
 'rendimentos':{icon:'income',tone:'teal'},
 'educacao':{icon:'education',tone:'lavender'},
 'escola':{icon:'education',tone:'lavender'},
 'cursos':{icon:'education',tone:'lavender'},
 'faculdade':{icon:'education',tone:'lavender'},
 'ensino':{icon:'education',tone:'lavender'},
 'estudos':{icon:'education',tone:'lavender'},
 'imovel':{icon:'home',tone:'aqua'},
 'imoveis':{icon:'home',tone:'aqua'},
 'moradia':{icon:'home',tone:'aqua'},
 'casa':{icon:'home',tone:'aqua'},
 'comunicacao':{icon:'subscriptions',tone:'slate'},
};
const fallbackTones:Partial<Record<LaunchIconName,CategoryTone>>={
 grocery:'amber',health:'rose',transport:'blue',home:'aqua',
 income:'teal',food:'mint',education:'lavender',
 fuel:'gold',leisure:'violet',services:'slate',
 gift:'apricot',card:'blue',work:'aqua',subscriptions:'slate',
};

export function normalizeCategoryLabel(value:string){
 return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
}
export function launchCategoryPresentation(value:string):Appearance{
 const normalized=normalizeCategoryLabel(value);
 if(Object.prototype.hasOwnProperty.call(alias,normalized))return alias[normalized];
 const icon=launchCategoryIcon(value);
 return {icon,tone:fallbackTones[icon]??'neutral'};
}
