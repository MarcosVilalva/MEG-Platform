package br.com.megfinancas.app;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {
    private static final String PREFS_NAME = "meg_biometric_login";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_PASSWORD = "password";

    private SharedPreferences prefs() {
        try {
            MasterKey masterKey = new MasterKey.Builder(getContext())
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();
            return EncryptedSharedPreferences.create(
                getContext(),
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception ignored) {
            return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        }
    }

    private int authenticators() {
        return BiometricManager.Authenticators.BIOMETRIC_STRONG
            | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    }

    private boolean hasStoredCredentials() {
        SharedPreferences sharedPreferences = prefs();
        return sharedPreferences.contains(KEY_EMAIL) && sharedPreferences.contains(KEY_PASSWORD);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        int result = BiometricManager.from(getContext()).canAuthenticate(authenticators());
        JSObject response = new JSObject();
        response.put("available", result == BiometricManager.BIOMETRIC_SUCCESS);
        response.put("enabled", hasStoredCredentials());
        if (result != BiometricManager.BIOMETRIC_SUCCESS) response.put("reason", String.valueOf(result));
        call.resolve(response);
    }

    @PluginMethod
    public void saveCredentials(PluginCall call) {
        String email = call.getString("email", "").trim();
        String password = call.getString("password", "");
        if (email.isEmpty() || password.isEmpty()) {
            call.reject("Credenciais incompletas.");
            return;
        }
        if (BiometricManager.from(getContext()).canAuthenticate(authenticators()) != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject("Biometria ou bloqueio de tela indisponível.");
            return;
        }
        authenticateAndRun(call, "Ativar biometria no MEG Finanças", "Confirme sua identidade para liberar o acesso rápido", () -> {
            prefs().edit().putString(KEY_EMAIL, email).putString(KEY_PASSWORD, password).apply();
            JSObject response = new JSObject();
            response.put("saved", true);
            call.resolve(response);
        });
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        SharedPreferences sharedPreferences = prefs();
        String email = sharedPreferences.getString(KEY_EMAIL, "");
        String password = sharedPreferences.getString(KEY_PASSWORD, "");
        if (email.isEmpty() || password.isEmpty()) {
            call.reject("Biometria ainda não configurada.");
            return;
        }
        authenticateAndRun(
            call,
            call.getString("title", "Entrar no MEG Finanças"),
            call.getString("subtitle", "Confirme sua identidade"),
            () -> {
                JSObject response = new JSObject();
                response.put("email", email);
                response.put("password", password);
                call.resolve(response);
            }
        );
    }

    private void authenticateAndRun(PluginCall call, String title, String subtitle, Runnable success) {
        FragmentActivity activity = (FragmentActivity) getActivity();
        Executor executor = ContextCompat.getMainExecutor(getContext());
        BiometricPrompt prompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                success.run();
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                call.reject(errString.toString());
            }

            @Override
            public void onAuthenticationFailed() {
                // Android keeps the prompt open for another attempt.
            }
        });
        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(authenticators())
            .build();
        activity.runOnUiThread(() -> prompt.authenticate(promptInfo));
    }

    @PluginMethod
    public void clear(PluginCall call) {
        prefs().edit().clear().apply();
        call.resolve();
    }
}
