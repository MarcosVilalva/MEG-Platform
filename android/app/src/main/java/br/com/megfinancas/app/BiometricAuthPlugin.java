package br.com.megfinancas.app;

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
    private static final int AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_WEAK;

    private volatile SharedPreferences cachedPreferences;

    private synchronized SharedPreferences prefs() throws Exception {
        if (cachedPreferences != null) return cachedPreferences;

        MasterKey masterKey = new MasterKey.Builder(getContext())
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build();

        cachedPreferences = EncryptedSharedPreferences.create(
            getContext(),
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        );
        return cachedPreferences;
    }

    private boolean hasStoredCredentials() {
        try {
            SharedPreferences sharedPreferences = prefs();
            String email = sharedPreferences.getString(KEY_EMAIL, "");
            String password = sharedPreferences.getString(KEY_PASSWORD, "");
            return email != null && !email.isEmpty() && password != null && !password.isEmpty();
        } catch (Exception ignored) {
            return false;
        }
    }

    private FragmentActivity fragmentActivity(PluginCall call) {
        if (!(getActivity() instanceof FragmentActivity)) {
            call.reject("BIOMETRIC_ACTIVITY_UNAVAILABLE");
            return null;
        }
        return (FragmentActivity) getActivity();
    }

    private String availabilityReason(int result) {
        switch (result) {
            case 1:
                return "BIOMETRIC_HW_UNAVAILABLE";
            case 7:
                return "BIOMETRIC_LOCKOUT";
            case 9:
                return "BIOMETRIC_LOCKOUT_PERMANENT";
            case 11:
                return "BIOMETRIC_NONE_ENROLLED";
            case 12:
                return "BIOMETRIC_NO_HARDWARE";
            case 15:
                return "BIOMETRIC_SECURITY_UPDATE_REQUIRED";
            case -2:
                return "BIOMETRIC_UNSUPPORTED";
            default:
                return String.valueOf(result);
        }
    }

    private BiometricPrompt.PromptInfo promptInfo(String title, String subtitle, String negativeButton) {
        return new BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(AUTHENTICATORS)
            .setNegativeButtonText(negativeButton)
            .build();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        int result = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        boolean available = result == BiometricManager.BIOMETRIC_SUCCESS;

        JSObject response = new JSObject();
        response.put("available", available);
        response.put("enabled", available && hasStoredCredentials());
        response.put("authenticator", "BIOMETRIC_WEAK");

        if (available && hasStoredCredentials()) {
            try {
                response.put("email", prefs().getString(KEY_EMAIL, ""));
            } catch (Exception ignored) {
                response.put("enabled", false);
                response.put("reason", "SECURE_STORAGE_UNAVAILABLE");
            }
        } else if (!available) {
            response.put("reason", availabilityReason(result));
            response.put("reasonCode", result);
        }
        call.resolve(response);
    }

    @PluginMethod
    public void saveCredentials(PluginCall call) {
        String email = call.getString("email", "").trim();
        String password = call.getString("password", "");
        if (email.isEmpty() || password.isEmpty()) {
            call.reject("CREDENTIALS_INCOMPLETE");
            return;
        }

        int result = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        if (result != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject(availabilityReason(result));
            return;
        }

        FragmentActivity activity = fragmentActivity(call);
        if (activity == null) return;

        Executor executor = ContextCompat.getMainExecutor(getContext());
        BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                try {
                    prefs().edit()
                        .putString(KEY_EMAIL, email)
                        .putString(KEY_PASSWORD, password)
                        .commit();
                    JSObject response = new JSObject();
                    response.put("saved", true);
                    call.resolve(response);
                } catch (Exception cause) {
                    call.reject("SECURE_STORAGE_UNAVAILABLE", cause);
                }
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                call.reject("BIOMETRIC_ERROR_" + errorCode + ": " + errString);
            }

            @Override
            public void onAuthenticationFailed() {
                // O Android mantém a janela aberta para permitir nova tentativa.
            }
        });

        BiometricPrompt.PromptInfo promptInfo = promptInfo(
            "Ativar biometria no MEG Finanças",
            "Confirme sua identidade para liberar o acesso rápido",
            "Cancelar"
        );
        activity.runOnUiThread(() -> biometricPrompt.authenticate(promptInfo));
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            prefs().edit().clear().commit();
            call.resolve();
        } catch (Exception cause) {
            call.reject("SECURE_STORAGE_UNAVAILABLE", cause);
        }
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        final String email;
        final String password;
        try {
            SharedPreferences sharedPreferences = prefs();
            email = sharedPreferences.getString(KEY_EMAIL, "");
            password = sharedPreferences.getString(KEY_PASSWORD, "");
        } catch (Exception cause) {
            call.reject("SECURE_STORAGE_UNAVAILABLE", cause);
            return;
        }

        if (email == null || email.isEmpty() || password == null || password.isEmpty()) {
            call.reject("BIOMETRIC_NOT_CONFIGURED");
            return;
        }

        int availability = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        if (availability != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject(availabilityReason(availability));
            return;
        }

        FragmentActivity activity = fragmentActivity(call);
        if (activity == null) return;

        Executor executor = ContextCompat.getMainExecutor(getContext());
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
                call.reject("BIOMETRIC_ERROR_" + errorCode + ": " + errString);
            }

            @Override
            public void onAuthenticationFailed() {
                // O Android mantém a janela aberta para permitir nova tentativa.
            }
        });

        String title = call.getString("title", "Entrar no MEG Finanças");
        String subtitle = call.getString("subtitle", "Confirme sua identidade");
        BiometricPrompt.PromptInfo promptInfo = promptInfo(
            title,
            subtitle,
            "Usar e-mail e senha"
        );
        activity.runOnUiThread(() -> biometricPrompt.authenticate(promptInfo));
    }
}
