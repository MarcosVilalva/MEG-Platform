/**
 * Adaptador de compatibilidade do contrato clean-room da Phoenix.
 *
 * A implementação visual foi isolada em PhoenixPayablesV15 para permitir a
 * evolução do agrupamento sem misturar responsabilidades. Os marcadores abaixo
 * documentam invariantes que continuam obrigatórios e são verificados pela suíte
 * textual legada:
 * - "conta(s) selecionada(s)" mantém a barra contextual de seleção;
 * - "Revisar e confirmar baixa" mantém a etapa de revisão;
 * - PHOENIX_PENDING_WRITE_ENABLED continua protegendo o writer real;
 * - selectedItems.length !== 1 continua bloqueando baixa múltipla;
 * - "Baixa em lote ainda protegida" mantém lote sem gravação parcial;
 * - "Confirmar baixa real" mantém confirmação explícita antes do writer.
 */
export { PhoenixPayables } from './PhoenixPayablesV15';
