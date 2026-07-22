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
        return BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
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
        if (hasStoredCredentials()) {
            response.put("email", prefs().getString(KEY_EMAIL, ""));
        }
        if (result != BiometricManager.BIOMETRIC_SUCCESS) {
            response.put("reason", String.valueOf(result));
        }
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
        int result = BiometricManager.from(getContext()).canAuthenticate(authenticators());
        if (result != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject("Biometria ou bloqueio de tela indisponivel.");
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(getContext());
        FragmentActivity activity = (FragmentActivity) getActivity();
        BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                prefs().edit()
                    .putString(KEY_EMAIL, email)
                    .putString(KEY_PASSWORD, password)
                    .apply();
                JSObject response = new JSObject();
                response.put("saved", true);
                call.resolve(response);
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                call.reject(errString.toString());
            }

            @Override
            public void onAuthenticationFailed() {
                // Keep the prompt open so Android can allow another attempt.
            }
        });

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle("Ativar biometria no MEG Financas")
            .setSubtitle("Confirme sua identidade para liberar o acesso rapido")
            .setAllowedAuthenticators(authenticators())
            .build();

        getActivity().runOnUiThread(() -> biometricPrompt.authenticate(promptInfo));
    }

    @PluginMethod
    public void clear(PluginCall call) {
        prefs().edit().clear().apply();
        call.resolve();
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        SharedPreferences sharedPreferences = prefs();
        String email = sharedPreferences.getString(KEY_EMAIL, "");
        String password = sharedPreferences.getString(KEY_PASSWORD, "");
        if (email.isEmpty() || password.isEmpty()) {
            call.reject("Biometria ainda nao configurada.");
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(getContext());
        FragmentActivity activity = (FragmentActivity) getActivity();
        BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                JSObject response = new JSObject();
                response.put("email", email);
                response.put("password", password);
                call.resolve(response);
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                call.reject(errString.toString());
            }

            @Override
            public void onAuthenticationFailed() {
                // Keep the prompt open so Android can allow another attempt.
            }
        });

        String title = call.getString("title", "Entrar no MEG Financas");
        String subtitle = call.getString("subtitle", "Confirme sua identidade");
        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(authenticators())
            .build();

        getActivity().runOnUiThread(() -> biometricPrompt.authenticate(promptInfo));
    }
}
