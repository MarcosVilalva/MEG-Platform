import { Capacitor, registerPlugin } from '@capacitor/core';

const AppUpdater = registerPlugin('AppUpdater');
const VERSION_URL = 'https://marcosvilalva.github.io/MEG-Platform/downloads/app-version.json';
const DISMISSED_KEY = 'meg-dismissed-app-version';

function updateDialog(release, installed) {
  document.querySelector('#appUpdateDialog')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'appUpdateDialog';
  dialog.className = 'modal app-update-dialog';
  dialog.innerHTML = `
    <div class="app-update-icon" aria-hidden="true">↻</div>
    <small class="decision-eyebrow">ATUALIZAÇÃO DO APLICATIVO</small>
    <h2>Uma nova versão do MEG está disponível</h2>
    <p>Versão instalada: <strong>${installed.versionName}</strong> · nova versão: <strong>${release.versionName}</strong></p>
    <div class="app-update-notes">${String(release.releaseNotes || 'Melhorias de desempenho, segurança e experiência.').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</div>
    <p class="app-update-status" id="appUpdateStatus">A atualização preserva todos os dados salvos na nuvem.</p>
    <div class="modal-actions">
      <button type="button" class="ghost-button" id="appUpdateLater">Agora não</button>
      <button type="button" class="primary-button" id="appUpdateNow">Atualizar agora</button>
    </div>`;
  document.body.append(dialog);
  const status = dialog.querySelector('#appUpdateStatus');
  const updateButton = dialog.querySelector('#appUpdateNow');
  dialog.querySelector('#appUpdateLater').addEventListener('click', () => {
    sessionStorage.setItem(DISMISSED_KEY, String(release.versionCode));
    dialog.close();
  });
  updateButton.addEventListener('click', async () => {
    updateButton.disabled = true;
    try {
      const info = await AppUpdater.getInfo();
      if (!info.canInstallPackages) {
        status.textContent = 'Ative “Permitir desta fonte”, volte ao MEG e toque em Atualizar novamente.';
        await AppUpdater.requestInstallPermission();
        updateButton.textContent = 'Tentar novamente';
        return;
      }
      status.textContent = 'Baixando a atualização com segurança…';
      updateButton.textContent = 'Baixando…';
      await AppUpdater.downloadAndInstall({ url: release.downloadUrl, sha256: release.sha256 || '' });
      status.textContent = 'Download concluído. Confirme a instalação na tela do Android.';
    } catch (cause) {
      const message = cause?.message || String(cause || 'Falha desconhecida.');
      status.textContent = message.includes('INSTALL_PERMISSION_REQUIRED')
        ? 'Autorize a instalação de apps pelo MEG e tente novamente.'
        : `Não foi possível atualizar: ${message}`;
      updateButton.textContent = 'Tentar novamente';
    } finally {
      updateButton.disabled = false;
    }
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.showModal();
}

export async function checkForAppUpdate({ force = false } = {}) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return { available: false };
  try {
    const [installed, response] = await Promise.all([
      AppUpdater.getInfo(),
      fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' })
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const release = await response.json();
    const available = Number(release.versionCode) > Number(installed.versionCode);
    const dismissed = sessionStorage.getItem(DISMISSED_KEY) === String(release.versionCode);
    if (available && (force || release.mandatory || !dismissed)) updateDialog(release, installed);
    return { available, release, installed };
  } catch (cause) {
    console.warn('MEG app update check failed', cause);
    return { available: false, error: cause };
  }
}
