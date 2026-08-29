export function embeddedAndroidVersion() {
  const versionName = String(import.meta.env.VITE_ANDROID_VERSION_NAME || '').trim();
  const versionCode = Number(import.meta.env.VITE_ANDROID_VERSION_CODE);
  if (!versionName || !Number.isFinite(versionCode) || versionCode <= 0) return null;
  return {
    versionName,
    versionCode,
    source: 'embedded-build',
  };
}

export function publishEmbeddedAndroidVersion() {
  const installed = embeddedAndroidVersion();
  if (!installed || typeof document === 'undefined' || typeof window === 'undefined') return installed;

  window.MEG_INSTALLED_APP_VERSION = installed;
  document.body.dataset.installedAppVersion = installed.versionName;
  const label = document.querySelector('#sidebarVersion');
  if (label) {
    label.textContent = `APK v${installed.versionName}`;
    // Mantém compatibilidade com as rotinas antigas, impedindo que uma falha
    // posterior da ponte nativa substitua uma versão conhecida por "indisponível".
    label.dataset.versionSource = 'native';
  }
  window.dispatchEvent(new CustomEvent('meg:installed-app-version', { detail: installed }));
  return installed;
}

function initializeEmbeddedVersion() {
  publishEmbeddedAndroidVersion();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEmbeddedVersion, { once: true });
  } else {
    initializeEmbeddedVersion();
  }
}
