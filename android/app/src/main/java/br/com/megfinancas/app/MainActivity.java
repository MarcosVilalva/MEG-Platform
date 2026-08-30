package br.com.megfinancas.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {
    private static final long UPDATE_FOCUS_DELAY_MS = 1500;
    private final Handler updateHandler = new Handler(Looper.getMainLooper());
    private final Runnable updateCheck = () -> {
        if (!hasWindowFocus() || getBridge() == null) return;
        PluginHandle handle = getBridge().getPlugin("AppUpdater");
        if (handle != null && handle.getInstance() instanceof AppUpdaterPlugin) {
            AppUpdaterPlugin updater = (AppUpdaterPlugin) handle.getInstance();
            if (updater.resumePendingInstallIfAuthorized()) return;
            updater.checkForAvailableUpdateNative();
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(BiometricAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        updateHandler.removeCallbacks(updateCheck);
        if (hasFocus) updateHandler.postDelayed(updateCheck, UPDATE_FOCUS_DELAY_MS);
    }

    public void onBiometricAuthenticationSucceeded() {
        // A biometria libera apenas a autenticação. O atualizador será liberado
        // pela WebView depois que a base, o Dashboard e os alertas iniciais
        // estiverem concluídos, evitando diálogos concorrentes no início.
        updateHandler.removeCallbacks(updateCheck);
    }

    @Override
    public void onPause() {
        updateHandler.removeCallbacks(updateCheck);
        super.onPause();
    }
}
