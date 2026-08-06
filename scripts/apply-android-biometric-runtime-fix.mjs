import fs from 'node:fs';

const loginFile = 'apps/web/src/native-biometric-login.js';
let loginSource = fs.readFileSync(loginFile, 'utf8');

const replacements = [
  [
    "async function getBiometricAuth() {\n  if (!await waitForNativeAndroid()) return null;\n  biometricPluginPromise ||= getCapacitorCore()",
    "async function getBiometricAuth() {\n  biometricPluginPromise ||= getCapacitorCore()",
  ],
  [
    "export async function getBiometricLoginStatus() {\n  if (!await waitForNativeAndroid()) {\n    return { available: false, enabled: false, reason: 'NOT_NATIVE_ANDROID' };\n  }\n  try {\n    const status = await callBiometricPlugin('isAvailable', undefined, { retries: STATUS_CALL_RETRIES });\n    window.MEG_BIOMETRIC_STATUS = status;\n    return status;",
    "export async function getBiometricLoginStatus() {\n  try {\n    const bridge = await callBiometricPlugin('ping', {}, { retries: 2 });\n    if (!bridge?.native || bridge?.platform !== 'android') throw new Error('PLUGIN_BRIDGE_INVALID');\n    const status = await callBiometricPlugin('isAvailable', {}, { retries: STATUS_CALL_RETRIES });\n    document.body?.classList.add('native-mobile');\n    document.body.dataset.nativeRuntime = 'android-biometric-plugin';\n    window.MEG_NATIVE_ANDROID_CONFIRMED = true;\n    window.MEG_BIOMETRIC_STATUS = { ...status, native: true, platform: 'android', pluginVersion: bridge.pluginVersion };\n    return window.MEG_BIOMETRIC_STATUS;",
  ],
  [
    "export async function saveBiometricLogin({ email, password }) {\n  if (!await waitForNativeAndroid() || !email || !password) return { saved: false };",
    "export async function saveBiometricLogin({ email, password }) {\n  if (!email || !password) return { saved: false, reason: 'CREDENTIALS_INCOMPLETE' };",
  ],
  [
    "export async function requestBiometricLogin() {\n  if (!await waitForNativeAndroid()) return null;",
    "export async function requestBiometricLogin() {",
  ],
  [
    "export async function clearBiometricLogin() {\n  if (!await waitForNativeAndroid()) return;",
    "export async function clearBiometricLogin() {",
  ],
  [
    "async function mountAndroidBiometricControl() {\n  if (!await waitForNativeAndroid()) return false;\n  const form = document.querySelector('#loginForm');",
    "async function mountAndroidBiometricControl() {\n  const form = document.querySelector('#loginForm');",
  ],
  [
    "function delay(milliseconds) {\n  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));\n}",
    "function delay(milliseconds) {\n  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));\n}\n\nfunction withBiometricTimeout(promise, milliseconds, code) {\n  let timer;\n  return Promise.race([\n    Promise.resolve(promise),\n    new Promise((_, reject) => {\n      timer = globalThis.setTimeout(() => reject(new Error(code)), milliseconds);\n    }),\n  ]).finally(() => globalThis.clearTimeout(timer));\n}",
  ],
  [
    "      return await BiometricAuth[method](payload);",
    "      const timeout = method === 'ping' || method === 'isAvailable' ? 6000 : 45000;\n      return await withBiometricTimeout(\n        BiometricAuth[method](payload || {}),\n        timeout,\n        `BIOMETRIC_${String(method).toUpperCase()}_TIMEOUT`,\n      );",
  ],
];

for (const [before, after] of replacements) {
  if (!loginSource.includes(before)) {
    throw new Error(`Trecho biométrico esperado não encontrado: ${before.slice(0, 100)}`);
  }
  loginSource = loginSource.replace(before, after);
}

fs.writeFileSync(loginFile, loginSource);

const settingsFile = 'apps/web/src/native-biometric-settings.js';
let settingsSource = fs.readFileSync(settingsFile, 'utf8');

const settingsAnchor = "let mountAttempts = 0;";
if (!settingsSource.includes(settingsAnchor)) throw new Error('Âncora das configurações biométricas não encontrada.');
settingsSource = settingsSource.replace(
  settingsAnchor,
  `${settingsAnchor}\nconst BIOMETRIC_STATUS_TIMEOUT_MS = 8000;\n\nfunction withStatusTimeout(promise) {\n  let timer;\n  return Promise.race([\n    Promise.resolve(promise),\n    new Promise((_, reject) => {\n      timer = window.setTimeout(() => reject(new Error('BIOMETRIC_STATUS_TIMEOUT')), BIOMETRIC_STATUS_TIMEOUT_MS);\n    }),\n  ]).finally(() => window.clearTimeout(timer));\n}`,
);

const oldUpdate = `  const updateButton = async () => {\n    const status = await getBiometricLoginStatus();\n    button.dataset.enabled = String(Boolean(status?.enabled));\n    if (!status?.available) {\n      button.textContent = 'Biometria indisponível';\n      button.title = biometricUnavailableMessage(status?.reason);\n      return status;\n    }\n    button.textContent = status.enabled ? 'Biometria ativa — testar' : 'Ativar biometria neste aparelho';\n    button.title = status.enabled\n      ? 'Toque para testar a leitura biométrica.'\n      : 'Toque para vincular sua conta à biometria do Android.';\n    return status;\n  };`;
const newUpdate = `  const updateButton = async () => {\n    button.disabled = true;\n    button.textContent = 'Verificando biometria...';\n    try {\n      const status = await withStatusTimeout(getBiometricLoginStatus());\n      button.dataset.enabled = String(Boolean(status?.enabled));\n      if (!status?.available) {\n        button.textContent = 'Biometria indisponível — tentar novamente';\n        button.title = biometricUnavailableMessage(status?.reason);\n        return status;\n      }\n      button.textContent = status.enabled ? 'Biometria ativa — testar' : 'Ativar biometria neste aparelho';\n      button.title = status.enabled\n        ? 'Toque para testar a leitura biométrica.'\n        : 'Toque para vincular sua conta à biometria do Android.';\n      return status;\n    } catch (cause) {\n      const reason = cause?.message || 'PLUGIN_UNAVAILABLE';\n      button.dataset.enabled = 'false';\n      button.textContent = 'Biometria: tentar novamente';\n      button.title = reason === 'BIOMETRIC_STATUS_TIMEOUT'\n        ? 'O Android não respondeu em 8 segundos. Toque para tentar novamente.'\n        : biometricUnavailableMessage(reason);\n      return { available: false, enabled: false, reason };\n    } finally {\n      button.disabled = false;\n    }\n  };`;
if (!settingsSource.includes(oldUpdate)) throw new Error('Rotina do botão biométrico não encontrada.');
settingsSource = settingsSource.replace(oldUpdate, newUpdate);

settingsSource = settingsSource.replace(
  "      const status = await getBiometricLoginStatus();",
  "      const status = await withStatusTimeout(getBiometricLoginStatus());",
);

fs.writeFileSync(settingsFile, settingsSource);
console.log('Android biometric bridge, timeout and non-blocking menu fix applied successfully.');
