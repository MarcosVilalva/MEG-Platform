package br.com.megfinancas.app;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "ReportExporter")
public class ReportExporterPlugin extends Plugin {
    private static final String DEFAULT_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @PluginMethod
    public void share(PluginCall call) {
        String base64 = call.getString("base64", "");
        String filename = safeFilename(call.getString("filename", "relatorio-executivo-meg.xlsx"));
        String mimeType = call.getString("mimeType", DEFAULT_MIME);
        if (base64.isEmpty()) {
            call.reject("O relatório não contém dados para exportação.");
            return;
        }

        try {
            File directory = new File(getContext().getCacheDir(), "reports");
            if (!directory.exists() && !directory.mkdirs()) {
                throw new IllegalStateException("Não foi possível preparar a pasta de relatórios.");
            }
            File report = new File(directory, filename);
            byte[] contents = Base64.decode(base64, Base64.DEFAULT);
            try (FileOutputStream output = new FileOutputStream(report)) {
                output.write(contents);
            }

            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                report
            );
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Relatório executivo MEG Finanças");
            shareIntent.setClipData(ClipData.newRawUri(filename, uri));
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(shareIntent, "Salvar ou compartilhar relatório");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().runOnUiThread(() -> getContext().startActivity(chooser));

            JSObject result = new JSObject();
            result.put("shared", true);
            result.put("filename", filename);
            result.put("size", contents.length);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Não foi possível abrir o compartilhamento do relatório: " + error.getMessage(), error);
        }
    }

    private String safeFilename(String value) {
        String safe = String.valueOf(value).replaceAll("[^A-Za-z0-9._-]", "-");
        return safe.toLowerCase().endsWith(".xlsx") ? safe : safe + ".xlsx";
    }
}
