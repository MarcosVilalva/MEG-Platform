package br.com.megfinancas.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final String TAG = "MEG-AppUpdater";
    private static final String[] RELEASE_MANIFEST_URLS = {
        "https://marcosvilalva.github.io/MEG-Platform/downloads/app-version.json",
        "https://raw.githubusercontent.com/MarcosVilalva/MEG-Platform/main/apps/web/public/downloads/app-version.json"
    };
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean nativeCheckRunning = new AtomicBoolean(false);
    private final AtomicBoolean nativePromptVisible = new AtomicBoolean(false);
    private volatile boolean authenticatedUiReady = false;
    private volatile long suppressedNativePromptVersion = -1;

    private interface DownloadCallback {
        void onSuccess(String actualSha256);
        void onError(Exception error);
    }

    @PluginMethod
    public void getInfo(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
            JSObject result = new JSObject();
            result.put("versionCode", versionCode);
            result.put("versionName", info.versionName);
            result.put("canInstallPackages", Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Não foi possível consultar a versão instalada.", error);
        }
    }

    @PluginMethod
    public void requestInstallPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls()) {
            call.resolve();
            return;
        }
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getReleaseManifest(PluginCall call) {
        String source = call.getString("url");
        if (source == null || !source.startsWith("https://")) {
            call.reject("O manifesto de atualização precisa usar HTTPS.");
            return;
        }

        executor.execute(() -> {
            try {
                call.resolve(fetchReleaseManifest(source));
            } catch (Exception error) {
                call.reject("Não foi possível consultar a atualização: " + error.getMessage(), error);
            }
        });
    }

    @PluginMethod
    public void setAuthenticatedUiReady(PluginCall call) {
        markAuthenticatedSessionReady();
        call.resolve();
    }

    public void markAuthenticatedSessionReady() {
        authenticatedUiReady = true;
        // A WebView executa a primeira verificação imediatamente depois que o
        // alerta financeiro inicial termina. O código nativo fica como segunda
        // proteção para retomadas/foco, evitando dois diálogos simultâneos.
        Log.i(TAG, "Sessão autenticada. Verificação nativa liberada para retomadas.");
    }

    @PluginMethod
    public void suppressNativePrompt(PluginCall call) {
        Long versionCode = call.getLong("versionCode");
        if (versionCode == null) {
            Integer integerCode = call.getInt("versionCode");
            versionCode = integerCode == null ? -1L : integerCode.longValue();
        }
        suppressedNativePromptVersion = versionCode;
        call.resolve();
    }

    public void checkForAvailableUpdateNative() {
        if (!authenticatedUiReady || nativePromptVisible.get() || !nativeCheckRunning.compareAndSet(false, true)) return;
        executor.execute(() -> {
            try {
                JSObject release = fetchNewestReleaseManifest();
                PackageInfo installed = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
                long installedCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? installed.getLongVersionCode() : installed.versionCode;
                long releaseCode = release.getLong("versionCode");
                if (releaseCode <= installedCode || releaseCode <= suppressedNativePromptVersion) return;

                String releaseName = release.optString("versionName", String.valueOf(releaseCode));
                String releaseNotes = release.optString("releaseNotes", "Uma nova versão do MEG está pronta para instalar.");
                String downloadUrl = release.optString("downloadUrl", "");
                String sha256 = release.optString("sha256", "");
                if (!downloadUrl.startsWith("https://")) throw new IllegalStateException("Endereço do APK inválido.");

                Activity activity = getActivity();
                if (activity == null) throw new IllegalStateException("Tela do aplicativo indisponível.");
                activity.runOnUiThread(() -> showNativeUpdatePrompt(activity, installed.versionName, releaseName, releaseNotes, releaseCode, downloadUrl, sha256));
            } catch (Exception error) {
                Log.w(TAG, "Falha na verificação nativa de atualização", error);
            } finally {
                nativeCheckRunning.set(false);
            }
        });
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String source = call.getString("url");
        String expectedSha256 = call.getString("sha256", "");
        if (source == null || !source.startsWith("https://")) {
            call.reject("A atualização precisa usar um endereço HTTPS válido.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            call.reject("INSTALL_PERMISSION_REQUIRED");
            return;
        }

        downloadAndInstallInternal(source, expectedSha256, new DownloadCallback() {
            @Override
            public void onSuccess(String actualSha256) {
                JSObject result = new JSObject();
                result.put("sha256", actualSha256);
                call.resolve(result);
            }

            @Override
            public void onError(Exception error) {
                call.reject("Não foi possível baixar ou abrir a atualização: " + error.getMessage(), error);
            }
        });
    }

    private JSObject fetchNewestReleaseManifest() throws Exception {
        Exception lastError = null;
        JSObject newest = null;
        long newestCode = -1L;
        long nonce = System.currentTimeMillis();

        for (int index = 0; index < RELEASE_MANIFEST_URLS.length; index += 1) {
            String source = RELEASE_MANIFEST_URLS[index];
            try {
                JSObject release = fetchReleaseManifest(source + "?native=" + nonce + "-" + index);
                long code = release.optLong("versionCode", -1L);
                if (code > newestCode) {
                    newest = release;
                    newestCode = code;
                }
            } catch (Exception error) {
                lastError = error;
            }
        }

        if (newest != null && newestCode > 0) return newest;
        throw lastError != null ? lastError : new IllegalStateException("Manifesto de atualização indisponível.");
    }

    private JSObject fetchReleaseManifest(String source) throws Exception {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(source).openConnection();
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(20000);
            connection.setInstanceFollowRedirects(true);
            connection.setUseCaches(false);
            connection.setRequestProperty("Cache-Control", "no-cache, no-store, max-age=0");
            connection.setRequestProperty("Pragma", "no-cache");
            connection.setRequestProperty("Accept", "application/json");
            connection.connect();
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) throw new IllegalStateException("Manifesto respondeu HTTP " + status);
            StringBuilder payload = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) payload.append(line);
            }
            JSObject result = new JSObject(payload.toString());
            if (result.optLong("versionCode", -1L) <= 0) {
                throw new IllegalStateException("Manifesto sem versionCode válido.");
            }
            return result;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void showNativeUpdatePrompt(Activity activity, String installedName, String releaseName, String releaseNotes, long releaseCode, String downloadUrl, String sha256) {
        if (activity.isFinishing() || activity.isDestroyed() || !nativePromptVisible.compareAndSet(false, true)) return;
        new AlertDialog.Builder(activity)
            .setTitle("Atualização do MEG disponível")
            .setMessage("Versão instalada: " + installedName + "\nNova versão: " + releaseName + "\n\n" + releaseNotes)
            .setNegativeButton("Agora não", (dialog, which) -> {
                suppressedNativePromptVersion = releaseCode;
                nativePromptVisible.set(false);
            })
            .setPositiveButton("Atualizar agora", (dialog, which) -> {
                nativePromptVisible.set(false);
                installAvailableUpdateNatively(downloadUrl, sha256);
            })
            .setOnDismissListener(dialog -> nativePromptVisible.set(false))
            .show();
    }

    private void installAvailableUpdateNatively(String source, String expectedSha256) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            showToast("Autorize 'Permitir desta fonte' e volte ao MEG para continuar.");
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return;
        }
        showToast("Baixando e validando a atualização do MEG...");
        downloadAndInstallInternal(source, expectedSha256, new DownloadCallback() {
            @Override
            public void onSuccess(String actualSha256) {
                showToast("Atualização validada. Conclua a instalação na tela do Android.");
            }

            @Override
            public void onError(Exception error) {
                Log.e(TAG, "Falha ao instalar atualização", error);
                showToast("Não foi possível instalar a atualização: " + error.getMessage());
            }
        });
    }

    private void downloadAndInstallInternal(String source, String expectedSha256, DownloadCallback callback) {
        executor.execute(() -> {
            File directory = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            File apk = new File(directory, "MEG-Financas-atualizacao.apk");
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(source).openConnection();
                connection.setConnectTimeout(30000);
                connection.setReadTimeout(120000);
                connection.setInstanceFollowRedirects(true);
                connection.connect();
                if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) {
                    throw new IllegalStateException("Download respondeu HTTP " + connection.getResponseCode());
                }
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(apk)) {
                    byte[] buffer = new byte[16384];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        output.write(buffer, 0, count);
                        digest.update(buffer, 0, count);
                    }
                } finally {
                    connection.disconnect();
                }
                String actualSha256 = toHex(digest.digest());
                if (!expectedSha256.isEmpty() && !actualSha256.equalsIgnoreCase(expectedSha256)) {
                    apk.delete();
                    throw new SecurityException("A assinatura digital do arquivo baixado não confere.");
                }
                Uri apkUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent installer = new Intent(Intent.ACTION_VIEW);
                installer.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installer.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(installer);
                callback.onSuccess(actualSha256);
            } catch (Exception error) {
                callback.onError(error);
            }
        });
    }

    private void showToast(String message) {
        Activity activity = getActivity();
        if (activity == null) return;
        activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_LONG).show());
    }

    private String toHex(byte[] bytes) {
        StringBuilder value = new StringBuilder();
        for (byte item : bytes) value.append(String.format(Locale.ROOT, "%02x", item));
        return value.toString();
    }
}
