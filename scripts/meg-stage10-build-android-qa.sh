#!/usr/bin/env bash
set -euo pipefail

# Build only the separate APK variant using a loopback backend via adb reverse.
cd "$(dirname "$0")/.."
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK}"

export CAPACITOR_BUILD=true
# QA-only: force GET and PATCH through WebView to exercise the offline intercept.
# This variable is NEVER exported in the stable Android build.
export MEG_STAGE10_QA_DISABLE_NATIVE_HTTP="${MEG_STAGE10_QA_DISABLE_NATIVE_HTTP:-1}"
case "$MEG_STAGE10_QA_DISABLE_NATIVE_HTTP" in 0|1) ;; *) echo 'ISSUE699_INVALID_QA_HTTP_MODE'; exit 2;; esac
export VITE_API_URL=http://127.0.0.1:3333
export VITE_MOBILE_APP=true
export VITE_STAGE10_ANDROID_CONFIRMATION_QA=true
export VITE_PHOENIX_SIMPLE_EVENT_WRITE=enabled
export VITE_PHOENIX_BENEFIT_WRITE=enabled
export VITE_PHOENIX_CARD_PURCHASE_WRITE=disabled
export VITE_PHOENIX_TRANSFER_WRITE=disabled
export VITE_PHOENIX_PENDING_WRITE=disabled
export VITE_PHOENIX_BULK_EVENT_WRITE=disabled
export MEG_VERSION_CODE=708
export MEG_VERSION_NAME=2.0.708

npm run build:web
test ! -e apps/web/dist/downloads
grep -q 'data-meg-shell="phoenix-v15"' apps/web/dist/index.html
grep -rlF 'http://127.0.0.1:3333' apps/web/dist/assets >/dev/null
grep -rlF 'meg.phoenix.create-qa.v1.' apps/web/dist/assets >/dev/null
npx --no-install cap sync android
node -e "const c=require('./android/app/src/main/assets/capacitor.config.json'); const desired=process.env.MEG_STAGE10_QA_DISABLE_NATIVE_HTTP==='0'; if(c.plugins?.CapacitorHttp?.enabled!==desired) throw Error('ISSUE699_QA_CAPACITOR_HTTP_CONFIG_MISMATCH'); console.log('ISSUE699_QA_CAPACITOR_HTTP_'+(desired?'ENABLED':'DISABLED')+'=PASS')"
(cd android && bash ./gradlew --no-daemon assembleStage10Qa)

apk=android/app/build/outputs/apk/stage10Qa/app-stage10Qa.apk
build_tools=$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)
badging=$("$build_tools/aapt" dump badging "$apk")
grep -q "^package: name='br.com.megfinancas.app.stage10qa'" <<<"$badging"
grep -q "^application-label:'MEG Etapa 10 QA'" <<<"$badging"
"$build_tools/apksigner" verify "$apk"
sha256sum "$apk"
