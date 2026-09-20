// Entrada oficial de produção. Mantemos um único bootstrap para Web e Android,
// mas o runtime visual e financeiro pertence integralmente à Phoenix V15.
import '../phoenix/phoenix-release-hardening.css';
import '../phoenix/preview-boot.css';
import '../phoenix/auth-fast-entry-bridge';
import '../phoenix/history-prewarm-bridge';
import '../phoenix/description-autocomplete-bridge';
import '../phoenix/launch-business-rules-bridge';
import '../phoenix/card-domain-live-refresh-bridge';
import '../phoenix/card-view-continuity-bridge';
import '../phoenix/card-management-bridge';
import '../phoenix/card-statement-payment-bridge';
import '../phoenix/card-statement-reopen-bridge';
import '../phoenix/card-statement-lifecycle-bridge';
import '../phoenix/card-statement-history-bridge';
import '../phoenix/card-statement-projection-bridge';
import '../phoenix/home-commitment-forecast-bridge';
import '../phoenix/home-scenario-simulator-bridge';
import '../phoenix/home-purchase-decision-bridge';
import '../phoenix/card-event-form-bridge';
import '../phoenix/card-purchase-detail-bridge';
import '../phoenix/card-movement-readonly-bridge';
import '../phoenix/card-purchase-edit-bridge';
import '../phoenix/simple-event-form-bridge';
import '../phoenix/write-success-auto-close';
import '../phoenix/bulk-checkbox-fastpaint';
import '../phoenix/bulk-event-actions-bridge';
import '../phoenix/bulk-event-ux-enhancements';
import '../phoenix/action-prewarm-bridge';
import '../phoenix/avatar-runtime-bridge';
import '../phoenix/phoenix-keyboard-grid-bridge';
import '../phoenix/phoenix-table-export-bridge';
import '../phoenix/phoenix-overlay-theme-bridge';
import '../phoenix/phoenix-visual-a11y.css';
import { clearSession } from './auth-client';

const nativeOperationalBuild = import.meta.env.VITE_MOBILE_APP === 'true';

if (nativeOperationalBuild) {
  document.body.classList.add('native-mobile', 'meg-operational-mobile');
  document.body.dataset.megOperational = 'android-v2';
}

async function bootMegRuntime() {
  if (nativeOperationalBuild) {
    try {
      // @ts-expect-error módulo JS nativo existente, carregado somente no APK.
      const biometric = await import('../native-biometric-login.js');
      const startup = await biometric.prepareAndroidBiometricStartup();
      if (startup?.required) {
        // A biometria é a fonte de verdade no APK. Mesmo quando reconhecida,
        // descartamos qualquer sessão web anterior para impedir que o preview
        // fique preso validando um token antigo em 22%. As credenciais
        // biométricas já foram mantidas em memória e serão consumidas pelo
        // login nativo logo após o preview montar.
        clearSession();
      }
    } catch (cause) {
      console.warn('MEG Android biometric startup unavailable', cause);
    }
  }

  await import('../phoenix/preview-main');
}

void bootMegRuntime();
