#!/usr/bin/env python3
"""Etapa 10: auditoria estática SOMENTE LEITURA do APK público do GitHub Release.

Baixa cópia efêmera no CI; sem instalar, executar, reempacotar ou alterar APK.
Imprime SOMENTE hash, tamanho, versionamento e nomes de hosts de API conhecidos.
Nunca imprime senhas, tokens, URLs completas ou conteúdo de assets.
"""
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile

URL = ("https://github.com/MarcosVilalva/MEG-Platform/"
       "releases/download/android-latest/MEG-Financas-708.apk")
EXPECTED_BYTES = 6_715_918
EXPECTED_SHA256 = "1718b23c2f38977c5d759c07b26e59762819fd9d16168c017859bd09f2ee83c6"
CI_FLAG = os.environ.get("MEG_STAGE10_APK_STATIC_QA")
if CI_FLAG != "1" or os.environ.get("GITHUB_ACTIONS") != "true":
    raise SystemExit("STAGE10_APK_AUDIT_GITHUB_CI_ONLY")

with tempfile.TemporaryDirectory(prefix="meg-stage10-apk-readonly-") as tmp:
    filename = pathlib.Path(tmp) / "release-708.apk"
    request = urllib.request.Request(URL, headers={
        "User-Agent": "MEG-Stage10-ReadOnly-Release-Audit",
        "Accept": "application/octet-stream",
    })
    with urllib.request.urlopen(request, timeout=75) as response, filename.open("wb") as output:
        total = 0
        sha = hashlib.sha256()
        while (chunk := response.read(1024 * 512)):
            total += len(chunk)
            if total > EXPECTED_BYTES + 1024:
                raise SystemExit("STAGE10_APK_RELEASE_SIZE_LIMIT")
            sha.update(chunk)
            output.write(chunk)
    if total != EXPECTED_BYTES:
        raise SystemExit(f"STAGE10_APK_SIZE_MISMATCH expected={EXPECTED_BYTES} received={total}")
    if sha.hexdigest() != EXPECTED_SHA256:
        raise SystemExit("STAGE10_APK_RELEASE_SHA256_CHANGED")
    if not zipfile.is_zipfile(filename):
        raise SystemExit("STAGE10_APK_NOT_ZIP")

    hosts: set[str] = set()
    files_inspected = 0
    embedded = {"app-state/transactions": False, "megCloudConfirmation": False}
    with zipfile.ZipFile(filename) as apk:
        entries = apk.infolist()
        # Apenas NOMES e TAMANHOS de assets; nunca imprimimos o texto bruto.
        for entry in sorted(entries, key=lambda x: x.filename):
            if entry.filename.startswith("assets/") and not entry.is_dir():
                print("MEG_STAGE10_APK_ASSET_PATH", entry.filename[:220],
                      "BYTES", entry.file_size)
        # Identificar se a release usa caminhos de AppState, outbox ou PATCH.
        # Produz apenas booleanos e nomes dos bundles, nunca codigo empacotado.
        protocol_markers = (
            "app-state", "/transactions", "PATCH", "409", "outbox",
            "instant-persistence", "cloudRequest", "cloud-write-ahead",
        )
        for entry in entries:
            if not (entry.filename.startswith("assets/public/")
                    and entry.filename.endswith(".js") and not entry.is_dir()
                    and entry.file_size < 4_000_000):
                continue
            content = apk.read(entry).decode("utf-8", errors="ignore")
            hits = [x for x in protocol_markers if x in content]
            if hits:
                print("MEG_STAGE10_APK_BUNDLE_MARKERS", entry.filename[:180], ",".join(hits))
            if "app-state" in content or "409" in content:
                # Reportar contagens de PADRÕES, não trechos de codigo nem tokens.
                # Uma ocorrencia so demonstra sintaxe empacotada, nao que
                # um dispositivo de verdade tenha executado o ramo.
                patterns = {
                    "status_409": r"\.status\s*={2,3}\s*409\b",
                    "409_continue": r"409\s*\)\s*continue\b",
                    "409_retryable": r"409.{0,100}retryable",
                    "patch_appstate": r"app-state.{0,100}PATCH",
                    "appstate_patch": r"PATCH.{0,100}app-state",
                }
                for pname, pregex in patterns.items():
                    n = len(re.findall(pregex, content))
                    print("MEG_STAGE10_APK_BUNDLE_PATTERN", entry.filename[:150],
                          pname, n)
        if "assets/capacitor.config.json" in apk.namelist():
            conf = json.loads(apk.read("assets/capacitor.config.json"))
            from urllib.parse import urlparse
            server = conf.get("server") if isinstance(conf, dict) else None
            server = server if isinstance(server, dict) else {}
            print("MEG_STAGE10_APK_CAPACITOR_REMOTE_URL_CONFIGURED",
                  bool(server.get("url")))
            if isinstance(server.get("url"), str):
                print("MEG_STAGE10_APK_CAPACITOR_REMOTE_HOST",
                      urlparse(server["url"]).hostname or "NONE")
        for suffix in ("classes.dex", "classes2.dex", "classes3.dex"):
            if suffix not in apk.namelist():
                continue
            dex = apk.read(suffix)
            # DEX strings podem conter segredos: só saída booleana de marcadores.
            for marker in (b"app-state/transactions",
                           b"meg-platform-api.onrender.com",
                           b"megCloudConfirmation", b"loadUrl",
                           b"WebView", b"capacitor"):
                print("MEG_STAGE10_APK_DEX_MARKER", suffix,
                      marker.decode("ascii"), "FOUND" if marker in dex else "NOT_FOUND")

        for entry in entries:
            if entry.is_dir() or entry.file_size > 12_000_000:
                continue
            # APK assets (JS/JSON/HTML) are text and carry the endpoint.
            if not entry.filename.startswith("assets/"):
                continue
            if not entry.filename.endswith((".js", ".json", ".html", ".txt", ".xml", ".css", ".properties")):
                continue
            raw = apk.read(entry)
            files_inspected += 1
            text = raw.decode("utf-8", errors="ignore")
            for value in embedded:
                if value in text:
                    embedded[value] = True
            for match in re.finditer(r"https?://([a-zA-Z0-9.-]+)", text):
                host = match.group(1).lower().strip(".")
                if host.endswith(".onrender.com"):
                    hosts.add(host)

    print("MEG_STAGE10_APK_RELEASE_ASSET_NAME MEG-Financas-708.apk")
    print("MEG_STAGE10_APK_RELEASE_SIZE", total)
    print("MEG_STAGE10_APK_RELEASE_SHA256", sha.hexdigest())
    print("MEG_STAGE10_APK_ASSETS_SCANNED", files_inspected)
    print("MEG_STAGE10_APK_ONRENDER_HOSTS", ",".join(sorted(hosts)) or "NONE")
    for term, found in embedded.items():
        print("MEG_STAGE10_APK_SIGNATURE", term, "FOUND" if found else "NOT_FOUND")

    aapt_candidates = []
    if shutil.which("aapt"):
        aapt_candidates.append(pathlib.Path(shutil.which("aapt")))
    for root in (os.getenv("ANDROID_HOME"), os.getenv("ANDROID_SDK_ROOT")):
        if root:
            aapt_candidates += list((pathlib.Path(root) / "build-tools").glob("*/aapt"))
    for aapt in reversed(aapt_candidates):
        if not aapt.is_file():
            continue
        result = subprocess.run([str(aapt), "dump", "badging", str(filename)],
                                capture_output=True, text=True, timeout=20, check=False)
        package = next((line for line in result.stdout.splitlines()
                        if line.startswith("package:")), None)
        if package:
            safe = re.search(r"name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", package)
            if safe:
                print("MEG_STAGE10_APK_PACKAGE_NAME", safe.group(1))
                print("MEG_STAGE10_APK_VERSION_CODE", safe.group(2))
                print("MEG_STAGE10_APK_VERSION_NAME", safe.group(3))
            break
    print("MEG_STAGE10_APK_READONLY_RELEASE_INSPECTION_OK")
