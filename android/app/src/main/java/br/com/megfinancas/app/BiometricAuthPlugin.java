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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {
    private static final String LEGACY_PREFS_NAME = "meg_biometric_login";
    private static final String SECURE_PREFS_NAME = "meg_biometric_login_secure_v3";
    private static final String META_PREFS_NAME = "meg_biometric_meta_v1";
    private static final String KEY_EMAIL = "email";
    private static final String KEY_PASSWORD = "password";
    private static final String KEY_CONFIGURED = "configured";
    private static final int AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_WEAK;

    private final ExecutorService storageExecutor = Executors.newSingleThreadExecutor();
    private volatile SharedPreferences cachedPreferences;

    private synchronized SharedPreferences prefs() throws Exception {
        if (cachedPreferences != null) return cachedPreferences;

        MasterKey masterKey = new MasterKey.Builder(getContext())
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build();

        SharedPreferences securePreferences = EncryptedSharedPreferences.create(
            getContext(),
            SECURE_PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        );

        migrateLegacyCredentials(securePreferences);
        cachedPreferences = securePreferences;
        return cachedPreferences;
    }

    private SharedPreferences metaPrefs() {
        return getContext().getSharedPreferences(META_PREFS_NAME, Context.MODE_PRIVATE);
    }

    private boolean isConfigured() {
        return metaPrefs().getBoolean(KEY_CONFIGURED, false);
    }

    private void setConfigured(boolean configured) {
        metaPrefs().edit().putBoolean(KEY_CONFIGURED, configured).apply();
    }

    private void migrateLegacyCredentials(SharedPreferences securePreferences) {
        if (securePreferences.contains(KEY_EMAIL) && securePreferences.contains(KEY_PASSWORD)) {
            setConfigured(true);
            return;
        }

        String[] legacyNames = { "meg_biometric_login_secure_v2", LEGACY_PREFS_NAME };
        for (String legacyName : legacyNames) {
            try {
                SharedPreferences legacy = getContext().getSharedPreferences(legacyName, Context.MODE_PRIVATE);
                String email = legacy.getString(KEY_EMAIL, "");
                String password = legacy.getString(KEY_PASSWORD, "");
                if (email == null || email.trim().isEmpty() || password == null || password.isEmpty()) continue;

                boolean migrated = securePreferences.edit()
                    .putString(KEY_EMAIL, email.trim())
                    .putString(KEY_PASSWORD, password)
                    .commit();
                if (migrated) {
                    setConfigured(true);
                    legacy.edit().clear().apply();
                    return;
                }
            } catch (Exception ignored) {
                // Uma base antiga inválida não pode impedir uma nova ativação.
            }
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

    private void resolveOnUiThread(FragmentActivity activity, PluginCall call, JSObject response) {
        activity.runOnUiThread(() -> call.resolve(response));
    }

    private void rejectOnUiThread(FragmentActivity activity, PluginCall call, String code, Exception cause) {
        activity.runOnUiThread(() -> call.reject(code, cause));
    }

    @PluginMethod
    public void ping(PluginCall call) {
        JSObject response = new JSObject();
        response.put("native", true);
        response.put("platform", "android");
        response.put("pluginVersion", 3);
        call.resolve(response);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        int result = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        boolean available = result == BiometricManager.BIOMETRIC_SUCCESS;

        JSObject response = new JSObject();
        response.put("available", available);
        response.put("enabled", available && isConfigured());
        response.put("authenticator", "BIOMETRIC_WEAK");
        response.put("storageVersion", 3);
        response.put("native", true);
        response.put("platform", "android");

        if (!available) {
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
                storageExecutor.execute(() -> {
                    try {
                        boolean saved = prefs().edit()
                            .putString(KEY_EMAIL, email)
                            .putString(KEY_PASSWORD, password)
                            .commit();
                        if (!saved) {
                            activity.runOnUiThread(() -> call.reject("SECURE_STORAGE_WRITE_FAILED"));
                            return;
                        }
                        setConfigured(true);
                        JSObject response = new JSObject();
                        response.put("saved", true);
                        response.put("storageVersion", 3);
                        resolveOnUiThread(activity, call, response);
                    } catch (Exception cause) {
                        setConfigured(false);
                        rejectOnUiThread(activity, call, "SECURE_STORAGE_UNAVAILABLE", cause);
                    }
                });
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
        FragmentActivity activity = fragmentActivity(call);
        if (activity == null) return;

        storageExecutor.execute(() -> {
            try {
                prefs().edit().clear().commit();
                getContext().getSharedPreferences(LEGACY_PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply();
                getContext().getSharedPreferences("meg_biometric_login_secure_v2", Context.MODE_PRIVATE).edit().clear().apply();
                setConfigured(false);
                resolveOnUiThread(activity, call, new JSObject());
            } catch (Exception cause) {
                rejectOnUiThread(activity, call, "SECURE_STORAGE_UNAVAILABLE", cause);
            }
        });
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        if (!isConfigured()) {
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
                storageExecutor.execute(() -> {
                    try {
                        SharedPreferences sharedPreferences = prefs();
                        String email = sharedPreferences.getString(KEY_EMAIL, "");
                        String password = sharedPreferences.getString(KEY_PASSWORD, "");
                        if (email == null || email.isEmpty() || password == null || password.isEmpty()) {
                            setConfigured(false);
                            activity.runOnUiThread(() -> call.reject("BIOMETRIC_NOT_CONFIGURED"));
                            return;
                        }

                        JSObject response = new JSObject();
                        response.put("email", email);
                        response.put("password", password);
                        response.put("storageVersion", 3);
                        resolveOnUiThread(activity, call, response);
                    } catch (Exception cause) {
                        setConfigured(false);
                        rejectOnUiThread(activity, call, "SECURE_STORAGE_UNAVAILABLE", cause);
                    }
                });
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
