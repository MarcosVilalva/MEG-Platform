package br.com.megfinancas.app;

import android.Manifest;
import android.net.Uri;
import android.util.Log;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.plugin.CapacitorHttp;
import java.io.File;
import java.io.IOException;

/**
 * Disposable stage10Qa instrumentation only. Never compiled in stable Android.
 * Replace the core plugin under its original name and preserve normal methods.
 */
@CapacitorPlugin(
    name = "CapacitorHttp",
    permissions = {
        @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "HttpWrite"),
        @Permission(strings = { Manifest.permission.READ_EXTERNAL_STORAGE }, alias = "HttpRead")
    }
)
public final class Stage10QaHttpPlugin extends CapacitorHttp {
    private static final String TAG = "MEG_STAGE10_QA";
    private static final String OFFLINE_FLAG = "meg_issue699_webview_offline";

    private boolean blockIfOffline(PluginCall call, String method) {
        final String raw = call.getString("url");
        if (raw == null) return false;
        final Uri uri = Uri.parse(raw);
        final String path = uri.getPath();
        if (!"http".equals(uri.getScheme())
                || !"127.0.0.1".equals(uri.getHost())
                || uri.getPort() != 3333 || path == null
                || !("/app-state".equals(path) || path.startsWith("/app-state/"))) {
            return false;
        }
        Log.i(TAG, "ISSUE699_QA_NATIVE_HTTP_SEEN " + method + " " + path);
        if (!new File(getContext().getFilesDir(), OFFLINE_FLAG).isFile()) return false;
        Log.i(TAG, "ISSUE699_QA_NATIVE_HTTP_OFFLINE " + method + " " + path);
        IOException failure = new IOException("ISSUE699_QA_NETWORK_UNREACHABLE");
        call.reject("ISSUE699_QA_NETWORK_UNREACHABLE", "ISSUE699_QA_NATIVE_HTTP_OFFLINE", failure);
        return true;
    }

    @Override
    @PluginMethod
    public void request(PluginCall call) {
        if (!blockIfOffline(call, call.getString("method", "GET"))) super.request(call);
    }

    @Override
    @PluginMethod
    public void patch(PluginCall call) {
        if (!blockIfOffline(call, "PATCH")) super.patch(call);
    }

    @Override
    @PluginMethod
    public void post(PluginCall call) {
        if (!blockIfOffline(call, "POST")) super.post(call);
    }

    @Override
    @PluginMethod
    public void put(PluginCall call) {
        if (!blockIfOffline(call, "PUT")) super.put(call);
    }

    @Override
    @PluginMethod
    public void delete(PluginCall call) {
        if (!blockIfOffline(call, "DELETE")) super.delete(call);
    }
}
