"""Teste sintetico sem rede, dispositivo ou acesso a APK real."""
from __future__ import annotations

import io
import zipfile
from meg_stage10_apk_protocol_signatures import SIGNATURES, fingerprint

def archive(text: bytes) -> zipfile.ZipFile:
    data = io.BytesIO()
    with zipfile.ZipFile(data, "w") as z:
        z.writestr("assets/public/assets/main-qa.js", text)
        z.writestr("assets/native-bridge.js", b"app-state/transactions") # Fora da Web.
        z.writestr("assets/public/assets/too-large.js", b"app-state/transactions" * 400_000)
    data.seek(0)
    return zipfile.ZipFile(data)

with archive(b'fetch("/app-state"); const x = "expectedRevision"; const y = "PUT";') as apk:
    found, scanned = fingerprint(apk)
    assert scanned == 1, (scanned, found)
    assert found["APP_STATE_ROUTE"]
    assert found["EXPECTED_REVISION"]
    assert found["HTTP_PUT_LITERAL"]
    assert not found["TRANSACTION_PATCH_ROUTE"]
    assert not found["CLOUD_CONFIRMATION_QUERY"]
    assert not found["TRANSACTION_OUTBOX_KEY"]

with archive(b'const x="app-state/transactions"; const o="meg-cloud-transaction-outbox-v1"; const y="megCloudConfirmation";') as apk:
    found, scanned = fingerprint(apk)
    assert scanned == 1
    assert found["TRANSACTION_PATCH_ROUTE"]
    assert found["TRANSACTION_OUTBOX_KEY"]
    assert found["CLOUD_CONFIRMATION_QUERY"]

with archive(b'const x="PHOENIX_WRITE_NOT_CONFIRMED";const a="/finance/events";const b="/finance/benefit-events";const c="/cards/purchases";') as apk:
    found, scanned = fingerprint(apk)
    assert scanned == 1
    for key in ("PHOENIX_WRITE_NOT_CONFIRMED", "PHOENIX_EVENT_CREATE_ROUTE", "PHOENIX_BENEFIT_ROUTE", "PHOENIX_CARD_PURCHASE_ROUTE"):
        assert found[key], key

assert len(SIGNATURES) == 15
print("MEG_STAGE10_APK_PROTOCOL_FINGERPRINT_SYNTHETIC_PASS")
