"""Fingerprint literal do protocolo empacotado, sem executar JS ou expor dados."""
from __future__ import annotations

import zipfile

# Padroes exatos sao evidencia estatica; ausencia nao descarta construcao dinamica.
SIGNATURES = {
    "TRANSACTION_PATCH_ROUTE": b"app-state/transactions",
    "TRANSACTION_OUTBOX_KEY": b"meg-cloud-transaction-outbox-v1",
    "TRANSACTION_OUTBOX_CONFLICT_KEY": b"meg-cloud-transaction-outbox-conflict-v1",
    "STATE_PROPERTIES_OUTBOX_KEY": b"meg-cloud-state-properties-outbox-v1",
    "CLOUD_CONFIRMATION_QUERY": b"megCloudConfirmation",
    "APP_STATE_ROUTE": b"app-state",
    "EXPECTED_REVISION": b"expectedRevision",
    "OPERATION_ID": b"operationId",
    "HTTP_PATCH_LITERAL": b"PATCH",
    "HTTP_PUT_LITERAL": b"PUT",
    "HTTP_409_LITERAL": b"409",
}

def fingerprint(apk: zipfile.ZipFile) -> tuple[dict[str, bool], int]:
    results = {key: False for key in SIGNATURES}
    scanned = 0
    for entry in apk.infolist():
        if not (entry.filename.startswith("assets/public/")
                and entry.filename.endswith((".js", ".html", ".json"))
                and not entry.is_dir()
                and entry.file_size <= 4_000_000):
            continue
        blob = apk.read(entry)
        scanned += 1
        for label, token in SIGNATURES.items():
            if token in blob:
                results[label] = True
    return results, scanned
