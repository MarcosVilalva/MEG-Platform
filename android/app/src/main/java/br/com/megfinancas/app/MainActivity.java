package br.com.megfinancas.app;

import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.MotionEvent;
import android.webkit.WebView;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {
    private static final long UPDATE_FOCUS_DELAY_MS = 1500;
    private static final long WEBVIEW_REPAINT_DELAY_MS = 90;
    private final Handler updateHandler = new Handler(Looper.getMainLooper());
    private final Handler renderHandler = new Handler(Looper.getMainLooper());
    private WebView appWebView;
    private final Runnable repaintWebView = () -> {
        if (appWebView == null) return;
        appWebView.postInvalidateOnAnimation();
        appWebView.postDelayed(appWebView::postInvalidateOnAnimation, 48);
    };
    private final Runnable updateCheck = () -> {
        if (!hasWindowFocus()) {
            scheduleUpdateCheck();
            return;
        }
        if (getBridge() == null) {
            scheduleUpdateCheck();
            return;
        }
        PluginHandle handle = getBridge().getPlugin("AppUpdater");
        if (handle == null || !(handle.getInstance() instanceof AppUpdaterPlugin)) {
            scheduleUpdateCheck();
            return;
        }
        AppUpdaterPlugin updater = (AppUpdaterPlugin) handle.getInstance();
        if (updater.resumePendingInstallIfAuthorized()) return;
        updater.checkForAvailableUpdateNative();
    };

    private void scheduleUpdateCheck() {
        updateHandler.removeCallbacks(updateCheck);
        updateHandler.postDelayed(updateCheck, UPDATE_FOCUS_DELAY_MS);
    }

    private void applyImmersiveNavigation() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
            return;
        }

        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(BiometricAuthPlugin.class);
        registerPlugin(MegNativeShellPlugin.class);
        super.onCreate(savedInstanceState);

        // Mantemos uma única camada acelerada durante toda a vida do WebView.
        // Alternar software/hardware invalidava tiles do Chromium e gerava os
        // fragmentos brancos/coloridos vistos ao voltar para a Home. A correção
        // agora é repaint pós-gesto, sem trocar o compositor e sem sacrificar scroll.
        if (getBridge() != null && getBridge().getWebView() != null) {
            appWebView = getBridge().getWebView();
            appWebView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            appWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            appWebView.setOnTouchListener((view, event) -> {
                int action = event.getActionMasked();
                if (action == MotionEvent.ACTION_DOWN || action == MotionEvent.ACTION_MOVE) {
                    renderHandler.removeCallbacks(repaintWebView);
                } else if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
                    renderHandler.removeCallbacks(repaintWebView);
                    renderHandler.postDelayed(repaintWebView, WEBVIEW_REPAINT_DELAY_MS);
                }
                return false;
            });
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                appWebView.setOnScrollChangeListener((view, scrollX, scrollY, oldScrollX, oldScrollY) -> {
                    renderHandler.removeCallbacks(repaintWebView);
                    renderHandler.postDelayed(repaintWebView, WEBVIEW_REPAINT_DELAY_MS);
                });
            }
        }

        getWindow().getDecorView().post(this::applyImmersiveNavigation);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        updateHandler.removeCallbacks(updateCheck);
        if (hasFocus) {
            applyImmersiveNavigation();
            scheduleUpdateCheck();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        applyImmersiveNavigation();
        scheduleUpdateCheck();
    }

    public void onBiometricAuthenticationSucceeded() {
        // Após a biometria, refazemos a verificação nativa. O atualizador não
        // depende mais da WebView para descobrir uma versão nova.
        scheduleUpdateCheck();
    }

    @Override
    public void onPause() {
        updateHandler.removeCallbacks(updateCheck);
        renderHandler.removeCallbacks(repaintWebView);
        super.onPause();
    }
}
