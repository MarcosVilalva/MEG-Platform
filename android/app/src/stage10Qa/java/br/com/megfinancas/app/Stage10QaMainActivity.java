package br.com.megfinancas.app;

import android.os.Bundle;

/**
 * Launched only by the isolated #699 Android QA test. Register the native
 * guard before BridgeActivity creates the Capacitor bridge. Never stable.
 */
public final class Stage10QaMainActivity extends MainActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(Stage10QaHttpPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
