/** Tipos estritos para adaptador IndexedDB JavaScript compartilhado com Web legada. */
export function readDurableOutbox(kind: string): Promise<unknown | null>;
export function readDurableOutboxStrict(kind: string): Promise<unknown | null>;
export function protectDurableOutbox(kind: string, payload: unknown): Promise<{
  protected: boolean;
  unavailable: boolean;
}>;
export function deleteDurableOutboxIfGeneration(kind: string, generation: number): Promise<boolean>;
export function deleteDurableOutboxIfOperationId(kind: string, operationId: string): Promise<boolean>;
