package br.com.megfinancas.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MegNativeShell")
public class MegNativeShellPlugin extends Plugin {
    @PluginMethod
    public void exitAndRemoveTask(PluginCall call) {
        if (getActivity() == null) {
            call.reject("ACTIVITY_UNAVAILABLE");
            return;
        }
        call.resolve();
        getActivity().runOnUiThread(() -> getActivity().finishAndRemoveTask());
    }
}
