import { authenticatedRequest } from '../app/auth-client';
import type { PhoenixReadModel } from './contracts';
import { clearPhoenixReadModelCache, loadPhoenixReadModel } from './data/load-phoenix-read-model';

export type PhoenixNormalizationPreview = {
  revision: number;
  primary: boolean;
  reconciled: boolean;
  mode: string;
  updatedAt?: string | null;
  source: { sourceCount: number; validCount: number; invalidCount: number; fingerprint: string };
  normalized: { count: number; fingerprint: string };
};

export type PhoenixNormalizationReconcileResult =
  | {
      status: 'confirmed';
      repair: {
        active?: boolean;
        changed?: boolean;
        revision?: number;
        refreshedEvents?: number;
        removedLegacyIds?: number;
      };
      preview: PhoenixNormalizationPreview;
      snapshot: PhoenixReadModel;
    }
  | {
      status: 'error';
      code: 'PRIMARY_REQUIRED' | 'REVISION_CONFLICT' | 'RECONCILIATION_FAILED' | 'RECONCILE_FAILED';
      message: string;
      preview?: PhoenixNormalizationPreview;
    };

export async function readPhoenixNormalizationPreview() {
  return authenticatedRequest<PhoenixNormalizationPreview>('/app-state/normalization-preview', { cache: 'no-store' });
}

export async function reconcilePhoenixPrimaryMirror(
  prepared: PhoenixNormalizationPreview,
  month: string,
): Promise<PhoenixNormalizationReconcileResult> {
  if (!prepared.primary) {
    return {
      status: 'error',
      code: 'PRIMARY_REQUIRED',
      message: 'A base normalizada ainda não é a fonte primária deste workspace. O espelho não pode ser reconciliado por esta operação.',
      preview: prepared,
    };
  }

  try {
    const response = await authenticatedRequest<{
      repair: PhoenixNormalizationReconcileResult extends { status: 'confirmed'; repair: infer T } ? T : never;
      preview: PhoenixNormalizationPreview;
      reconciled: boolean;
    }>('/app-state/normalization-reconcile-primary', {
      method: 'POST',
      body: JSON.stringify({
        expectedRevision: prepared.revision,
        confirmation: 'RECONCILIAR_ESPELHO_APPSTATE',
      }),
    });

    if (!response.reconciled || !response.preview?.reconciled) {
      return {
        status: 'error',
        code: 'RECONCILIATION_FAILED',
        message: 'O servidor executou a tentativa de reconciliação, mas a conferência final ainda encontrou divergência.',
        preview: response.preview,
      };
    }

    clearPhoenixReadModelCache();
    const snapshot = await loadPhoenixReadModel(month, { force: true, forceStatic: true });
    return {
      status: 'confirmed',
      repair: response.repair || {},
      preview: response.preview,
      snapshot,
    };
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : 0;
    const raw = error instanceof Error ? error.message : '';
    if (status === 409 || /NORMALIZATION_REVISION_CONFLICT|NORMALIZED_PRIMARY_MIRROR_CONFLICT/i.test(raw)) {
      let preview: PhoenixNormalizationPreview | undefined;
      try { preview = await readPhoenixNormalizationPreview(); } catch { /* diagnóstico opcional */ }
      return {
        status: 'error',
        code: 'REVISION_CONFLICT',
        message: 'A base mudou depois da conferência. O reparo foi cancelado; compare as fontes novamente antes de tentar de novo.',
        preview,
      };
    }
    if (/NORMALIZATION_PRIMARY_REQUIRED/i.test(raw)) {
      return {
        status: 'error',
        code: 'PRIMARY_REQUIRED',
        message: 'A base normalizada não está ativa como fonte primária. Nenhum reparo foi executado.',
      };
    }
    if (status === 422 || /NORMALIZATION_RECONCILIATION_FAILED/i.test(raw)) {
      let preview: PhoenixNormalizationPreview | undefined;
      try { preview = await readPhoenixNormalizationPreview(); } catch { /* diagnóstico opcional */ }
      return {
        status: 'error',
        code: 'RECONCILIATION_FAILED',
        message: 'A reconciliação não fechou a divergência. A base financeira primária foi preservada e o diagnóstico precisa ser revisto.',
        preview,
      };
    }
    return {
      status: 'error',
      code: 'RECONCILE_FAILED',
      message: raw || 'Não foi possível reconciliar o espelho do AppState.',
    };
  }
}
