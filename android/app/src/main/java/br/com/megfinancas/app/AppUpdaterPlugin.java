package br.com.megfinancas.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
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
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final String TAG = "MEG-AppUpdater";
    private static final String UPDATE_PREFERENCES = "meg-secure-app-update";
    private static final String PENDING_SOURCE_KEY = "pending-source";
    private static final String PENDING_SHA256_KEY = "pending-sha256";
    private static final int MAX_DOWNLOAD_REDIRECTS = 6;
    private static final String[] RELEASE_MANIFEST_URLS = {
        "https://marcosvilalva.github.io/MEG-Platform/downloads/app-version.json",
        "https://raw.githubusercontent.com/MarcosVilalva/MEG-Platform/main/apps/web/public/downloads/app-version.json"
    };
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean nativeCheckRunning = new AtomicBoolean(false);
    private final AtomicBoolean nativePromptVisible = new AtomicBoolean(false);
    private final AtomicBoolean installRunning = new AtomicBoolean(false);
    private volatile boolean authenticatedUiReady = false;
    private volatile long suppressedNativePromptVersion = -1;
    private volatile String pendingInstallSource = null;
    private volatile String pendingInstallSha256 = "";

    private interface DownloadCallback {
        void onSuccess(String actualSha256);
        void onError(Exception error);
    }

    private void notifyUpdateState(String state, int percent, String message) {
        JSObject payload = new JSObject();
        payload.put("state", state);
        if (percent >= 0) payload.put("percent", percent);
        if (message != null && !message.isEmpty()) payload.put("message", message);
        notifyListeners("appUpdateState", payload, false);
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

    private void rememberPendingInstall(String source, String expectedSha256) {
        pendingInstallSource = source;
        pendingInstallSha256 = expectedSha256 == null ? "" : expectedSha256;
        getContext().getSharedPreferences(UPDATE_PREFERENCES, android.content.Context.MODE_PRIVATE)
            .edit()
            .putString(PENDING_SOURCE_KEY, pendingInstallSource)
            .putString(PENDING_SHA256_KEY, pendingInstallSha256)
            .apply();
        Log.i(TAG, "Atualização guardada para retomar após permissão de instalação.");
    }

    private String pendingInstallSource() {
        if (pendingInstallSource != null && !pendingInstallSource.isEmpty()) return pendingInstallSource;
        SharedPreferences preferences = getContext().getSharedPreferences(UPDATE_PREFERENCES, android.content.Context.MODE_PRIVATE);
        pendingInstallSource = preferences.getString(PENDING_SOURCE_KEY, null);
        pendingInstallSha256 = preferences.getString(PENDING_SHA256_KEY, "");
        return pendingInstallSource;
    }

    private void clearPendingInstall() {
        pendingInstallSource = null;
        pendingInstallSha256 = "";
        getContext().getSharedPreferences(UPDATE_PREFERENCES, android.content.Context.MODE_PRIVATE)
            .edit()
            .remove(PENDING_SOURCE_KEY)
            .remove(PENDING_SHA256_KEY)
            .apply();
    }

    public boolean resumePendingInstallIfAuthorized() {
        String source = pendingInstallSource();
        if (source == null || source.isEmpty()) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) return false;

        String sha256 = pendingInstallSha256;
        Log.i(TAG, "Permissão concedida. Retomando atualização pendente automaticamente.");
        installAvailableUpdateNatively(source, sha256);
        return true;
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
        rememberPendingInstall(source, expectedSha256);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            call.reject("INSTALL_PERMISSION_REQUIRED");
            return;
        }

        downloadAndInstallInternal(source, expectedSha256, new DownloadCallback() {
            @Override
            public void onSuccess(String actualSha256) {
                if (actualSha256 != null && !actualSha256.isEmpty()) clearPendingInstall();
                JSObject result = new JSObject();
                result.put("sha256", actualSha256);
                result.put("installerLaunched", true);
                call.resolve(result);
            }

            @Override
            public void onError(Exception error) {
                call.reject("Não foi possível baixar ou abrir a atualização: " + error.getMessage(), error);
            }
        });
    }

    @PluginMethod
    public void startDownloadAndInstall(PluginCall call) {
        String source = call.getString("url");
        String expectedSha256 = call.getString("sha256", "");
        if (source == null || !source.startsWith("https://")) {
            call.reject("A atualização precisa usar um endereço HTTPS válido.");
            return;
        }

        rememberPendingInstall(source, expectedSha256);
        boolean permissionRequired = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls();
        JSObject accepted = new JSObject();
        accepted.put("accepted", true);
        accepted.put("permissionRequired", permissionRequired);
        call.resolve(accepted);

        installAvailableUpdateNatively(source, expectedSha256);
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

    private JSObject fetchFirstAvailableReleaseManifest() throws Exception {
        return fetchNewestReleaseManifest();
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
        rememberPendingInstall(source, expectedSha256);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            notifyUpdateState("waiting-permission", -1, null);
            showToast("Autorize 'Permitir desta fonte'. Ao voltar, o MEG continuará a atualização automaticamente.");
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return;
        }
        showToast("Baixando e validando a atualização do MEG...");
        downloadAndInstallInternal(source, expectedSha256, new DownloadCallback() {
            @Override
            public void onSuccess(String actualSha256) {
                if (actualSha256 != null && !actualSha256.isEmpty()) clearPendingInstall();
                notifyUpdateState("installer-launched", 100, null);
                showToast("Atualização validada. Conclua a instalação na tela do Android.");
            }

            @Override
            public void onError(Exception error) {
                Log.e(TAG, "Falha ao instalar atualização", error);
                notifyUpdateState("failed", -1, error.getMessage());
                showToast("Não foi possível instalar a atualização: " + error.getMessage());
            }
        });
    }

    private HttpURLConnection openDownloadConnection(String source) throws Exception {
        URL current = new URL(source);
        for (int redirect = 0; redirect <= MAX_DOWNLOAD_REDIRECTS; redirect += 1) {
            HttpURLConnection connection = (HttpURLConnection) current.openConnection();
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(120000);
            connection.setInstanceFollowRedirects(false);
            connection.setUseCaches(false);
            connection.setRequestProperty("Cache-Control", "no-cache, no-store, max-age=0");
            connection.setRequestProperty("Pragma", "no-cache");
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive, application/octet-stream, */*");
            connection.setRequestProperty("User-Agent", "MEG-Financas-Android-Updater");
            connection.connect();
            int status = connection.getResponseCode();
            if (status >= 200 && status < 300) return connection;
            if (status >= 300 && status < 400) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();
                if (location == null || location.isEmpty()) throw new IllegalStateException("Redirecionamento do APK sem destino.");
                current = new URL(current, location);
                if (!"https".equalsIgnoreCase(current.getProtocol())) throw new SecurityException("Redirecionamento inseguro bloqueado.");
                continue;
            }
            String message = "Download respondeu HTTP " + status;
            connection.disconnect();
            throw new IllegalStateException(message);
        }
        throw new IllegalStateException("O download excedeu o limite de redirecionamentos.");
    }

    private void launchPackageInstaller(File apk) throws Exception {
        if (!apk.isFile() || apk.length() < 4) throw new IllegalStateException("APK baixado está vazio.");
        try (FileInputStream input = new FileInputStream(apk)) {
            int first = input.read();
            int second = input.read();
            if (first != 'P' || second != 'K') throw new IllegalStateException("Arquivo baixado não possui formato APK válido.");
        }
        verifyPackageSignature(apk);

        Uri apkUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
        Intent installer = new Intent(Intent.ACTION_INSTALL_PACKAGE);
        installer.setData(apkUri);
        installer.setClipData(ClipData.newRawUri("MEG Finanças atualização", apkUri));
        installer.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        installer.putExtra(Intent.EXTRA_RETURN_RESULT, false);

        PackageManager packageManager = getContext().getPackageManager();
        List<ResolveInfo> handlers = packageManager.queryIntentActivities(installer, PackageManager.MATCH_DEFAULT_ONLY);
        if (handlers.isEmpty()) {
            installer = new Intent(Intent.ACTION_VIEW);
            installer.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installer.setClipData(ClipData.newRawUri("MEG Finanças atualização", apkUri));
            installer.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            handlers = packageManager.queryIntentActivities(installer, PackageManager.MATCH_DEFAULT_ONLY);
        }
        for (ResolveInfo handler : handlers) {
            getContext().grantUriPermission(handler.activityInfo.packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }
        try {
            getContext().startActivity(installer);
        } catch (Exception primaryError) {
            Intent fallback = new Intent(Intent.ACTION_VIEW);
            fallback.setDataAndType(apkUri, "application/vnd.android.package-archive");
            fallback.setClipData(ClipData.newRawUri("MEG Finanças atualização", apkUri));
            fallback.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(fallback);
            } catch (Exception fallbackError) {
                throw new IllegalStateException("O Android não conseguiu abrir o instalador de pacotes.", fallbackError);
            }
        }
    }

    @SuppressWarnings("deprecation")
    private Signature[] packageSignatures(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && info.signingInfo != null) {
            return info.signingInfo.hasMultipleSigners()
                ? info.signingInfo.getApkContentsSigners()
                : info.signingInfo.getSigningCertificateHistory();
        }
        return info.signatures;
    }

    private void verifyPackageSignature(File apk) throws Exception {
        PackageManager manager = getContext().getPackageManager();
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? PackageManager.GET_SIGNING_CERTIFICATES
            : PackageManager.GET_SIGNATURES;
        PackageInfo candidate = manager.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
        PackageInfo installed = manager.getPackageInfo(getContext().getPackageName(), flags);
        if (candidate == null || !getContext().getPackageName().equals(candidate.packageName)) {
            throw new SecurityException("O arquivo baixado não pertence ao aplicativo MEG.");
        }
        Signature[] candidateSignatures = packageSignatures(candidate);
        Signature[] installedSignatures = packageSignatures(installed);
        if (candidateSignatures == null || installedSignatures == null || candidateSignatures.length == 0 || installedSignatures.length == 0) {
            throw new SecurityException("Não foi possível validar o certificado do aplicativo.");
        }
        boolean trusted = Arrays.stream(candidateSignatures).anyMatch(candidateSignature ->
            Arrays.stream(installedSignatures).anyMatch(installedSignature -> installedSignature.equals(candidateSignature))
        );
        if (!trusted) throw new SecurityException("O certificado da atualização não corresponde ao MEG instalado.");
    }

    private void downloadAndInstallInternal(String source, String expectedSha256, DownloadCallback callback) {
        if (!installRunning.compareAndSet(false, true)) {
            showToast("A atualização já está sendo baixada. Aguarde a abertura do instalador.");
            callback.onSuccess("");
            return;
        }
        executor.execute(() -> {
            File directory = new File(getContext().getCacheDir(), "updates");
            File partial = new File(directory, "MEG-Financas-atualizacao.apk.part");
            File apk = new File(directory, "MEG-Financas-atualizacao.apk");
            try {
                notifyUpdateState("downloading", 0, null);
                if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Não foi possível preparar a pasta temporária da atualização.");
                partial.delete();
                apk.delete();

                HttpURLConnection connection = openDownloadConnection(source);
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                long expectedBytes = connection.getContentLength();
                long downloadedBytes = 0L;
                int lastPercent = -1;
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[16384];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        output.write(buffer, 0, count);
                        digest.update(buffer, 0, count);
                        downloadedBytes += count;
                        if (expectedBytes > 0) {
                            int percent = (int) Math.min(99L, (downloadedBytes * 100L) / expectedBytes);
                            if (percent >= lastPercent + 5) {
                                lastPercent = percent;
                                notifyUpdateState("downloading", percent, null);
                            }
                        }
                    }
                    output.flush();
                    output.getFD().sync();
                } finally {
                    connection.disconnect();
                }

                notifyUpdateState("validating", 100, null);
                String actualSha256 = toHex(digest.digest());
                if (!expectedSha256.isEmpty() && !actualSha256.equalsIgnoreCase(expectedSha256)) {
                    partial.delete();
                    throw new SecurityException("A assinatura digital do arquivo baixado não confere.");
                }
                if (!partial.renameTo(apk)) {
                    throw new IllegalStateException("Não foi possível concluir o arquivo temporário da atualização.");
                }
                launchPackageInstaller(apk);
                callback.onSuccess(actualSha256);
            } catch (Exception error) {
                partial.delete();
                callback.onError(error);
            } finally {
                installRunning.set(false);
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
