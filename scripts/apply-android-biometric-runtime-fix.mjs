import fs from 'node:fs';

const file = 'apps/web/src/native-biometric-login.js';
let source = fs.readFileSync(file, 'utf8');

const replacements = [
  [
    "async function getBiometricAuth() {\n  if (!await waitForNativeAndroid()) return null;\n  biometricPluginPromise ||= getCapacitorCore()",
    "async function getBiometricAuth() {\n  biometricPluginPromise ||= getCapacitorCore()",
  ],
  [
    "export async function getBiometricLoginStatus() {\n  if (!await waitForNativeAndroid()) {\n    return { available: false, enabled: false, reason: 'NOT_NATIVE_ANDROID' };\n  }\n  try {\n    const status = await callBiometricPlugin('isAvailable', undefined, { retries: STATUS_CALL_RETRIES });\n    window.MEG_BIOMETRIC_STATUS = status;\n    return status;",
    "export async function getBiometricLoginStatus() {\n  try {\n    const status = await callBiometricPlugin('isAvailable', undefined, { retries: STATUS_CALL_RETRIES });\n    document.body?.classList.add('native-mobile');\n    document.body.dataset.nativeRuntime = 'android-biometric-plugin';\n    window.MEG_NATIVE_ANDROID_CONFIRMED = true;\n    window.MEG_BIOMETRIC_STATUS = { ...status, native: true, platform: 'android' };\n    return window.MEG_BIOMETRIC_STATUS;",
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
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Trecho biométrico esperado não encontrado: ${before.slice(0, 90)}`);
  }
  source = source.replace(before, after);
}

fs.writeFileSync(file, source);
console.log('Android biometric runtime gate removed successfully.');
