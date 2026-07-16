package br.com.megfinancas.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

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
                JSObject result = new JSObject();
                result.put("sha256", actualSha256);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Não foi possível baixar ou abrir a atualização: " + error.getMessage(), error);
            }
        });
    }

    private String toHex(byte[] bytes) {
        StringBuilder value = new StringBuilder();
        for (byte item : bytes) value.append(String.format(Locale.ROOT, "%02x", item));
        return value.toString();
    }
}
