package br.com.megfinancas.app;

import android.app.Activity;
import android.app.Application;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;

/**
 * Instrumentacao exclusiva da variante stage10Qa. NUNCA carregada no APK estavel.
 * Preserva todas as rotas normais do BridgeWebViewClient do Capacitor.
 */
public final class Stage10QaApplication extends Application implements Application.ActivityLifecycleCallbacks {
    private static final String QA_PACKAGE = "br.com.megfinancas.app.stage10qa";
    private static final String OFFLINE_FLAG = "meg_issue699_webview_offline";
    private static final String TAG = "MEG_STAGE10_QA";
    private Bridge qaHttpRegisteredBridge;

    @Override
    public void onCreate() {
        super.onCreate();
        if (!QA_PACKAGE.equals(getPackageName())) {
            throw new IllegalStateException("ISSUE699_QA_INSTRUMENTATION_REQUIRES_QA_PACKAGE");
        }
        registerActivityLifecycleCallbacks(this);
    }

    @Override
    public void onActivityResumed(Activity activity) {
        if (!(activity instanceof MainActivity)) return;
        final Bridge bridge = ((MainActivity) activity).getBridge();
        if (bridge == null || bridge.getWebView() == null) return;
        // Core plugin is registered during Bridge creation. Replace only in
        // disposable stage10Qa after Bridge exists, retaining normal transport.
        if (qaHttpRegisteredBridge != bridge) {
            bridge.registerPlugin(Stage10QaHttpPlugin.class);
            qaHttpRegisteredBridge = bridge;
            Log.i(TAG, "ISSUE699_QA_NATIVE_HTTP_PLUGIN_ATTACHED");
        }
        bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                // QA-only diagnostic. Exact URL only for isolated local hosts.
                // Never log remote query parameters or authorization headers.
                boolean diagnosticLocal = "localhost".equals(uri.getHost())
                    || "127.0.0.1".equals(uri.getHost());
                Log.i(TAG, "ISSUE699_CLIENT_ATTACHED " + request.getMethod()
                    + " " + (diagnosticLocal ? uri.toString()
                        : uri.getScheme() + "://" + uri.getHost()));
                // CapacitorHttp 7 wraps native fetch as:
                // https://localhost/_capacitor_http_interceptor_?u=<original URL>
                // Match ONLY the decoded API URL, never generic localhost assets.
                Uri original = uri;
                if ("https".equals(uri.getScheme())
                    && "localhost".equals(uri.getHost())
                    && "/_capacitor_http_interceptor_".equals(uri.getPath())) {
                    String target = uri.getQueryParameter("u");
                    if (target != null) original = Uri.parse(target);
                }
                boolean protectedQaRequest = "http".equals(original.getScheme())
                    && "127.0.0.1".equals(original.getHost())
                    && original.getPort() == 3333
                    && original.getPath() != null
                    && ("/app-state".equals(original.getPath())
                        || original.getPath().startsWith("/app-state/"));
                if (protectedQaRequest && new File(getFilesDir(), OFFLINE_FLAG).isFile()) {
                    Log.i(TAG, "ISSUE699_QA_WEBVIEW_OFFLINE_INTERCEPTED " + request.getMethod()
                        + " " + original.getScheme() + "://" + original.getHost()
                        + ":" + original.getPort() + original.getPath());
                    // O fluxo de leitura falha com IOException, nao gera 409/5xx falso.
                    // O teste deve verificar que fetch/body rejeitou e nenhum commit ocorreu.
                    return new WebResourceResponse("application/octet-stream", "UTF-8",
                        new InputStream() {
                            @Override
                            public int read() throws IOException {
                                throw new IOException("ISSUE699_QA_NETWORK_UNREACHABLE");
                            }
                            @Override
                            public int read(byte[] data, int offset, int length) throws IOException {
                                throw new IOException("ISSUE699_QA_NETWORK_UNREACHABLE");
                            }
                        });
                }
                return super.shouldInterceptRequest(view, request);
            }
        });
        Log.i(TAG, "ISSUE699_QA_WEBVIEW_CLIENT_INSTALLED");
    }

    @Override public void onActivityCreated(Activity activity, Bundle state) {}
    @Override public void onActivityStarted(Activity activity) {}
    @Override public void onActivityPaused(Activity activity) {}
    @Override public void onActivityStopped(Activity activity) {}
    @Override public void onActivitySaveInstanceState(Activity activity, Bundle state) {}
    @Override public void onActivityDestroyed(Activity activity) {}
}
