/**
 * Política de entrada textual da Web MEG, aprovada pelo usuário em 12/11/2026.
 * Aplicar SOMENTE a campos livres destinados a texto financeiro (descrição,
 * observações etc.). Nunca aplicar a IDs, e-mails, senhas, tokens, datas,
 * valores ou chaves de idempotência.
 */
export function normalizeFinancialTextInput(value:string):string {
 return value.toLocaleUpperCase('pt-BR');
}
