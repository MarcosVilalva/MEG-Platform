/**
 * Gate técnico opcional, sem alterar as regras financeiras.
 * A API histórica não exige expectedUpdatedAt; o cliente Stage10 deve fornecê-lo.
 * Em READ COMMITTED/serializable, a validação ocorre DENTRO da transação
 * protegida, depois da leitura do agregado e antes de atualizar.
 */
export function matchesExpectedCardPurchaseVersion(
 expectedUpdatedAt:string|undefined,currentUpdatedAt:Date,
):boolean{
 if(expectedUpdatedAt===undefined)return true;
 return expectedUpdatedAt===currentUpdatedAt.toISOString();
}
